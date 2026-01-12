const multer = require('multer');

// memory storage so we can forward buffer to S3
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB cap, adjust
});

module.exports = upload;
