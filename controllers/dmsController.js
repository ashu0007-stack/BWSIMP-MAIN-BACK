import fs from "fs";
import path from "path";
import db from "../config/db.js";
import crypto from "crypto";

// Generate unique share token
const generateShareToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Enhanced version with named folders
const ensureNamedUploadDir = async (componentId, disciplineId, documentTypeId) => {
  const baseDir = 'uploads/documents/';

  let componentName = 'General';
  let disciplineName = 'General';
  let documentTypeName = 'General';

  // Fetch actual names from database
  if (componentId) {
    try {
      const [compRows] = await db.query("SELECT component_name FROM package_component WHERE id = ?", [componentId]);
      if (compRows.length > 0) {
        componentName = compRows[0].component_name;
      }
    } catch (e) {
      console.warn("Could not fetch component name:", e.message);
    }
  }

  if (disciplineId) {
    try {
      const [discRows] = await db.query("SELECT discipline_name FROM disciplines WHERE id = ?", [disciplineId]);
      if (discRows.length > 0) {
        disciplineName = discRows[0].discipline_name;
      }
    } catch (e) {
      console.warn("Could not fetch discipline name:", e.message);
    }
  }

  if (documentTypeId) {
    try {
      const [typeRows] = await db.query("SELECT type_name FROM document_types WHERE id = ?", [documentTypeId]);
      if (typeRows.length > 0) {
        documentTypeName = typeRows[0].type_name;
      }
    } catch (e) {
      console.warn("Could not fetch document type name:", e.message);
    }
  }

  // Create safe folder names
  const safeComponentName = componentName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeDisciplineName = disciplineName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeDocumentTypeName = documentTypeName.replace(/[^a-zA-Z0-9]/g, '_');

  const uploadDir = path.join(baseDir, safeComponentName, safeDisciplineName, safeDocumentTypeName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created named upload directory:', uploadDir);
  }

  return {
    uploadDir,
    folderStructure: `${safeComponentName}/${safeDisciplineName}/${safeDocumentTypeName}`,
    displayStructure: `${componentName}/${disciplineName}/${documentTypeName}`
  };
};

