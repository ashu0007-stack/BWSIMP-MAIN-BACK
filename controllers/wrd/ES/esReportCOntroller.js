import db from "../../../config/db.js";

// ✅ Get all active projects
export const getAllWork = async (req, res) => {
  try {
    // ✅ सही column names use करें
    const [rows] = await db.execute(
      `SELECT w.*,c.contractor_name FROM work w inner join contractors c on 
w.id=c.work_id
WHERE isAwarded_flag = '1' ORDER BY package_number`
    );
    
    // ✅ सही response format
    res.json({
      success: true,
      data: rows,
      message: "Projects fetched successfully"
    });
  } catch (err) {
    console.error("Get Projects Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch projects",
      details: err.message
    });
  }
};

// ✅ Get project by ID
export const getWorkById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      "SELECT * FROM work WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Project not found" 
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      message: "Project fetched successfully"
    });
  } catch (err) {
    console.error("Get Project Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch project" 
    });
  }
};

// ✅ Get project by package number
export const getWorkByPackage = async (req, res) => {
  try {
    const { packageNumber } = req.params;
    
    const [rows] = await db.execute(
      "SELECT * FROM work WHERE package_number = ?",
      [packageNumber]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "work not found" 
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      message: "Project fetched successfully"
    });
  } catch (err) {
    console.error("Get Project by Package Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch project" 
    });
  }
};

// ✅ Get all environmental indicators
export const getAllEnvironmentalIndicators = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM environmental_indicators 
       WHERE is_active = 1 
       ORDER BY category, indicator_name`
    );
    res.json({
      success: true,
      data: rows,
      message: "Environmental indicators fetched successfully"
    });
  } catch (err) {
    console.error("Environmental Indicators Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch environmental indicators" 
    });
  }
};

// ✅ Get indicator by ID
export const getEnvironmentalIndicatorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      "SELECT * FROM environmental_indicators WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Indicator not found" 
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      message: "Indicator fetched successfully"
    });
  } catch (err) {
    console.error("Get Indicator Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch indicator" 
    });
  }
};

// ✅ Create environmental indicator
export const createEnvironmentalIndicator = async (req, res) => {
  try {
    const {
      indicator_code,
      indicator_name,
      category,
      frequency,
      unit,
      standard_value,
      sampling_points,
      description
    } = req.body;

    // Check if indicator code already exists
    const [existing] = await db.execute(
      "SELECT id FROM environmental_indicators WHERE indicator_code = ?",
      [indicator_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Indicator code already exists"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO environmental_indicators 
       (indicator_code, indicator_name, category, frequency, unit, 
        standard_value, sampling_points, description, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        indicator_code,
        indicator_name,
        category,
        frequency,
        unit,
        standard_value,
        sampling_points,
        description
      ]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, indicator_code },
      message: "Environmental indicator created successfully"
    });
  } catch (err) {
    console.error("Create Indicator Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create environmental indicator" 
    });
  }
};

// ✅ Get environmental data for project
export const getEnvironmentalDataByProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, category, indicator_id } = req.query;
    
    let sql = `
      SELECT ed.*, ei.indicator_name, ei.category, ei.unit as standard_unit,
             p.package_number, p.work_name
      FROM environmental_data ed
      JOIN environmental_indicators ei ON ed.indicator_id = ei.id
      JOIN work p ON ed.work_id = p.id
      WHERE ed.work_id = ?
    `;
    
    const params = [id];
    if (startDate && endDate) {
      sql += ' AND ed.reporting_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    if (category) {
      sql += ' AND ei.category = ?';
      params.push(category);
    }
    
    if (indicator_id) {
      sql += ' AND ed.indicator_id = ?';
      params.push(indicator_id);
    }
    
    sql += ' ORDER BY ed.reporting_date DESC, ei.indicator_name';
    
    const [rows] = await db.execute(sql, params);
    
    res.json({
      success: true,
      data: rows,
      message: "Environmental data fetched successfully"
    });
  } catch (err) {
    console.error("Get Environmental Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch environmental data" 
    });
  }
};

// ✅ Submit environmental data
export const submitEnvironmentalData = async (req, res) => {
  try {
    const {
      project_id,
      indicator_id,
      reporting_date,
      sample_location,
      measured_value,
      unit,
      status = 'within_limit',
      remarks,
      photo_url,
      monitored_by
    } = req.body;

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM work WHERE id = ?",
      [project_id]
    );

    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    // Validate indicator exists
    const [indicator] = await db.execute(
      "SELECT id FROM environmental_indicators WHERE id = ?",
      [indicator_id]
    );

    if (indicator.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Indicator not found"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO environmental_data 
       (project_id, indicator_id, reporting_date, sample_location,
        measured_value, unit, status, remarks, photo_url, monitored_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        indicator_id,
        reporting_date,
        sample_location,
        measured_value,
        unit,
        status,
        remarks,
        photo_url,
        monitored_by || req.user?.name || 'System'
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId,
        project_id,
        indicator_id,
        reporting_date 
      },
      message: "Environmental data submitted successfully"
    });
  } catch (err) {
    console.error("Submit Environmental Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit environmental data" 
    });
  }
};

// ✅ Update environmental data
export const updateEnvironmentalData = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.project_id;
    delete updates.indicator_id;
    delete updates.created_at;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update"
      });
    }
    
    // Build SET clause dynamically
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE environmental_data SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Environmental data not found" 
      });
    }

    res.json({
      success: true,
      message: "Environmental data updated successfully"
    });
  } catch (err) {
    console.error("Update Environmental Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update environmental data" 
    });
  }
};

// ✅ Delete environmental data
export const deleteEnvironmentalData = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.execute(
      "DELETE FROM environmental_data WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Environmental data not found" 
      });
    }

    res.json({
      success: true,
      message: "Environmental data deleted successfully"
    });
  } catch (err) {
    console.error("Delete Environmental Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete environmental data" 
    });
  }
};


// ✅ Get all social indicators
export const getAllSocialIndicators = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM social_indicators 
       WHERE is_active = 1 
       ORDER BY category, indicator_name`
    );
    res.json({
      success: true,
      data: rows,
      message: "Social indicators fetched successfully"
    });
  } catch (err) {
    console.error("Social Indicators Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch social indicators" 
    });
  }
};

