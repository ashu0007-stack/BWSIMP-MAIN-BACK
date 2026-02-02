import db from "../../config/db.js";



export const getPDOWorks = async (req, res) => {
  try {
    const [rows] = await db.query(`
    SELECT 
    w.id,
    w.work_name,
    w.package_number,
    w.work_cost,
    w.target_km,
    w.work_start_range,
    w.work_end_range,
    w.dept_id,
    w.created_by,
    w.created_email,
    w.created_at,
    w.zone_id,
    w.circle_id,
    w.division_id,
    w.Area_Under_improved_Irrigation,
    w.work_period_months, 
    w.isAwarded_flag,
    c.contractor_name,
    c.agreement_no,
    c.contract_awarded_amount,
    c.nameofauthrizeperson,
    c.work_commencement_date,
    c.work_stipulated_date,
    c.email AS contractor_email,
    d.division_name as division_name,
    c.agency_address,
    wb.total_population
FROM work w
INNER JOIN divisions d ON w.division_id = d.id
LEFT JOIN contractors c ON w.id = c.work_id
left join work_beneficiaries wb on w.id = wb.work_id
 where isAwarded_flag = 1
ORDER BY w.package_number;
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching works:", err);
    res.status(500).json({ error: "Failed to fetch works", details: err.message });
  }
};

// =============================
// GET ALL PDO INDICATORS
// =============================
export const getAllPDOIndicators = async (req, res) => {
  try {
    const [indicators] = await db.query(`
      SELECT * FROM pdo_indicators 
      ORDER BY category, id
    `);
    res.json({ success: true, indicators });
  } catch (err) {
    console.error("❌ Error fetching PDO indicators:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO indicators", 
      details: err.message 
    });
  }
};

// =============================
// GET PDO INDICATOR BY ID
// =============================
export const getPDOIndicatorById = async (req, res) => {
  try {
    const { id } = req.params;
    const [indicators] = await db.query(
      "SELECT * FROM pdo_indicators WHERE id = ?",
      [id]
    );
    
    if (indicators.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "PDO indicator not found" 
      });
    }
    
    res.json({ success: true, indicator: indicators[0] });
  } catch (err) {
    console.error("❌ Error fetching PDO indicator:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO indicator", 
      details: err.message 
    });
  }
};

// =============================
// CREATE PDO INDICATOR
// =============================
export const createPDOIndicator = async (req, res) => {
  try {
    const {
      name,
      category,
      unit,
      target,
      baseline = 0,
      current = 0,
      cumulative = 0,
      percentage = 0,
      female_target = 0,
      youth_target = 0
    } = req.body;

    // Get user info from session
    const user_email = req.session.user?.email || req.session.user_email;
    const username = req.session.user?.username || req.session.username;

    const [result] = await db.query(
      `INSERT INTO pdo_indicators 
      (name, category, unit, target, baseline, current, cumulative, 
       percentage, female_target, youth_target, created_by, created_email) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        unit,
        target,
        baseline,
        current,
        cumulative,
        percentage,
        female_target,
        youth_target,
        username || "System",
        user_email || "system@example.com"
      ]
    );

    res.json({
      success: true,
      message: "✅ PDO indicator created successfully",
      indicatorId: result.insertId
    });
  } catch (err) {
    console.error("❌ Error creating PDO indicator:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create PDO indicator", 
      details: err.message 
    });
  }
};

// =============================
// UPDATE PDO INDICATOR
// =============================
export const updatePDOIndicator = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      unit,
      target,
      baseline,
      current,
      cumulative,
      percentage,
      female_target,
      youth_target
    } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM pdo_indicators WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "PDO indicator not found" 
      });
    }

    await db.query(
      `UPDATE pdo_indicators SET 
      name = ?, category = ?, unit = ?, target = ?, baseline = ?,
      current = ?, cumulative = ?, percentage = ?, 
      female_target = ?, youth_target = ?
      WHERE id = ?`,
      [
        name,
        category,
        unit,
        target,
        baseline,
        current,
        cumulative,
        percentage,
        female_target,
        youth_target,
        id
      ]
    );

    res.json({
      success: true,
      message: "✅ PDO indicator updated successfully"
    });
  } catch (err) {
    console.error("❌ Error updating PDO indicator:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update PDO indicator", 
      details: err.message 
    });
  }
};

// =============================
// DELETE PDO INDICATOR
// =============================
export const deletePDOIndicator = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT id FROM pdo_indicators WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "PDO indicator not found" 
      });
    }

    await db.query("DELETE FROM pdo_indicators WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "✅ PDO indicator deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting PDO indicator:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete PDO indicator", 
      details: err.message 
    });
  }
};

