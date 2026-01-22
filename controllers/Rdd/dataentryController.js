import db from "../../config/db.js";
import path from "path";
import Joi from "joi";

// ===============================================
// ✅ JOI Validation Schema
// ===============================================
const dataEntrySchema = Joi.object({
  district: Joi.number().integer().required().messages({
    "any.required": "District is required",
    "number.base": "District must be a valid numeric ID",
  }),
  districts: Joi.any().optional(),
  block: Joi.string().trim().min(2).required().messages({
    "any.required": "Block is required",
  }),
  panchayat: Joi.string().trim().min(2).required().messages({
    "any.required": "Panchayat is required",
  }),
  financialYear: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      "any.required": "Financial Year is required",
      "string.pattern.base": "Financial Year must follow YYYY-YY format (e.g. 2024-25)",
    }),
     status: Joi.string().valid('pending', 'Approved', 'Ongoing', 'complete', 'Suspended').default('pending').messages({
    "any.only": "Status must be one of: pending, Approved, Ongoing, complete, Suspended",
  }),
  workCode: Joi.string()
    .pattern(/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?/~`]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      "any.required": "Work Code is required",
      "string.pattern.base": "Work Code must be alphanumeric and can include special characters",
    }),
  workName: Joi.string().trim().min(3).max(255).required().messages({
    "any.required": "Work Name is required",
  }),
  workCategory: Joi.number().integer().required().messages({
    "any.required": "Work Category is required",
    "number.base": "Work Category must be a valid ID",
  }),
  workType: Joi.number().integer().required().messages({
    "any.required": "Work Type is required",
    "number.base": "Work Type must be a valid ID",
  }),
  agency: Joi.string().trim().allow("", null),
  commandArea: Joi.string()
    .pattern(/^\d*(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Command Area must be a number with up to 2 decimal places",
    }),
  propLength: Joi.string()
    .pattern(/^\d{1,3}(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Length must be a number with up to 3 digits and 2 decimal places",
    }),
  propWidth: Joi.string()
    .pattern(/^\d{1,3}(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Width must be a number with up to 3 digits and 2 decimal places",
    }),
  propHeight: Joi.string()
    .pattern(/^\d{1,3}(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Height must be a number with up to 3 digits and 2 decimal places",
    }),
  sanctionAmtWages: Joi.string()
    .pattern(/^\d*(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Sanction amount for wages must be a number with up to 2 decimal places",
    }),
  sanctionAmtMaterial: Joi.string()
    .pattern(/^\d*(\.\d{1,2})?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Sanction amount for material must be a number with up to 2 decimal places",
    }),
  workStartDate: Joi.date().allow(null, ""),
  workCompletionDate: Joi.date().allow(null, ""),
  remarks: Joi.string().trim().allow("", null),
  userId: Joi.number().integer().required().messages({
    "any.required": "User ID is required",
    "number.base": "User ID must be a valid numeric ID",
  }),
  schemaType: Joi.string().trim().min(2).required().messages({
    "any.required": "Schema Type is required",
  })
});



// ==================================================
// ✅ File Upload Validation
// ==================================================
const validateFileUpload = (file) => {
  if (!file) {
    return { isValid: true };
  }

  const allowedMimeTypes = ['application/pdf'];
  const maxFileSize = 5 * 1024 * 1024;

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Only PDF files are allowed for upload'
    };
  }

  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: 'File size must be less than 5MB'
    };
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension !== '.pdf') {
    return {
      isValid: false,
      error: 'Only .pdf files are allowed'
    };
  }

  return { isValid: true };
};

// ==================================================
// ✅ Helper Function: Run SQL Query Safely
// ==================================================
const runQuery = async (query, params = []) => {
  const [rows] = await db.query(query, params);
  return rows;
};

// ==================================================
// ✅ FIXED: Get Work Categories
// ==================================================
export const getWorkCategories = async (req, res) => {
  try {
    const categories = await runQuery(`
      SELECT 
        id, 
        category_name
      FROM rdd_work_categories 
      ORDER BY id
    `);

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("Error fetching work categories:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch work categories" 
    });
  }
};

// ==================================================
// ✅ FIXED: Get Sub-Categories by Work Category
// ==================================================
export const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        error: "Category ID is required",
      });
    }

    const subCategories = await runQuery(
      `
      SELECT 
        id, 
        sub_category_name
      FROM rdd_sub_categories 
      WHERE work_category_id = ?
      ORDER BY id
      `,
      [categoryId]
    );

    res.json({
      success: true,
      data: subCategories,
    });
  } catch (err) {
    console.error("Error fetching sub-categories:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch sub-categories" 
    });
  }
};

// ==================================================
// ✅ FIXED: Get All Entries (with Filters + Pagination)
// ==================================================
// ==================================================
// ✅ FIXED: Get All Entries (with Filters + Pagination)
// ==================================================
export const getDataEntries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      district,
      block,
      panchayat,
      financialYear,
      workCategory,
      schemaType,
      status,
      userId,
      search,
    } = req.query;

    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        de.*, 
        d.district_name,
        b.block_name,
        gp.gp_name as panchayat_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name
      FROM data_entries de 
      LEFT JOIN districts d ON de.district = d.district_id 
      LEFT JOIN blocks b ON de.block = b.block_id
      LEFT JOIN grampanchayat gp ON de.panchayat = gp.gp_id
      LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
      LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM data_entries de 
      LEFT JOIN districts d ON de.district = d.district_id 
      LEFT JOIN blocks b ON de.block = b.block_id
      LEFT JOIN grampanchayat gp ON de.panchayat = gp.gp_id
      LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
      LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // Add filters
    if (district && district !== "all") {
      baseQuery += " AND de.district = ?";
      countQuery += " AND de.district = ?";
      params.push(district);
      countParams.push(district);
    }
    if (block && block !== "all") {
      baseQuery += " AND de.block = ?";
      countQuery += " AND de.block = ?";
      params.push(block);
      countParams.push(block);
    }
    if (panchayat && panchayat !== "all") {
      baseQuery += " AND de.panchayat = ?";
      countQuery += " AND de.panchayat = ?";
      params.push(panchayat);
      countParams.push(panchayat);
    }
    if (financialYear && financialYear !== "all") {
      baseQuery += " AND de.financial_year = ?";
      countQuery += " AND de.financial_year = ?";
      params.push(financialYear);
      countParams.push(financialYear);
    }
    if (workCategory && workCategory !== "all") {
      baseQuery += " AND de.work_category = ?";
      countQuery += " AND de.work_category = ?";
      params.push(workCategory);
      countParams.push(workCategory);
    }
    if (schemaType && schemaType !== "all") {
      baseQuery += " AND de.schame_type = ?";
      countQuery += " AND de.schame_type = ?";
      params.push(schemaType);
      countParams.push(schemaType);
    }
  // In the generateReport function, add this filter:
if (status && status !== "all") {
  reportQuery += " AND de.status = ?";
  params.push(status);
}
    if (userId && userId !== "all") {
      baseQuery += " AND de.user_id = ?";
      countQuery += " AND de.user_id = ?";
      params.push(userId);
      countParams.push(userId);
    }
    if (search) {
      baseQuery += ` AND (
        de.work_name LIKE ? OR 
        de.work_code LIKE ? OR 
        de.agency LIKE ? OR 
        d.district_name LIKE ? OR
        b.block_name LIKE ? OR
        gp.gp_name LIKE ? OR
        de.schame_type LIKE ? OR
        wc.category_name LIKE ? OR
        sc.sub_category_name LIKE ? OR
        de.status LIKE ?
      )`;
      countQuery += ` AND (
        de.work_name LIKE ? OR 
        de.work_code LIKE ? OR 
        de.agency LIKE ? OR 
        d.district_name LIKE ? OR
        b.block_name LIKE ? OR
        gp.gp_name LIKE ? OR
        de.schame_type LIKE ? OR
        wc.category_name LIKE ? OR
        sc.sub_category_name LIKE ? OR
        de.status LIKE ?
      )`;
      const searchParam = `%${search}%`;
      // Add 10 parameters for baseQuery
      params.push(
        searchParam, searchParam, searchParam, searchParam, searchParam,
        searchParam, searchParam, searchParam, searchParam, searchParam
      );
      // Add 10 parameters for countQuery
      countParams.push(
        searchParam, searchParam, searchParam, searchParam, searchParam,
        searchParam, searchParam, searchParam, searchParam, searchParam
      );
    }

    baseQuery += " ORDER BY de.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const rows = await runQuery(baseQuery, params);
    const countResult = await runQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching data entries:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch data entries",
      details: err.message 
    });
  }
};
// ==================================================
// ✅ FIXED: Get Single Entry by ID
// ==================================================
export const getDataEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await runQuery(
      `SELECT 
        de.*, 
        d.district_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name
       FROM data_entries de 
       LEFT JOIN districts d ON de.district = d.district_id 
       LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
       LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
       WHERE de.id = ?`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ success: false, error: "Data entry not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Error fetching data entry:", err);
    res.status(500).json({ success: false, error: "Failed to fetch data entry" });
  }
};

// ==================================================
// ✅ FIXED: Create New Entry (Using Your Exact Column Names)
// ==================================================
export const createDataEntry = async (req, res) => {
  try {
    // Validate file upload first
    if (req.file) {
      const fileValidation = validateFileUpload(req.file);
      if (!fileValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: fileValidation.error
        });
      }
    }

    // Extract districts field and remove it from validation
    const { districts, ...bodyWithoutDistricts } = req.body;
    
    const { error, value } = dataEntrySchema.validate(bodyWithoutDistricts, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map((e) => e.message),
      });
    }

    const asUpload = req.file ? req.file.filename : null;

    // ✅ FIXED: Using your exact column names
    const insertQuery = `
      INSERT INTO data_entries (
        district, block, panchayat, financial_year, work_code, work_name, 
        work_category, work_type, agency, command_area, prop_length, 
        prop_width, prop_height, sanction_amt_wages, sanction_amt_material,
        work_start_date, work_completion_date, remarks, as_upload, user_id, schame_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(insertQuery, [
      value.district,
      value.block,
      value.panchayat,
      value.financialYear,
      value.workCode,
      value.workName,
      value.workCategory,
      value.workType,
      value.agency || null,
      value.commandArea || null,
      value.propLength || null,
      value.propWidth || null,
      value.propHeight || null,
      value.sanctionAmtWages || null,
      value.sanctionAmtMaterial || null,
      value.workStartDate || null,
      value.workCompletionDate || null,
      value.remarks || null,
      asUpload,
      value.userId,
      value.schemaType
    ]);

    const newId = result[0].insertId;
    const newEntry = await runQuery(
      `SELECT 
        de.*, 
        d.district_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name
       FROM data_entries de 
       LEFT JOIN districts d ON de.district = d.district_id 
       LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
       LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
       WHERE de.id = ?`,
      [newId]
    );

    res.status(201).json({
      success: true,
      message: "Data entry created successfully",
      data: newEntry[0],
    });
  } catch (err) {
    console.error("Error creating data entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create data entry",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ==================================================
// ✅ FIXED: Update Entry (Using Your Exact Column Names)
// ==================================================
// ==================================================
// ✅ FIXED: Update Entry (Using Your Exact Column Names)
// ==================================================
export const updateDataEntry = async (req, res) => {
  try {
    if (req.file) {
      const fileValidation = validateFileUpload(req.file);
      if (!fileValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: fileValidation.error
        });
      }
    }

    const { id } = req.params;
    
    const { districts, ...bodyWithoutDistricts } = req.body;
    
    const { error, value } = dataEntrySchema.validate(bodyWithoutDistricts, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map((e) => e.message),
      });
    }

    const existing = await runQuery("SELECT id, as_upload FROM data_entries WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Data entry not found" });
    }

    const asUpload = req.file ? req.file.filename : existing[0].as_upload;

    // ✅ FIXED: Using your exact column names with status
  const updateQuery = `
  UPDATE data_entries SET
    district=?, block=?, panchayat=?, financial_year=?, work_code=?, work_name=?, 
    work_category=?, work_type=?, agency=?, command_area=?, prop_length=?, prop_width=?, 
    prop_height=?, sanction_amt_wages=?, sanction_amt_material=?, work_start_date=?, 
    work_completion_date=?, remarks=?, as_upload=?, user_id=?, schame_type=?, status=?,
    updated_at=CURRENT_TIMESTAMP
  WHERE id=?
`;

    await db.query(updateQuery, [
      value.district,
      value.block,
      value.panchayat,
      value.financialYear,
      value.workCode,
      value.workName,
      value.workCategory,
      value.workType,
      value.agency || null,
      value.commandArea || null,
      value.propLength || null,
      value.propWidth || null,
      value.propHeight || null,
      value.sanctionAmtWages || null,
      value.sanctionAmtMaterial || null,
      value.workStartDate || null,
      value.workCompletionDate || null,
      value.remarks || null,
      asUpload,
      value.userId,
      value.schemaType,
      value.status || 'pending',
      id  // WHERE clause parameter
    ]);

    const updatedEntry = await runQuery(
      `SELECT 
        de.*, 
        d.district_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name
       FROM data_entries de 
       LEFT JOIN districts d ON de.district = d.district_id 
       LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
       LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
       WHERE de.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Data entry updated successfully",
      data: updatedEntry[0],
    });
  } catch (err) {
    console.error("Error updating data entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update data entry",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ==================================================
// ✅ ADDED: Delete Entry (Missing Function)
// ==================================================
export const deleteDataEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if entry exists
    const existing = await runQuery("SELECT id FROM data_entries WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Data entry not found" 
      });
    }

    // Delete the entry
    await db.query("DELETE FROM data_entries WHERE id = ?", [id]);
    
    res.json({ 
      success: true, 
      message: "Data entry deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting data entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete data entry",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ==================================================
// ✅ FIXED: Get Filter Values
// ==================================================
// ==================================================
// ✅ FIXED: Get Filter Values
// ==================================================
export const getUniqueFilterValues = async (req, res) => {
  try {
    const districts = await runQuery("SELECT district_id, district_name FROM districts ORDER BY district_name");
    const blocks = await runQuery("SELECT block_id, block_name FROM blocks ORDER BY block_name");
    const panchayats = await runQuery("SELECT gp_id, gp_name FROM grampanchayat ORDER BY gp_name");
    const financialYears = await runQuery("SELECT DISTINCT financial_year FROM data_entries ORDER BY financial_year DESC");
    const workCategories = await runQuery("SELECT id, category_name FROM rdd_work_categories ORDER BY id");
    const schemaTypes = await runQuery("SELECT DISTINCT schame_type FROM data_entries ORDER BY schame_type");
    const statuses = await runQuery("SELECT DISTINCT status FROM data_entries ORDER BY status");
    const users = await runQuery("SELECT DISTINCT user_id FROM data_entries ORDER BY user_id");

    res.json({
      success: true,
      data: {
        districts: districts.map((d) => ({ id: d.district_id, name: d.district_name })),
        blocks: blocks.map((b) => ({ id: b.block_id, name: b.block_name })),
        panchayats: panchayats.map((p) => ({ id: p.gp_id, name: p.gp_name })),
        financialYears: financialYears.map((f) => f.financial_year),
        workCategories: workCategories.map((w) => ({ id: w.id, name: w.category_name })),
        schemaTypes: schemaTypes.map((s) => s.schame_type),
        statuses: statuses.map((s) => s.status),
        users: users.map((u) => u.user_id),
      },
    });
  } catch (err) {
    console.error("Error fetching filter values:", err);
    res.status(500).json({ success: false, error: "Failed to fetch filter values" });
  }
};

// ==================================================
// ✅ FIXED: Get Summary Stats
// ==================================================
// ==================================================
// ✅ FIXED: Get Summary Stats
// ==================================================
export const getStatsSummary = async (req, res) => {
  try {
    const totalWorks = await runQuery("SELECT COUNT(*) as total FROM data_entries");
    const totalAmount = await runQuery(
      "SELECT SUM(COALESCE(sanction_amt_wages,0) + COALESCE(sanction_amt_material,0)) as total_amount FROM data_entries"
    );
    const worksByDistrict = await runQuery(`
      SELECT d.district_name as district, COUNT(*) as count
      FROM data_entries de
      LEFT JOIN districts d ON de.district = d.district_id
      GROUP BY de.district, d.district_name
      ORDER BY count DESC
    `);
    const worksByCategory = await runQuery(`
      SELECT wc.category_name as work_category, COUNT(*) as count 
      FROM data_entries de
      LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
      GROUP BY de.work_category, wc.category_name
      ORDER BY count DESC
    `);
    const worksBySchema = await runQuery(`
      SELECT schame_type, COUNT(*) as count 
      FROM data_entries 
      GROUP BY schame_type 
      ORDER BY count DESC
    `);
    const worksByStatus = await runQuery(`
      SELECT status, COUNT(*) as count 
      FROM data_entries 
      GROUP BY status 
      ORDER BY count DESC
    `);
    const worksByUser = await runQuery(`
      SELECT user_id, COUNT(*) as count 
      FROM data_entries 
      GROUP BY user_id 
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        totalWorks: totalWorks[0].total,
        totalAmount: totalAmount[0].total_amount || 0,
        worksByDistrict,
        worksByCategory,
        worksBySchema,
        worksByStatus,
        worksByUser,
      },
    });
  } catch (err) {
    console.error("Error fetching stats summary:", err);
    res.status(500).json({ success: false, error: "Failed to fetch statistics" });
  }
};
// ===============================================
// ✅ Status-only Update Validation Schema
// ===============================================
const statusUpdateSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Ongoing', 'complete', 'Suspended').required().messages({
    "any.required": "Status is required",
    "any.only": "Status must be one of:Approved, Ongoing, complete, Suspended"
  })
});

