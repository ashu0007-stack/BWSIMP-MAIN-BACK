import db from "../../config/db.js";

// =============================
// GET ALL WORKS
// =============================
export const getAllWorks = async (req, res) => {
  try {
    const [rows] = await db.query(`
    SELECT 
    w.id,
    w.work_name,
    w.package_number,
    w.work_cost,
    w.target_km,
    w.dept_id,
    w.created_by,
    w.created_email,
    w.created_at,
    w.zone_id,
    w.circle_id,
    w.division_id,
    w.Area_Under_improved_Irrigation,
    w.work_period_months,
    -- Award status display using CASE
    CASE 
        WHEN w.isAwarded_flag = 1 THEN 'Awarded'
        WHEN w.isAwarded_flag = 0 THEN 'Not Awarded'
        ELSE 'Unknown'
    END as award_status,
    w.isAwarded_flag,
    c.contractor_name,
    c.agreement_no,
    c.contract_awarded_amount,
    c.nameofauthrizeperson,
    c.work_commencement_date,
    c.work_stipulated_date,
    c.email AS contractor_email,
    d.division_name as division_name,
    c.agency_address
FROM work w
INNER JOIN divisions d ON w.division_id = d.id
LEFT JOIN contractors c ON w.id = c.work_id
ORDER BY w.package_number;
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching works:", err);
    res.status(500).json({ error: "Failed to fetch works", details: err.message });
  }
};

// =============================
// CREATE WORK (Updated with work_period_months)
// =============================
export const createWork = async (req, res) => {
  try {
    const {
      zone_id,
      circle_id,
      division_id,
      component_id,
      subcomponent_id,
      workcomponentId,
      work_name,
      work_package_name,
      target_km,
      work_period_months,
      work_cost,
      package_number,
      Area_Under_improved_Irrigation,
      user_data,
    } = req.body;
    console.log("📦 Received data:", {
      work_name,
      work_package_name,
      workcomponentId,
      package_number,
      target_km
    });
    let dept_id, user_email, username;

    if (user_data) {
      dept_id = user_data.dept_id;
      user_email = user_data.email;
      username = user_data.username;
      console.log("✅ Using user data from request body");
    } else {
      dept_id = req.session.userDetails?.dept_id || req.session.dept_id;
      user_email = req.session.userDetails?.email || req.session.user_email;
      username = req.session.userDetails?.username || req.session.username;
      console.log("⚠️ Using session data as fallback");
    }

    if (!dept_id || !user_email) {
      return res
        .status(400)
        .json({ error: "User department or email missing. Please login again." });
    }

    const [result] = await db.query(
      `INSERT INTO work 
        (zone_id, circle_id, division_id, component_id, subcomponent_id, dept_id, work_name, 
         target_km, work_period_months, work_cost, package_number,
          Area_Under_improved_Irrigation, created_by, created_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        zone_id,
        circle_id,
        division_id,
        component_id,
        subcomponent_id,
        dept_id,
        work_package_name,
        target_km,
        work_period_months || 0,
        work_cost,
        package_number,
        Area_Under_improved_Irrigation,
        username || "Unknown User",
        user_email,
      ]
    );

    res.json({
      message: "✅ Work created successfully",
      workId: result.insertId,
      createdBy: username,
      createdEmail: user_email,
    });
  } catch (error) {
    if (error.errno === 1062) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_WORK_NAME',
        message: 'A work with this name already exists.',
        details: 'Please choose a different work name or modify the existing one.',
        field: 'work_name'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'An error occurred while saving the work.'
    });
  }
};

