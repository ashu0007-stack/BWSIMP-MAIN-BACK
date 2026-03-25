// controllers/superAdminController.js
import db from "../config/db.js";

// =============================
// DASHBOARD STATS CONTROLLER
// =============================
export const getDashboardStats = async (req, res) => {
  try {
    // Total schemes/works
    const [totalSchemes] = await db.query(`
      SELECT COUNT(*) as total FROM work
    `);

    // Active projects (In Progress milestones)
    const [activeProjects] = await db.query(`
      SELECT COUNT(DISTINCT work_id) as total 
      FROM milestones 
      WHERE status = 'In Progress'
    `);

    // Average PDO percentage
    const [avgPDO] = await db.query(`
      SELECT COALESCE(AVG(percentage), 0) as average 
      FROM pdo_indicators 
      WHERE percentage IS NOT NULL
    `);

    // At risk projects (Delayed milestones)
    const [atRisk] = await db.query(`
      SELECT COUNT(DISTINCT work_id) as total 
      FROM milestones 
      WHERE status = 'Delayed'
    `);

    // Get last month's stats for comparison
    const [lastMonthStats] = await db.query(`
      SELECT COUNT(*) as total_schemes 
      FROM work 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);

    res.json({
      totalSchemes: totalSchemes[0].total,
      activeProjects: activeProjects[0].total,
      averagePDO: Math.round(avgPDO[0].average),
      atRisk: atRisk[0].total,
      lastMonthIncrease: lastMonthStats[0].total_schemes
    });

  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats", details: err.message });
  }
};

// =============================
// DEPARTMENT PROGRESS CONTROLLER
// =============================
export const getDepartmentProgress = async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT 
        d.id as dept_id,
        d.department_name,
        COUNT(DISTINCT w.id) as total_works,
        COALESCE(SUM(w.work_cost), 0) as total_budget,
        COALESCE((
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
        ), 0) as total_milestones,
        COALESCE((
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id) 
          AND m.status = 'Completed'
        ), 0) as completed_milestones,
        COALESCE((
          SELECT AVG(percentage) 
          FROM pdo_indicators pi 
          WHERE pi.id IN (
            SELECT DISTINCT indicator_id 
            FROM pdo_progress pp 
            WHERE pp.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
          )
        ), 0) as avg_pdo,
        COALESCE((
          SELECT SUM(cumulative_fy) 
          FROM fin_expenditures 
          WHERE department_id = d.id
        ), 0) as total_spent
      FROM departments d
      LEFT JOIN work w ON d.id = w.dept_id
      WHERE d.id IN (1, 2, 3) -- RDD, WRD, DOA
      GROUP BY d.id, d.department_name
    `);

    // Format the response
    const formattedData = {};
    departments.forEach(dept => {
      const progress = dept.total_milestones > 0 
        ? Math.round((dept.completed_milestones / dept.total_milestones) * 100) 
        : 0;
      
      formattedData[dept.dept_code] = {
        totalWorks: dept.total_works,
        completedMilestones: dept.completed_milestones,
        totalMilestones: dept.total_milestones,
        totalBudget: dept.total_budget,
        totalSpent: dept.total_spent,
        pdo: Math.round(dept.avg_pdo),
        progress: progress,
        budget: formatCurrency(dept.total_budget),
        spent: formatCurrency(dept.total_spent),
        timeline: getCurrentQuarter()
      };
    });

    res.json(formattedData);

  } catch (err) {
    console.error("❌ Error fetching department progress:", err);
    res.status(500).json({ error: "Failed to fetch department progress", details: err.message });
  }
};