// ==================================================
// ✅ UPDATE ONLY STATUS (Individual Status Update) - FIXED
// ==================================================


// ==================================================
// ✅ UPDATE ONLY STATUS (Individual Status Update) - FIXED
// ==================================================
export const updateDataEntryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'Approved', 'Ongoing', 'complete', 'Suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if entry exists
    const existing = await runQuery("SELECT id FROM data_entries WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Data entry not found" 
      });
    }

    // Update only the status field
    const updateQuery = `
      UPDATE data_entries SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.query(updateQuery, [status, id]);

    // Fetch updated entry
    const updatedEntry = await runQuery(
      `SELECT 
        de.*, 
        d.district_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name
       FROM data_entries de 
       LEFT JOIN districts d ON de.district = d.district_id 
       LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
       LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
       WHERE de.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Status updated successfully",
      data: updatedEntry[0],
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update status",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// ==================================================
// ✅ NEW: Generate Reports with Advanced Filtering
// ==================================================
export const generateReport = async (req, res) => {
  try {
    const {
      reportType = 'summary',
      district,
      block,
      panchayat,
      financialYear,
      workCategory,
      schemaType,
      startDate,
      endDate,
      format = 'json' // json, csv, pdf
    } = req.query;

    let reportQuery = `
      SELECT 
        de.*,
        d.district_name,
        b.block_name,
        gp.gp_name as panchayat_name,
        wc.category_name as work_category_name,
        sc.sub_category_name as work_type_name,
        (COALESCE(de.sanction_amt_wages, 0) + COALESCE(de.sanction_amt_material, 0)) as total_sanction_amount
      FROM data_entries de 
      LEFT JOIN districts d ON de.district = d.district_id 
      LEFT JOIN blocks b ON de.block = b.block_id
      LEFT JOIN grampanchayat gp ON de.panchayat = gp.gp_id
      LEFT JOIN rdd_work_categories wc ON de.work_category = wc.id
      LEFT JOIN rdd_sub_categories sc ON de.work_type = sc.id
      WHERE 1=1
    `;

    const params = [];

    // Apply filters
    if (district && district !== "all") {
      reportQuery += " AND de.district = ?";
      params.push(district);
    }
    if (block && block !== "all") {
      reportQuery += " AND de.block = ?";
      params.push(block);
    }
    if (panchayat && panchayat !== "all") {
      reportQuery += " AND de.panchayat = ?";
      params.push(panchayat);
    }
    if (financialYear && financialYear !== "all") {
      reportQuery += " AND de.financial_year = ?";
      params.push(financialYear);
    }
    if (workCategory && workCategory !== "all") {
      reportQuery += " AND de.work_category = ?";
      params.push(workCategory);
    }
    if (schemaType && schemaType !== "all") {
      reportQuery += " AND de.schame_type = ?";
      params.push(schemaType);
    }
    if (startDate) {
      reportQuery += " AND DATE(de.created_at) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      reportQuery += " AND DATE(de.created_at) <= ?";
      params.push(endDate);
    }

    // Order by
    reportQuery += " ORDER BY de.created_at DESC";

    const reportData = await runQuery(reportQuery, params);

    // Generate different report types
    let reportResult;
    switch (reportType) {
      case 'detailed':
        reportResult = generateDetailedReport(reportData);
        break;
      case 'financial':
        reportResult = generateFinancialReport(reportData);
        break;
      case 'progress':
        reportResult = generateProgressReport(reportData);
        break;
      default:
        reportResult = generateSummaryReport(reportData);
    }

    // Return in requested format
    if (format === 'csv') {
      // You can implement CSV conversion here
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      return res.send(convertToCSV(reportResult));
    } else if (format === 'pdf') {
      // You can implement PDF generation here
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      return res.send(generatePDF(reportResult));
    }

    res.json({
      success: true,
      reportType,
      filters: req.query,
      data: reportResult,
      totalRecords: reportData.length
    });

  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate report",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ==================================================
// ✅ Report Generation Helper Functions
// ==================================================
const generateSummaryReport = (data) => {
  const summary = {
    totalWorks: data.length,
    totalSanctionAmount: data.reduce((sum, item) => sum + parseFloat(item.total_sanction_amount || 0), 0),
    worksByDistrict: {},
    worksByCategory: {},
    worksBySchema: {},
    averageSanctionAmount: 0
  };

  data.forEach(item => {
    // Count by district
    const district = item.district_name || 'Unknown';
    summary.worksByDistrict[district] = (summary.worksByDistrict[district] || 0) + 1;

    // Count by category
    const category = item.work_category_name || 'Unknown';
    summary.worksByCategory[category] = (summary.worksByCategory[category] || 0) + 1;

    // Count by schema
    const schema = item.schame_type || 'Unknown';
    summary.worksBySchema[schema] = (summary.worksBySchema[schema] || 0) + 1;
  });

  summary.averageSanctionAmount = summary.totalWorks > 0 
    ? summary.totalSanctionAmount / summary.totalWorks 
    : 0;

  return summary;
};

const generateDetailedReport = (data) => {
  return data.map(item => ({
    id: item.id,
    workCode: item.work_code,
    workName: item.work_name,
    district: item.district_name,
    block: item.block_name,
    panchayat: item.panchayat_name,
    financialYear: item.financial_year,
    workCategory: item.work_category_name,
    workType: item.work_type_name,
    sanctionAmount: item.total_sanction_amount,
    startDate: item.work_start_date,
    completionDate: item.work_completion_date,
    status: item.work_completion_date ? 'Completed' : 'In Progress'
  }));
};

const generateFinancialReport = (data) => {
  const financialSummary = {
    totalSanctionAmount: 0,
    totalWages: 0,
    totalMaterial: 0,
    byDistrict: {},
    byCategory: {}
  };

  data.forEach(item => {
    const wages = parseFloat(item.sanction_amt_wages || 0);
    const material = parseFloat(item.sanction_amt_material || 0);
    const total = wages + material;

    financialSummary.totalSanctionAmount += total;
    financialSummary.totalWages += wages;
    financialSummary.totalMaterial += material;

    // By district
    const district = item.district_name || 'Unknown';
    if (!financialSummary.byDistrict[district]) {
      financialSummary.byDistrict[district] = { total: 0, wages: 0, material: 0, count: 0 };
    }
    financialSummary.byDistrict[district].total += total;
    financialSummary.byDistrict[district].wages += wages;
    financialSummary.byDistrict[district].material += material;
    financialSummary.byDistrict[district].count += 1;

    // By category
    const category = item.work_category_name || 'Unknown';
    if (!financialSummary.byCategory[category]) {
      financialSummary.byCategory[category] = { total: 0, wages: 0, material: 0, count: 0 };
    }
    financialSummary.byCategory[category].total += total;
    financialSummary.byCategory[category].wages += wages;
    financialSummary.byCategory[category].material += material;
    financialSummary.byCategory[category].count += 1;
  });

  return financialSummary;
};

const generateProgressReport = (data) => {
  const progress = {
    total: data.length,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionRate: 0
  };

  data.forEach(item => {
    if (item.work_completion_date) {
      progress.completed++;
    } else if (item.work_start_date) {
      progress.inProgress++;
    } else {
      progress.notStarted++;
    }
  });

  progress.completionRate = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return progress;
};

// Helper function for CSV conversion (basic implementation)
const convertToCSV = (data) => {
  if (!data || typeof data !== 'object') return '';
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(field => 
        `"${String(field || '').replace(/"/g, '""')}"`
      ).join(',')
    );
    return [headers, ...rows].join('\n');
  } else {
    // For object data, create key-value pairs
    return Object.entries(data)
      .map(([key, value]) => `"${key}","${value}"`)
      .join('\n');
  }
};

// Placeholder for PDF generation
const generatePDF = (data) => {
  // Implement PDF generation using libraries like pdfkit, jspdf, etc.
  return `PDF report would be generated for ${Array.isArray(data) ? data.length : 'unknown'} records`;
};

// ==================================================
// ✅ File Upload Validation Middleware (for use in routes)
// ==================================================
export const validateUploadMiddleware = (req, res, next) => {
  if (!req.file) {
    return next(); // No file is allowed
  }

  const validation = validateFileUpload(req.file);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  next();
};