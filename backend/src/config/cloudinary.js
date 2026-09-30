/**
 * Cloudinary Configuration
 *
 * Single source of truth for every Cloudinary interaction in the backend.
 * The connection string comes from the CLOUDINARY_URL environment variable,
 * e.g. cloudinary://<api_key>:<api_secret>@<cloud_name>
 *
 * Everything degrades gracefully: if CLOUDINARY_URL is not set the helpers
 * report "not enabled" and the app falls back to local disk storage.
 */

const cloudinary = require('cloudinary');

// Folder layout mirroring the previous local uploads/ structure.
const FOLDERS = {
  image: 'images',
  document: 'documents',
  audio: 'audio',
  video: 'videos',
  exam: 'exam',
  reportcard: 'reportcard',
  news: 'news',
  circulars: 'circulars',
  homework: 'homework',
  general: 'general',
};

const isCloudinaryEnabled = () => Boolean(
  process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()
);

if (isCloudinaryEnabled()) {
  cloudinary.config({
    secure: true,
    // CLOUDINARY_URL already carries cloud name / api key / api secret.
    cloudinary_url: process.env.CLOUDINARY_URL.trim(),
  });
  console.log('[Cloudinary] Configured from CLOUDINARY_URL');
} else {
  console.warn('[Cloudinary] CLOUDINARY_URL not set - falling back to local uploads/ storage');
}

/**
 * Map a MIME type to the folder it should live in.
 */
function folderForMimeType(mimetype = '') {
  if (mimetype.startsWith('image/')) return FOLDERS.image;
  if (mimetype.startsWith('audio/')) return FOLDERS.audio;
  if (mimetype.startsWith('video/')) return FOLDERS.video;
  return FOLDERS.document;
}

/**
 * Pick the Cloudinary resource_type for a file.
 * - images -> 'image'
 * - video  -> 'video'
 * - everything else (pdf, doc, xlsx, audio...) -> 'image' so PDFs stay inline-viewable
 */
function resourceTypeForMimeType(mimetype = '') {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'image';

/**
 * Upload a Buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {Object} options
 * @param {string} options.originalname - original file name
 * @param {string} options.mimetype
 * @param {string} [options.folder] - explicit folder, else derived from mimetype
 * @returns {Promise<{url, publicId, resourceType, size, name, type}>}
 */
async function uploadBuffer(buffer, { originalname = 'file', mimetype = 'application/octet-stream', folder } = {}) {
  if (!isCloudinaryEnabled()) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_URL missing)');
  }

  const uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || folderForMimeType(mimetype),
        resource_type: resourceTypeForMimeType(mimetype),
        public_id: Date.now().toString(),
        use_filename: false,
        unique_filename: false,
        overwrite: false,
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );

    stream.end(buffer);
  });

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type,
    size: uploaded.bytes,
    name: originalname,
    type: uploaded.format || mimetype,
  };
}

/**
 * Extract { publicId, resourceType } from a stored Cloudinary URL.
 * Returns null for non-Cloudinary URLs (e.g. local /uploads/... paths).
 */
function parseCloudinaryUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return null;

  const marker = '/upload/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const segments = url.slice(markerIndex + marker.length).split('?')[0].split('/').filter(Boolean);

  // Drop the version segment (v1234567890) if present.
  if (segments.length && /^v\d+$/.test(segments[0])) segments.shift();
  if (!segments.length) return null;

  const fileNameWithExt = segments.pop();
  const hasExt = fileNameWithExt.includes('.');
  const extension = hasExt ? fileNameWithExt.split('.').pop() : '';
  const baseName = hasExt ? fileNameWithExt.slice(0, -(extension.length + 1)) : fileNameWithExt;

  const folder = segments.join('/');
  const publicIdWithoutExt = folder ? `${folder}/${baseName}` : baseName;
  const publicId = `${publicIdWithoutExt}.${extension}`;

  // Resource type is the segment immediately preceding "/upload/".
  const resourceType = url.slice(0, markerIndex).split('/').pop() || 'image';

  return { publicId, publicIdWithoutExt, extension, resourceType };
}

/**
 * Delete a previously uploaded Cloudinary asset given its URL.
 * Best effort - never throws, so DB deletes are never blocked.
 * @returns {Promise<boolean>} true when the URL was a Cloudinary asset we deleted
 */
async function deleteByUrl(url) {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed || !isCloudinaryEnabled()) return false;

  try {
    // Try the full public_id (keeps extension), then the bare id.
    const attempts = [
      { public_id: parsed.publicId, resource_type: parsed.resourceType },
      { public_id: parsed.publicIdWithoutExt, resource_type: parsed.resourceType },
    ];

    for (const attempt of attempts) {
      try {
        await cloudinary.uploader.destroy(attempt.public_id, {
          resource_type: attempt.resource_type,
          invalidate: true,
        });
        return true;
      } catch (error) {
        // Try the next variant
      }
    }

    return false;
  } catch (error) {
    console.error('[Cloudinary] deleteByUrl failed:', error.message);
    return false;
  }
}

module.exports = {
  cloudinary,
  FOLDERS,
  isCloudinaryEnabled,
  folderForMimeType,
  resourceTypeForMimeType,
  uploadBuffer,
  parseCloudinaryUrl,
  deleteByUrl,
};


}
