const db = require('../config/db'); // adapt if your pool file name differs
const { v4: uuidv4 } = require('uuid');
const storage = require('./storageService');

async function createDocument(metadata, file) {
  const client = await db.getConnection ? await db.getConnection() : db; // adapt to your db lib
  // If using mysql2 pool: use .getConnection, otherwise for pg use pool.connect
  // To keep it simple, below assumes `db.query(sql, params)` works.
  try {
    // Insert document
    const insertDocSql = `INSERT INTO documents (title, description, owner_id, department_id) VALUES (?, ?, ?, ?)`;
    const paramsDoc = [metadata.title, metadata.description || null, metadata.owner_id, metadata.department_id || null];

    // Adjust for Postgres ($1..). We'll detect by db.format presence.
    if (db.format) {
      // mysql style pool has format() method? If not, assume mysql2 isn't used.
    }

    // Simple approach: use single queries in sequence and get last insert id
    const docRes = await db.query(insertDocSql, paramsDoc);
    let insertedId;
    if (docRes.insertId) insertedId = docRes.insertId; // MySQL
    else if (docRes.rows && docRes.rows[0] && docRes.rows[0].id) insertedId = docRes.rows[0].id; // Postgres RETURNING assumed not used
    else {
      // If Postgres, run with RETURNING
      // Let's handle Postgres separately:
      const pgRes = await db.query(
        `INSERT INTO documents (title, description, owner_id, department_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [metadata.title, metadata.description || null, metadata.owner_id, metadata.department_id || null]
      );
      insertedId = pgRes.rows[0].id;
    }

    const versionNumber = 1;
    const storageKey = `documents/${insertedId}/${uuidv4()}_${file.originalname}`;

    // upload to storage
    await storage.uploadBuffer(file.buffer, storageKey, file.mimetype);

    // insert version
    const insertVerSql = `INSERT INTO document_versions (document_id, version_number, storage_key, filename, mimetype, file_size, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    // Try Postgres alternative if query fails
    try {
      const verRes = await db.query(insertVerSql, [insertedId, versionNumber, storageKey, file.originalname, file.mimetype, file.size, metadata.owner_id]);
      // get ver id
      const verId = verRes.insertId || (verRes.rows && verRes.rows[0] && verRes.rows[0].id);
      // update documents.current_version_id
      try {
        await db.query('UPDATE documents SET current_version_id = ? WHERE id = ?', [verId, insertedId]);
      } catch (e) {
        // Postgres param style
        await db.query('UPDATE documents SET current_version_id = $1 WHERE id = $2', [verId, insertedId]);
      }

      // log audit
      await db.query('INSERT INTO audit_logs (document_id, version_id, user_id, action, message) VALUES (?, ?, ?, ?, ?)', [insertedId, verId, metadata.owner_id, 'upload', 'initial upload']);
      return { document_id: insertedId, version_id: verId };
    } catch (errInner) {
      // Fallback Postgres path (RETURNING)
      const verPg = await db.query(
        `INSERT INTO document_versions (document_id, version_number, storage_key, filename, mimetype, file_size, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [insertedId, versionNumber, storageKey, file.originalname, file.mimetype, file.size, metadata.owner_id]
      );
      const verId = verPg.rows[0].id;
      await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2', [verId, insertedId]);
      await db.query('INSERT INTO audit_logs (document_id, version_id, user_id, action, message) VALUES ($1,$2,$3,$4,$5)', [insertedId, verId, metadata.owner_id, 'upload', 'initial upload']);
      return { document_id: insertedId, version_id: verId };
    }
  } catch (err) {
    console.error('createDocument error', err);
    throw err;
  }
}

async function uploadNewVersion(documentId, userId, file) {
  try {
    // determine next version
    const maxRes = await db.query('SELECT COALESCE(MAX(version_number),0) as maxv FROM document_versions WHERE document_id = ?', [documentId]).catch(async () => {
      const r = await db.query('SELECT COALESCE(MAX(version_number),0) as maxv FROM document_versions WHERE document_id = $1', [documentId]);
      return r;
    });
    const maxv = (maxRes[0] && maxRes[0].maxv) || (maxRes.rows && maxRes.rows[0].maxv) || 0;
    const nextVersion = Number(maxv) + 1;

    const storageKey = `documents/${documentId}/${uuidv4()}_${file.originalname}`;
    await storage.uploadBuffer(file.buffer, storageKey, file.mimetype);

    // insert version (similar dual-style handling)
    try {
      const verRes = await db.query(
        'INSERT INTO document_versions (document_id, version_number, storage_key, filename, mimetype, file_size, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [documentId, nextVersion, storageKey, file.originalname, file.mimetype, file.size, userId]
      );
      const verId = verRes.insertId || (verRes.rows && verRes.rows[0] && verRes.rows[0].id);
      await db.query('UPDATE documents SET current_version_id = ? WHERE id = ?', [verId, documentId]);
      await db.query('INSERT INTO audit_logs (document_id, version_id, user_id, action, message) VALUES (?, ?, ?, ?, ?)', [documentId, verId, userId, 'upload', `upload version ${nextVersion}`]);
      return { version_id: verId, version_number: nextVersion };
    } catch (e) {
      const verPg = await db.query(
        'INSERT INTO document_versions (document_id, version_number, storage_key, filename, mimetype, file_size, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [documentId, nextVersion, storageKey, file.originalname, file.mimetype, file.size, userId]
      );
      const verId = verPg.rows[0].id;
      await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2', [verId, documentId]);
      await db.query('INSERT INTO audit_logs (document_id, version_id, user_id, action, message) VALUES ($1,$2,$3,$4,$5)', [documentId, verId, userId, 'upload', `upload version ${nextVersion}`]);
      return { version_id: verId, version_number: nextVersion };
    }
  } catch (err) {
    console.error('uploadNewVersion error', err);
    throw err;
  }
}

async function getDocumentWithCurrentVersion(documentId) {
  try {
    // Try Postgres join
    const res = await db.query(
      `SELECT d.*, v.id as version_id, v.version_number, v.filename, v.mimetype, v.storage_key, v.file_size, v.created_at as version_created_at
       FROM documents d
       LEFT JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.id = ?`, [documentId]
    ).catch(async () => {
      const r = await db.query(
        `SELECT d.*, v.id as version_id, v.version_number, v.filename, v.mimetype, v.storage_key, v.file_size, v.created_at as version_created_at
         FROM documents d
         LEFT JOIN document_versions v ON v.id = d.current_version_id
         WHERE d.id = $1`, [documentId]);
      return r;
    });

    return (res.rows && res.rows[0]) || (res[0] && res[0][0]) || res[0];
  } catch (err) {
    throw err;
  }
}

async function getDownloadUrlForVersion(versionId) {
  try {
    const res = await db.query('SELECT storage_key FROM document_versions WHERE id = ?', [versionId]).catch(async () => {
      return await db.query('SELECT storage_key FROM document_versions WHERE id = $1', [versionId]);
    });
    const storageKey = (res.rows && res.rows[0] && res.rows[0].storage_key) || (res[0] && res[0][0] && res[0][0].storage_key) || res[0];
    if (!storageKey) throw new Error('version not found');
    return storage.getSignedDownloadUrl(storageKey, 60);
  } catch (err) {
    throw err;
  }
}

module.exports = { createDocument, uploadNewVersion, getDocumentWithCurrentVersion, getDownloadUrlForVersion };
