// Vercel Node function: reference-compatible image upload backed by IPFS.
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
  const field = Buffer.from('name="image"');
  const fieldAt = body.indexOf(field);
  if (fieldAt < 0) throw new Error('No image field was received.');
  const headerStart = body.lastIndexOf(boundary, fieldAt);
  const headersEnd = body.indexOf(Buffer.from('\r\n\r\n'), fieldAt);
  const dataStart = headersEnd + 4;
  const nextBoundary = body.indexOf(boundary, dataStart);
  if (headerStart < 0 || headersEnd < 0 || nextBoundary < 0) throw new Error('Invalid multipart body.');
  const headers = body.subarray(headerStart, headersEnd).toString('utf8');
  let dataEnd = nextBoundary;
  if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) dataEnd -= 2;
  const filename = headers.match(/filename="([^"]*)"/i)?.[1] || 'token-logo';
  const contentType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() || '';
  return { filename, type: contentType, data: body.subarray(dataStart, dataEnd) };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BYTES + 1024 * 1024) {
        reject(new Error('Upload is too large. Maximum size is 5 MB.'));
        req.destroy();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'POST an image using field name image.' });
  }
  try {
    const image = parseMultipart(req, await readBody(req));
    if (!ALLOWED.has(image.type)) return send(res, 415, { error: 'Only PNG, JPG/JPEG, and WEBP images are allowed.' });
    if (!image.data.length || image.data.length > MAX_BYTES) return send(res, 413, { error: 'Image must be between 1 byte and 5 MB.' });

    let uri;
    if (process.env.PINATA_JWT) {
      const form = new FormData();
      form.append('file', new Blob([image.data], { type: image.type }), `pons-logo${ALLOWED.get(image.type)}`);
      const upstream = await fetch('https://uploads.pinata.cloud/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
        body: form
      });
      const payload = await upstream.json().catch(() => ({}));
      const cid = payload?.data?.cid || payload?.cid;
      if (!upstream.ok || !cid) return send(res, 502, { error: 'IPFS provider rejected the image upload.' });
      uri = `ipfs://${cid}`;
    } else {
      // Same fallback contract used by the reference repository while a local
      // Pinata credential is not configured in this Vercel project.
      const upstream = new FormData();
      upstream.append('image', new Blob([image.data], { type: image.type }), `pons-logo${ALLOWED.get(image.type)}`);
      const response = await fetch('https://pons-launcher.vercel.app/api/upload', { method: 'POST', body: upstream });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.uri) return send(res, 502, { error: payload?.error || `IPFS upload failed (HTTP ${response.status})` });
      uri = payload.uri;
    }

    const cid = uri.startsWith('ipfs://') ? uri.slice(7) : '';
    return send(res, 200, { ok: true, uri, ...(cid ? { cid, gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}` } : {}) });
  } catch (error) {
    console.error('Upload error', error);
    return send(res, 400, { error: error.message || 'Invalid image upload.' });
  }
}

export const config = { api: { bodyParser: false } };
