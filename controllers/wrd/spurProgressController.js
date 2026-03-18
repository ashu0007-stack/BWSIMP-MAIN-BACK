// controllers/wrd/spurProgressController.js
import db from "../../config/db.js";

// ✅ Add Spur Progress (Sirf Status Update) - No length calculations
// controllers/wrd/spurProgressController.js

// ✅ Add Spur Progress - WITH DEBUG LOGS
export const addSpurProgressEntry = async (req, res) => {
  const connection = await db.getConnection();
  
  try { 
    await connection.beginTransaction();
    
    console.log("🟢 Received spur progress body:", JSON.stringify(req.body, null, 2));
    
    let { 
      packageNumber, 
      spur_id, 
      spur_name, 
      spur_length,
      location_km, 
      status,
      progress_date,
      remarks,
      created_by,
      created_email
    } = req.body;

    // Validation with detailed logs
    console.log("🔍 Validating fields:");
    console.log("  packageNumber:", packageNumber);
    console.log("  spur_id:", spur_id);
    console.log("  spur_name:", spur_name);
    console.log("  status:", status);

    if (!packageNumber) {
      console.log("❌ Missing packageNumber");
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "packageNumber is required" });
    }
    
    if (!spur_id) {
      console.log("❌ Missing spur_id");
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "spur_id is required" });
    }

    if (!status) {
      console.log("❌ Missing status");
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "status is required" });
    }

    // Check if work exists
    console.log("🔍 Checking work for package:", packageNumber);
    const [workRows] = await connection.execute(
      "SELECT id FROM work WHERE package_number = ?", 
      [packageNumber]
    );
    
    if (workRows.length === 0) {
      console.log("❌ Work not found for package:", packageNumber);
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: `Work not found for package: ${packageNumber}` });
    }

    const workId = workRows[0].id;
    console.log("✅ Work ID found:", workId);

    // Parse values
    spur_length = parseFloat(spur_length ?? 0);
    location_km = parseFloat(location_km ?? 0);
    progress_date = progress_date || new Date().toISOString().split('T')[0];
    
    status = status || 'not-started';
    remarks = remarks || '';
    created_by = created_by || 'System';
    created_email = created_email || 'system@example.com';

    console.log("📝 Inserting into work_spur_progress:");
    console.log("  workId:", workId);
    console.log("  spur_id:", spur_id);
    console.log("  spur_name:", spur_name);
    console.log("  spur_length:", spur_length);
    console.log("  location_km:", location_km);
    console.log("  progress_date:", progress_date);
    console.log("  status:", status);

    // ✅ STEP 1: Insert into work_spur_progress
    await connection.execute(
      `INSERT INTO work_spur_progress 
        (work_id, spur_id, spur_name, spur_length_km, location_km, 
         progress_date, status, remarks, created_by, created_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workId, 
        spur_id, 
        spur_name || `Spur-${spur_id}`, 
        spur_length, 
        location_km,
        progress_date,
        status,
        remarks,
        created_by,
        created_email
      ]
    );

    console.log("✅ Inserted into work_spur_progress");

    // ✅ STEP 2: Update or Insert in work_spurs table
    console.log("🔄 Checking work_spurs...");
    
    const [existingSpur] = await connection.execute(
      "SELECT id FROM work_spurs WHERE work_id = ? AND id = ?",
      [workId, spur_id]
    );

    if (existingSpur.length === 0) {
      console.log("📝 Inserting new spur into work_spurs");
      await connection.execute(
        `INSERT INTO work_spurs 
         (id, work_id, spur_name, location_km, spurs_length, is_new, created_by, created_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          spur_id,
          workId, 
          spur_name || `Spur-${spur_id}`, 
          location_km || 0,
          spur_length || 0,
          'new',
          created_by,
          created_email
        ]
      );
      console.log("✅ Inserted new record in work_spurs");
    } else {
      console.log("✅ Spur already exists in work_spurs");
    }

    await connection.commit();
    connection.release();
    
    console.log("✅ Transaction completed successfully");
    
    return res.json({ 
      success: true,
      message: "Spur progress updated successfully",
      spur_id: spur_id,
      status: status
    });

  } catch (err) {
    await connection.rollback();
    if (connection) connection.release();
    
    console.error("❌ Error in addSpurProgressEntry:", err);
    console.error("❌ Error code:", err.code);
    console.error("❌ Error message:", err.message);
    console.error("❌ SQL:", err.sql);
    
    res.status(500).json({ 
      error: "Failed to add spur progress",
      details: err.message 
    });
  }
};

