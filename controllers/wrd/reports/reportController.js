import db from "../../../config/db.js";

// =============================
// GET ALL WORKS
// =============================
export const getREPWorks = async (req, res) => {
  try {
    const [rows] = await db.query(`
   SELECT 
    w.id,
    w.work_name,
    w.package_number,
    w.work_cost,
    w.target_km,
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
    -- Date formatting
    DATE_FORMAT(c.work_commencement_date, '%d-%m-%Y') as work_commencement_date,
    DATE_FORMAT(c.work_stipulated_date, '%d-%m-%Y') as work_stipulated_date,
    c.email AS contractor_email,
    d.division_name as division_name,
    ci.circle_name,
    z.zone_name,
    c.agency_address,
    wb.total_population,
    v.census_population
FROM work w
INNER JOIN divisions d ON w.division_id = d.id
LEFT JOIN circles ci ON w.circle_id = ci.id
LEFT JOIN zones z ON w.zone_id = z.id
LEFT JOIN contractors c ON w.id = c.work_id
LEFT JOIN work_beneficiaries wb ON w.id = wb.work_id
LEFT JOIN work_villages v ON w.id = v.work_id
ORDER BY w.id DESC;
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching works:", err);
    res.status(500).json({ error: "Failed to fetch works", details: err.message });
  }
};

export const getREPMilestonesByWorkId = async (req, res) => {
  const { workId } = req.params;

  try {
    // Use the corrected SQL query
    const [rows] = await db.query(`
      SELECT 
        m.milestone_number,
        COALESCE(m.milestone_name, CONCAT('Milestone ', m.milestone_number)) AS milestone_name,
        
        -- Total milestone quantity (from milestones table)
        SUM(COALESCE(m.milestone_qty, 0)) AS total_milestone_qty,
        
        -- Total completed quantity (from milestones table)
        SUM(COALESCE(m.completed_quantity, 0)) AS total_completed_qty,
        
        -- Calculate achievement percentage: (completed / milestone_qty) * 100
        CASE 
            WHEN SUM(COALESCE(m.milestone_qty, 0)) > 0
            THEN ROUND(
                (SUM(COALESCE(m.completed_quantity, 0)) * 100) / 
                SUM(COALESCE(m.milestone_qty, 0)),
                2
            )
            ELSE 0 
        END AS achievement_percentage,
        
        -- Remaining quantity
        ROUND(
            SUM(COALESCE(m.milestone_qty, 0)) - SUM(COALESCE(m.completed_quantity, 0)),
            2
        ) AS remaining_qty,
        
        -- Status based on percentage
        CASE 
            WHEN SUM(COALESCE(m.milestone_qty, 0)) > 0 
                 AND (SUM(COALESCE(m.completed_quantity, 0)) * 100) / SUM(COALESCE(m.milestone_qty, 0)) >= 100 
                 THEN 'Completed'
            WHEN SUM(COALESCE(m.completed_quantity, 0)) > 0 
                 THEN 'In Progress'
            ELSE 'Not Started'
        END AS milestone_status,
        
        -- Additional useful info
        COUNT(DISTINCT m.component_id) AS components_count,
         DATE_FORMAT((m.work_start_date), '%d-%m-%Y') AS work_start_date,
    DATE_FORMAT((m.work_stipulated_date), '%d-%m-%Y') AS work_stipulated_date,
    DATE_FORMAT((m.work_actualcompletion_date), '%d-%m-%Y') AS work_actualcompletion_date
        
      FROM milestones m
      JOIN components c ON m.component_id = c.id
      WHERE m.milestone_number IS NOT NULL 
        AND c.work_id = ?
      GROUP BY m.milestone_number, m.milestone_name
      ORDER BY m.milestone_number
    `, [workId]);

    if (rows.length === 0) {
      return res.json([]);
    }

    // Format the response
    const finalResponse = rows.map(row => {
      // Format dates

      return {
        milestone_number: row.milestone_number,
        milestone_name: row.milestone_name,
        milestone_qty: row.total_milestone_qty,
        completed_quantity: row.total_completed_qty,
        remaining_qty: row.remaining_qty,
        achievement_percentage: row.achievement_percentage,
        status: row.milestone_status,
        work_start_date: row.work_start_date,
        work_stipulated_date: row.work_stipulated_date,
        work_actualcompletion_date: row.work_actualcompletion_date,
        components_count: row.components_count
      };
    });

    res.json(finalResponse);

  } catch (err) {
    console.error("❌ Error fetching milestone report:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch milestone report",
      details: err.message
    });
  }
};
export const getREPTenderByWorkId = async (req, res) => {
  const { workId } = req.params; // ✅ FIXED

  try {
    const [rows] = await db.query(
      `SELECT 
        td.*,
        w.isTenderCreated_flag,
        w.isAwarded_flag,

        CASE
          WHEN td.is_draft = 1 THEN 'Draft'
          WHEN w.isTenderCreated_flag = 1 Then 'Tender Created'
        END AS tender_status

      FROM tenderdetails td
      LEFT JOIN work w ON td.work_id = w.id
      WHERE td.work_id = ?
      ORDER BY td.createdAt DESC`,
      [workId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No tender found" });
    }

    res.json(rows[0]); // ✅ full data
  } catch (err) {
    console.error("❌ Tender fetch error:", err);
    res.status(500).json({ error: "Failed to fetch tender" });
  }
};

export const getREPContractById = async (req, res) => {
  try {
    const { workId } = req.params;

    const [contractRows] = await db.query(`
      SELECT 
        c.id,
        c.work_id,
        c.tenderrefno,
        c.agreement_no,
        c.contractor_name,
        c.nameofauthrizeperson,
        c.mobileno,
        c.email,
        c.alternate_mobile,
        c.alternate_email,
        c.agency_address,
        c.contract_awarded_amount,
        c.work_commencement_date,
        c.work_stipulated_date,
        c.actual_date_of_completion,
        c.inserted_by,
        c.status,
        DATE_FORMAT(c.createdAt, '%Y-%m-%d') AS createdAt, 
        DATE_FORMAT(c.updatedAt, '%Y-%m-%d') AS updatedAt,  
        w.work_name,
        DATE_FORMAT(c.work_commencement_date, '%Y-%m-%d') AS start_date_formatted,
        DATE_FORMAT(c.work_stipulated_date, '%Y-%m-%d') AS completion_date_formatted
      FROM contractors c
      LEFT JOIN work w ON w.id = c.work_id
      WHERE c.work_id = ?
      LIMIT 1
    `, [workId]);

    // ✅ Contract not found → safe empty response
    if (contractRows.length === 0) {
      return res.json({
        contract: null,
        key_personnel: [],
        equipment: [],
        social_data: [],
        environmental_data: [],
        work_methodology_data: []
      });
    }

    const contract = contractRows[0];
    const contractId = contract.id;

    // Parallel fetch (faster)
    const [
      personnelRows,
      equipmentRows,
      socialRows,
      environmentalRows,
      methodologyRows
    ] = await Promise.all([
      db.query(`SELECT * FROM contractor_key_personnel WHERE contractor_id = ?`, [contractId]),
      db.query(`SELECT * FROM contractor_equipment WHERE contractor_id = ?`, [contractId]),
      db.query(`SELECT * FROM contractor_social_data WHERE contractor_id = ?`, [contractId]),
      db.query(`SELECT * FROM contractor_environmental_data WHERE contractor_id = ?`, [contractId]),
      db.query(`SELECT * FROM contractor_work_methodology WHERE contractor_id = ?`, [contractId])
    ]);

    res.json({
      ...contract,
      key_personnel: personnelRows[0],
      equipment: equipmentRows[0],
      social_data: socialRows[0],
      environmental_data: environmentalRows[0],
      work_methodology_data: methodologyRows[0]
    });

  } catch (err) {
    console.error("❌ Error fetching contract:", err);
    res.status(500).json({
      error: "Failed to fetch contract",
      message: err.message
    });
  }
};


export const getREPLengthById = async (req, res) => {
  try {
    const { workId } = req.params;

    const [rows] = await db.query(`
      SELECT 
        work_id,
        IFNULL(SUM(earthwork_done_km), 0) AS earthwork_done_km,
        IFNULL(SUM(lining_done_km), 0) AS lining_done_km
      FROM length_progress
      WHERE work_id = ?
      GROUP BY work_id
    `, [workId]);

    if (rows.length === 0) {
      return res.json({
        work_id: workId,
        earthwork_done_km: 0,
        lining_done_km: 0
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error("❌ getProgressByPackage error:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};