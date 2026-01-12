// controllers/Rdd/workLogRddController.js
import db from "../../config/db.js";
import path from "path";

// ===============================================
// ✅ File Upload Validation for Images Only
// ===============================================
const validateImageUpload = (file) => {
  if (!file) {
    return { isValid: true };
  }

  const allowedMimeTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif',
    'image/webp'
  ];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed for upload'
    };
  }

  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB'
    };
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'Only .jpg, .jpeg, .png, .gif, .webp files are allowed'
    };
  }

  return { isValid: true };
};

// Get ALL work logs by data entry ID (returns array)
const getWorkLogByDataEntryId = async (req, res) => {
  try {
    const { dataEntryId } = req.params;
    
    const [rows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code,
              de.district,
              de.block,
              de.panchayat
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       WHERE wl.data_entry_id = ?
       ORDER BY wl.created_at DESC`,
      [dataEntryId]
    );
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('Error fetching work logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get LATEST work log by data entry ID
const getLatestWorkLogByDataEntryId = async (req, res) => {
  try {
    const { dataEntryId } = req.params;
    
    const [rows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code,
              de.district,
              de.block,
              de.panchayat
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       WHERE wl.data_entry_id = ?
       ORDER BY wl.created_at DESC
       LIMIT 1`,
      [dataEntryId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No work log found for this data entry'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching latest work log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create NEW work log (always creates new entry)
const createWorkLog = async (req, res) => {
  try {
    // Validate file uploads first
    if (req.files) {
      if (req.files.initial_upload) {
        const initialValidation = validateImageUpload(req.files.initial_upload[0]);
        if (!initialValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: initialValidation.error
          });
        }
      }
      
      if (req.files.final_upload) {
        const finalValidation = validateImageUpload(req.files.final_upload[0]);
        if (!finalValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: finalValidation.error
          });
        }
      }
    }

    const {
      data_entry_id,
      agency_name,
      command_area,
      proposed_length,
      proposed_width,
      proposed_height,
      wages_amount,
      material_amount,
      total_sanction_amount
    } = req.body;
    
    const user_id = req.user?.id;
    
    console.log('Creating NEW work log for data_entry_id:', data_entry_id);
    
    // Validate required fields
    if (!data_entry_id || !agency_name) {
      return res.status(400).json({
        success: false,
        message: 'Data entry ID and agency name are required'
      });
    }
    
    // Check if data entry exists
    const [dataEntryRows] = await db.execute(
      'SELECT id, work_name, work_code FROM data_entries WHERE id = ?',
      [data_entry_id]
    );
    
    if (dataEntryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data entry not found'
      });
    }
    
    // Get count of existing logs for this data entry
    const [existingCountRows] = await db.execute(
      'SELECT COUNT(*) as log_count FROM work_log_rdd WHERE data_entry_id = ?',
      [data_entry_id]
    );
    
    const logCount = existingCountRows[0].log_count;
    const logNumber = logCount + 1;
    
    // Handle file uploads
    const initial_upload = req.files?.initial_upload ? req.files.initial_upload[0].filename : null;
    const final_upload = req.files?.final_upload ? req.files.final_upload[0].filename : null;
    
    // Always create new record (never update)
    const [result] = await db.execute(
      `INSERT INTO work_log_rdd 
       (data_entry_id, agency_name, command_area, proposed_length, proposed_width, 
        proposed_height, wages_amount, material_amount, total_sanction_amount, 
        initial_upload, final_upload, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data_entry_id,
        agency_name,
        command_area || 0,
        proposed_length || 0,
        proposed_width || 0,
        proposed_height || 0,
        wages_amount || 0,
        material_amount || 0,
        total_sanction_amount || 0,
        initial_upload,
        final_upload,
        user_id
      ]
    );
    
    console.log('New work log created with ID:', result.insertId, 'Log number:', logNumber);
    
    // Fetch the created record
    const [newRows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code,
              de.district,
              de.block,
              de.panchayat
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       WHERE wl.id = ?`,
      [result.insertId]
    );
    
    res.json({
      success: true,
      message: `Work log #${logNumber} created successfully`,
      data: newRows[0],
      logNumber: logNumber,
      totalLogs: logNumber
    });
    
  } catch (error) {
    console.error('Error creating work log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create or update work log - ALWAYS CREATES NEW
const createOrUpdateWorkLog = async (req, res) => {
  try {
    // Validate file uploads first
    if (req.files) {
      if (req.files.initial_upload) {
        const initialValidation = validateImageUpload(req.files.initial_upload[0]);
        if (!initialValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: initialValidation.error
          });
        }
      }
      
      if (req.files.final_upload) {
        const finalValidation = validateImageUpload(req.files.final_upload[0]);
        if (!finalValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: finalValidation.error
          });
        }
      }
    }

    const {
      data_entry_id,
      agency_name,
      command_area,
      proposed_length,
      proposed_width,
      proposed_height,
      wages_amount,
      material_amount,
      total_sanction_amount
    } = req.body;
    
    const user_id = req.user?.id;
    
    console.log('createOrUpdateWorkLog - Creating NEW log for data_entry_id:', data_entry_id);
    
    // Validate required fields
    if (!data_entry_id || !agency_name) {
      return res.status(400).json({
        success: false,
        message: 'Data entry ID and agency name are required'
      });
    }
    
    // Check if data entry exists
    const [dataEntryRows] = await db.execute(
      'SELECT id FROM data_entries WHERE id = ?',
      [data_entry_id]
    );
    
    if (dataEntryRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data entry not found'
      });
    }
    
    // Get count of existing logs
    const [existingCountRows] = await db.execute(
      'SELECT COUNT(*) as log_count FROM work_log_rdd WHERE data_entry_id = ?',
      [data_entry_id]
    );
    
    const logCount = existingCountRows[0].log_count;
    const logNumber = logCount + 1;
    
    // Handle file uploads
    const initial_upload = req.files?.initial_upload ? req.files.initial_upload[0].filename : null;
    const final_upload = req.files?.final_upload ? req.files.final_upload[0].filename : null;
    
    // ALWAYS CREATE NEW RECORD (never update existing)
    const [result] = await db.execute(
      `INSERT INTO work_log_rdd 
       (data_entry_id, agency_name, command_area, proposed_length, proposed_width, 
        proposed_height, wages_amount, material_amount, total_sanction_amount, 
        initial_upload, final_upload, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data_entry_id,
        agency_name,
        command_area || 0,
        proposed_length || 0,
        proposed_width || 0,
        proposed_height || 0,
        wages_amount || 0,
        material_amount || 0,
        total_sanction_amount || 0,
        initial_upload,
        final_upload,
        user_id
      ]
    );
    
    console.log('New log created. Total logs for data_entry_id', data_entry_id, ':', logNumber);
    
    // Fetch the created record
    const [newRows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       WHERE wl.id = ?`,
      [result.insertId]
    );
    
    res.json({
      success: true,
      message: `Work log #${logNumber} created successfully`,
      data: newRows[0],
      logNumber: logNumber,
      totalLogs: logNumber,
      action: 'created'
    });
    
  } catch (error) {
    console.error('Error creating work log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update work log
const updateWorkLog = async (req, res) => {
  try {
    const { dataEntryId } = req.params;
    const {
      agency_name,
      command_area,
      proposed_length,
      proposed_width,
      proposed_height,
      wages_amount,
      material_amount,
      total_sanction_amount
    } = req.body;
    
    // Check if work log exists
    const [existingRows] = await db.execute(
      'SELECT id FROM work_log_rdd WHERE data_entry_id = ?',
      [dataEntryId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found for this data entry'
      });
    }
    
    // Update existing record
    const [result] = await db.execute(
      `UPDATE work_log_rdd 
       SET agency_name = ?, 
           command_area = ?, 
           proposed_length = ?, 
           proposed_width = ?, 
           proposed_height = ?, 
           wages_amount = ?, 
           material_amount = ?, 
           total_sanction_amount = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE data_entry_id = ?`,
      [
        agency_name,
        command_area || 0,
        proposed_length || 0,
        proposed_width || 0,
        proposed_height || 0,
        wages_amount || 0,
        material_amount || 0,
        total_sanction_amount || 0,
        dataEntryId
      ]
    );
    
    // Fetch the updated record
    const [updatedRows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       WHERE wl.data_entry_id = ?`,
      [dataEntryId]
    );
    
    res.json({
      success: true,
      message: 'Work log updated successfully',
      data: updatedRows[0]
    });
    
  } catch (error) {
    console.error('Error updating work log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete specific work log by ID
const deleteWorkLog = async (req, res) => {
  try {
    const { workLogId } = req.params;
    
    const [result] = await db.execute(
      'DELETE FROM work_log_rdd WHERE id = ?',
      [workLogId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Work log deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting work log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete all work logs for a data entry
const deleteAllWorkLogsForEntry = async (req, res) => {
  try {
    const { dataEntryId } = req.params;
    
    const [result] = await db.execute(
      'DELETE FROM work_log_rdd WHERE data_entry_id = ?',
      [dataEntryId]
    );
    
    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} work logs for data entry ${dataEntryId}`,
      deletedCount: result.affectedRows
    });
    
  } catch (error) {
    console.error('Error deleting work logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all work logs with pagination and filters
const getAllWorkLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      agency_name,
      start_date,
      end_date,
      data_entry_id
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (agency_name) {
      whereClause += ' AND wl.agency_name LIKE ?';
      params.push(`%${agency_name}%`);
    }
    
    if (data_entry_id) {
      whereClause += ' AND wl.data_entry_id = ?';
      params.push(data_entry_id);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(wl.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(wl.created_at) <= ?';
      params.push(end_date);
    }
    
    // Get total count
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM work_log_rdd wl ${whereClause}`,
      params
    );
    
    const total = countRows[0].total;
    
    // Get paginated data
    const [rows] = await db.execute(
      `SELECT wl.*, 
              de.work_name,
              de.work_code,
              de.district,
              de.block,
              de.panchayat,
              (SELECT COUNT(*) FROM work_log_rdd wl2 WHERE wl2.data_entry_id = wl.data_entry_id) as total_logs_for_entry
       FROM work_log_rdd wl
       LEFT JOIN data_entries de ON wl.data_entry_id = de.id
       ${whereClause}
       ORDER BY wl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching work logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get work log statistics
const getWorkLogStats = async (req, res) => {
  try {
    const [statsRows] = await db.execute(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT data_entry_id) as unique_data_entries,
        AVG(total_sanction_amount) as avg_sanction_amount,
        MAX(created_at) as latest_log_date
      FROM work_log_rdd
    `);
    
    const [topEntriesRows] = await db.execute(`
      SELECT 
        data_entry_id,
        COUNT(*) as log_count,
        de.work_name,
        de.work_code
      FROM work_log_rdd wl
      LEFT JOIN data_entries de ON wl.data_entry_id = de.id
      GROUP BY data_entry_id
      ORDER BY log_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        stats: statsRows[0],
        topEntries: topEntriesRows
      }
    });
    
  } catch (error) {
    console.error('Error fetching work log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Debug endpoint to check work logs
const debugWorkLogs = async (req, res) => {
  try {
    const { dataEntryId } = req.params;
    
    const [workLogs] = await db.execute(
      'SELECT * FROM work_log_rdd WHERE data_entry_id = ? ORDER BY created_at DESC',
      [dataEntryId]
    );
    
    const [dataEntry] = await db.execute(
      'SELECT * FROM data_entries WHERE id = ?',
      [dataEntryId]
    );
    
    res.json({
      success: true,
      data: {
        dataEntry: dataEntry[0] || null,
        workLogs: workLogs,
        workLogCount: workLogs.length
      }
    });
    
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get uploaded image
const getUploadedImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const { type } = req.query; // 'initial' or 'final'
    
    // You would typically serve the image from your uploads directory
    // This is a basic implementation - adjust based on your file storage setup
    const imagePath = path.join(process.cwd(), 'uploads', 'work-logs', filename);
    
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error('Error serving image:', err);
        res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }
    });
    
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching image',
      error: error.message
    });
  }
};

// Export all functions
export {
  getWorkLogByDataEntryId,
  getLatestWorkLogByDataEntryId,
  createWorkLog,
  createOrUpdateWorkLog,
  updateWorkLog,
  deleteWorkLog,
  deleteAllWorkLogsForEntry,
  getAllWorkLogs,
  getWorkLogStats,
  debugWorkLogs,
  getUploadedImage,
  validateImageUpload
};