// ✅ Create social indicator
export const createSocialIndicator = async (req, res) => {
  try {
    const {
      indicator_code,
      indicator_name,
      category,
      frequency,
      unit,
      description
    } = req.body;

    // Check if indicator code already exists
    const [existing] = await db.execute(
      "SELECT id FROM social_indicators WHERE indicator_code = ?",
      [indicator_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Indicator code already exists"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO social_indicators 
       (indicator_code, indicator_name, category, frequency, unit, description, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        indicator_code,
        indicator_name,
        category,
        frequency,
        unit,
        description
      ]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, indicator_code },
      message: "Social indicator created successfully"
    });
  } catch (err) {
    console.error("Create Social Indicator Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create social indicator" 
    });
  }
};

// ✅ Get social data for project
export const getSocialDataByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, category, indicator_id } = req.query;
    
    let sql = `
      SELECT sd.*, si.indicator_name, si.category, si.unit as standard_unit,
             p.package_number, p.work_name
      FROM social_data sd
      JOIN social_indicators si ON sd.indicator_id = si.id
      JOIN work p ON sd.work_id = p.id
      WHERE sd.work_id = ?
    `;
    
    const params = [projectId];
    
    if (startDate && endDate) {
      sql += ' AND sd.reporting_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    if (category) {
      sql += ' AND si.category = ?';
      params.push(category);
    }
    
    if (indicator_id) {
      sql += ' AND sd.indicator_id = ?';
      params.push(indicator_id);
    }
    
    sql += ' ORDER BY sd.reporting_date DESC, si.indicator_name';
    
    const [rows] = await db.execute(sql, params);
    
    res.json({
      success: true,
      data: rows,
      message: "Social data fetched successfully"
    });
  } catch (err) {
    console.error("Get Social Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch social data" 
    });
  }
};