// =============================
// GET ALL PDO PROGRESS ENTRIES
// =============================
export const getAllPDOProgress = async (req, res) => {
  try {
    const [progress] = await db.query(`
      SELECT 
        p.*,
        i.name as indicator_name,
        i.category,
        i.unit,
        w.work_name,
        w.package_number
      FROM pdo_progress p
      LEFT JOIN pdo_indicators i ON p.indicator_id = i.id
      LEFT JOIN work w ON p.work_id = w.id
      ORDER BY p.entry_date DESC, p.created_at DESC
    `);
    res.json({ success: true, progress });
  } catch (err) {
    console.error("❌ Error fetching PDO progress:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO progress", 
      details: err.message 
    });
  }
};

// =============================
// GET PDO PROGRESS BY WORK ID
// =============================
export const getPDOProgressByWorkId = async (req, res) => {
  try {
    const { workId } = req.params;

    const [progress] = await db.query(`
      SELECT 
        p.*,
        i.name as indicator_name,
        i.category,
        i.unit,
        i.target,
        w.work_name,
        w.package_number
      FROM pdo_progress p
      LEFT JOIN pdo_indicators i ON p.indicator_id = i.id
      LEFT JOIN work w ON p.work_id = w.id
      WHERE p.work_id = ?
      ORDER BY p.entry_date DESC
    `, [workId]);

    res.json({ success: true, progress });
  } catch (err) {
    console.error("❌ Error fetching PDO progress by work:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO progress", 
      details: err.message 
    });
  }
};

// =============================
// GET PDO PROGRESS BY INDICATOR ID
// =============================
export const getPDOProgressByIndicatorId = async (req, res) => {
  try {
    const { indicatorId } = req.params;

    const [progress] = await db.query(`
      SELECT 
        p.*,
        i.name as indicator_name,
        i.category,
        i.unit,
        w.work_name,
        w.package_number
      FROM pdo_progress p
      LEFT JOIN pdo_indicators i ON p.indicator_id = i.id
      LEFT JOIN work w ON p.work_id = w.id
      WHERE p.indicator_id = ?
      ORDER BY p.entry_date DESC
    `, [indicatorId]);

    res.json({ success: true, progress });
  } catch (err) {
    console.error("❌ Error fetching PDO progress by indicator:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO progress", 
      details: err.message 
    });
  }
};

