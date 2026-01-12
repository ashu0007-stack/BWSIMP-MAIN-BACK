const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const S3_ENDPOINT = process.env.S3_ENDPOINT; // e.g. http://localhost:5000
const S3_BUCKET = process.env.S3_BUCKET || 'dms';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const USE_MINIO = process.env.USE_MINIO === 'true';

const s3Config = { region: S3_REGION };

if (USE_MINIO && S3_ENDPOINT) {
  s3Config.endpoint = S3_ENDPOINT;
  s3Config.s3ForcePathStyle = true;
}

const s3 = new AWS.S3({
  ...s3Config,
  accessKeyId: S3_ACCESS_KEY,
  secretAccessKey: S3_SECRET_KEY,
  signatureVersion: 'v4'
});

async function uploadBuffer(buffer, key, contentType) {
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }).promise();
  return key;
}

function getSignedDownloadUrl(key, expiresSec = 60) {
  return s3.getSignedUrl('getObject', {
    Bucket: S3_BUCKET,
    Key: key,
    Expires: expiresSec
  });
}

module.exports = { uploadBuffer, getSignedDownloadUrl };
