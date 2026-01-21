import db from "../../config/db.js";
export const addSpurProgressEntry = async (req, res) => {
  const connection = await db.getConnection();
  
  try { 
    await connection.beginTransaction();
    
    console.log("🟢 Received spur progress body:", req.body);
    
    let { 
      packageNumber, 
      spur_id, 
      spur_name, 
      spur_length_km,
      location_km, 
      completed_km,
      completion_percentage, 
      status,
      progress_date,
      remarks,
      created_by,
      created_email
    } = req.body;

    // Validation
    if (!packageNumber) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "packageNumber is required" });
    }
    
    if (!spur_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "spur_id is required" });
    }

    // Check if work exists
    const [workRows] = await connection.execute(
      "SELECT id FROM work WHERE package_number = ?", 
      [packageNumber]
    );
    
    if (workRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: `Work not found for package: ${packageNumber}` });
    }

    const workId = workRows[0].id;
    console.log("🟢 Work ID found:", workId);

    // Parse values
    spur_length_km = parseFloat(spur_length_km ?? 0);
    location_km = parseFloat(location_km ?? 0);
    completed_km = parseFloat(completed_km ?? 0);
    completion_percentage = parseFloat(completion_percentage ?? 0);
    progress_date = progress_date || new Date().toISOString().split('T')[0];
    
    // Status mapping
    status = status || 'not-started';
    if (status === 'pending') status = 'not-started';
    
    remarks = remarks || '';
    created_by = created_by || 'System';
    created_email = created_email || 'system@example.com';

    // Validate values
    if (isNaN(spur_length_km) || isNaN(completed_km) || isNaN(location_km)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "Invalid numeric values" });
    }

    if (completed_km < 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: "Completed length cannot be negative" });
    }

    if (completed_km > spur_length_km) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ 
        error: `Completed (${completed_km}m) cannot exceed spur length (${spur_length_km}m)` 
      });
    }

    // ✅ STEP 1: Insert into work_spur_progress
    console.log(`🟢 Inserting into work_spur_progress for spur_id: ${spur_id}`);
    
    await connection.execute(
      `INSERT INTO work_spur_progress 
        (work_id, spur_id, spur_name, spur_length_km, location_km, 
         completed_km, completion_percentage, progress_date, status,
         remarks, created_by, created_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        workId, 
        spur_id, 
        spur_name || `Spur-${spur_id}`, 
        spur_length_km, 
        location_km,
        completed_km, 
        completion_percentage,
        progress_date,
        status,
        remarks,
        created_by,
        created_email
      ]
    );

    console.log(`✅ Inserted into work_spur_progress`);

    // ✅ STEP 2: Update workspurs table with ADDITION
    // यहाँ हम existing value में नया completed_km add करेंगे
    console.log(`🟢 Updating workspurs table with addition...`);
    
    const updateQuery = `
      UPDATE work_spurs 
      SET progress_copmletion_spur_length = COALESCE(progress_copmletion_spur_length, 0) + ?
      WHERE work_id = ? AND id = ?
    `;
    
    const [updateResult] = await connection.execute(
      updateQuery,
      [completed_km, workId, spur_id]
    );
    
    console.log(`✅ workspurs update result:`, updateResult);
    
    // Check if any row was updated
    // if (updateResult.affectedRows === 0) {
    //   // No existing record found, so insert a new one
    //   console.log(`🟢 No existing record in workspurs, inserting new...`);
      
    //   await connection.execute(
    //     `INSERT INTO workspurs 
    //      (work_id, spur_id, progress_copmletion_spur_length, created_at)
    //      VALUES (?, ?, ?, NOW())`,
    //     [workId, spur_id, completed_km]
    //   );
      
    //   console.log(`✅ Inserted new record in workspurs`);
    // }

    // ✅ STEP 3: Get the updated total for response
    const [totalResult] = await connection.execute(
      "SELECT progress_copmletion_spur_length FROM work_spurs WHERE work_id = ? AND id = ?",
      [workId, spur_id]
    );
    
    const totalProgress = totalResult.length > 0 
      ? totalResult[0].progress_copmletion_spur_length 
      : completed_km;

    // Commit transaction
    await connection.commit();
    connection.release();
    
    console.log(`✅ Transaction completed successfully`);
    
    return res.json({ 
      success: true,
      message: "Spur progress added successfully",
      action: "added",
      spur_id: spur_id,
      completed_this_time: completed_km,
      total_progress: totalProgress
    });

  } catch (err) {
    // Rollback on error
    await connection.rollback();
    if (connection) connection.release();
    
    console.error("❌ Error in addSpurProgressEntry:");
    console.error("❌ Error details:", err);
    
    // Handle specific errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: "Duplicate entry. Progress already exists for this spur.",
        details: err.sqlMessage
      });
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: "Foreign key constraint failed. Work not found.",
        details: err.sqlMessage
      });
    }
    
    res.status(500).json({ 
      error: "Failed to add spur progress",
      details: err.message 
    });
  }
};


