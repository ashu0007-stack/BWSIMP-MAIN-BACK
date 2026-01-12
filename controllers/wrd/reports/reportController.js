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
    c.work_commencement_date,
    c.work_stipulated_date,
    c.email AS contractor_email,
    d.division_name as division_name,
	ci.circle_name,
    z.zone_name,
    c.agency_address
FROM work w
INNER JOIN divisions d ON w.division_id = d.id
left JOIN circles ci ON w.circle_id = ci.id
left join zones z on w.zone_id = z.id
LEFT JOIN contractors c ON w.id = c.work_id
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
    const [rows] = await db.query(`
      SELECT
        m.milestone_number,
        m.completed_quantity,
        c.total_qty,
        c.num_of_milestones
      FROM milestones m
      JOIN components c ON m.component_id = c.id
      WHERE c.work_id = ?
    `, [workId]);

    if (rows.length === 0) {
      return res.json([]);
    }

    // 🔹 total milestones for this work
    const totalMilestones = Math.max(
      ...rows.map(r => r.num_of_milestones)
    );

    const milestoneMap = {};

    // 🔹 initialize all milestones
    for (let i = 1; i <= totalMilestones; i++) {
      milestoneMap[i] = {
        milestone_number: i,
        milestone_name: `Milestone ${i}`,
        completed_quantity_sum: 0,
        total_quantity_sum: 0,
        achievement_percentage: 0,
        status: "Not Started"
      };
    }

    // 🔹 aggregate component data milestone-wise
    rows.forEach(row => {
      const m = milestoneMap[row.milestone_number];

      if (!m) return;

      m.completed_quantity_sum += Number(row.completed_quantity || 0);
      m.total_quantity_sum += Number(row.total_qty || 0);
    });

    // 🔹 calculate achievement & status
    const finalResponse = Object.values(milestoneMap).map(m => {
      let achievement = 0;

      if (m.total_quantity_sum > 0) {
        achievement = (
          (m.completed_quantity_sum / m.total_quantity_sum) * 100
        ).toFixed(2);
      }

      let status = "Not Started";
      if (achievement > 0 && achievement < 100) status = "In Progress";
      if (achievement >= 100) status = "Completed";

      return {
        milestone_number: m.milestone_number,
        milestone_name: m.milestone_name,
        achievement_percentage: Number(achievement),
        status
      };
    });

    res.json(finalResponse);

  } catch (err) {
    console.error("❌ Error fetching milestone report:", err);
    res.status(500).json({
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


