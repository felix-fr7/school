/**
 * End-to-end test through the REAL backend upload code path (multer +
 * fileUpload middleware), not the raw Cloudinary SDK.
 * Run: node scripts/test-upload-pipeline.js
 */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const request = require('http');

const { uploadSingle, resolveFileUrl, deleteFile, isCloudinaryEnabled } = require('../src/middleware/fileUpload');

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f \ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF\n',
  'latin1'
);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const app = express();

app.post('/up/pdf', uploadSingle('file'), (req, res) => {
  res.json({
    url: resolveFileUrl(req.file),
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

const server = app.listen(0);

function post(path, filename, contentType, buffer) {
  return new Promise((resolve, reject) => {
    const boundary = '----macveltest' + Date.now();
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, buffer, tail]);

    const req = request.request(
      { host: '127.0.0.1', port: server.address().port, path, method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            console.error('NON_JSON_RESPONSE status=' + res.statusCode);
            console.error('BODY_SNIPPET=' + data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
            resolve({ __error: true, status: res.statusCode });
          }
        });
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

async function reachable(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 't' } });
  return res.status;
}

(async () => {
  console.error('CLOUDINARY_ENABLED=' + isCloudinaryEnabled());
  let ok = true;

  // ---- PDF through the real multer pipeline ----
  const pdf = await post('/up/pdf', 'report card.pdf', 'application/pdf', PDF);
  console.error('PDF_RESPONSE=' + JSON.stringify(pdf));
  const pdfStatus = await reachable(pdf.url);
  console.error('PDF_DELIVERY=' + pdfStatus);
  if (pdfStatus !== 200) ok = false;

  // ---- PNG through the real multer pipeline ----
  const png = await post('/up/pdf', 'logo.png', 'image/png', PNG);
  console.error('PNG_RESPONSE=' + JSON.stringify(png));
  const pngStatus = await reachable(png.url);
  console.error('PNG_DELIVERY=' + pngStatus);
  if (pngStatus !== 200) ok = false;

  // ---- Delete through the shared deleteFile helper ----
  const d1 = await deleteFile(pdf.url);
  console.error('DELETE_PDF=' + d1);
  const d2 = await deleteFile(png.url);
  console.error('DELETE_PNG=' + d2);
  if (!d1 || !d2) ok = false;

  server.close();
  console.error(ok ? 'PIPELINE_RESULT=PASS' : 'PIPELINE_RESULT=FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  server.close();
  console.error('FATAL=' + e.message);
  process.exit(1);
});