// =============================
// CREATE PDO PROGRESS ENTRY
// =============================
export const createPDOProgress = async (req, res) => {
  try {
    const {
      work_id,
      indicator_id,
      period,
      achievement,
      female_achievement = 0,
      youth_achievement = 0,
      remark = ''
    } = req.body;

    // Get user info from session
    let user_email = "system@example.com";
    let username = "System";

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Get sum of ALL achievements for this indicator (not max cumulative)
      const [previousAchievements] = await db.query(
        `SELECT COALESCE(SUM(achievement), 0) as total_achievement 
         FROM pdo_progress 
         WHERE indicator_id = ?`,
        [indicator_id]
      );

      const previousTotal = parseFloat(previousAchievements[0]?.total_achievement) || 0;
      
      // Calculate new cumulative (sum of all achievements including current)
      const newCumulative = previousTotal + (parseFloat(achievement) || 0);

      // Insert progress entry with auto-calculated cumulative
      const [result] = await db.query(
        `INSERT INTO pdo_progress 
        (work_id, indicator_id, period, achievement, cumulative, 
         female_achievement, youth_achievement, remark, entry_date, created_by, created_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
        [
          work_id,
          indicator_id,
          period,
          parseFloat(achievement) || 0,
          newCumulative, // Auto-calculated cumulative
          parseFloat(female_achievement) || 0,
          parseFloat(youth_achievement) || 0,
          remark,
          username || "System",
          user_email || "system@example.com"
        ]
      );

      // Get sum of ALL achievements again to verify
      const [currentTotal] = await db.query(
        `SELECT COALESCE(SUM(achievement), 0) as total_achievement 
        FROM pdo_progress 
        WHERE indicator_id = ?`,
        [indicator_id]
      );

      const totalAchievement = parseFloat(currentTotal[0]?.total_achievement) || 0;

      // Get indicator target
      const [indicator] = await db.query(
        "SELECT target FROM pdo_indicators WHERE id = ?",
        [indicator_id]
      );

      const target = parseFloat(indicator[0]?.target) || 1;
      const percentage = Math.min((totalAchievement / target) * 100, 100);

      // Update indicator with new total achievement and percentage
      await db.query(
        `UPDATE pdo_indicators SET 
        current = ?, cumulative = ?, percentage = ?
        WHERE id = ?`,
        [
          parseFloat(achievement) || 0,
          totalAchievement,
          percentage,
          indicator_id
        ]
      );

      await db.query("COMMIT");

      res.json({
        success: true,
        message: "✅ PDO progress entry created successfully",
        progressId: result.insertId,
        cumulative: totalAchievement,
        percentage: percentage
      });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error creating PDO progress entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create PDO progress entry", 
      details: err.message 
    });
  }
};

// =============================
// UPDATE PDO PROGRESS ENTRY (FIXED - Auto cumulative update)
// =============================
export const updatePDOProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      period,
      achievement,
      female_achievement,
      youth_achievement,
      remark
    } = req.body;

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Get current progress entry
      const [currentProgress] = await db.query(
        "SELECT indicator_id, work_id, achievement as old_achievement FROM pdo_progress WHERE id = ?",
        [id]
      );

      if (currentProgress.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({ 
          success: false, 
          error: "Progress entry not found" 
        });
      }

      const indicatorId = currentProgress[0].indicator_id;
      const oldAchievement = parseFloat(currentProgress[0].old_achievement) || 0;
      const newAchievement = parseFloat(achievement) || 0;

      // Get ALL achievements for this indicator (including current entry)
      const [allEntries] = await db.query(
        `SELECT achievement FROM pdo_progress 
         WHERE indicator_id = ?`,
        [indicatorId]
      );

      // Calculate total achievement
      let totalAchievement = 0;
      allEntries.forEach(entry => {
        const entryAchievement = parseFloat(entry.achievement) || 0;
        // If this is the entry being updated, use new value instead of old
        totalAchievement += entryAchievement;
      });

      // Adjust for the change in achievement (remove old, add new)
      const adjustedTotal = totalAchievement - oldAchievement + newAchievement;

      // Update this specific entry's cumulative (which should be same as total)
      await db.query(
        `UPDATE pdo_progress SET 
        period = ?, achievement = ?, cumulative = ?,
        female_achievement = ?, youth_achievement = ?, remark = ?
        WHERE id = ?`,
        [
          period,
          newAchievement,
          adjustedTotal, // This entry's cumulative = total achievement
          parseFloat(female_achievement) || 0,
          parseFloat(youth_achievement) || 0,
          remark || '',
          id
        ]
      );

      // Update ALL entries to have the same cumulative (total achievement)
      await db.query(
        `UPDATE pdo_progress SET cumulative = ? WHERE indicator_id = ?`,
        [adjustedTotal, indicatorId]
      );

      // Get indicator target
      const [indicator] = await db.query(
        "SELECT target FROM pdo_indicators WHERE id = ?",
        [indicatorId]
      );

      const target = parseFloat(indicator[0]?.target) || 1;
      const percentage = Math.min((adjustedTotal / target) * 100, 100);

      // Update indicator
      await db.query(
        `UPDATE pdo_indicators SET 
        current = ?, cumulative = ?, percentage = ?
        WHERE id = ?`,
        [
          newAchievement,
          adjustedTotal,
          percentage,
          indicatorId
        ]
      );

      await db.query("COMMIT");

      res.json({
        success: true,
        message: "✅ PDO progress entry updated successfully",
        cumulative: adjustedTotal,
        percentage: percentage
      });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error updating PDO progress entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update PDO progress entry", 
      details: err.message 
    });
  }
};

// =============================
// DELETE PDO PROGRESS ENTRY
// =============================
export const deletePDOProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // Start transaction
    await db.query("START TRANSACTION");

    try {
      // Get progress entry details
      const [progress] = await db.query(
        "SELECT indicator_id FROM pdo_progress WHERE id = ?",
        [id]
      );

      if (progress.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({ 
          success: false, 
          error: "Progress entry not found" 
        });
      }

      const indicatorId = progress[0].indicator_id;

      // Delete progress entry
      await db.query("DELETE FROM pdo_progress WHERE id = ?", [id]);

      // Recalculate max cumulative
      const [maxCumulative] = await db.query(
        `SELECT MAX(cumulative) as max_cumulative 
        FROM pdo_progress 
        WHERE indicator_id = ?`,
        [indicatorId]
      );

      const maxCum = maxCumulative[0]?.max_cumulative || 0;

      // Get indicator target
      const [indicator] = await db.query(
        "SELECT target FROM pdo_indicators WHERE id = ?",
        [indicatorId]
      );

      const target = indicator[0]?.target || 1;
      const percentage = Math.min((maxCum / target) * 100, 100);

      // Update indicator
      await db.query(
        `UPDATE pdo_indicators SET 
        current = 0, cumulative = ?, percentage = ?
        WHERE id = ?`,
        [maxCum, percentage, indicatorId]
      );

      await db.query("COMMIT");

      res.json({
        success: true,
        message: "✅ PDO progress entry deleted successfully"
      });
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("❌ Error deleting PDO progress entry:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete PDO progress entry", 
      details: err.message 
    });
  }
};

// =============================
// GET PDO SUMMARY (Dashboard Data)
// =============================
export const getPDOSummary = async (req, res) => {
  try {
    // Get all indicators
    const [indicators] = await db.query(`
      SELECT * FROM pdo_indicators 
      ORDER BY category, id
    `);

    // Get total progress entries
    const [progressCount] = await db.query(`
      SELECT COUNT(*) as total_entries FROM pdo_progress
    `);

    // Calculate totals
    const pdo1Indicators = indicators.filter(i => i.category === 'PDO1');
    const pdo2Indicators = indicators.filter(i => i.category === 'PDO2');

    const totalAreaTarget = pdo1Indicators.reduce((sum, i) => sum + parseFloat(i.target), 0);
    const totalAreaAchieved = pdo1Indicators.reduce((sum, i) => sum + parseFloat(i.cumulative), 0);
    const totalAreaPercentage = totalAreaTarget > 0 ? (totalAreaAchieved / totalAreaTarget) * 100 : 0;

    const totalPeopleTarget = pdo2Indicators.reduce((sum, i) => sum + parseFloat(i.target), 0);
    const totalPeopleAchieved = pdo2Indicators.reduce((sum, i) => sum + parseFloat(i.cumulative), 0);
    const totalPeoplePercentage = totalPeopleTarget > 0 ? (totalPeopleAchieved / totalPeopleTarget) * 100 : 0;

    // Calculate female and youth totals
    const femaleTarget = pdo2Indicators.reduce((sum, i) => 
      sum + (parseFloat(i.female_target) || Math.round(parseFloat(i.target) * 0.49)), 0);
    
    const youthTarget = pdo2Indicators.reduce((sum, i) => 
      sum + (parseFloat(i.youth_target) || Math.round(parseFloat(i.target) * 0.29)), 0);

    // Get female and youth achievements from progress entries
    const [femaleProgress] = await db.query(`
      SELECT SUM(female_achievement) as total_female 
      FROM pdo_progress 
      WHERE indicator_id IN (SELECT id FROM pdo_indicators WHERE category = 'PDO2')
    `);

    const [youthProgress] = await db.query(`
      SELECT SUM(youth_achievement) as total_youth 
      FROM pdo_progress 
      WHERE indicator_id IN (SELECT id FROM pdo_indicators WHERE category = 'PDO2')
    `);

    const femaleAchieved = parseFloat(femaleProgress[0]?.total_female || 0);
    const youthAchieved = parseFloat(youthProgress[0]?.total_youth || 0);

    const femalePercentage = femaleTarget > 0 ? (femaleAchieved / femaleTarget) * 100 : 0;
    const youthPercentage = youthTarget > 0 ? (youthAchieved / youthTarget) * 100 : 0;

    // Get recent progress entries
    const [recentProgress] = await db.query(`
      SELECT 
        p.*,
        i.name as indicator_name,
        i.category,
        i.unit,
        w.work_name,
        w.package_number
      FROM pdo_progress p
      LEFT JOIN pdo_indicators i ON p.indicator_id = i.id
      LEFT JOIN work w ON p.work_id = w.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: {
        indicators: indicators,
        pdo1: {
          totalTarget: totalAreaTarget,
          totalAchieved: totalAreaAchieved,
          percentage: totalAreaPercentage,
          indicators: pdo1Indicators
        },
        pdo2: {
          totalTarget: totalPeopleTarget,
          totalAchieved: totalPeopleAchieved,
          percentage: totalPeoplePercentage,
          female: {
            target: femaleTarget,
            achieved: femaleAchieved,
            percentage: femalePercentage
          },
          youth: {
            target: youthTarget,
            achieved: youthAchieved,
            percentage: youthPercentage
          },
          indicators: pdo2Indicators
        },
        progressCount: progressCount[0]?.total_entries || 0,
        recentProgress: recentProgress
      }
    });
  } catch (err) {
    console.error("❌ Error fetching PDO summary:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO summary", 
      details: err.message 
    });
  }
};

