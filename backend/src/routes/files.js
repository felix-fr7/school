/**
 * Files Routes
 * General file upload and management
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle, uploadArray, deleteFile, getFileUrl } = require('../middleware/fileUpload');
const path = require('path');
const fs = require('fs');

// Upload file
router.post('/upload', authenticate, isAdmin, uploadSingle('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.destination.replace(path.join(__dirname, '../../'), '')}/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticate, isAdmin, uploadArray('files', 10), async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadedFiles = files.map(file => ({
      url: `/uploads/${file.destination.replace(path.join(__dirname, '../../'), '')}/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(201).json({
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:filename', authenticate, isAdmin, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    
    // Find file in uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    let filePath = null;
    
    const subdirs = ['images', 'documents', 'audio', 'videos'];
    for (const subdir of subdirs) {
      const checkPath = path.join(uploadsDir, subdir, filename);
      if (fs.existsSync(checkPath)) {
        filePath = checkPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;