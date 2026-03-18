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
    w.zone_id,
    w.division_id,
    w.has_spurs,
    w.has_embankment,
    w.circle_id,
    w.work_start_range,
    w.work_end_range,
    c.contract_awarded_amount,
    COUNT(ws.id) AS total_spurs

FROM work w
LEFT JOIN contractors c 
    ON c.work_id = w.id 
LEFT JOIN divisions d 
    ON c.division_id = d.id
LEFT JOIN work_spurs ws 
    ON w.id = ws.work_id

WHERE w.isAwarded_flag = 1

GROUP BY 
    w.id,
    w.work_name,
    w.package_number,
    w.target_km,
    w.work_start_range,
    w.work_end_range,
    c.contractor_name,
    c.work_commencement_date,
    c.work_stipulated_date,
    c.actual_date_of_completion,
    d.division_name,
    c.agreement_no,
    w.zone_id,
    w.division_id,
    w.has_spurs,
    w.has_embankment,
    w.circle_id,
    c.contract_awarded_amount

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

    console.log("🟢 Fetching progress for package:", packageNumber);

    /* 1️⃣ Work fetch - UPDATED with has_embankment field */
    const [workRows] = await db.execute(
      `SELECT id, target_km, work_start_range, work_end_range, 
              work_name, package_number, has_spurs, has_embankment 
       FROM work WHERE package_number = ?`,
      [packageNumber]
    );

    if (workRows.length === 0) {
      return res.status(404).json({ error: "Work not found" });
    }

    const workId = workRows[0].id;
    const targetKm = parseFloat(workRows[0].target_km) || 0;
    const work_start_range = parseFloat(workRows[0].work_start_range) || 0;
    const work_end_range = parseFloat(workRows[0].work_end_range) || 0;
    const workName = workRows[0].work_name || '';
    const packageNum = workRows[0].package_number || packageNumber;
    const hasSpurs = workRows[0].has_spurs || 0;
    const hasEmbankment = workRows[0].has_embankment || 0;

    /* 2️⃣ Main canal progress (Length) */
    const [progressRows] = await db.execute(
      "SELECT * FROM length_progress WHERE work_id = ? ORDER BY start_km",
      [workId]
    );

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
        id: p.id,
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

    /* 3️⃣ EMBANKMENT PROGRESS - YEH NAYA HAI */
    let embankmentProgress = [];
    let embankmentHistory = [];
    let embankmentSummary = {
      total_embankment_length: 0,
      completed_length: 0,
      in_progress_length: 0,
      not_started_length: 0,
      total_entries: 0,
      progress_percentage: 0
    };

    if (hasEmbankment === 1) {
      // Get all embankment progress entries
      const [embankmentRows] = await db.execute(
        `SELECT * FROM embankment_progress 
         WHERE work_id = ? 
         ORDER BY start_km`,
        [workId]
      );

      embankmentProgress = embankmentRows.map(e => ({
        id: e.id,
        start_km: parseFloat(e.start_km),
        end_km: parseFloat(e.end_km),
        length: parseFloat(e.end_km) - parseFloat(e.start_km),
        embankment_done_km: parseFloat(e.embankment_done_km),
        progress_percentage: ((parseFloat(e.embankment_done_km) / 
          (parseFloat(e.end_km) - parseFloat(e.start_km))) * 100).toFixed(2),
        date: e.progress_date,
        created_by: e.created_by,
        created_at: e.created_at
      }));

      // Get embankment history (all entries)
      const [historyRows] = await db.execute(
        `SELECT 
          ep.*,
          DATE_FORMAT(ep.progress_date, '%d-%m-%Y') as formatted_date
         FROM embankment_progress ep
         WHERE ep.work_id = ?
         ORDER BY ep.progress_date DESC, ep.id DESC`,
        [workId]
      );

      embankmentHistory = historyRows;

      // Calculate embankment summary
      const totalEmbankmentDone = embankmentProgress.reduce(
        (sum, e) => sum + e.embankment_done_km, 0
      );

      // Create reach-wise data for embankment (like length progress)
      let embankmentKmData = [];
      let embLastKm = 0;

      embankmentProgress.forEach((e) => {
        if (e.start_km > embLastKm) {
          embankmentKmData.push({
            start_km: embLastKm,
            end_km: e.start_km,
            embankment_done_km: 0,
            date: null,
          });
        }

        embankmentKmData.push({
          id: e.id,
          start_km: e.start_km,
          end_km: e.end_km,
          embankment_done_km: e.embankment_done_km,
          date: e.date,
        });

        embLastKm = e.end_km;
      });

      if (embLastKm < targetKm) {
        embankmentKmData.push({
          start_km: embLastKm,
          end_km: targetKm,
          embankment_done_km: 0,
          date: null,
        });
      }

      embankmentSummary = {
        total_embankment_length: targetKm,
        completed_length: totalEmbankmentDone,
        remaining_length: targetKm - totalEmbankmentDone,
        progress_percentage: targetKm > 0 ? 
          ((totalEmbankmentDone / targetKm) * 100).toFixed(2) : 0,
        total_entries: embankmentProgress.length,
        reach_wise_data: embankmentKmData
      };
    }

    /* 4️⃣ Spur progress - EXISTING CODE */
    let spurProgress = [];
    let spurHistory = [];
    let spurSummary = {
      total_spurs: 0,
      completed_spurs: 0,
      in_progress_spurs: 0,
      not_started_spurs: 0,
      total_length: 0,
      completed_length: 0,
      completion_percentage: 0
    };

    if (hasSpurs === 1) {
      // Get all spurs
      const [spurList] = await db.execute(
        `SELECT id, spur_name, location_km, spurs_length, is_new
         FROM work_spurs WHERE work_id = ? ORDER BY location_km`,
        [workId]
      );

      console.log(`🟢 Found ${spurList.length} spurs for work ID: ${workId}`);

      // Get latest progress for each spur
      for (const spur of spurList) {
        const [progress] = await db.execute(
          `SELECT id, progress_date, status, remarks, created_by, created_at
           FROM work_spur_progress 
           WHERE work_id = ? AND spur_id = ?
           ORDER BY progress_date DESC, id DESC LIMIT 1`,
          [workId, spur.id]
        );

        const latestProgress = progress[0] || null;

        spurProgress.push({
          id: spur.id,
          spur_id: spur.id,
          spur_name: spur.spur_name,
          location_km: parseFloat(spur.location_km) || 0,
          spur_length: parseFloat(spur.spurs_length) || 0,
          is_new: spur.is_new || 'new',
          status: latestProgress?.status || 'not-started',
          progress_date: latestProgress?.progress_date || null,
          remarks: latestProgress?.remarks || null,
          last_updated_by: latestProgress?.created_by || null,
          last_updated_at: latestProgress?.created_at || null,
        });
      }

      // Get all history
      const [history] = await db.execute(
        `SELECT wsp.*, DATE_FORMAT(wsp.progress_date, '%d-%m-%Y') as formatted_date
         FROM work_spur_progress wsp
         WHERE wsp.work_id = ?
         ORDER BY wsp.progress_date DESC, wsp.id DESC`,
        [workId]
      );
      spurHistory = history;

      // Calculate spur summary
      const totalSpurs = spurProgress.length;
      const completedSpurs = spurProgress.filter(s => s.status === 'completed').length;
      const inProgressSpurs = spurProgress.filter(s => s.status === 'in-progress').length;
      const notStartedSpurs = spurProgress.filter(s => s.status === 'not-started').length;
      
      const totalLength = spurProgress.reduce((sum, s) => sum + s.spur_length, 0);
      const completedLength = spurProgress
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.spur_length, 0);

      spurSummary = {
        total_spurs: totalSpurs,
        completed_spurs: completedSpurs,
        in_progress_spurs: inProgressSpurs,
        not_started_spurs: notStartedSpurs,
        total_length: totalLength.toFixed(2),
        completed_length: completedLength.toFixed(2),
        completion_percentage: totalLength > 0 
          ? ((completedLength / totalLength) * 100).toFixed(2) 
          : 0
      };
    }

    /* 5️⃣ Calculate length summary */
    const totalEarthwork = progressRows.reduce(
      (sum, p) => sum + (parseFloat(p.earthwork_done_km) || 0), 0
    );
    const totalLining = progressRows.reduce(
      (sum, p) => sum + (parseFloat(p.lining_done_km) || 0), 0
    );

    const lengthSummary = {
      total_earthwork: totalEarthwork,
      total_lining: totalLining,
      progress_percentage: targetKm > 0 ? 
        ((totalLining / targetKm) * 100).toFixed(2) : 0,
      remaining_length: (targetKm - totalLining).toFixed(2),
      total_entries: progressRows.length
    };

    /* 6️⃣ Final response - WITH EMBANKMENT DATA */
    res.json({
      success: true,
      work_id: workId,
      work_name: workName,
      package_number: packageNum,
      target_km: targetKm,
      work_start_range: work_start_range,
      work_end_range: work_end_range,
      has_spurs: hasSpurs,
      has_embankment: hasEmbankment,
      
      // Main canal progress (Length)
      length_progress: kmData,
      length_summary: lengthSummary,
      
      // Embankment progress - YEH NAYA HAI
      embankment_progress: embankmentProgress,
      embankment_history: embankmentHistory,
      embankment_summary: embankmentSummary,
      
      // Spur progress
      spurs: spurProgress,
      spur_history: spurHistory,
      spur_summary: spurSummary
    });

  } catch (err) {
    console.error("❌ getProgressByPackage error:", err);
    res.status(500).json({ 
      error: "Failed to fetch progress",
      details: err.message 
    });
  }
};