// =============================
// ADD BENEFICIARIES (Updated with beneficiaries_male)
// =============================
export const addBeneficiaries = async (req, res) => {
  try {
    const { workId } = req.params;
    const {
      total_population,
      beneficiaries_male, // NEW FIELD
      beneficiaries_youth_15_28,
      beneficiaries_female,
      beneficiaries_above_28, // KEPT FOR COMPATIBILITY
      beneficiaries_other_gender, // KEPT FOR COMPATIBILITY
      user_data,
    } = req.body;

    let user_email, username;
    if (user_data) {
      user_email = user_data.email;
      username = user_data.username;
    } else {
      user_email = req.session.user?.email || req.session.user_email;
      username = req.session.user?.username || req.session.username;
    }

    const [workCheck] = await db.query("SELECT id FROM work WHERE id = ?", [workId]);
    if (workCheck.length === 0) return res.status(404).json({ error: "Work not found" });

    const [result] = await db.query(
      `INSERT INTO work_beneficiaries 
        (work_id, total_population, beneficiaries_male, beneficiaries_female, 
         beneficiaries_youth_15_28, beneficiaries_above_28, beneficiaries_other_gender,
         created_by, created_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workId,
        total_population,
        beneficiaries_male || 0,
        beneficiaries_female || 0,
        beneficiaries_youth_15_28 || 0,
        beneficiaries_above_28 || 0,
        beneficiaries_other_gender || 0,
        username || "Unknown User",
        user_email || "unknown@example.com",
      ]
    );

    res.json({ message: "✅ Beneficiaries added successfully", beneficiaryId: result.insertId });
  } catch (err) {
    console.error("❌ Error adding beneficiaries:", err);
    res.status(500).json({ error: "Failed to add beneficiaries", details: err.message });
  }
};

// =============================
// ADD VILLAGES (Updated with new fields)
// =============================
export const addVillages = async (req, res) => {
  try {
    const { workId } = req.params;
    const { villages, user_data } = req.body;

    let user_email, username;
    if (user_data) {
      user_email = user_data.email;
      username = user_data.username;
    } else {
      user_email = req.session.user?.email || req.session.user_email;
      username = req.session.user?.username || req.session.username;
    }

    const [workCheck] = await db.query("SELECT id FROM work WHERE id = ?", [workId]);
    if (workCheck.length === 0) return res.status(404).json({ error: "Work not found" });

    for (const village of villages) {
      await db.query(
        `INSERT INTO work_villages 
          (work_id, district_name, block_name, gram_panchayat, village_name, 
           census_population, male_population, female_population, created_by, created_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workId,
          village.district_name || "",
          village.block_name || "",
          village.gram_panchayat || "",
          village.village_name || "",
          village.census_population || 0,
          village.male_population || 0,
          village.female_population || 0,
          username || "Unknown User",
          user_email || "unknown@example.com",
        ]
      );
    }

    res.json({ message: "✅ Villages added successfully" });
  } catch (err) {
    console.error("❌ Error adding villages:", err);
    res.status(500).json({ error: "Failed to add villages", details: err.message });
  }
};

