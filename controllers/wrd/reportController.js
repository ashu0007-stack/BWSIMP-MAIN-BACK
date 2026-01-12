import db from "../../config/db.js";

// Comprehensive Report with Filters

  // export const getComprehensiveReport= async (req, res) => {
  //   try {
  //     const {
  //       work_id,
  //       package_number,
  //       contractor_name,
  //       start_date,
  //       end_date,
  //       status,
  //       component_id
  //     } = req.query;

  //     const whereClauses = [];
  //     const params = [];

  //     if (work_id) {
  //       whereClauses.push('w.id = ?');
  //       params.push(work_id);
  //     }

  //     if (package_number) {
  //       whereClauses.push('w.package_number LIKE ?');
  //       params.push(`%${package_number}%`);
  //     }

  //     if (contractor_name) {
  //       whereClauses.push('c.contractor_name LIKE ?');
  //       params.push(`%${contractor_name}%`);
  //     }

  //     if (start_date) {
  //       whereClauses.push('DATE(w.created_at) >= ?');
  //       params.push(start_date);
  //     }

  //     if (end_date) {
  //       whereClauses.push('DATE(w.created_at) <= ?');
  //       params.push(end_date);
  //     }

  //     if (status) {
  //       whereClauses.push('w.isAwarded_flag = ?');
  //       params.push(status === 'awarded' ? 1 : 0);
  //     }

  //     if (component_id) {
  //       whereClauses.push('w.component_id = ?');
  //       params.push(component_id);
  //     }

  //     const whereClause = whereClauses.length > 0
  //       ? `WHERE ${whereClauses.join(' AND ')}`
  //       : '';

  //     const query = `
  //       SELECT 
  //         w.id as work_id,
  //         w.work_name,
  //         w.package_number,
  //         w.work_cost,
  //         w.target_km,
  //         w.Area_Under_improved_Irrigation as improved_area,
  //         w.work_period_months,
  //         w.created_at,
  //         w.isAwarded_flag,
  //         w.isTenderCreated_flag,
  //         c.contractor_name,
  //         c.tenderrefno,
  //         c.agreement_no,
  //         c.contract_awarded_amount,
  //         c.work_commencement_date,
  //         c.work_stipulated_date,
  //         c.actual_date_of_completion,
  //         c.mobileno,
  //         c.email,
  //         (
  //           SELECT COUNT(*) 
  //           FROM milestones m2 
  //           WHERE m2.work_id = w.id 
  //           AND m2.status = 'Completed'
  //         ) as completed_milestones,
  //         (
  //           SELECT COUNT(*) 
  //           FROM milestones m2 
  //           WHERE m2.work_id = w.id
  //         ) as total_milestones,
  //         (
  //           SELECT COALESCE(SUM(lp.earthwork_done_km), 0)
  //           FROM length_progress lp
  //           WHERE lp.work_id = w.id
  //         ) as total_earthwork_done,
  //         (
  //           SELECT COALESCE(SUM(lp.lining_done_km), 0)
  //           FROM length_progress lp
  //           WHERE lp.work_id = w.id
  //         ) as total_lining_done,
  //         (
  //           SELECT COALESCE(SUM(mp.quantity), 0)
  //           FROM milestone_progress mp
  //           JOIN milestones m3 ON mp.milestone_id = m3.id
  //           WHERE m3.work_id = w.id
  //         ) as total_progress_quantity,
  //         (
  //           SELECT MAX(mp.progress_date)
  //           FROM milestone_progress mp
  //           JOIN milestones m3 ON mp.milestone_id = m3.id
  //           WHERE m3.work_id = w.id
  //         ) as last_progress_date
  //       FROM work w
  //       LEFT JOIN contractors c ON w.id = c.work_id
  //       ${whereClause}
  //       GROUP BY w.id, c.id
  //       ORDER BY w.created_at DESC
  //     `;

  //     const [results] = await db.execute(query, params);

  //     res.json({
  //       success: true,
  //       data: results,
  //       total: Array.isArray(results) ? results.length : 0,
  //       filters: req.query
  //     });

  //   } catch (error) {
  //     console.error('Error fetching comprehensive report:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error fetching comprehensive report',
  //       error: error.message
  //     });
  //   }
  // };

  // Progress Report for Specific Work
    export const getProgressReport= async (req, res) => {
    try {
      const { work_id } = req.params;

      const query = `
        SELECT 
          w.work_name,
          w.package_number,
          w.target_km,
          w.work_cost,
          w.work_period_months,
          w.created_at,
          c.contractor_name,
          c.agreement_no,
          c.work_commencement_date,
          c.work_stipulated_date,
          c.actual_date_of_completion,
          
          -- Earthwork Progress
          (
            SELECT COALESCE(SUM(earthwork_done_km), 0)
            FROM length_progress lp
            WHERE lp.work_id = w.id
          ) as earthwork_completed,
          
          -- Lining Progress
          (
            SELECT COALESCE(SUM(lining_done_km), 0)
            FROM length_progress lp
            WHERE lp.work_id = w.id
          ) as lining_completed,
          
          -- Overall Progress Percentage
          CASE 
            WHEN w.target_km > 0 THEN
              ROUND(
                (
                  (SELECT COALESCE(SUM(earthwork_done_km), 0) FROM length_progress WHERE work_id = w.id) +
                  (SELECT COALESCE(SUM(lining_done_km), 0) FROM length_progress WHERE work_id = w.id)
                ) / (w.target_km * 2) * 100, 
                2
              )
            ELSE 0
          END as overall_progress_percentage,
          
          -- Milestone Status Count
          (
            SELECT COUNT(*) 
            FROM milestones m 
            WHERE m.work_id = w.id 
            AND m.status = 'Completed'
          ) as completed_milestones,
          
          (
            SELECT COUNT(*) 
            FROM milestones m 
            WHERE m.work_id = w.id 
            AND m.status = 'In Progress'
          ) as inprogress_milestones,
          
          (
            SELECT COUNT(*) 
            FROM milestones m 
            WHERE m.work_id = w.id 
            AND m.status = 'Delayed'
          ) as delayed_milestones,
          
          (
            SELECT COUNT(*) 
            FROM milestones m 
            WHERE m.work_id = w.id 
            AND m.status = 'Not Started'
          ) as not_started_milestones,
          
          -- Kilometer Progress
          (
            SELECT COALESCE(SUM(actual_km), 0)
            FROM kilometer_progress kp
            WHERE kp.work_id = w.id 
            AND kp.milestone_type = 'earthwork'
            AND kp.status = 'completed'
          ) as earthwork_km_completed,
          
          (
            SELECT COALESCE(SUM(actual_km), 0)
            FROM kilometer_progress kp
            WHERE kp.work_id = w.id 
            AND kp.milestone_type = 'lining'
            AND kp.status = 'completed'
          ) as lining_km_completed,
          
          -- Latest Progress Update
          (
            SELECT MAX(progress_date)
            FROM (
              SELECT progress_date FROM length_progress WHERE work_id = w.id
              UNION
              SELECT progress_date FROM milestone_progress mp 
              JOIN milestones m ON mp.milestone_id = m.id 
              WHERE m.work_id = w.id
            ) as all_dates
          ) as last_progress_date,
          
          -- Days elapsed/remaining
          DATEDIFF(
            COALESCE(c.actual_date_of_completion, CURDATE()), 
            c.work_commencement_date
          ) as days_elapsed,
          
          CASE 
            WHEN c.actual_date_of_completion IS NULL THEN
              DATEDIFF(c.work_stipulated_date, CURDATE())
            ELSE 0
          END as days_remaining

        FROM work w
        LEFT JOIN contractors c ON w.id = c.work_id
        WHERE w.id = ?
        GROUP BY w.id, c.id
      `;

      const [results] = await db.execute(query, [work_id]);

      if (!results || results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work not found'
        });
      }

      res.json({
        success: true,
        data: results[0]
      });

    } catch (error) {
      console.error('Error fetching progress report:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching progress report',
        error: error.message
      });
    }
  };

  // Financial Report
    export const getFinancialReport= async (req, res) => {
    try {
      const { start_date, end_date, contractor_name, min_amount, max_amount } = req.query;

      const whereClauses = ['c.id IS NOT NULL'];
      const params = [];

      if (start_date) {
        whereClauses.push('c.work_commencement_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        whereClauses.push('c.work_commencement_date <= ?');
        params.push(end_date);
      }

      if (contractor_name) {
        whereClauses.push('c.contractor_name LIKE ?');
        params.push(`%${contractor_name}%`);
      }

      if (min_amount) {
        whereClauses.push('c.contract_awarded_amount >= ?');
        params.push(min_amount);
      }

      if (max_amount) {
        whereClauses.push('c.contract_awarded_amount <= ?');
        params.push(max_amount);
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          w.id,
          w.package_number,
          w.work_name,
          c.contractor_name,
          c.tenderrefno,
          c.agreement_no,
          c.contract_awarded_amount,
          c.work_commencement_date,
          c.work_stipulated_date,
          c.actual_date_of_completion,
          DATEDIFF(
            COALESCE(c.actual_date_of_completion, CURDATE()), 
            c.work_commencement_date
          ) as actual_duration_days,
          DATEDIFF(
            c.work_stipulated_date, 
            c.work_commencement_date
          ) as stipulated_duration_days,
          CASE 
            WHEN c.actual_date_of_completion IS NULL THEN 'Ongoing'
            WHEN c.actual_date_of_completion > c.work_stipulated_date THEN 'Delayed'
            ELSE 'Completed on Time'
          END as completion_status,
          (
            SELECT COALESCE(SUM(mp.quantity), 0)
            FROM milestone_progress mp
            JOIN milestones m ON mp.milestone_id = m.id
            WHERE m.work_id = w.id
          ) as total_progress_amount,
          (
            SELECT COUNT(*)
            FROM milestones m
            WHERE m.work_id = w.id
            AND m.status = 'Completed'
          ) as milestones_completed
        FROM work w
        JOIN contractors c ON w.id = c.work_id
        ${whereClause}
        ORDER BY c.contract_awarded_amount DESC
      `;

      const [results] = await db.execute(query, params);

      res.json({
        success: true,
        data: results,
        total: Array.isArray(results) ? results.length : 0
      });

    } catch (error) {
      console.error('Error fetching financial report:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching financial report',
        error: error.message
      });
    }
  };

  // Milestone Details
  export const getMilestoneDetails = async (req, res) => {

    try {
      const { work_id } = req.params;

      const query = `
        SELECT 
          m.id,
          m.work_stipulated_date,
          m.work_actualcompletion_date,
          m.status,
          m.remarks,
          m.package_number,
          m.created_by,
          m.created_email,
          m.created_at,
          COALESCE(SUM(mp.quantity), 0) as progress_quantity,
          COUNT(mp.id) as progress_entries_count,
          MAX(mp.progress_date) as last_progress_update,
          MIN(mp.progress_date) as first_progress_date,
          (
            SELECT remark
            FROM milestone_progress mp2
            WHERE mp2.milestone_id = m.id
            ORDER BY mp2.progress_date DESC
            LIMIT 1
          ) as latest_remark
        FROM milestones m
        LEFT JOIN milestone_progress mp ON m.id = mp.milestone_id
        WHERE m.work_id = ?
        GROUP BY m.id
        ORDER BY m.work_stipulated_date
      `;

      const [results] = await db.execute(query, [work_id]);

      res.json({
        success: true,
        data: results,
        total: Array.isArray(results) ? results.length : 0
      });

    } catch (error) {
      console.error('Error fetching milestone details:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching milestone details',
        error: error.message
      });
    }
  };

  // Contractor Performance Report
  export const getContractorPerformance = async (req, res) => {
    try {
      const { min_works, min_value, min_rate } = req.query;

      const havingClauses = [];
      const params = [];

      if (min_works) {
        havingClauses.push('total_works >= ?');
        params.push(parseInt(min_works));
      }

      if (min_value) {
        havingClauses.push('total_contract_value >= ?');
        params.push(parseFloat(min_value));
      }

      if (min_rate) {
        havingClauses.push('milestone_completion_rate >= ?');
        params.push(parseFloat(min_rate));
      }

      const havingClause = havingClauses.length > 0
        ? `HAVING ${havingClauses.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          c.contractor_name,
          c.tenderrefno,
          c.agreement_no,
          c.email,
          c.mobileno,
          COUNT(DISTINCT w.id) as total_works,
          SUM(c.contract_awarded_amount) as total_contract_value,
          AVG(
            CASE 
              WHEN c.actual_date_of_completion IS NOT NULL THEN
                DATEDIFF(c.actual_date_of_completion, c.work_commencement_date)
              ELSE NULL
            END
          ) as avg_completion_days,
          SUM(
            CASE 
              WHEN m.status = 'Completed' THEN 1 
              ELSE 0 
            END
          ) as completed_milestones,
          SUM(
            CASE 
              WHEN m.status = 'Delayed' THEN 1 
              ELSE 0 
            END
          ) as delayed_milestones,
          COUNT(DISTINCT m.id) as total_milestones,
          CASE 
            WHEN COUNT(DISTINCT m.id) > 0 THEN
              ROUND(
                (SUM(
                  CASE 
                    WHEN m.status = 'Completed' THEN 1 
                    ELSE 0 
                  END
                ) / COUNT(DISTINCT m.id)) * 100, 
                2
              )
            ELSE 0
          END as milestone_completion_rate,
          (
            SELECT COUNT(*)
            FROM work w2
            JOIN contractors c2 ON w2.id = c2.work_id
            WHERE c2.contractor_name = c.contractor_name
            AND w2.isAwarded_flag = 1
          ) as active_projects,
          (
            SELECT COUNT(*)
            FROM work w2
            JOIN contractors c2 ON w2.id = c2.work_id
            WHERE c2.contractor_name = c.contractor_name
            AND c2.actual_date_of_completion IS NOT NULL
          ) as completed_projects
        FROM contractors c
        LEFT JOIN work w ON c.work_id = w.id
        LEFT JOIN milestones m ON w.id = m.work_id
        GROUP BY c.contractor_name, c.tenderrefno, c.agreement_no, c.email, c.mobileno
        ${havingClause}
        ORDER BY total_contract_value DESC
      `;

      const [results] = await db.execute(query, params);

      res.json({
        success: true,
        data: results,
        total: Array.isArray(results) ? results.length : 0
      });

    } catch (error) {
      console.error('Error fetching contractor performance:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching contractor performance report',
        error: error.message
      });
    }
  };

  // Dashboard Summary
  export const getDashboardSummary = async (req, res) => {
    try {
      const query = `
        SELECT 
  -- Works Statistics
  (SELECT COUNT(*) FROM work) as total_works,
  (SELECT COALESCE(SUM(work_cost), 0) FROM work) as total_project_cost,
  (SELECT COUNT(DISTINCT package_number) FROM work) as total_packages,
  (SELECT COALESCE(AVG(work_cost), 0) FROM work) as avg_work_cost,
  
  -- Contractors Statistics
  (SELECT COUNT(*) FROM contractors) as total_contractors,
  (SELECT COUNT(*) FROM contractors WHERE actual_date_of_completion IS NULL) as active_contractors,
  
  -- Milestones Statistics
  (SELECT COUNT(*) FROM milestones) as total_milestones,
  (SELECT COUNT(*) FROM milestones WHERE status = 'Completed') as completed_milestones,
  (SELECT COUNT(*) FROM milestones WHERE status = 'Delayed') as delayed_milestones,
  (SELECT COUNT(*) FROM milestones WHERE status = 'In Progress') as inprogress_milestones,
  
  -- Progress Statistics
  (
    SELECT COALESCE(SUM(earthwork_done_km), 0)
    FROM length_progress
  ) as total_earthwork_done,
  (
    SELECT COALESCE(SUM(lining_done_km), 0)
    FROM length_progress
  ) as total_lining_done,
  (
    SELECT COALESCE(SUM(target_km), 0)
    FROM work
  ) as total_target_km,
  
  -- Financial Statistics
  (SELECT COALESCE(SUM(contract_awarded_amount), 0) FROM contractors) as total_contract_value,
  (SELECT COALESCE(AVG(contract_awarded_amount), 0) FROM contractors) as avg_contract_value,
  (SELECT COUNT(DISTINCT w.id) FROM work w JOIN contractors c ON w.id = c.work_id WHERE c.actual_date_of_completion IS NOT NULL) as completed_works,
  (SELECT COUNT(DISTINCT w.id) FROM work w JOIN contractors c ON w.id = c.work_id WHERE c.actual_date_of_completion IS NULL AND w.isAwarded_flag = 1) as ongoing_works,
  
  -- Recent Activity
  (
    SELECT COUNT(*)
    FROM milestones
    WHERE DATE(created_at) = CURDATE()
  ) as today_milestones,
  (
    SELECT COUNT(*)
    FROM milestone_progress
    WHERE DATE(progress_date) = CURDATE()
  ) as today_progress_entries,
  (
    SELECT MAX(created_at)
    FROM milestones
  ) as last_milestone_created,
  (
    SELECT MAX(progress_date)
    FROM milestone_progress
  ) as last_progress_update
FROM dual;
      `;

      const [results] = await db.execute(query);

      res.json({
        success: true,
        data: results[0]
      });

    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard summary',
        error: error.message
      });
    }
  };

  // Export Report Data
  export const exportReportData = async (req, res) => {
    try {
      const { report_type, format = 'csv', ...filters } = req.query;

      let data = [];
      let filename = 'report';

      switch (report_type) {
        case 'comprehensive':
          const comprehensiveResult = await this.getComprehensiveReportData(filters);
          data = comprehensiveResult;
          filename = 'comprehensive-report';
          break;

        case 'financial':
          const financialResult = await this.getFinancialReportData(filters);
          data = financialResult;
          filename = 'financial-report';
          break;

        case 'contractor':
          const contractorResult = await this.getContractorPerformanceData(filters);
          data = contractorResult;
          filename = 'contractor-performance-report';
          break;

        case 'progress':
          const { work_id } = filters;
          if (!work_id) {
            return res.status(400).json({ error: 'Work ID is required for progress report' });
          }
          const progressResult = await this.getProgressReportData(work_id);
          data = [progressResult];
          filename = `progress-report-${work_id}`;
          break;

        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}-${Date.now()}.csv`);
        return res.send(csv);
      } else if (format === 'json') {
        return res.json({
          success: true,
          data: data,
          filename: `${filename}-${Date.now()}.json`
        });
      } else {
        return res.status(400).json({ error: 'Invalid format' });
      }

    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting report',
        error: error.message
      });
    }
  };

  // Helper methods for export
  export const getComprehensiveReportData = async (filters) => {
    const whereClauses = [];
    const params = [];

    // Add filters similar to main method
    if (filters.package_number) {
      whereClauses.push('w.package_number LIKE ?');
      params.push(`%${filters.package_number}%`);
    }

    const query = `
      SELECT 
        w.package_number,
        w.work_name,
        w.work_cost,
        w.target_km,
        c.contractor_name,
        c.contract_awarded_amount,
        c.work_commencement_date,
        c.work_stipulated_date
      FROM work w
      LEFT JOIN contractors c ON w.id = c.work_id
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
    `;

    const [results] = await db.execute(query, params);
    return results;
  };

  export const getFinancialReportData = async (filters) => {
    const query = `
      SELECT 
        w.package_number,
        w.work_name,
        c.contractor_name,
        c.contract_awarded_amount,
        c.work_commencement_date,
        c.work_stipulated_date,
        c.actual_date_of_completion
      FROM work w
      JOIN contractors c ON w.id = c.work_id
    `;

    const [results] = await db.execute(query);
    return results;
  };

  export const getContractorPerformanceData = async (filters) => {
    const query = `
      SELECT 
        contractor_name,
        COUNT(*) as total_works,
        SUM(contract_awarded_amount) as total_value,
        AVG(DATEDIFF(actual_date_of_completion, work_commencement_date)) as avg_days
      FROM contractors
      WHERE actual_date_of_completion IS NOT NULL
      GROUP BY contractor_name
    `;

    const [results] = await db.execute(query);
    return results;
  };

  export const getProgressReportData = async (workId) => {
    const query = `
      SELECT 
        w.work_name,
        w.package_number,
        w.target_km,
        w.work_cost,
        c.contractor_name
      FROM work w
      LEFT JOIN contractors c ON w.id = c.work_id
      WHERE w.id = ?
    `;

    const [results] = await db.execute(query, [workId]);
    return results[0];
  };

  convertToCSV: (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  // Get Length Progress Data
  export const getLengthProgress = async (req, res) => {
    try {
      const { work_id, start_date, end_date } = req.query;

      const whereClauses = [];
      const params = [];

      if (work_id) {
        whereClauses.push('work_id = ?');
        params.push(work_id);
      }

      if (start_date) {
        whereClauses.push('progress_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        whereClauses.push('progress_date <= ?');
        params.push(end_date);
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          id,
          work_id,
          start_km,
          end_km,
          earthwork_done_km,
          lining_done_km,
          progress_date,
          created_at
        FROM length_progress
        ${whereClause}
        ORDER BY progress_date DESC
      `;

      const [results] = await db.execute(query, params);

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('Error fetching length progress:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching length progress',
        error: error.message
      });
    }
  };

  // Get Kilometer Progress Data
  export const getKilometerProgress= async (req, res) => {
    try {
      const { work_id, milestone_type, status } = req.query;

      const whereClauses = [];
      const params = [];

      if (work_id) {
        whereClauses.push('work_id = ?');
        params.push(work_id);
      }

      if (milestone_type) {
        whereClauses.push('milestone_type = ?');
        params.push(milestone_type);
      }

      if (status) {
        whereClauses.push('status = ?');
        params.push(status);
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          id,
          work_id,
          milestone_type,
          target_km,
          target_date,
          actual_km,
          completed_date,
          status,
          created_at
        FROM kilometer_progress
        ${whereClause}
        ORDER BY target_date
      `;

      const [results] = await db.execute(query, params);

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      console.error('Error fetching kilometer progress:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching kilometer progress',
        error: error.message
      });
    }
  };

  // Get Monthly Progress Report
  export const getMonthlyProgress= async (req, res) => {
    try {
      const { year, month } = req.query;

      const yearParam = year || new Date().getFullYear();
      const monthParam = month || new Date().getMonth() + 1;

      const query = `
        SELECT 
          DATE_FORMAT(lp.progress_date, '%Y-%m') as month_year,
          SUM(lp.earthwork_done_km) as total_earthwork,
          SUM(lp.lining_done_km) as total_lining,
          COUNT(DISTINCT lp.work_id) as works_count,
          (
            SELECT COUNT(*)
            FROM milestones m
            WHERE DATE_FORMAT(m.created_at, '%Y-%m') = DATE_FORMAT(lp.progress_date, '%Y-%m')
            AND m.status = 'Completed'
          ) as milestones_completed
        FROM length_progress lp
        WHERE YEAR(lp.progress_date) = ? 
          AND MONTH(lp.progress_date) = ?
        GROUP BY DATE_FORMAT(lp.progress_date, '%Y-%m')
        ORDER BY lp.progress_date
      `;

      const [results] = await db.execute(query, [yearParam, monthParam]);

      res.json({
        success: true,
        data: results,
        year: yearParam,
        month: monthParam
      });

    } catch (error) {
      console.error('Error fetching monthly progress:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching monthly progress report',
        error: error.message
      });
    }
  };

  // Get Work Details with All Related Data
  export const getWorkDetails = async (req, res) => {
    try {
      const { work_id } = req.params;

      const query = `
        SELECT 
          w.*,
          c.*,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', m.id,
                'target_date', m.target_date,
                'actual_date', m.actual_date,
                'status', m.status,
                'remarks', m.remarks
              )
            )
            FROM milestones m
            WHERE m.work_id = w.id
          ) as milestones,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', lp.id,
                'start_km', lp.start_km,
                'end_km', lp.end_km,
                'earthwork_done_km', lp.earthwork_done_km,
                'lining_done_km', lp.lining_done_km,
                'progress_date', lp.progress_date
              )
            )
            FROM length_progress lp
            WHERE lp.work_id = w.id
          ) as length_progress,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', kp.id,
                'milestone_type', kp.milestone_type,
                'target_km', kp.target_km,
                'target_date', kp.target_date,
                'actual_km', kp.actual_km,
                'status', kp.status
              )
            )
            FROM kilometer_progress kp
            WHERE kp.work_id = w.id
          ) as kilometer_progress
        FROM work w
        LEFT JOIN contractors c ON w.id = c.work_id
        WHERE w.id = ?
      `;

      const [results] = await db.execute(query, [work_id]);

      if (!results || results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work not found'
        });
      }

      // Parse JSON strings
      const work = results[0];
      if (work.milestones) work.milestones = JSON.parse(work.milestones);
      if (work.length_progress) work.length_progress = JSON.parse(work.length_progress);
      if (work.kilometer_progress) work.kilometer_progress = JSON.parse(work.kilometer_progress);

      res.json({
        success: true,
        data: work
      });

    } catch (error) {
      console.error('Error fetching work details:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching work details',
        error: error.message
      });
    }
  };