// 4️⃣ Add progress entry (✅ fixed payload issue)
export const addProgressEntry = async (req, res) => {
  try {

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

// 5️⃣ Add EMBANKMENT progress entry
export const addEmbankmentProgressEntry = async (req, res) => {
  try {
    let { 
      packageNumber, 
      startKm, 
      endKm, 
      embankmentDoneKm, 
      progressDate,
      created_by 
    } = req.body;

    // Validation
    if (!packageNumber) {
      return res.status(400).json({ 
        success: false,
        error: "PACKAGE_NUMBER_REQUIRED",
        message: "packageNumber is required" 
      });
    }

    // Get work ID from package number
    const [workRows] = await db.execute(
      "SELECT id, work_name FROM work WHERE package_number = ?", 
      [packageNumber]
    );
    
    if (workRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "WORK_NOT_FOUND",
        message: "Work not found with this package number" 
      });
    }

    const workId = workRows[0].id;
    const workName = workRows[0].work_name;

    // Parse and validate values
    startKm = parseFloat(startKm ?? 0);
    endKm = parseFloat(endKm ?? 0);
    embankmentDoneKm = parseFloat(embankmentDoneKm ?? 0);
    progressDate = progressDate || null;

    // Validate numeric values
    if (isNaN(startKm) || isNaN(endKm) || isNaN(embankmentDoneKm)) {
      return res.status(400).json({ 
        success: false,
        error: "INVALID_NUMERIC_VALUES",
        message: "Invalid KM values. Please enter valid numbers." 
      });
    }

    // Validate range
    if (endKm <= startKm) {
      return res.status(400).json({ 
        success: false,
        error: "INVALID_RANGE",
        message: "End KM must be greater than Start KM" 
      });
    }

    // Validate embankment done doesn't exceed reach length
    const reachLength = endKm - startKm;
    if (embankmentDoneKm > reachLength) {
      return res.status(400).json({ 
        success: false,
        error: "EXCEEDS_REACH_LENGTH",
        message: `Embankment done (${embankmentDoneKm} KM) cannot exceed reach length (${reachLength.toFixed(2)} KM)` 
      });
    }

    // Validate embankment done is positive
    if (embankmentDoneKm <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "INVALID_PROGRESS",
        message: "Embankment done must be greater than 0" 
      });
    }

    // Insert into database
    await db.execute(
      `INSERT INTO embankment_progress 
        (work_id, start_km, end_km, embankment_done_km, progress_date, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workId, startKm, endKm, embankmentDoneKm, progressDate, created_by || 'System']
    );

    // Calculate total embankment done for this work
    const [totalRows] = await db.execute(
      `SELECT SUM(embankment_done_km) as total 
       FROM embankment_progress 
       WHERE work_id = ?`,
      [workId]
    );
    
    const totalEmbankment = parseFloat(totalRows[0]?.total || 0);

    res.json({ 
      success: true,
      message: "✅ Embankment progress added successfully",
      data: {
        work_id: workId,
        work_name: workName,
        package_number: packageNumber,
        start_km: startKm,
        end_km: endKm,
        embankment_done_km: embankmentDoneKm,
        progress_date: progressDate,
        total_embankment_done: totalEmbankment
      }
    });

  } catch (err) {
    console.error("❌ Error adding embankment progress:", err);
    
    // Handle specific database errors
    if (err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ 
        success: false,
        error: "INVALID_WORK_ID",
        message: "Invalid work reference" 
      });
    }
    
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return res.status(400).json({ 
        success: false,
        error: "INVALID_DATA_FORMAT",
        message: "Invalid data format. Please check your input." 
      });
    }

    res.status(500).json({ 
      success: false,
      error: "DATABASE_ERROR",
      message: "Failed to add embankment progress",
      details: err.message 
    });
  }
};