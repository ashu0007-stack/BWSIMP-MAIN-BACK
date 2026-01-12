import db from "../../config/db.js";
 
// ✅ Get all milestones with work & component names
export const getAllMilestones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        m.id, w.package_number, w.work_name, c.nameofcomponent,
        m.target_date, m.actual_date, m.status, m.remarks
      FROM milestones m
      JOIN work w ON m.work_id = w.id
      JOIN components c ON m.component_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching milestones:", err);
    res.status(500).json({ error: "Failed to fetch milestones", details: err.message });
  }
};
 
export const getworkbyMilestone = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id,
        c.contractor_name,
        c.agreement_no,
        c.tenderrefno,
        c.work_id,
        w.work_name,
        w.package_number,
        c.contract_awarded_amount,
        DATE_FORMAT(c.work_commencement_date, '%d-%m-%Y') AS work_commencement_date,
         DATE_FORMAT(c.work_stipulated_date, '%d-%m-%Y') AS work_stipulated_date,
         DATE_FORMAT(c.actual_date_of_completion, '%d-%m-%Y') AS actual_date_of_completion,
        c.nameofauthrizeperson,
        c.mobileno,
        c.status,
        c.createdAt,
        c.updatedAt,
        c.agency_address,
        c.email
      FROM contractors c
      LEFT JOIN work w ON w.id = c.work_id;
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching milestones:", err);
    res.status(500).json({ error: "Failed to fetch milestones", details: err.message });
  }
};
 
// ✅ Get progress for a specific milestone
export const getMilestoneProgress = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM milestone_progress WHERE milestone_id = ? ORDER BY updated_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching milestone progress:", err);
    res.status(500).json({ error: "Failed to fetch milestone progress", details: err.message });
  }
};
 
// ✅ Add progress for a milestone
export const addMilestoneProgress = async (req, res) => {
  const { month, year, planned_percent, achieved_percent, cumulative_percent, remarks } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO milestone_progress
        (milestone_id, month, year, planned_percent, achieved_percent, cumulative_percent, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, month, year, planned_percent, achieved_percent, cumulative_percent, remarks]
    );
    res.json({ id: result.insertId, message: "Progress added successfully" });
  } catch (err) {
    console.error("❌ Error adding milestone progress:", err);
    res.status(500).json({ error: "Failed to add progress", details: err.message });
  }
};
 
// ✅ Get package-wise progress summary
export const getPackageProgress = async (req, res) => {
  const { pkg } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT
        c.nameofcomponent AS component,
        c.total_qty AS total,
        COALESCE((
          SELECT SUM(mp.quantity)
          FROM milestone_progress mp
          WHERE mp.milestone_id = m.id
            AND YEAR(mp.progress_date) * 100 + MONTH(mp.progress_date) <
                YEAR(CURDATE()) * 100 + MONTH(CURDATE())
        ), 0) AS tillLast,
        COALESCE((
          SELECT SUM(mp.quantity)
          FROM milestone_progress mp
          WHERE mp.milestone_id = m.id
            AND YEAR(mp.progress_date) = YEAR(CURDATE())
            AND MONTH(mp.progress_date) = MONTH(CURDATE())
        ), 0) AS current,
        COALESCE((
          SELECT SUM(mp.quantity)
          FROM milestone_progress mp
          WHERE mp.milestone_id = m.id
        ), 0) AS cumulative
      FROM milestones m
      JOIN components c ON m.component_id = c.id
      WHERE m.package_number = ?`,
      [pkg]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching package progress:", err);
    res.status(500).json({ error: "Failed to fetch package progress", details: err.message });
  }
};
 
// ✅ Get components for a package
export const getPackageComponents = async (req, res) => {
  const { pkg } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT
        c.id,
        c.nameofcomponent as name,
        LOWER(REPLACE(c.nameofcomponent, ' ', '')) as field_name
       FROM components c
       JOIN milestones m ON c.id = m.component_id
       WHERE m.package_number = ?`,
      [pkg]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching components:", err);
    res.status(500).json({ error: "Failed to fetch components", details: err.message });
  }
};
 