// ✅ Submit social data
export const submitSocialData = async (req, res) => {
  try {
    const {
      project_id,
      indicator_id,
      reporting_date,
      male_count = 0,
      female_count = 0,
      value_text,
      value_numeric,
      status = 'complied',
      remarks,
      photo_url,
      verified_by
    } = req.body;

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM work WHERE id = ?",
      [project_id]
    );

    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    // Validate indicator exists
    const [indicator] = await db.execute(
      "SELECT id FROM social_indicators WHERE id = ?",
      [indicator_id]
    );

    if (indicator.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Indicator not found"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO social_data 
       (work_id, indicator_id, reporting_date, male_count, female_count,
        value_text, value_numeric, status, remarks, photo_url, verified_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        indicator_id,
        reporting_date,
        male_count,
        female_count,
        value_text,
        value_numeric,
        status,
        remarks,
        photo_url,
        verified_by || req.user?.name || 'System'
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId,
        project_id,
        indicator_id,
        reporting_date 
      },
      message: "Social data submitted successfully"
    });
  } catch (err) {
    console.error("Submit Social Data Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit social data" 
    });
  }
};

// ✅ Get all grievances for project
export const getGrievancesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, category, startDate, endDate, search } = req.query;
    
    let sql = `
      SELECT g.*, p.package_number, p.work_name
      FROM grievances g
      JOIN work p ON g.work_id = p.id
      WHERE g.work_id = ?
    `;
    
    const params = [projectId];
    
    if (status) {
      sql += ' AND g.status = ?';
      params.push(status);
    }
    
    if (category) {
      sql += ' AND g.category = ?';
      params.push(category);
    }
    
    if (startDate && endDate) {
      sql += ' AND g.received_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    if (search) {
      sql += ' AND (g.complainant_name LIKE ? OR g.grievance_id LIKE ? OR g.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY g.received_date DESC';
    
    const [rows] = await db.execute(sql, params);
    
    res.json({
      success: true,
      data: rows,
      message: "Grievances fetched successfully"
    });
  } catch (err) {
    console.error("Get Grievances Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch grievances" 
    });
  }
};

// ✅ Register new grievance
export const registerGrievance = async (req, res) => {
  
  try {
    const {
      project_id,  // Changed from 'id' to 'project_id'
      received_date,
      complainant_name,
      contact_number,
      category = 'other',
      description,
      priority = 'medium',
      status = 'pending'  // Added status field
    } = req.body;

    // ✅ VALIDATION: Check required fields
    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: "Project ID is required"
      });
    }
    
    if (!complainant_name) {
      return res.status(400).json({
        success: false,
        error: "Complainant name is required"
      });
    }
    
    if (!description) {
      return res.status(400).json({
        success: false,
        error: "Description is required"
      });
    }

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM work WHERE id = ?",
      [project_id]  // Changed from id to project_id
    );

    if (project.length === 0) {
      console.error('❌ Project not found:', project_id);
      return res.status(404).json({
        success: false,
        error: `Project with ID ${project_id} not found`
      });
    }

    // Generate grievance ID
    const year = new Date().getFullYear();
    const [count] = await db.execute(
      "SELECT COUNT(*) as count FROM grievances WHERE YEAR(received_date) = ?",
      [year]
    );
    
    const grievance_id = `GRV-${year}-${String(parseInt(count[0].count) + 1).padStart(3, '0')}`;

    const [result] = await db.execute(
      `INSERT INTO grievances 
       (grievance_id, work_id, received_date, complainant_name, 
        contact_number, category, description, priority, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        grievance_id,
        project_id,  // Changed from id to project_id
        received_date || new Date().toISOString().split('T')[0],
        complainant_name,
        contact_number || null,
        category,
        description,
        priority,
        status,
        req.user?.name || 'System'
      ]
    );
    
    // Get the created grievance
    const [grievance] = await db.execute(
      "SELECT * FROM grievances WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: grievance[0],
      message: "Grievance registered successfully"
    });
    
  } catch (err) {
    console.error("❌ Register Grievance Error:", err);
    console.error("Error stack:", err.stack);
    
    // More specific error messages
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        success: false, 
        error: "Database table 'grievances' does not exist" 
      });
    }
    
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ 
        success: false, 
        error: `Database field error: ${err.message}` 
      });
    }
    
    if (err.code === 'ER_PARSE_ERROR') {
      return res.status(500).json({ 
        success: false, 
        error: "SQL syntax error" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Failed to register grievance",
      details: err.message 
    });
  }
};

// ✅ Update grievance status
export const updateGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      resolution_details, 
      assigned_to,
      complainant_feedback,
      feedback_rating 
    } = req.body;

    // Check if grievance exists
    const [grievance] = await db.execute(
      "SELECT id FROM grievances WHERE id = ?",
      [id]
    );

    if (grievance.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Grievance not found"
      });
    }

    const updates = {};
    const params = [];
    
    if (status) {
      updates.status = status;
      params.push(status);
    }
    
    if (resolution_details) {
      updates.resolution_details = resolution_details;
      params.push(resolution_details);
    }
    
    if (assigned_to) {
      updates.assigned_to = assigned_to;
      params.push(assigned_to);
    }
    
    if (complainant_feedback) {
      updates.complainant_feedback = complainant_feedback;
      params.push(complainant_feedback);
    }
    
    if (feedback_rating) {
      updates.feedback_rating = feedback_rating;
      params.push(feedback_rating);
    }
    
    // If status is resolved, set resolution date
    if (status === 'resolved') {
      updates.resolution_date = new Date().toISOString().split('T')[0];
      params.push(updates.resolution_date);
    }
    
    if (params.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update"
      });
    }
    
    // Build SET clause
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    params.push(id);

    await db.execute(
      `UPDATE grievances SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: "Grievance updated successfully"
    });
  } catch (err) {
    console.error("Update Grievance Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update grievance" 
    });
  }
};