export const getAllSpursProgress = async (req, res) => {
  try {
    const { workId } = req.params;
    
    if (!workId) {
      return res.status(400).json({ error: "workId is required" });
    }

    // Directly get spurs from work_spurs table using work_id
    const [spurs] = await db.execute(
      `SELECT 
        ws.id,
        ws.work_id,
        ws.spur_name,
        ws.location_km,
        ws.spurs_length as spur_length,
        ws.is_new,
        COALESCE(ws.progress_copmletion_spur_length, 0) as completed_length,
       
        ws.progress_copmletion_spur_length as total_progress,
        
        -- Calculate completion percentage
        CASE 
          WHEN ws.spurs_length > 0 
          THEN (COALESCE(ws.progress_copmletion_spur_length, 0) / ws.spurs_length * 100)
          ELSE 0
        END as completion_percentage,
        
        -- Determine status based on progress
        CASE 
          WHEN COALESCE(ws.progress_copmletion_spur_length, 0) >= ws.spurs_length THEN 'completed'
          WHEN COALESCE(ws.progress_copmletion_spur_length, 0) > 0 THEN 'in-progress'
          ELSE 'not-started'
        END as status,
        
        -- Get latest progress date from history
        (SELECT MAX(progress_date) 
         FROM work_spur_progress 
         WHERE work_id = ws.work_id 
         AND spur_name = ws.spur_name) as last_progress_date
        
      FROM work_spurs ws
      WHERE ws.work_id = ?
      ORDER BY ws.location_km`,
      [workId]
    );

    // Also get work details for context
    // const [workDetails] = await db.execute(
    //   "SELECT package_number, work_name, contractor_name FROM work WHERE id = ?",
    //   [workId]
    // );

    // Calculate summary statistics
    let totalSpurs = spurs.length;
    let totalLength = 0;
    let totalCompleted = 0;
    let completedSpurs = 0;
    let inProgressSpurs = 0;
    let notStartedSpurs = 0;

    spurs.forEach(spur => {
      const spurLength = parseFloat(spur.spur_length) || 0;
      const completed = parseFloat(spur.completed_length) || 0;
      
      totalLength += spurLength;
      totalCompleted += completed;
      
      if (spur.status === 'completed') completedSpurs++;
      else if (spur.status === 'in-progress') inProgressSpurs++;
      else notStartedSpurs++;
    });

    const overallCompletion = totalLength > 0 ? (totalCompleted / totalLength * 100) : 0;

    res.json({
      success: true,
      // work_details: workDetails[0] || {},
      data: spurs,
      summary: {
        total_spurs: totalSpurs,
        total_length: totalLength.toFixed(2),
        total_completed: totalCompleted.toFixed(2),
        overall_completion: overallCompletion.toFixed(2),
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