// =============================
// GET PDO INDICATORS FOR WORK TYPE
// =============================
export const getPDOIndicatorsByWorkType = async (req, res) => {
  try {
    const { workId } = req.params;

    // Get work details
    const [work] = await db.query(
      `SELECT w.*, d.division_name, 
      wb.total_population
      FROM work w 
      LEFT JOIN divisions d ON w.division_id = d.id 
      left join work_beneficiaries wb on w.id = wb.work_id
      WHERE w.id = ?`,
      [workId]
    );

    if (work.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Work not found" 
      });
    }

    const workData = work[0];
    const workNameLower = workData.work_name.toLowerCase();
    const divisionLower = workData.division_name.toLowerCase();

    let workType = 'IRRIGATION';
    
    if (
      workNameLower.includes('embankment') || 
      workNameLower.includes('bundh') || 
      workNameLower.includes('bund') ||
      workNameLower.includes('flood') ||
      divisionLower.includes('embankment') ||
      divisionLower.includes('flood')
    ) {
      workType = 'EMBANKMENT';
    }

    let indicators = [];
    
    if (workType === 'IRRIGATION') {
      // Get PDO1 (Irrigation Area) and PDO2 (Irrigation Beneficiaries)
      const [pdoIndicators] = await db.query(`
        SELECT * FROM pdo_indicators 
        WHERE (category = 'PDO1' AND name LIKE '%Irrigation%') 
           OR (category = 'PDO2' AND name LIKE '%Irrigation%')
        ORDER BY category
      `);
      indicators = pdoIndicators;
    } else {
      // Get PDO1 (Flood Resilience) and PDO2 (Flood Protection)
      const [pdoIndicators] = await db.query(`
        SELECT * FROM pdo_indicators 
        WHERE (category = 'PDO1' AND name LIKE '%Flood%') 
           OR (category = 'PDO2' AND name LIKE '%Flood%')
        ORDER BY category
      `);
      indicators = pdoIndicators;
    }

    res.json({
      success: true,
      workType,
      work: workData,
      indicators
    });
  } catch (err) {
    console.error("❌ Error fetching PDO indicators by work type:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch PDO indicators", 
      details: err.message 
    });
  }
};