export const getAllDivisions = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        w.division_id, 
        d.division_name,
        d.id as division_db_id
      FROM work w
      LEFT JOIN divisions d ON d.id = w.division_id
      WHERE w.division_id IS NOT NULL 
      AND w.division_id != ''
      AND d.division_name IS NOT NULL
      ORDER BY d.division_name
    `;
    
    const [results] = await db.execute(query);
    
    res.json({
      success: true,
      data: results.map(r => ({
        id: r.division_id,
        name: r.division_name || `Division ${r.division_id}`,
        db_id: r.division_db_id
      }))
    });
  } catch (error) {
    console.error('Error fetching divisions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching divisions',
      error: error.message
    });
  }
};
// Get Works by Division
export const getWorksByDivision = async (req, res) => {
  try {
    const { division_id } = req.query;
    
    if (!division_id) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const query = `
      SELECT 
        w.id as work_id,
        w.work_name,
        w.package_number,
        w.work_cost,
        w.target_km,
        w.division_id,
        d.division_name
      FROM work w
      LEFT JOIN divisions d ON d.id = w.division_id
      WHERE w.division_id = ?
      ORDER BY w.work_name
    `;
    
    const [results] = await db.execute(query, [division_id]);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching works by division:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching works by division',
      error: error.message
    });
  }
};
// Get Milestones by Work ID
export const getMilestonesByWork = async (req, res) => {
  try {
    const { work_id } = req.query;
    
    if (!work_id) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const query = `
      SELECT 
        id as milestone_id,
        work_stipulated_date,
        work_actualcompletion_date,
        status,
        remarks,
        package_number
      FROM milestones 
      WHERE work_id = ?
      ORDER BY work_stipulated_date
    `;
    
    const [results] = await db.execute(query, [work_id]);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching milestones by work:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching milestones by work',
      error: error.message
    });
  }
};

// Enhanced Comprehensive Report with hierarchical filters
export const getComprehensiveReport = async (req, res) => {
  try {
    const {
      work_id,
      package_number,
      contractor_name,
      start_date,
      end_date,
      status,
      component_id,
      division_id, 
      milestone_id
    } = req.query;

    const whereClauses = [];
    const params = [];

    if (division_id) {
      whereClauses.push('w.division_id = ?');
      params.push(division_id);
    }

    if (work_id) {
      whereClauses.push('w.id = ?');
      params.push(work_id);
    }

    if (package_number) {
      whereClauses.push('w.package_number LIKE ?');
      params.push(`%${package_number}%`);
    }

    if (contractor_name) {
      whereClauses.push('c.contractor_name LIKE ?');
      params.push(`%${contractor_name}%`);
    }

    if (start_date) {
      whereClauses.push('DATE(w.created_at) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereClauses.push('DATE(w.created_at) <= ?');
      params.push(end_date);
    }

    if (status) {
      whereClauses.push('w.isAwarded_flag = ?');
      params.push(status === 'awarded' ? 1 : 0);
    }

    if (component_id) {
      whereClauses.push('w.component_id = ?');
      params.push(component_id);
    }

    // Milestone filter (if needed)
    if (milestone_id) {
      whereClauses.push('w.id IN (SELECT work_id FROM milestones WHERE id = ?)');
      params.push(milestone_id);
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // ... rest of your existing query remains the same
    const query = `
       SELECT 
        w.id as work_id,
        w.work_name,
        w.package_number,
        w.work_cost,
        w.target_km,
        w.Area_Under_improved_Irrigation as improved_area,
        w.work_period_months,
        w.created_at,
        w.isAwarded_flag,
        w.isTenderCreated_flag,
        w.division_id, 
        c.contractor_name,
        c.tenderrefno,
        c.agreement_no,
        c.contract_awarded_amount,
        c.work_commencement_date,
        c.work_stipulated_date,
        c.actual_date_of_completion,
        c.mobileno,
        c.email,
        (
          SELECT COUNT(*) 
          FROM milestones m2 
          WHERE m2.work_id = w.id 
          AND m2.status = 'Completed'
        ) as completed_milestones,
        (
          SELECT COUNT(*) 
          FROM milestones m2 
          WHERE m2.work_id = w.id
        ) as total_milestones,
        (
          SELECT COALESCE(SUM(lp.earthwork_done_km), 0)
          FROM length_progress lp
          WHERE lp.work_id = w.id
        ) as total_earthwork_done,
        (
          SELECT COALESCE(SUM(lp.lining_done_km), 0)
          FROM length_progress lp
          WHERE lp.work_id = w.id
        ) as total_lining_done,
        (
          SELECT COALESCE(SUM(mp.quantity), 0)
          FROM milestone_progress mp
          JOIN milestones m3 ON mp.milestone_id = m3.id
          WHERE m3.work_id = w.id
        ) as total_progress_quantity,
        (
          SELECT MAX(mp.progress_date)
          FROM milestone_progress mp
          JOIN milestones m3 ON mp.milestone_id = m3.id
          WHERE m3.work_id = w.id
        ) as last_progress_date
      FROM work w
      LEFT JOIN contractors c ON w.id = c.work_id
      ${whereClause}
      GROUP BY w.id, c.id
      ORDER BY w.division_id, w.work_name
    `;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results,
      total: Array.isArray(results) ? results.length : 0,
      filters: req.query
    });

  } catch (error) {
    console.error('Error fetching comprehensive report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comprehensive report',
      error: error.message
    });
  }
};
