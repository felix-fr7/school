/**
 * Temporary smoke test: uploads a real PDF + PNG to Cloudinary, verifies the
 * URLs are reachable, then deletes both. Safe to run: it cleans up after itself.
 * Run: node scripts/test-cloudinary.js
 */

require('dotenv').config();
const { isCloudinaryEnabled, uploadBuffer, deleteByUrl, parseCloudinaryUrl } = require('../src/config/cloudinary');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Build a genuinely valid minimal single-page PDF with a correct xref table.
 * Cloudinary validates PDF structure, so a hand-waved stub gets rejected.
 */
function buildValidPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>',
    null, // stream object, filled in below
  ];

  const streamBody = 'BT /F1 24 Tf 72 700 Td (MACVEL Cloudinary test) Tj ET';
  objects[3] = `<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

const PDF = buildValidPdf();

const HEADERS = { 'User-Agent': 'macvel-cloudinary-smoketest' };

async function check(url) {
  const res = await fetch(url, { headers: HEADERS });
  return res.status;
}

(async () => {
  if (!isCloudinaryEnabled()) {
    console.error('SKIP: CLOUDINARY_URL is not set');
    process.exit(1);
  }

  const results = { image: null, pdf: null };

  // --- Upload an image ---------------------------------------------------
  const img = await uploadBuffer(PNG, {
    originalname: 'smoketest.png',
    mimetype: 'image/png',
    folder: 'smoketest',
  });
  results.image = { url: img.url, status: await check(img.url) };
  console.error('IMAGE_UPLOAD=' + JSON.stringify(results.image));

  // --- Upload a PDF ------------------------------------------------------
  const pdf = await uploadBuffer(PDF, {
    originalname: 'smoketest.pdf',
    mimetype: 'application/pdf',
    folder: 'smoketest',
  });
  results.pdf = { url: pdf.url, status: await check(pdf.url) };
  console.error('PDF_UPLOAD=' + JSON.stringify(results.pdf));

  // --- Delete both -------------------------------------------------------
  const delImg = await deleteByUrl(img.url);
  console.error('DELETE_IMAGE=' + delImg);
  const statusAfterImg = await check(img.url);
  console.error('IMAGE_STATUS_AFTER_DELETE=' + statusAfterImg);

  const delPdf = await deleteByUrl(pdf.url);
  console.error('DELETE_PDF=' + delPdf);
  const statusAfterPdf = await check(pdf.url);
  console.error('PDF_STATUS_AFTER_DELETE=' + statusAfterPdf);

  // --- Parse check -------------------------------------------------------
  console.error('PARSE=' + JSON.stringify(parseCloudinaryUrl(img.url)));

  const pass =
    results.image.status === 200 &&
    results.pdf.status === 200 &&
    delImg === true &&
    delPdf === true;

  console.error(pass ? 'RESULT=PASS' : 'RESULT=FAIL');
  process.exit(pass ? 0 : 1);
})().catch((error) => {
  console.error('RESULT=FAIL');
  console.error('ERROR=' + error.message);
  process.exit(1);
});
