import db from "../../config/db.js";

// 1️⃣ Get all works
export const getWorks = async (req, res) => {
  try {
    const [rows] = await db.execute(`
    SELECT 
    w.id,
    w.work_name,
    w.package_number,
    w.target_km AS target_km,
    c.contractor_name,
    DATE_FORMAT(c.work_commencement_date, '%d-%m-%Y') AS work_commencement_date,
    DATE_FORMAT(c.work_stipulated_date, '%d-%m-%Y') AS work_stipulated_date,
    DATE_FORMAT(c.actual_date_of_completion, '%d-%m-%Y') AS actual_date_of_completion,
    d.division_name,
    c.agreement_no,
    c.contract_awarded_amount
FROM work w
LEFT JOIN contractors c ON c.work_id = w.id 
left join divisions d on c.division_id=d.id
WHERE w.isAwarded_flag = 1
ORDER BY w.package_number;
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ getWorks error:", err);
    res.status(500).json({ error: "Failed to fetch works" });
  }
};

// 2️⃣ Get components by package
export const getComponentsByPackage = async (req, res) => {
  try {
    const { packageNumber } = req.params;
    const [workRows] = await db.execute("SELECT id FROM work WHERE package_number = ?", [packageNumber]);
    if (workRows.length === 0) return res.status(404).json({ error: "Work not found" });

    const workId = workRows[0].id;
    const [components] = await db.execute("SELECT * FROM package_component WHERE work_id = ?", [workId]);
    res.json(components);
  } catch (err) {
    console.error("❌ getComponentsByPackage error:", err);
    res.status(500).json({ error: "Failed to fetch components" });
  }
};

// 3️⃣ Get progress by package
export const getProgressByPackage = async (req, res) => {
  try {
    const { packageNumber } = req.params;
    const [workRows] = await db.execute("SELECT id, target_km FROM work WHERE package_number = ?", [packageNumber]);
    if (workRows.length === 0) return res.status(404).json({ error: "Work not found" });

    const workId = workRows[0].id;
    const targetKm = parseFloat(workRows[0].target_km);
    const [progressRows] = await db.execute("SELECT * FROM length_progress WHERE work_id = ? ORDER BY start_km", [workId]);

    let kmData = [];
    let lastKm = 0;
    progressRows.forEach((p) => {
      if (p.start_km > lastKm) {
        kmData.push({
          start_km: lastKm,
          end_km: p.start_km,
          earthwork_done_km: 0,
          lining_done_km: 0,
          date: null,
        });
      }
      kmData.push({
        start_km: parseFloat(p.start_km),
        end_km: parseFloat(p.end_km),
        earthwork_done_km: parseFloat(p.earthwork_done_km),
        lining_done_km: parseFloat(p.lining_done_km),
        date: p.progress_date,
      });
      lastKm = parseFloat(p.end_km);
    });

    if (lastKm < targetKm) {
      kmData.push({
        start_km: lastKm,
        end_km: targetKm,
        earthwork_done_km: 0,
        lining_done_km: 0,
        date: null,
      });
    }

    res.json({ target_km: targetKm, progress: kmData });
  } catch (err) {
    console.error("❌ getProgressByPackage error:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};

// 4️⃣ Add progress entry (✅ fixed payload issue)
export const addProgressEntry = async (req, res) => {
  try {
    console.log("🟢 Received body:", req.body); // 👀 debug log

    let { packageNumber, startKm, endKm, earthworkDoneKm, liningDoneKm, progressDate } = req.body;
    if (!packageNumber) return res.status(400).json({ error: "packageNumber is required" });

    const [workRows] = await db.execute("SELECT id FROM work WHERE package_number = ?", [packageNumber]);
    if (workRows.length === 0) return res.status(404).json({ error: "Work not found" });

    const workId = workRows[0].id;

    startKm = parseFloat(startKm ?? 0);
    endKm = parseFloat(endKm ?? 0);
    earthworkDoneKm = parseFloat(earthworkDoneKm ?? 0);
    liningDoneKm = parseFloat(liningDoneKm ?? 0);
    progressDate = progressDate || null;

    if (isNaN(startKm) || isNaN(endKm)) return res.status(400).json({ error: "Invalid KM values" });
    if (endKm <= startKm) return res.status(400).json({ error: "End KM must be greater than Start KM" });

    await db.execute(
      `INSERT INTO length_progress 
        (work_id, start_km, end_km, earthwork_done_km, lining_done_km, progress_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workId, startKm, endKm, earthworkDoneKm, liningDoneKm, progressDate]
    );

    res.json({ message: "Progress added successfully" });
  } catch (err) {
    console.error("❌ Error inserting progress:", err);
    res.status(500).json({ error: "Failed to add progress" });
  }
};