// =============================
// ADD COMPONENTS + MILESTONES
// =============================
export const addComponentsAndMilestones = async (req, res) => {
  try {
    const { workId } = req.params;
    const { components, user_data } = req.body;

    let user_email, username;
    if (user_data) {
      user_email = user_data.email;
      username = user_data.username;
    } else {
      user_email = req.session.user?.email || req.session.user_email;
      username = req.session.user?.username || req.session.username;
    }

    const [workCheck] = await db.query("SELECT id, package_number FROM work WHERE id = ?", [workId]);
    if (workCheck.length === 0) return res.status(404).json({ error: "Work not found" });

    const packageNumber = workCheck[0].package_number;

    for (const comp of components) {
      const [componentResult] = await db.query(
        `INSERT INTO components 
          (work_id, nameofcomponent, unitname, total_qty, num_of_milestones, created_by, created_email)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workId,
          comp.componentname,
          comp.unit,
          comp.totalQty,
          comp.Numberofmilestone || 0,
          username || "Unknown User",
          user_email || "unknown@example.com",
        ]
      );

      const componentId = componentResult.insertId;
      const numMilestones = parseInt(comp.Numberofmilestone) || 0;

      // Create milestones with quantities
      if (numMilestones >= 1 && comp.milestone1_qty) {
        await db.query(
          `INSERT INTO milestones 
            (work_id, component_id, package_number, milestone_number, milestone_name, milestone_qty, created_by, created_email)
           VALUES (?, ?, ?, 1, 'Milestone 1', ?, ?, ?)`,
          [workId, componentId, packageNumber, comp.milestone1_qty, username, user_email]
        );
      }

      if (numMilestones >= 2 && comp.milestone2_qty) {
        await db.query(
          `INSERT INTO milestones 
            (work_id, component_id, package_number, milestone_number, milestone_name, milestone_qty, created_by, created_email)
           VALUES (?, ?, ?, 2, 'Milestone 2', ?, ?, ?)`,
          [workId, componentId, packageNumber, comp.milestone2_qty, username, user_email]
        );
      }

      if (numMilestones >= 3 && comp.milestone3_qty) {
        await db.query(
          `INSERT INTO milestones 
            (work_id, component_id, package_number, milestone_number, milestone_name, milestone_qty, created_by, created_email)
           VALUES (?, ?, ?, 3, 'Milestone 3', ?, ?, ?)`,
          [workId, componentId, packageNumber, comp.milestone3_qty, username, user_email]
        );
      }
    }

    res.json({ message: "✅ Components + Milestones added successfully" });
  } catch (err) {
    console.error("❌ Error adding components:", err);
    res.status(500).json({ error: "Failed to add components and milestones", details: err.message });
  }
};

export const getWorksByDivision = async (req, res) => {
  try {
    const { divisionId } = req.params;
    if (!divisionId) return res.status(400).json({ error: "Division ID required" });

    const [rows] = await db.query(
      `SELECT w.id, w.work_name, w.work_cost, w.package_number,
              d.division_name, c.circle_name, z.zone_name
       FROM work w
       LEFT JOIN divisions d ON w.division_id = d.id
       LEFT JOIN circles c ON d.circle_id = c.id
       LEFT JOIN zones z ON c.zone_id = z.id
       WHERE w.division_id = ? and w.isAwarded_flag='0' and w.isTenderCreated_flag='0'
       ORDER BY w.id DESC`,
      [divisionId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching works by division:", err);
    res.status(500).json({ error: "Failed to fetch works", details: err.message });
  }
};
// GET WORK BY ID
// =============================
export const getWorkById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch work details
    const [workRows] = await db.query(`
      SELECT 
        w.*,
        d.division_name,
        c.circle_name,
        z.zone_name,
         CASE 
        WHEN w.isAwarded_flag = 1 THEN 'Awarded'
        WHEN w.isAwarded_flag = 0 THEN 'Not Awarded'
        ELSE 'Unknown'
    END as award_status
      FROM work w
      LEFT JOIN divisions d ON w.division_id = d.id
      LEFT JOIN circles c ON w.circle_id = c.id
      LEFT JOIN zones z ON w.zone_id = z.id
      WHERE w.id = ?
    `, [id]);

    if (workRows.length === 0) {
      return res.status(404).json({ error: "Work not found" });
    }

    const work = workRows[0];

    // Fetch beneficiaries
    const [beneficiariesRows] = await db.query(
      "SELECT * FROM work_beneficiaries WHERE work_id = ?",
      [id]
    );

    // Fetch villages
    const [villagesRows] = await db.query(
      "SELECT * FROM work_villages WHERE work_id = ?",
      [id]
    );

    // Fetch components
    const [componentsRows] = await db.query(
      "SELECT * FROM components WHERE work_id = ?",
      [id]
    );

    res.json({
      ...work,
      beneficiaries: beneficiariesRows[0] || null,
      villages: villagesRows,
      components: componentsRows
    });
  } catch (err) {
    console.error("❌ Error fetching work details:", err);
    res.status(500).json({ error: "Failed to fetch work details", details: err.message });
  }
};
// UPDATE WORK
// =============================
export const updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      work_name,
      package_number,
      work_cost,
      target_km,
      work_period_months,
      zone_id,
      circle_id,
      division_id,
      component_id,
      subcomponent_id,
      Area_Under_improved_Irrigation
    } = req.body;

    // Check if work exists
    const [workCheck] = await db.query("SELECT id FROM work WHERE id = ?", [id]);
    if (workCheck.length === 0) {
      return res.status(404).json({ error: "Work not found" });
    }

    // Update work
    await db.query(
      `UPDATE work SET 
        work_name = ?,
        package_number = ?,
        work_cost = ?,
        target_km = ?,
        work_period_months = ?,
        zone_id = ?,
        circle_id = ?,
        division_id = ?,
        component_id = ?,
        subcomponent_id = ?,
        Area_Under_improved_Irrigation = ?
       WHERE id = ?`,
      [
        work_name,
        package_number,
        work_cost,
        target_km,
        work_period_months,
        zone_id,
        circle_id,
        division_id,
        component_id,
        subcomponent_id,
        Area_Under_improved_Irrigation,
        id
      ]
    );

    res.json({ message: "✅ Work updated successfully", workId: id });
  } catch (err) {
    console.error("❌ Error updating work:", err);
    res.status(500).json({ error: "Failed to update work", details: err.message });
  }
};

// =============================
// DELETE WORK
// =============================
export const deleteWork = async (req, res) => {
  try {
    const { id } = req.params;

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Delete related data first (due to foreign keys)
      await db.query("DELETE FROM work_beneficiaries WHERE work_id = ?", [id]);
      await db.query("DELETE FROM work_villages WHERE work_id = ?", [id]);
      await db.query("DELETE FROM components WHERE work_id = ?", [id]);
      await db.query("DELETE FROM milestones WHERE work_id = ?", [id]);

      // Delete the work
      await db.query("DELETE FROM work WHERE id = ?", [id]);

      await db.query("COMMIT");
      res.json({ message: "✅ Work deleted successfully" });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error deleting work:", err);
    res.status(500).json({ error: "Failed to delete work", details: err.message });
  }
};

// =============================
// UPDATE BENEFICIARIES
// =============================
export const updateBeneficiaries = async (req, res) => {
  try {
    const { workId } = req.params;
    const {
      total_population,
      beneficiaries_male,
      beneficiaries_female,
      beneficiaries_youth_15_28
    } = req.body;

    // Check if beneficiaries exist
    const [existing] = await db.query(
      "SELECT id FROM work_beneficiaries WHERE work_id = ?",
      [workId]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query(
        `UPDATE work_beneficiaries SET 
          total_population = ?,
          beneficiaries_male = ?,
          beneficiaries_female = ?,
          beneficiaries_youth_15_28 = ?
         WHERE work_id = ?`,
        [
          total_population,
          beneficiaries_male,
          beneficiaries_female,
          beneficiaries_youth_15_28,
          workId
        ]
      );
    } else {
      // Insert new
      await db.query(
        `INSERT INTO work_beneficiaries 
          (work_id, total_population, beneficiaries_male, beneficiaries_female, beneficiaries_youth_15_28)
         VALUES (?, ?, ?, ?, ?)`,
        [workId, total_population, beneficiaries_male, beneficiaries_female, beneficiaries_youth_15_28]
      );
    }

    res.json({ message: "✅ Beneficiaries updated successfully" });
  } catch (err) {
    console.error("❌ Error updating beneficiaries:", err);
    res.status(500).json({ error: "Failed to update beneficiaries", details: err.message });
  }
};

// =============================
// UPDATE VILLAGES
// =============================
export const updateVillages = async (req, res) => {
  try {
    const { workId } = req.params;
    const { villages } = req.body;

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Delete existing villages
      await db.query("DELETE FROM work_villages WHERE work_id = ?", [workId]);

      // Insert updated villages
      for (const village of villages) {
        await db.query(
          `INSERT INTO work_villages 
            (work_id, district_name, block_name, gram_panchayat, village_name, 
             census_population, male_population, female_population)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workId,
            village.district_name,
            village.block_name,
            village.gram_panchayat,
            village.village_name,
            village.census_population,
            village.male_population,
            village.female_population
          ]
        );
      }

      await db.query("COMMIT");
      res.json({ message: "✅ Villages updated successfully" });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error updating villages:", err);
    res.status(500).json({ error: "Failed to update villages", details: err.message });
  }
};

