// Vercel Node function: app-owned image upload backed by Pinata IPFS.
// Configure PINATA_JWT in Vercel Project Settings -> Environment Variables.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp']
]);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function parseMultipart(req, body) {
  const type = req.headers['content-type'] || '';
  const match = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new Error('Multipart boundary is missing.');
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const start = body.indexOf(boundary);
  if (start < 0) throw new Error('Invalid multipart body.');
  let cursor = start + boundary.length;
  while (cursor < body.length) {
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    const headersEnd = body.indexOf(Buffer.from('\r\n\r\n'), cursor);
    if (headersEnd < 0) break;
    const headers = body.subarray(cursor, headersEnd).toString('utf8');
    const next = body.indexOf(boundary, headersEnd + 4);
    if (next < 0) break;
    let dataEnd = next;
    if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) dataEnd -= 2;
    const disposition = headers.match(/content-disposition:[^\r\n]*name="([^"]+)"[^\r\n]*/i);
    const filename = headers.match(/filename="([^"]*)"/i);
    const contentType = headers.match(/content-type:\s*([^\r\n]+)/i);
    if (disposition && disposition[1] === 'image' && filename) {
      return { filename: filename[1], type: (contentType?.[1] || '').trim().toLowerCase(), data: body.subarray(headersEnd + 4, dataEnd) };
    }
    cursor = next + boundary.length;
  }
  throw new Error('No image field was received.');
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BYTES + 1024 * 1024) throw new Error('Upload is too large. Maximum size is 5 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'POST an image using field name image.' });
  }
  if (!process.env.PINATA_JWT) {
    return send(res, 503, { error: 'Image upload is not configured yet. Add PINATA_JWT to the Vercel project environment.' });
  }
  try {
    const image = parseMultipart(req, await readBody(req));
    if (!ALLOWED.has(image.type)) return send(res, 415, { error: 'Only PNG, JPG/JPEG, and WEBP images are allowed.' });
    if (!image.data.length || image.data.length > MAX_BYTES) return send(res, 413, { error: 'Image must be between 1 byte and 5 MB.' });
    const form = new FormData();
    form.append('file', new Blob([image.data], { type: image.type }), `pons-logo${ALLOWED.get(image.type)}`);
    const upstream = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form
    });
    const payload = await upstream.json().catch(() => ({}));
    const cid = payload?.data?.cid || payload?.cid;
    if (!upstream.ok || !cid) {
      console.error('Pinata upload failed', upstream.status, payload?.error || payload?.message || 'unknown');
      return send(res, 502, { error: 'IPFS provider rejected the image upload.' });
    }
    return send(res, 200, { ok: true, uri: `ipfs://${cid}`, cid, gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}` });
  } catch (error) {
    console.error('Upload error', error);
    return send(res, 400, { error: error.message || 'Invalid image upload.' });
  }
};

module.exports.config = { api: { bodyParser: false } };