// =============================
// MAP WORK TO PDO INDICATOR
// =============================
export const mapWorkToPDO = async (req, res) => {
  try {
    const { workId, indicatorId, contribution_percentage = 100 } = req.body;

    // Check if work exists
    const [work] = await db.query("SELECT id FROM work WHERE id = ?", [workId]);
    if (work.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Work not found" 
      });
    }

    // Check if indicator exists
    const [indicator] = await db.query(
      "SELECT id FROM pdo_indicators WHERE id = ?",
      [indicatorId]
    );
    if (indicator.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "PDO indicator not found" 
      });
    }

    // Check if mapping already exists
    const [existingMapping] = await db.query(
      `SELECT id FROM work_pdo_mapping 
      WHERE work_id = ? AND indicator_id = ?`,
      [workId, indicatorId]
    );

    if (existingMapping.length > 0) {
      // Update existing mapping
      await db.query(
        `UPDATE work_pdo_mapping SET 
        contribution_percentage = ?
        WHERE work_id = ? AND indicator_id = ?`,
        [contribution_percentage, workId, indicatorId]
      );
    } else {
      // Create new mapping
      await db.query(
        `INSERT INTO work_pdo_mapping 
        (work_id, indicator_id, contribution_percentage)
        VALUES (?, ?, ?)`,
        [workId, indicatorId, contribution_percentage]
      );
    }

    res.json({
      success: true,
      message: "✅ Work mapped to PDO indicator successfully"
    });
  } catch (err) {
    console.error("❌ Error mapping work to PDO:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to map work to PDO", 
      details: err.message 
    });
  }
};

// =============================
// GET WORK PDO MAPPINGS
// =============================
export const getWorkPDOMappings = async (req, res) => {
  try {
    const { workId } = req.params;

    const [mappings] = await db.query(`
      SELECT 
        m.*,
        i.name as indicator_name,
        i.category,
        i.unit,
        i.target,
        i.cumulative,
        i.percentage,
        w.work_name,
        w.package_number
      FROM work_pdo_mapping m
      LEFT JOIN pdo_indicators i ON m.indicator_id = i.id
      LEFT JOIN work w ON m.work_id = w.id
      WHERE m.work_id = ?
    `, [workId]);

    res.json({ success: true, mappings });
  } catch (err) {
    console.error("❌ Error fetching work PDO mappings:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch work PDO mappings", 
      details: err.message 
    });
  }
};