// =============================
// UPDATE COMPONENTS
// =============================
export const updateComponents = async (req, res) => {
  try {
    const { workId } = req.params;
    const { components } = req.body;

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Delete existing components
      await db.query("DELETE FROM components WHERE work_id = ?", [workId]);
      await db.query("DELETE FROM milestones WHERE work_id = ?", [workId]);

      // Insert updated components
      for (const comp of components) {
        const [result] = await db.query(
          `INSERT INTO components 
            (work_id, nameofcomponent, unitname, total_qty, num_of_milestones, milestone_details)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            workId,
            comp.nameofcomponent,
            comp.unitname,
            comp.total_qty,
            comp.num_of_milestones,
            comp.milestone_details
          ]
        );

        const componentId = result.insertId;

        // Create milestones if needed
        const numMilestones = parseInt(comp.num_of_milestones) || 0;
        for (let i = 1; i <= numMilestones; i++) {
          await db.query(
            `INSERT INTO milestones (work_id, component_id)
             VALUES (?, ?)`,
            [workId, componentId]
          );
        }
      }

      await db.query("COMMIT");
      res.json({ message: "✅ Components updated successfully" });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error updating components:", err);
    res.status(500).json({ error: "Failed to update components", details: err.message });
  }
};

export const getAssignedWorks = async (req, res) => {
  try {
    const userId = req.params.userId;
   
    // User details
    const [userRows] = await db.query(
      `SELECT zone_id, circle_id, division_id, department_id,role_id
       FROM users WHERE id = ?`,
      [userId]
    );
   
    if (userRows.length === 0) {
      return res.json({ success: true, works: [] });
    }
   
    const user = userRows[0];
    
    // If no zone, circle, or division is assigned
    if (!user.department_id && !user.zone_id && !user.circle_id && !user.division_id ) {
      return res.json({ success: true, works: [] });
    }
   
    // Start building query
    let query = `
      SELECT
        w.id,
        w.work_name as name,
        w.package_number as code,
        w.work_cost as budget,
        w.target_km as target,
        w.Area_Under_improved_Irrigation as improved_area,
        w.isAwarded_flag,
        w.isTenderCreated_flag,
        w.created_at,
        w.package_number,
        c.id as contractor_id,
        c.contractor_name,
        z.zone_name,
        ci.circle_name,
        d.division_name,
        dept.id as department_id,
		dept.department_name,
        c.work_stipulated_date,
        c.actual_date_of_completion,
        c.contract_awarded_amount
      FROM work w
      LEFT JOIN contractors c ON c.work_id = w.id
      LEFT JOIN circles ci ON ci.id = w.circle_id
      LEFT JOIN zones z ON z.id = w.zone_id
      LEFT JOIN divisions d ON d.id = w.division_id
      LEFT JOIN departments dept ON dept.id = w.dept_id
    `;
    
    const conditions = [];
    const params = [];
    
    // Add conditions based on user's assignments
     if (user.department_id) {
      conditions.push('w.dept_id = ?');
      params.push(user.department_id);
    }
    if (user.zone_id) {
      conditions.push('w.zone_id = ?');
      params.push(user.zone_id);
    }
    
    if (user.circle_id) {
      conditions.push('w.circle_id = ?');
      params.push(user.circle_id);
    }
    
    if (user.division_id) {
      conditions.push('w.division_id = ?');
      params.push(user.division_id);
    }
    
    
    // Add WHERE clause if conditions exist
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' OR ')}`;
    }
    
    // Add ORDER BY
    query += ` ORDER BY w.package_number asc`;
    
    // console.log('Final Query:', query);
    // console.log('Query Params:', params);
    
    // Execute query
    const [works] = await db.query(query, params);
    
    // Process results
    const processedWorks = works.map(work => {
      // Calculate progress based on flags
      let progress = 0;
      if (work.isAwarded_flag === 1) progress = 50;
      if (work.isTenderCreated_flag === 1) progress = 25;
      
      // Format location
      const locationParts = [
        work.zone_name,
        work.circle_name, 
        work.division_name
      ].filter(part => part && part.trim() !== '');
      
      return {
        id: work.id.toString(),
        name: work.name || `Work ${work.id}`,
        code: work.code || 'N/A',
        budget: work.contract_awarded_amount,
        target: work.target ? `${work.target} KM` : 'Target not set',
        progress: progress,
        zone: work.zone_name || 'N/A',
        circle: work.circle_name || 'N/A',
        division: work.division_name || 'N/A',
        location: locationParts.join(', ') || 'Location not specified',
        status: work.isAwarded_flag === 1 ? 'In Progress' :
                work.isTenderCreated_flag === 1 ? 'Tender Created' : 
                'Not Started',
        deadline: work.work_stipulated_date ? work.work_stipulated_date.toISOString().split('T')[0] : 'Not set',
        completion_date: work.actual_date_of_completion ? work.actual_date_of_completion.toISOString().split('T')[0] : 'Not set',
        contractor_name: work.contractor_name || 'No contractor assigned',
        type: 'Irrigation Work',
        beneficiaries: Math.floor(Math.random() * 9000) + 1000,
        improved_area: work.improved_area || 0,
        contractor_id: work.contractor_id || null
      };
    });
    
    res.json({
      success: true,
      count: processedWorks.length,
      works: processedWorks
    });
    
  } catch (err) {
    console.error("Error in getAssignedWorks:", err);
    
    // Send more detailed error in development
    const errorResponse = {
      success: false,
      error: "Database error",
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    };
    
    res.status(500).json(errorResponse);
  }
};