// =============================
// MILESTONE TRACKER CONTROLLER
// =============================
export const getMilestoneTracker = async (req, res) => {
  try {
    const [milestones] = await db.query(`
      SELECT 
        m.id,
        m.milestone_name,
        m.milestone_qty as target,
        m.completed_quantity as achieved,
        m.achievement_percentage as percentage,
        m.status,
        DATE_FORMAT(m.work_start_date, '%d-%m-%Y') as start_date,
        DATE_FORMAT(m.work_stipulated_date, '%d-%m-%Y') as end_date,
        DATE_FORMAT(m.work_actualcompletion_date, '%d-%m-%Y') as completion_date,
        m.package_number,
        w.work_name,
        w.work_cost,
        w.dept_id,
        d.dept_code,
        -- Calculate delay if any
        CASE 
          WHEN m.status != 'Completed' AND m.work_stipulated_date < CURDATE() 
          THEN DATEDIFF(CURDATE(), m.work_stipulated_date)
          ELSE 0 
        END as delay_days
      FROM milestones m
      INNER JOIN work w ON m.work_id = w.id
      LEFT JOIN departments d ON w.dept_id = d.id
      ORDER BY 
        CASE m.status
          WHEN 'Delayed' THEN 1
          WHEN 'In Progress' THEN 2
          WHEN 'Not Started' THEN 3
          WHEN 'Completed' THEN 4
        END,
        m.work_stipulated_date ASC
      LIMIT 50
    `);

    res.json(milestones);

  } catch (err) {
    console.error("❌ Error fetching milestones:", err);
    res.status(500).json({ error: "Failed to fetch milestones", details: err.message });
  }
};

// =============================
// PDO DATA CONTROLLER
// =============================
export const getPDOData = async (req, res) => {
  try {
    const [indicators] = await db.query(`
      SELECT 
        pi.id,
        pi.name,
        pi.category,
        pi.unit,
        pi.target,
        pi.baseline,
        pi.current,
        pi.cumulative,
        pi.percentage,
        pi.female_target,
        pi.youth_target,
        -- Get latest progress
        (
          SELECT JSON_OBJECT(
            'achievement', pp.achievement,
            'quarter', pp.quarter,
            'entry_date', DATE_FORMAT(pp.entry_date, '%d-%m-%Y')
          )
          FROM pdo_progress pp 
          WHERE pp.indicator_id = pi.id 
          ORDER BY pp.entry_date DESC 
          LIMIT 1
        ) as latest_progress
      FROM pdo_indicators pi
      ORDER BY pi.percentage ASC
    `);

    res.json(indicators);

  } catch (err) {
    console.error("❌ Error fetching PDO data:", err);
    res.status(500).json({ error: "Failed to fetch PDO data", details: err.message });
  }
};

// =============================
// FINANCIAL DATA CONTROLLER
// =============================
export const getFinancialData = async (req, res) => {
  try {
    const [financial] = await db.query(`
      SELECT 
        fe.expenditure_id,
        fe.financial_year,
        fe.department_id,
        d.dept_name,
        d.dept_code,
        fe.budget_fy,
        fe.expenditure_this_month,
        fe.cumulative_fy,
        fe.total_to_date,
        fe.utilization_percent,
        fe.variance,
        fe.cfms_head,
        DATE_FORMAT(fe.created_at, '%d-%m-%Y') as created_date,
        -- Calculate remaining budget
        (fe.budget_fy - fe.cumulative_fy) as remaining_budget,
        -- Status based on utilization
        CASE 
          WHEN fe.utilization_percent >= 90 THEN 'Critical'
          WHEN fe.utilization_percent >= 75 THEN 'High'
          WHEN fe.utilization_percent >= 50 THEN 'Medium'
          ELSE 'Normal'
        END as budget_status
      FROM fin_expenditures fe
      LEFT JOIN departments d ON fe.department_id = d.id
      ORDER BY fe.utilization_percent DESC
      LIMIT 100
    `);

    res.json(financial);

  } catch (err) {
    console.error("❌ Error fetching financial data:", err);
    res.status(500).json({ error: "Failed to fetch financial data", details: err.message });
  }
};