// 📁 Upload document with named folders and user info
export const uploadDocumentWithNamedFolders = async (req, res) => {
  console.log("=== UPLOAD REQUEST STARTED ===");

  try {
    console.log("📦 Request received");
    console.log("📝 Body fields:", req.body);
    console.log("📎 File info:", req.file ? {
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    } : 'No file');

    if (!req.file) {
      console.log("❌ No file in request");
      return res.status(400).json({
        success: false,
        error: "No file uploaded"
      });
    }

    const {
      documentName,
      remarks,
      componentId,
      disciplineId,
      documentTypeId,
      versionControl,
      isFinal,
      userId,
      userName,
      userEmail
    } = req.body;

    console.log("📊 Form data received:", {
      documentName,
      componentId,
      disciplineId,
      documentTypeId,
      versionControl,
      isFinal,
      remarks,
      userId,
      userName,
      userEmail
    });

    if (!documentName) {
      console.log("❌ Missing documentName");
      return res.status(400).json({
        success: false,
        error: "Document name is required"
      });
    }

    if (!documentTypeId) {
      console.log("❌ Missing documentTypeId");
      return res.status(400).json({
        success: false,
        error: "Document type is required"
      });
    }

    // Use provided user info or default to 'admin'
    const uploadedBy = userName || 'admin';
    const uploadedById = userId || null;

    // Create named folder structure
    const { uploadDir, folderStructure, displayStructure } = await ensureNamedUploadDir(
      componentId,
      disciplineId,
      documentTypeId
    );


    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const currentDate = new Date().toISOString().split('T')[0]; 
    const sanitizedDocumentName = documentName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const fileNameWithVersion = `${sanitizedDocumentName}_${versionControl || 'R0'}_${currentDate}${fileExtension}`;
    const filePath = path.join(uploadDir, fileNameWithVersion);
    const fileNameWithTimestamp = `${fileNameWithVersion}`;
    console.log("💾 Moving file to:", filePath);
    console.log("📝 Generated filename:", fileNameWithTimestamp);


    // Move file from temp to structured folder
    fs.renameSync(req.file.path, filePath);


    const fileSize = req.file.size;
    const fileName = req.file.originalname;
    const originalFileName = req.file.originalname;

    console.log("💾 File details:", {
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      fileExtension,
      filePath
    });

    // Test database connection first
    console.log("🔌 Testing database connection...");
    try {
      const [dbTest] = await db.query('SELECT 1 as test');
      console.log("✅ Database connection successful");
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }

    // Insert into database with user info
    console.log("💾 Inserting document into database...");

    const [result] = await db.query(
      `INSERT INTO documents (
    document_name, 
    file_name, 
    file_path, 
    file_size, 
    file_extension,
    version_control, 
    upload_date, 
    remarks, 
    uploaded_by, 
    is_final,
    component_id, 
    discipline_id,
    document_type_id,
    folder_structure
  ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentName,
        fileNameWithTimestamp, // Use the new filename
        filePath,
        fileSize,
        fileExtension,
        versionControl || 'R0',
        remarks || '',
        uploadedBy,
        isFinal === 'true' ? 1 : 0,
        componentId || null,
        disciplineId || null,
        documentTypeId,
        folderStructure
      ]
    );

    console.log("✅ Database insert successful, ID:", result.insertId);

    res.json({
      success: true,
      message: "Document uploaded successfully with folder structure",
      id: result.insertId,
      folderStructure: displayStructure,
      filePath: filePath,
      uploadedBy: uploadedBy
    });

    console.log("=== UPLOAD REQUEST COMPLETED SUCCESSFULLY ===");

  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err);
    console.error("Error stack:", err.stack);

    // Delete uploaded file if database operation failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("🗑️ Deleted uploaded file due to error");
      } catch (unlinkError) {
        console.error("Failed to delete file:", unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📧 Create shareable link for document - FIXED VERSION
export const createShareLink = async (req, res) => {
  try {
    const { documentId } = req.params;
    const {
      userEmail,
      permissionType = 'view',
      expiresInHours = 24,
      userId
    } = req.body;

    console.log("🔗 Creating share link for document:", documentId);
    console.log("📧 Sharing with:", userEmail);
    console.log("🎯 Permission type:", permissionType);
    console.log("👤 Received user ID:", userId);

    // Validate required fields
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "User email is required"
      });
    }

    // Validate document exists
    const [docRows] = await db.query("SELECT id, document_name FROM documents WHERE id = ?", [documentId]);
    if (docRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Document not found"
      });
    }

    // 🔧 FIX: Ensure we always have a valid created_by value
    let createdBy = 1; // Default fallback user ID

    if (userId) {
      // Check if user exists in database
      try {
        const [userRows] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
        if (userRows.length > 0) {
          createdBy = parseInt(userId);
          console.log("✅ Valid user found, created_by:", createdBy);
        } else {
          console.warn("⚠️ User ID not found in database, using default:", userId);
        }
      } catch (userError) {
        console.warn("⚠️ Could not validate user, using default:", userError.message);
      }
    } else {
      // If no userId provided, try to find an admin user
      try {
        const [adminRows] = await db.query("SELECT id FROM users WHERE role = 'admin' OR role = 'user' LIMIT 1");
        if (adminRows.length > 0) {
          createdBy = adminRows[0].id;
          console.log("👨‍💼 Using admin user ID:", createdBy);
        }
      } catch (adminError) {
        console.warn("⚠️ Could not find admin user, using default ID 1");
      }
    }

    console.log("👤 Final created_by value:", createdBy);

    // Generate unique token
    const shareToken = generateShareToken();
    const expiresAt = expiresInHours > 0 ?
      new Date(Date.now() + expiresInHours * 60 * 60 * 1000) :
      null;

    // Create permission record
    const [result] = await db.query(
      `INSERT INTO document_permissions (
        document_id, 
        user_id, 
        user_email, 
        permission_type, 
        share_token, 
        expires_at, 
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        userId, 
        userEmail,
        permissionType,
        shareToken,
        expiresAt,
        createdBy 
      ]
    );

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareToken}`;

    console.log("✅ Share link created successfully");
    console.log("🔗 Share URL:", shareUrl);
    console.log("👤 Created by user ID:", createdBy);

    res.json({
      success: true,
      message: "Share link created successfully",
      shareUrl,
      shareToken,
      expiresAt,
      permissionId: result.insertId,
      createdBy: createdBy
    });

  } catch (err) {
    console.error("❌ Create share link error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// 🔍 Validate share token and get document
export const validateShareToken = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("🔍 Validating share token:", token);

    const [permissionRows] = await db.query(
      `SELECT 
        dp.*,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_extension,
        d.uploaded_by,
        d.folder_structure,
        u.username as created_by_name
      FROM document_permissions dp
      JOIN documents d ON dp.document_id = d.id
      LEFT JOIN users u ON dp.created_by = u.id
      WHERE dp.share_token = ? AND dp.is_active = TRUE 
        AND (dp.expires_at IS NULL OR dp.expires_at > NOW())`,
      [token]
    );

    if (permissionRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Invalid or expired share link"
      });
    }

    const permission = permissionRows[0];

    res.json({
      success: true,
      document: {
        id: permission.document_id,
        document_name: permission.document_name,
        file_name: permission.file_name,
        file_path: permission.file_path,
        file_size: permission.file_size,
        file_extension: permission.file_extension,
        uploaded_by: permission.uploaded_by,
        folder_structure: permission.folder_structure
      },
      permission: {
        type: permission.permission_type,
        expiresAt: permission.expires_at,
        createdBy: permission.created_by_name || 'Unknown User'
      }
    });

  } catch (err) {
    console.error("❌ Validate token error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📄 Download shared document
export const downloadSharedDocument = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("📥 Download request for shared document:", token);

    const [permissionRows] = await db.query(
      `SELECT 
        dp.*,
        d.file_path,
        d.file_name,
        d.document_name
      FROM document_permissions dp
      JOIN documents d ON dp.document_id = d.id
      WHERE dp.share_token = ? AND dp.is_active = TRUE 
        AND (dp.expires_at IS NULL OR dp.expires_at > NOW())
        AND dp.permission_type IN ('download', 'both')`,
      [token]
    );

    if (permissionRows.length === 0) {
      return res.status(403).json({
        success: false,
        error: "Download not permitted or link expired"
      });
    }

    const permission = permissionRows[0];
    const filePath = permission.file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found on server"
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${permission.file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Log download activity
    console.log(`📝 Access log: Document ${permission.document_id} downloaded via share token`);

  } catch (err) {
    console.error("❌ Download shared document error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 👁️ View shared document
export const viewSharedDocument = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("👁️ View request for shared document:", token);

    const [permissionRows] = await db.query(
      `SELECT 
        dp.*,
        d.file_path,
        d.file_name,
        d.document_name
      FROM document_permissions dp
      JOIN documents d ON dp.document_id = d.id
      WHERE dp.share_token = ? AND dp.is_active = TRUE 
        AND (dp.expires_at IS NULL OR dp.expires_at > NOW())
        AND dp.permission_type IN ('view', 'both')`,
      [token]
    );

    if (permissionRows.length === 0) {
      return res.status(403).json({
        success: false,
        error: "View not permitted or link expired"
      });
    }

    const permission = permissionRows[0];
    const filePath = permission.file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "File not found on server"
      });
    }

    // For viewing, we serve the file directly
    res.sendFile(path.resolve(filePath));

    // Log view activity
    console.log(`📝 Access log: Document ${permission.document_id} viewed via share token`);

  } catch (err) {
    console.error("❌ View shared document error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📋 Get document sharing permissions - UPDATED TO SHOW ACTUAL USER INFO
export const getDocumentPermissions = async (req, res) => {
  try {
    const { documentId } = req.params;

    console.log("📋 Fetching permissions for document:", documentId);

    // Check if document exists
    const [docRows] = await db.query("SELECT id FROM documents WHERE id = ?", [documentId]);
    if (docRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Document not found"
      });
    }

    // Get permissions with created_by user name - IMPROVED QUERY
    const [permissionRows] = await db.query(
      `SELECT 
        dp.id,
        dp.user_email,
        dp.permission_type,
        dp.share_token,
        dp.expires_at,
        dp.created_at,
        dp.is_active,
        dp.created_by,
        COALESCE(u.username, u.email, 'Unknown User') as created_by_name
      FROM document_permissions dp
      LEFT JOIN users u ON dp.created_by = u.id
      WHERE dp.document_id = ?
      ORDER BY dp.created_at DESC`,
      [documentId]
    );

    console.log(`✅ Found ${permissionRows.length} permissions for document ${documentId}`);

    res.json({
      success: true,
      permissions: permissionRows
    });

  } catch (err) {
    console.error("❌ Get permissions error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 🗑️ Revoke sharing permission
export const revokePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;

    const [result] = await db.query(
      "UPDATE document_permissions SET is_active = FALSE WHERE id = ?",
      [permissionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Permission not found"
      });
    }

    res.json({
      success: true,
      message: "Permission revoked successfully"
    });

  } catch (err) {
    console.error("❌ Revoke permission error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📊 Get master data for dropdowns - Return objects with IDs
export const getMasterData = async (req, res) => {
  try {
    console.log("🎯 Fetching master data...");

    // Get components with IDs
    let components = [];
    try {
      const [componentRows] = await db.query("SELECT id, component_name FROM package_component");
      components = componentRows;
    } catch (e) {
      console.warn("⚠️ Could not fetch components:", e.message);
      components = [];
    }

    // Get disciplines with IDs AND component_id
    let disciplines = [];
    try {
      const [disciplineRows] = await db.query("SELECT id, component_id, discipline_name FROM disciplines");
      disciplines = disciplineRows;
    } catch (e) {
      console.warn("⚠️ Could not fetch disciplines:", e.message);
      disciplines = [];
    }

    // Get document types with IDs
    let documentTypes = [];
    try {
      const [typeRows] = await db.query("SELECT id, type_name FROM document_types");
      documentTypes = typeRows;
    } catch (e) {
      console.warn("⚠️ Could not fetch document types:", e.message);
      documentTypes = [];
    }

    const masterData = {
      components,
      disciplines, // अब disciplines में component_id भी होगा
      documentTypes,
      versions: ['P0', 'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'Final']
    };
    res.json(masterData);
  } catch (err) {
    console.error("❌ Master data fetch error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📄 Get all documents - Include IDs in response
export const getDocuments = async (req, res) => {
  try {
    console.log("📋 Fetching documents...");

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_extension,
        d.version_control,
        d.upload_date,
        d.remarks,
        d.uploaded_by,
        d.is_final,
        d.component_id,
        d.discipline_id,
        d.document_type_id,
        d.folder_structure,
        d.created_at,
        pc.component_name,
        dis.discipline_name,
        dt.type_name as document_type
      FROM documents d
      LEFT JOIN package_component pc ON d.component_id = pc.id
      LEFT JOIN disciplines dis ON d.discipline_id = dis.id
      LEFT JOIN document_types dt ON d.document_type_id = dt.id
      ORDER BY d.upload_date DESC`
    );

    console.log(`✅ Found ${rows.length} documents`);
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 🔍 Search documents
export const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;
    console.log(`🔍 Searching documents for: ${query}`);

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_extension,
        d.version_control,
        d.upload_date,
        d.remarks,
        d.uploaded_by,
        d.is_final,
        d.component_id,
        d.discipline_id,
        d.document_type_id,
        d.folder_structure,
        d.created_at,
        pc.component_name,
        dis.discipline_name,
        dt.type_name as document_type
      FROM documents d
      LEFT JOIN package_component pc ON d.component_id = pc.id
      LEFT JOIN disciplines dis ON d.discipline_id = dis.id
      LEFT JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.document_name LIKE ? OR d.remarks LIKE ? OR dt.type_name LIKE ? OR pc.component_name LIKE ? OR dis.discipline_name LIKE ?
      ORDER BY d.upload_date DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );

    console.log(`✅ Search found ${rows.length} documents`);
    res.json(rows);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ❌ Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Deleting document ID:", id);

    const [rows] = await db.query("SELECT file_path FROM documents WHERE id = ?", [id]);

    if (rows.length > 0) {
      const filePath = rows[0].file_path;

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("✅ Deleted file:", filePath);
      }

      await db.query("DELETE FROM documents WHERE id = ?", [id]);
      console.log("✅ Deleted database record");

      res.json({ success: true, message: "Document deleted successfully" });
    } else {
      console.log("❌ Document not found for deletion");
      res.status(404).json({ success: false, error: "Document not found" });
    }
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📁 Get document by ID
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📄 Getting document by ID:", id);

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.document_name,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_extension,
        d.version_control,
        d.upload_date,
        d.remarks,
        d.uploaded_by,
        d.is_final,
        d.component_id,
        d.discipline_id,
        d.document_type_id,
        d.folder_structure,
        d.created_at,
        pc.component_name,
        dis.discipline_name,
        dt.type_name as document_type
      FROM documents d
      LEFT JOIN package_component pc ON d.component_id = pc.id
      LEFT JOIN disciplines dis ON d.discipline_id = dis.id
      LEFT JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      console.log("❌ Document not found");
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    console.log("✅ Document found");
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Get document error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
export const testSharedRoute = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("✅ Test route called with token:", token);

    res.json({
      success: true,
      message: "Test route working!",
      token: token,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Test route error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Keep the original upload function for backward compatibility
export const uploadDocument = uploadDocumentWithNamedFolders;