// ✅ Save overall package progress (loop over components)
export const savePackageProgress = async (req, res) => {
  const { packageNumber, progressDate, components, remark } = req.body;
 
  try {
    console.log("🟢 Saving progress for package:", packageNumber);
 
    for (const comp of components) {
  console.log(`🔍 Processing component:`, comp);
 
  const quantity = comp.quantity && comp.quantity !== "" ? parseFloat(comp.quantity) : 0;
  console.log(`📊 Quantity for component ${comp.componentId}: ${quantity}`);
 
      // Get milestone_id first
      const [milestoneRows] = await db.query(
        "SELECT id FROM milestones WHERE package_number = ? AND component_id = ?",
        [packageNumber, comp.componentId]
      );
 
      if (milestoneRows.length === 0) {
        console.warn(`⚠️ No milestone found for package ${packageNumber} and component ${comp.componentId}`);
        continue;
      }
 
      const milestoneId = milestoneRows[0].id;
 
      // Insert into progress table
      const [result] = await db.query(
        `INSERT INTO milestone_progress
         (milestone_id, progress_date, quantity, remark, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [milestoneId, progressDate, quantity, remark || ""]
      );
 
      console.log(`✅ Progress inserted: ID ${result.insertId}`);
    }
 
    res.json({ message: "Progress saved successfully" });
  } catch (err) {
    console.error("❌ Error saving package progress:", err);
    res.status(500).json({
      error: "Failed to save package progress",
      details: err.message,
      sql: err.sql
    });
  }
};
 
// ✅ Get all milestones for a package (Excel format ke liye)
export const getPackageMilestones = async (req, res) => {
  const { pkg } = req.params;
 
  try {
    // Pehle milestone details fetch karein
    const [milestoneRows] = await db.query(`
      SELECT
        m.id,
        m.milestone_number,
        m.milestone_name,
        m.milestone_qty,
        m.milestone_percentage,
        m.completed_quantity,
        m.previous_month_qty,
        m.current_month_qty,
        m.cumulative_qty,
        m.achievement_percentage,
        m.status,
        m.unit,
        c.id as component_id,
        c.nameofcomponent,
        c.unitname,
        c.total_qty,
        c.milestone_1_percentage,
        c.milestone_2_percentage,
        c.milestone_3_percentage,
        c.milestone_4_percentage,
        c.num_of_milestones,
        c.work_id
      FROM milestones m
      JOIN components c ON m.component_id = c.id
      WHERE m.package_number = ?
      ORDER BY c.nameofcomponent, m.milestone_number
    `, [pkg]);
   
    const milestoneCount = milestoneRows.length > 0
  ? milestoneRows.filter(row => row.component_id === milestoneRows[0].component_id).length
  : 0;
 
    // Agar koi data nahi hai to empty array return karein
    if (milestoneRows.length === 0) {
      return res.json([]);
    }
   
    // Data ko organize karein component-wise
    const organizedData = [];
    const componentMap = {};
   
    milestoneRows.forEach(row => {
      if (!componentMap[row.component_id]) {
        componentMap[row.component_id] = {
          component_id: row.component_id,
          name: row.nameofcomponent,
          unit: row.unitname,
          total_qty: row.total_qty,
          milestoneCount: milestoneCount,
          milestones: []
        };
      }
     
      componentMap[row.component_id].milestones.push({
        milestone_number: row.milestone_number,
        milestone_name: row.milestone_name,
        milestone_qty: row.milestone_qty,
        milestone_percentage: row.milestone_percentage,
        completed_quantity: row.completed_quantity,
        previous_month_qty: row.previous_month_qty,
        current_month_qty: row.current_month_qty,
        cumulative_qty: row.cumulative_qty,
        achievement_percentage: row.achievement_percentage,
        status: row.status,
        unit: row.unit
      });
    });
   
    // Map ko array mein convert karein
    for (const componentId in componentMap) {
      organizedData.push(componentMap[componentId]);
    }
   
    res.json(organizedData);
  } catch (err) {
    console.error("❌ Error fetching package milestones:", err);
    res.status(500).json({
      error: "Failed to fetch package milestones",
      details: err.message
    });
  }
};
 
// ✅ Get package components with milestone percentages
export const getPackageComponentsDetailed = async (req, res) => {
  const { pkg } = req.params;
 
  try {
    const [rows] = await db.query(`
      SELECT
        c.id,
        c.nameofcomponent as name,
        c.unitname,
        c.total_qty,
        c.num_of_milestones,
        c.milestone_1_percentage,
        c.milestone_2_percentage,
        c.milestone_3_percentage,
        c.milestone_4_percentage,
        LOWER(REPLACE(c.nameofcomponent, ' ', '_')) as field_name
      FROM components c
      JOIN work w ON c.work_id = w.id
      WHERE w.package_number = ?
      ORDER BY c.nameofcomponent
    `, [pkg]);
   
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching detailed components:", err);
    res.status(500).json({
      error: "Failed to fetch components",
      details: err.message
    });
  }
};
 
// ✅ Save milestone progress (Excel format ke hisaab se)
// milestoneController.js में saveMilestoneProgress function update करें:
 
// ✅ Save milestone progress (Excel format ke hisaab se)
export const saveMilestoneProgress = async (req, res) => {
  const {
    packageNumber,
    progressDate,
    fortnight,
    milestoneNumber,
    components,
    remark
  } = req.body;
 
  try {
    console.log("🟢 Saving milestone progress for package:", packageNumber);
   
    const connection = await db.getConnection();
    await connection.beginTransaction();
   
    try {
      for (const comp of components) {
        const quantity = comp.quantity && comp.quantity !== "" ? parseFloat(comp.quantity) : 0;
       
        if (quantity <= 0) continue; // Skip 0 quantities
       
        console.log(`📊 Processing component ${comp.componentId} with quantity: ${quantity}`);
       
        // 1. Milestone dhundhein
        const [milestoneRows] = await connection.query(`
          SELECT m.id, m.milestone_qty
          FROM milestones m
          JOIN components c ON m.component_id = c.id
          JOIN work w ON c.work_id = w.id
          WHERE w.package_number = ?
            AND m.component_id = ?
            AND m.milestone_number = ?
        `, [packageNumber, comp.componentId, milestoneNumber]);
       
        if (milestoneRows.length === 0) {
          console.warn(`⚠️ No milestone found for package ${packageNumber}, component ${comp.componentId}, milestone ${milestoneNumber}`);
          continue;
        }
       
        const milestoneId = milestoneRows[0].id;
        const milestoneQty = Number(milestoneRows[0].milestone_qty) || 0;
       
        console.log(`🎯 Found milestone ${milestoneId} with target qty: ${milestoneQty}`);
       
        // 2. Progress entry insert karein
        const [result] = await connection.query(
          `INSERT INTO milestone_progress
           (milestone_id, progress_date, quantity, remark, component_id, milestone_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [milestoneId, progressDate, quantity, remark || "", comp.componentId, milestoneNumber]
        );
       
        console.log(`✅ Progress inserted for milestone ${milestoneId}: ${quantity} ${comp.unit}`);
       
        // 3. Milestone table update karein
        // Pehle current month ka total nikal lein
        const [currentMonthTotal] = await connection.query(`
          SELECT COALESCE(SUM(quantity), 0) as total
          FROM milestone_progress
          WHERE milestone_id = ?
            AND YEAR(progress_date) = YEAR(?)
            AND MONTH(progress_date) = MONTH(?)
        `, [milestoneId, progressDate, progressDate]);
       
        // Pehle month ka total nikal lein
        const [previousMonthTotal] = await connection.query(`
          SELECT COALESCE(SUM(quantity), 0) as total
          FROM milestone_progress
          WHERE milestone_id = ?
            AND (
              YEAR(progress_date) < YEAR(?)
              OR (YEAR(progress_date) = YEAR(?) AND MONTH(progress_date) < MONTH(?))
            )
        `, [milestoneId, progressDate, progressDate, progressDate]);
       
        const currentMonthQty = parseFloat(currentMonthTotal[0].total) || 0;
        const previousMonthQty = parseFloat(previousMonthTotal[0].total) || 0;
        const cumulativeQty = currentMonthQty + previousMonthQty;
       
        console.log(`📈 Stats for milestone ${milestoneId}:`, {
          currentMonthQty,
          previousMonthQty,
          cumulativeQty,
          milestoneQty
        });
       
        // Achievement percentage calculate karein - FIX NaN issue
        let achievementPercentage = 0;
        if (milestoneQty > 0) {
          achievementPercentage = (cumulativeQty / milestoneQty) * 100;
          // Ensure percentage is between 0 and 100
          if (achievementPercentage > 100) achievementPercentage = 100;
          if (achievementPercentage < 0) achievementPercentage = 0;
        }
       
        console.log(`📊 Achievement percentage: ${achievementPercentage.toFixed(2)}%`);
       
        // Milestone update karein - FIX decimal formatting
        await connection.query(`
          UPDATE milestones
          SET
            completed_quantity = ?,
            current_month_qty = ?,
            previous_month_qty = ?,
            cumulative_qty = ?,
            achievement_percentage = ?,
            updated_at = NOW()
          WHERE id = ?
        `, [
          cumulativeQty.toFixed(2),
          currentMonthQty.toFixed(2),
          previousMonthQty.toFixed(2),
          cumulativeQty.toFixed(2),
          achievementPercentage.toFixed(2),
          milestoneId
        ]);
       
        console.log(`✅ Milestone ${milestoneId} updated successfully`);
       
        // 4. Component ka status update karein
        if (achievementPercentage >= 100) {
          await connection.query(
            "UPDATE milestones SET status = 'Completed' WHERE id = ?",
            [milestoneId]
          );
          console.log(`🎉 Milestone ${milestoneId} marked as Completed`);
        } else if (cumulativeQty > 0) {
          await connection.query(
            "UPDATE milestones SET status = 'In Progress' WHERE id = ?",
            [milestoneId]
          );
          console.log(`🔄 Milestone ${milestoneId} marked as In Progress`);
        }
      }
     
      await connection.commit();
      connection.release();
     
      console.log("✅ All progress saved successfully");
      res.json({
        success: true,
        message: "Milestone progress saved successfully"
      });
     
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("❌ Transaction error:", error);
      throw error;
    }
   
  } catch (err) {
    console.error("❌ Error saving milestone progress:", err);
    res.status(500).json({
      success: false,
      error: "Failed to save milestone progress",
      details: err.message,
      sql: err.sql
    });
  }
};