// =============================
// RISK ALERTS CONTROLLER
// =============================
export const getRiskAlerts = async (req, res) => {
  try {
    // 1. Delayed milestones (High severity)
    const [delayedMilestones] = await db.query(`
      SELECT 
        CONCAT('delay-', m.id) as id,
        'delay' as type,
        'high' as severity,
        'Delayed Milestone' as title,
        CONCAT(m.milestone_name, ' for work ', w.work_name, ' is delayed by ', 
               DATEDIFF(CURDATE(), m.work_stipulated_date), ' days') as description,
        w.dept_id as department,
        m.package_number,
        DATE_FORMAT(m.work_stipulated_date, '%d-%m-%Y') as due_date
      FROM milestones m
      INNER JOIN work w ON m.work_id = w.id
      WHERE m.status = 'Delayed'
      ORDER BY m.work_stipulated_date ASC
      LIMIT 20
    `);

    // 2. Low PDO achievement (Medium severity)
    const [lowPDO] = await db.query(`
      SELECT 
        CONCAT('pdo-', id) as id,
        'pdo' as type,
        'medium' as severity,
        'Low PDO Achievement' as title,
        CONCAT(name, ' is at ', percentage, '% achievement') as description,
        name as indicator,
        percentage
      FROM pdo_indicators 
      WHERE percentage < 50
      ORDER BY percentage ASC
      LIMIT 20
    `);

    // 3. Budget overruns (Medium severity)
    const [budgetIssues] = await db.query(`
      SELECT 
        CONCAT('budget-', expenditure_id) as id,
        'budget' as type,
        'medium' as severity,
        'Budget Variance' as title,
        CONCAT(cfms_head, ' has negative variance of ₹', FORMAT(ABS(variance), 0)) as description,
        variance,
        budget_fy as budget,
        cumulative_fy as spent
      FROM fin_expenditures 
      WHERE variance < 0
      ORDER BY variance ASC
      LIMIT 20
    `);

    // 4. Works without progress (Low severity)
    const [noProgress] = await db.query(`
      SELECT 
        CONCAT('noprogress-', w.id) as id,
        'progress' as type,
        'low' as severity,
        'No Progress Reported' as title,
        CONCAT(w.work_name, ' has no milestone updates in last 30 days') as description,
        w.dept_id as department,
        w.package_number
      FROM work w
      LEFT JOIN milestones m ON w.id = m.work_id AND m.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      WHERE m.id IS NULL
      AND w.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      LIMIT 20
    `);

    // Combine all alerts
    const allAlerts = [
      ...delayedMilestones,
      ...lowPDO,
      ...budgetIssues,
      ...noProgress
    ];

    // Sort by severity (high first)
    const severityOrder = { high: 1, medium: 2, low: 3 };
    allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json(allAlerts);

  } catch (err) {
    console.error("❌ Error fetching risk alerts:", err);
    res.status(500).json({ error: "Failed to fetch risk alerts", details: err.message });
  }
};

// =============================
// SCHEME PERFORMANCE CONTROLLER
// =============================
export const getSchemePerformance = async (req, res) => {
  try {
    const [schemes] = await db.query(`
      SELECT 
        w.id,
        w.work_name as name,
        w.package_number,
        w.work_cost as cost,
        w.target_km as target,
        w.dept_id as department,
        d.dept_code,
        -- Milestone stats
        COALESCE(milestone_stats.total_milestones, 0) as total_milestones,
        COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
        -- Calculate progress
        CASE 
          WHEN milestone_stats.total_milestones > 0 
          THEN ROUND((milestone_stats.completed_milestones / milestone_stats.total_milestones) * 100)
          ELSE 0 
        END as progress,
        -- Average PDO
        COALESCE(pdo_stats.avg_pdo, 0) as avg_pdo,
        -- Status based on progress
        CASE 
          WHEN milestone_stats.total_milestones > 0 
           AND milestone_stats.completed_milestones = milestone_stats.total_milestones THEN 'Completed'
          WHEN milestone_stats.total_milestones > 0 THEN 'In Progress'
          ELSE 'Not Started'
        END as status,
        -- Financial info
        COALESCE(fin.total_expenditure, 0) as total_expenditure,
        -- Latest update
        DATE_FORMAT(GREATEST(
          COALESCE(w.created_at, '1970-01-01'),
          COALESCE(milestone_stats.last_update, '1970-01-01')
        ), '%d-%m-%Y') as last_update
      FROM work w
      LEFT JOIN departments d ON w.dept_id = d.id
      LEFT JOIN (
        SELECT 
          work_id,
          COUNT(*) as total_milestones,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_milestones,
          MAX(created_at) as last_update
        FROM milestones
        GROUP BY work_id
      ) milestone_stats ON w.id = milestone_stats.work_id
      LEFT JOIN (
        SELECT 
          pp.work_id,
          AVG(pi.percentage) as avg_pdo
        FROM pdo_progress pp
        INNER JOIN pdo_indicators pi ON pp.indicator_id = pi.id
        GROUP BY pp.work_id
      ) pdo_stats ON w.id = pdo_stats.work_id
      LEFT JOIN (
        SELECT 
          fe.department_id,
          SUM(fe.cumulative_fy) as total_expenditure
        FROM fin_expenditures fe
        GROUP BY fe.department_id
      ) fin ON w.dept_id = fin.department_id
      ORDER BY progress DESC
      LIMIT 50
    `);

    res.json(schemes);

  } catch (err) {
    console.error("❌ Error fetching scheme performance:", err);
    res.status(500).json({ error: "Failed to fetch scheme performance", details: err.message });
  }
};

