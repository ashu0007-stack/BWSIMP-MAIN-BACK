import multer from 'multer';
import path from 'path';
import fs from 'fs';

const createUploadDirs = () => {
  const baseDir = 'uploads';
  const dirs = [
    `${baseDir}/contractors/social`,
    `${baseDir}/contractors/environmental`,
    `${baseDir}/contractors/work_methodology`
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Call to create directories
createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine folder based on file type
    if (req.body.type === 'social') {
      uploadPath += 'contractors/social/';
    } else if (req.body.type === 'environmental') {
      uploadPath += 'contractors/environmental/';
    } else if (req.body.type === 'work_methodology') {
      uploadPath += 'contractors/work_methodology/';
    } else {
      // Default to a general folder
      uploadPath += 'contractors/others/';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename: timestamp + random string + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, JPG, PNG files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Multiple file upload middleware
export const uploadMultipleFiles = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Single file upload middleware
export const uploadSingleFile = (fieldName) => {
  return upload.single(fieldName);
};

// Helper function to get file URL
export const getFileUrl = (req, filename, type) => {
  if (!filename) return null;
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  let folder = '';
  
  switch (type) {
    case 'social':
      folder = 'contractors/social';
      break;
    case 'environmental':
      folder = 'contractors/environmental';
      break;
    case 'work_methodology':
      folder = 'contractors/work_methodology';
      break;
    default:
      folder = 'contractors/others';
  }
  
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

// Helper function to delete file
export const deleteFile = (fileUrl) => {
  if (!fileUrl) return;
  
  try {
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const fullPath = `uploads/${folder}/${filename}`;
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};