// ✅ Get All Spurs with Latest Status and Length
export const getAllSpursProgress = async (req, res) => {
  try {
    const { workId } = req.params;
    
    if (!workId) {
      return res.status(400).json({ error: "workId is required" });
    }

    // Get all spurs with their latest status
    const [spurs] = await db.execute(
      `SELECT 
        ws.id,
        ws.work_id,
        ws.spur_name,
        ws.location_km,
        ws.spurs_length,
        ws.is_new,
        
        -- Get latest status from progress table
        (SELECT status 
         FROM work_spur_progress 
         WHERE work_id = ws.work_id 
         AND spur_name = ws.spur_name 
         ORDER BY progress_date DESC, id DESC 
         LIMIT 1) as current_status,
        
        -- Get latest progress date
        (SELECT progress_date 
         FROM work_spur_progress 
         WHERE work_id = ws.work_id 
         AND spur_name = ws.spur_name 
         ORDER BY progress_date DESC, id DESC 
         LIMIT 1) as last_progress_date,
        
        -- Get latest remarks
        (SELECT remarks 
         FROM work_spur_progress 
         WHERE work_id = ws.work_id 
         AND spur_name = ws.spur_name 
         ORDER BY progress_date DESC, id DESC 
         LIMIT 1) as last_remarks,
        
        -- Count total entries for this spur
        (SELECT COUNT(*) 
         FROM work_spur_progress 
         WHERE work_id = ws.work_id 
         AND spur_name = ws.spur_name) as total_entries
        
      FROM work_spurs ws
      WHERE ws.work_id = ?
      ORDER BY ws.location_km`,
      [workId]
    );

    // Get all progress history
    const [allProgress] = await db.execute(
      `SELECT 
        wsp.*,
        DATE_FORMAT(wsp.progress_date, '%d-%m-%Y') as formatted_date
       FROM work_spur_progress wsp
       WHERE wsp.work_id = ?
       ORDER BY wsp.progress_date DESC, wsp.id DESC`,
      [workId]
    );

    // Calculate summary statistics
    let totalSpurs = spurs.length;
    let totalLength = 0;
    let completedSpurs = 0;
    let inProgressSpurs = 0;
    let notStartedSpurs = 0;

    spurs.forEach(spur => {
      const status = spur.current_status || 'not-started';
      totalLength += parseFloat(spur.spurs_length) || 0;
      
      if (status === 'completed') completedSpurs++;
      else if (status === 'in-progress') inProgressSpurs++;
      else notStartedSpurs++;
    });

    res.json({
      success: true,
      data: spurs,
      history: allProgress,
      summary: {
        total_spurs: totalSpurs,
        total_length: totalLength.toFixed(2),
        completed_spurs: completedSpurs,
        in_progress_spurs: inProgressSpurs,
        not_started_spurs: notStartedSpurs
      }
    });

  } catch (err) {
    console.error("❌ Error in getAllSpursProgress:", err);
    res.status(500).json({ 
      error: "Failed to fetch spurs progress",
      details: err.message 
    });
  }
};

// ✅ Get Single Spur History
export const getSpurHistory = async (req, res) => {
  try {
    const { workId, spurName } = req.params;
    
    const [history] = await db.execute(
      `SELECT 
        id,
        spur_name,
        location_km,
        spur_length_km,
        progress_date,
        DATE_FORMAT(progress_date, '%d-%m-%Y') as formatted_date,
        status,
        remarks,
        created_by,
        created_at,
        DATE_FORMAT(created_at, '%d-%m-%Y %H:%i') as created_at_formatted
       FROM work_spur_progress 
       WHERE work_id = ? AND spur_name = ?
       ORDER BY progress_date DESC, id DESC`,
      [workId, spurName]
    );

    res.json({
      success: true,
      data: history
    });

  } catch (err) {
    console.error("❌ Error in getSpurHistory:", err);
    res.status(500).json({ error: "Failed to fetch spur history" });
  }
};