// ✅ Get labour camp facilities for project
export const getLabourCampByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const [rows] = await db.execute(
      `SELECT * FROM labour_camp_facilities 
       WHERE work_id = ? 
       ORDER BY facility_type, facility_name`,
      [projectId]
    );
    
    res.json({
      success: true,
      data: rows,
      message: "Labour camp facilities fetched successfully"
    });
  } catch (err) {
    console.error("Get Labour Camp Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch labour camp facilities" 
    });
  }
};

// ✅ Add labour camp facility
export const addLabourCampFacility = async (req, res) => {
  try {
    const {
      work_id,
      facility_type,
      facility_name,
      specification,
      quantity = 1,
      condition = 'good',
      remarks
    } = req.body;

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM projects WHERE id = ?",
      [work_id]
    );

    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO labour_camp_facilities 
       (project_id, facility_type, facility_name, specification, 
        quantity, condition, remarks, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        work_id,
        facility_type,
        facility_name,
        specification,
        quantity,
        condition,
        remarks,
        req.user?.name || 'System'
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId,
        project_id,
        facility_name
      },
      message: "Labour camp facility added successfully"
    });
  } catch (err) {
    console.error("Add Labour Camp Facility Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add labour camp facility" 
    });
  }
};

// ✅ Update labour camp facility
export const updateLabourCampFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      condition,
      last_inspection_date,
      next_inspection_date,
      remarks,
      photo_url
    } = req.body;

    const updates = {};
    const params = [];
    
    if (condition) {
      updates.condition = condition;
      params.push(condition);
    }
    
    if (last_inspection_date) {
      updates.last_inspection_date = last_inspection_date;
      params.push(last_inspection_date);
    }
    
    if (next_inspection_date) {
      updates.next_inspection_date = next_inspection_date;
      params.push(next_inspection_date);
    }
    
    if (remarks !== undefined) {
      updates.remarks = remarks;
      params.push(remarks);
    }
    
    if (photo_url) {
      updates.photo_url = photo_url;
      params.push(photo_url);
    }
    
    if (params.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update"
      });
    }
    
    // Build SET clause
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    params.push(id);

    const [result] = await db.execute(
      `UPDATE labour_camp_facilities SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Facility not found"
      });
    }

    res.json({
      success: true,
      message: "Labour camp facility updated successfully"
    });
  } catch (err) {
    console.error("Update Labour Camp Facility Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update labour camp facility" 
    });
  }
};

// ✅ Get attendance for project
export const getAttendanceByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month, year, startDate, endDate } = req.query;
    
    let sql = `
      SELECT * FROM daily_attendance 
      WHERE work_id = ?
    `;
    
    const params = [projectId];
    
    if (month && year) {
      sql += ' AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?';
      params.push(month, year);
    }
    
    if (startDate && endDate) {
      sql += ' AND attendance_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    sql += ' ORDER BY attendance_date DESC';
    
    const [rows] = await db.execute(sql, params);
    
    res.json({
      success: true,
      data: rows,
      message: "Attendance data fetched successfully"
    });
  } catch (err) {
    console.error("Get Attendance Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch attendance data" 
    });
  }
};

// ✅ Submit attendance
export const submitAttendance = async (req, res) => {
  try {
    const {
      project_id,
      attendance_date,
      male_present = 0,
      female_present = 0,
      male_absent = 0,
      female_absent = 0,
      remarks
    } = req.body;

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM projects WHERE id = ?",
      [project_id]
    );

    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    // Check if attendance already exists for this date
    const [existing] = await db.execute(
      "SELECT id FROM daily_attendance WHERE work_id = ? AND attendance_date = ?",
      [project_id, attendance_date]
    );

    let result;
    
    if (existing.length > 0) {
      // Update existing attendance
      [result] = await db.execute(
        `UPDATE daily_attendance 
         SET male_present = ?, female_present = ?, 
             male_absent = ?, female_absent = ?, 
             remarks = ?, recorded_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          male_present,
          female_present,
          male_absent,
          female_absent,
          remarks,
          req.user?.name || 'System',
          existing[0].id
        ]
      );
    } else {
      // Insert new attendance
      [result] = await db.execute(
        `INSERT INTO daily_attendance 
         (work_id, attendance_date, male_present, female_present,
          male_absent, female_absent, remarks, recorded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_id,
          attendance_date,
          male_present,
          female_present,
          male_absent,
          female_absent,
          remarks,
          req.user?.name || 'System'
        ]
      );
    }

    const recordId = existing.length > 0 ? existing[0].id : result.insertId;
    
    res.json({
      success: true,
      data: { 
        id: recordId,
        project_id,
        attendance_date
      },
      message: "Attendance saved successfully"
    });
  } catch (err) {
    console.error("Submit Attendance Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save attendance" 
    });
  }
};

// ✅ Get all ES reports for project
export const getESReportsByProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { report_type, year, status } = req.query;
    
    let sql = `
      SELECT er.*, p.package_number, p.work_name, c.contractor_name
      FROM es_reports er
      JOIN work p ON er.work_id = p.id
      join contractors c on p.id=c.work_id
      WHERE er.work_id = ?
    `;
    
    const params = [id];
    
    if (report_type) {
      sql += ' AND er.report_type = ?';
      params.push(report_type);
    }
    
    if (year) {
      sql += ' AND YEAR(er.reporting_period_start) = ?';
      params.push(year);
    }
    
    if (status) {
      sql += ' AND er.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY er.reporting_period_start DESC';
    
    const [rows] = await db.execute(sql, params);
    
    res.json({
      success: true,
      data: rows,
      message: "ES reports fetched successfully"
    });
  } catch (err) {
    console.error("Get ES Reports Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch ES reports" 
    });
  }
};

// ✅ Submit ES report
export const submitESReport = async (req, res) => {
  try {
    const {
      id,
      report_type,
      reporting_period_start,
      reporting_period_end,
      environmental_summary,
      social_summary,
      key_issues,
      recommendations,
      attachments
    } = req.body;

    // Validate project exists
    const [project] = await db.execute(
      "SELECT id FROM work WHERE id = ?",
      [id]
    );

    if (project.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      });
    }

    // Generate report number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = report_type.toUpperCase().charAt(0);
    
    const [count] = await db.execute(
      "SELECT COUNT(*) as count FROM es_reports WHERE report_type = ? AND YEAR(created_at) = ?",
      [report_type, year]
    );
    
    const report_number = `${prefix}R-${year}-${month}-${String(parseInt(count[0].count) + 1).padStart(3, '0')}`;

    const [result] = await db.execute(
      `INSERT INTO es_reports 
       (report_number, work_id, report_type, reporting_period_start,
        reporting_period_end, submission_date, submitted_by,
        environmental_summary, social_summary, key_issues, recommendations, 
        attachments, created_by) 
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        report_number,
        id,
        report_type,
        reporting_period_start,
        reporting_period_end,
        req.user?.name || 'System',
        environmental_summary,
        social_summary,
        key_issues,
        recommendations,
        attachments ? JSON.stringify(attachments) : null,
        req.user?.id || 0
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId,
        report_number,
        id
      },
      message: "ES report submitted successfully"
    });
  } catch (err) {
    console.error("Submit ES Report Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to submit ES report" 
    });
  }
};

