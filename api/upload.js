import Busboy from 'busboy';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    let parser;
    try { parser = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES } }); }
    catch (error) { reject(error); return; }
    let found = false;
    let tooLarge = false;
    const chunks = [];
    let filename = 'token-logo';
    let mime = '';
    parser.on('file', (field, stream, info) => {
      if (field !== 'image') { stream.resume(); return; }
      found = true;
      filename = info.filename || filename;
      mime = String(info.mimeType || '').toLowerCase();
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('limit', () => { tooLarge = true; });
    });
    parser.on('error', reject);
    parser.on('finish', () => {
      if (!found) return reject(new Error('No image field was received.'));
      if (tooLarge) return reject(new Error('Image must be under 5 MB.'));
      resolve({ filename, type: mime, data: Buffer.concat(chunks) });
    });
    req.pipe(parser);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'POST an image using field name image.' });
  }
  try {
    const image = await readMultipart(req);
    if (!ALLOWED.has(image.type)) return send(res, 415, { error: 'Only PNG, JPG/JPEG, and WEBP images are allowed.' });
    if (!image.data.length || image.data.length > MAX_BYTES) return send(res, 413, { error: 'Image must be between 1 byte and 5 MB.' });

    let uri;
    if (process.env.PINATA_JWT) {
      const form = new FormData();
      form.append('file', new Blob([image.data], { type: image.type }), image.filename);
      const upstream = await fetch('https://uploads.pinata.cloud/v3/files', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` }, body: form
      });
      const payload = await upstream.json().catch(() => ({}));
      const cid = payload?.data?.cid || payload?.cid;
      if (!upstream.ok || !cid) return send(res, 502, { error: 'IPFS provider rejected the image upload.' });
      uri = `ipfs://${cid}`;
    } else {
      return send(res, 503, { error: 'IPFS upload is not configured. Add PINATA_JWT in Vercel Environment Variables.' });
    }
    const cid = uri.startsWith('ipfs://') ? uri.slice(7) : '';
    return send(res, 200, { ok: true, uri, ...(cid ? { cid, gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}` } : {}) });
  } catch (error) {
    console.error('Upload error', error);
    return send(res, 400, { error: error.message || 'Invalid image upload.' });
  }
}

export const config = { api: { bodyParser: false } };