// =============================
// DEPARTMENT DETAILS CONTROLLER
// =============================
export const getDepartmentDetails = async (req, res) => {
  const { deptId } = req.params;
  
  try {
    const [department] = await db.query(`
      SELECT 
        d.id,
        d.dept_name,
        d.dept_code,
        COUNT(DISTINCT w.id) as total_schemes,
        COALESCE(SUM(w.work_cost), 0) as total_budget,
        COALESCE((
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
        ), 0) as total_milestones,
        COALESCE((
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id) 
          AND m.status = 'Completed'
        ), 0) as completed_milestones,
        COALESCE((
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id) 
          AND m.status = 'Delayed'
        ), 0) as delayed_milestones,
        COALESCE((
          SELECT AVG(percentage) 
          FROM pdo_indicators pi 
          WHERE pi.id IN (
            SELECT DISTINCT indicator_id 
            FROM pdo_progress pp 
            WHERE pp.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
          )
        ), 0) as avg_pdo,
        COALESCE((
          SELECT SUM(cumulative_fy) 
          FROM fin_expenditures 
          WHERE department_id = d.id
        ), 0) as total_spent
      FROM departments d
      LEFT JOIN work w ON d.id = w.dept_id
      WHERE d.id = ?
      GROUP BY d.id, d.dept_name, d.dept_code
    `, [deptId]);

    // Get top schemes for this department
    const [topSchemes] = await db.query(`
      SELECT 
        w.id,
        w.work_name,
        w.package_number,
        w.work_cost,
        COALESCE(milestone_stats.progress, 0) as progress,
        COALESCE(pdo_stats.avg_pdo, 0) as pdo_achievement
      FROM work w
      LEFT JOIN (
        SELECT 
          work_id,
          ROUND(AVG(achievement_percentage)) as progress
        FROM milestones
        GROUP BY work_id
      ) milestone_stats ON w.id = milestone_stats.work_id
      LEFT JOIN (
        SELECT 
          pp.work_id,
          ROUND(AVG(pi.percentage)) as avg_pdo
        FROM pdo_progress pp
        INNER JOIN pdo_indicators pi ON pp.indicator_id = pi.id
        GROUP BY pp.work_id
      ) pdo_stats ON w.id = pdo_stats.work_id
      WHERE w.dept_id = ?
      ORDER BY progress DESC
      LIMIT 10
    `, [deptId]);

    res.json({
      ...department[0],
      topSchemes
    });

  } catch (err) {
    console.error("❌ Error fetching department details:", err);
    res.status(500).json({ error: "Failed to fetch department details", details: err.message });
  }
};

// =============================
// EXPORT ALL CONTROLLERS
// =============================
export default {
  getDashboardStats,
  getDepartmentProgress,
  getMilestoneTracker,
  getPDOData,
  getFinancialData,
  getRiskAlerts,
  getSchemePerformance,
  getDepartmentDetails
};

// =============================
// HELPER FUNCTIONS
// =============================
function formatCurrency(value) {
  if (!value) return '0';
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value}`;
}

function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  if (month < 3) return `Q4 ${year-1}-${year}`;
  if (month < 6) return `Q1 ${year}-${year+1}`;
  if (month < 9) return `Q2 ${year}-${year+1}`;
  return `Q3 ${year}-${year+1}`;
}