// ✅ Get dashboard statistics for project
export const getDashboardStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Environmental compliance rate (last 30 days)
    const [envCompliance] = await db.execute(
      `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'within_limit' THEN 1 ELSE 0 END) as compliant
       FROM environmental_data 
       WHERE work_id = ? AND reporting_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [projectId]
    );
    
    // Social compliance rate (last 30 days)
    const [socialCompliance] = await db.execute(
      `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'complied' THEN 1 ELSE 0 END) as compliant
       FROM social_data 
       WHERE work_id = ? AND reporting_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [projectId]
    );
    
    // Grievance statistics
    const [grievanceStats] = await db.execute(
      `SELECT 
          status,
          COUNT(*) as count
       FROM grievances 
       WHERE work_id = ?
       GROUP BY status`,
      [projectId]
    );
    
    // Labour statistics (last 7 days)
    const [labourStats] = await db.execute(
      `SELECT 
          SUM(male_present + female_present) as total_present,
          AVG(male_present + female_present) as avg_daily,
          COUNT(*) as days_recorded
       FROM daily_attendance 
       WHERE work_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [projectId]
    );
    
    // Recent environmental alerts (exceeded limits)
    const [envAlerts] = await db.execute(
      `SELECT ed.*, ei.indicator_name
       FROM environmental_data ed
       JOIN environmental_indicators ei ON ed.indicator_id = ei.id
       WHERE ed.work_id = ? AND ed.status = 'exceeded'
       ORDER BY ed.reporting_date DESC
       LIMIT 5`,
      [projectId]
    );
    
    // Recent social non-compliance
    const [socialAlerts] = await db.execute(
      `SELECT sd.*, si.indicator_name
       FROM social_data sd
       JOIN social_indicators si ON sd.indicator_id = si.id
       WHERE sd.work_id = ? AND sd.status = 'not_complied'
       ORDER BY sd.reporting_date DESC
       LIMIT 5`,
      [projectId]
    );
    
    // Format response
    const stats = {
      environmental: {
        total: envCompliance[0]?.total || 0,
        compliant: envCompliance[0]?.compliant || 0,
        rate: envCompliance[0]?.total > 0 
          ? Math.round((envCompliance[0].compliant / envCompliance[0].total) * 100) 
          : 0,
        alerts: envAlerts
      },
      social: {
        total: socialCompliance[0]?.total || 0,
        compliant: socialCompliance[0]?.compliant || 0,
        rate: socialCompliance[0]?.total > 0 
          ? Math.round((socialCompliance[0].compliant / socialCompliance[0].total) * 100) 
          : 0,
        alerts: socialAlerts
      },
      grievances: grievanceStats.reduce((acc, curr) => {
        acc[curr.status] = curr.count;
        return acc;
      }, {}),
      labour: {
        total_present: labourStats[0]?.total_present || 0,
        avg_daily: Math.round(labourStats[0]?.avg_daily || 0),
        days_recorded: labourStats[0]?.days_recorded || 0
      }
    };
    
    res.json({
      success: true,
      data: stats,
      message: "Dashboard statistics fetched successfully"
    });
  } catch (err) {
    console.error("Get Dashboard Stats Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch dashboard statistics" 
    });
  }
};