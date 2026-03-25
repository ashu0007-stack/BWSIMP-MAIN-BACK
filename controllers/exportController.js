// controllers/exportController.js
import db from "../config/db.js";
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// =============================
// EXPORT DEPARTMENT REPORT
// =============================
export const exportDepartmentReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    // Fetch department data
    const [departments] = await db.query(`
      SELECT 
        d.id as dept_id,
        d.dept_name,
        d.dept_code,
        COUNT(DISTINCT w.id) as total_works,
        COALESCE(SUM(w.work_cost), 0) as total_budget,
        (
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
        ) as total_milestones,
        (
          SELECT COUNT(*) 
          FROM milestones m 
          WHERE m.work_id IN (SELECT id FROM work WHERE dept_id = d.id) 
          AND m.status = 'Completed'
        ) as completed_milestones,
        (
          SELECT AVG(percentage) 
          FROM pdo_indicators pi 
          WHERE pi.id IN (
            SELECT DISTINCT indicator_id 
            FROM pdo_progress pp 
            WHERE pp.work_id IN (SELECT id FROM work WHERE dept_id = d.id)
          )
        ) as avg_pdo
      FROM departments d
      LEFT JOIN work w ON d.id = w.dept_id
      WHERE d.id IN (1, 2, 3)
      GROUP BY d.id, d.dept_name, d.dept_code
    `);

    if (format === 'excel') {
      // Generate Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Department Progress');

      worksheet.columns = [
        { header: 'Department', key: 'dept_name', width: 30 },
        { header: 'Total Works', key: 'total_works', width: 15 },
        { header: 'Total Budget', key: 'total_budget', width: 20 },
        { header: 'Milestones', key: 'total_milestones', width: 15 },
        { header: 'Completed', key: 'completed_milestones', width: 15 },
        { header: 'Progress %', key: 'progress', width: 15 },
        { header: 'Avg PDO %', key: 'avg_pdo', width: 15 }
      ];

      departments.forEach(dept => {
        const progress = dept.total_milestones > 0 
          ? Math.round((dept.completed_milestones / dept.total_milestones) * 100)
          : 0;

        worksheet.addRow({
          dept_name: dept.dept_name,
          total_works: dept.total_works,
          total_budget: dept.total_budget,
          total_milestones: dept.total_milestones,
          completed_milestones: dept.completed_milestones,
          progress: progress,
          avg_pdo: Math.round(dept.avg_pdo || 0)
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=department-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Generate PDF (simplified version)
      // You'll need to install pdfkit: npm install pdfkit
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=department-report.pdf');

      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text('Department Progress Report', { align: 'center' });
      doc.moveDown();
      
      departments.forEach(dept => {
        const progress = dept.total_milestones > 0 
          ? Math.round((dept.completed_milestones / dept.total_milestones) * 100)
          : 0;

        doc.fontSize(14).text(`${dept.dept_name} (${dept.dept_code})`);
        doc.fontSize(10)
          .text(`Total Works: ${dept.total_works}`)
          .text(`Total Budget: ₹${dept.total_budget.toLocaleString()}`)
          .text(`Milestones: ${dept.completed_milestones}/${dept.total_milestones} (${progress}%)`)
          .text(`Average PDO: ${Math.round(dept.avg_pdo || 0)}%`);
        doc.moveDown();
      });

      doc.end();
    }

  } catch (err) {
    console.error("❌ Error exporting department report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

// =============================
// EXPORT SCHEME REPORT
// =============================
export const exportSchemeReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    const [schemes] = await db.query(`
      SELECT 
        w.id,
        w.work_name,
        w.package_number,
        w.work_cost,
        d.dept_code,
        COUNT(m.id) as total_milestones,
        SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_milestones,
        ROUND(AVG(m.achievement_percentage)) as avg_progress
      FROM work w
      LEFT JOIN departments d ON w.dept_id = d.id
      LEFT JOIN milestones m ON w.id = m.work_id
      GROUP BY w.id
      ORDER BY avg_progress DESC
      LIMIT 50
    `);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Scheme Performance');

      worksheet.columns = [
        { header: 'Scheme Name', key: 'work_name', width: 40 },
        { header: 'Package No', key: 'package_number', width: 20 },
        { header: 'Department', key: 'dept_code', width: 15 },
        { header: 'Cost', key: 'work_cost', width: 20 },
        { header: 'Milestones', key: 'total_milestones', width: 15 },
        { header: 'Completed', key: 'completed_milestones', width: 15 },
        { header: 'Progress %', key: 'avg_progress', width: 15 }
      ];

      schemes.forEach(scheme => {
        worksheet.addRow({
          work_name: scheme.work_name,
          package_number: scheme.package_number,
          dept_code: scheme.dept_code,
          work_cost: scheme.work_cost,
          total_milestones: scheme.total_milestones || 0,
          completed_milestones: scheme.completed_milestones || 0,
          avg_progress: scheme.avg_progress || 0
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=scheme-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json(schemes);
    }

  } catch (err) {
    console.error("❌ Error exporting scheme report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

// =============================
// EXPORT FINANCIAL REPORT
// =============================
export const exportFinancialReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    const [financial] = await db.query(`
      SELECT 
        fe.financial_year,
        d.dept_name,
        d.dept_code,
        fe.budget_fy,
        fe.cumulative_fy,
        fe.utilization_percent,
        fe.variance,
        fe.cfms_head
      FROM fin_expenditures fe
      LEFT JOIN departments d ON fe.department_id = d.id
      ORDER BY fe.utilization_percent DESC
    `);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Financial Report');

      worksheet.columns = [
        { header: 'Financial Year', key: 'financial_year', width: 15 },
        { header: 'Department', key: 'dept_name', width: 30 },
        { header: 'Budget', key: 'budget_fy', width: 20 },
        { header: 'Expenditure', key: 'cumulative_fy', width: 20 },
        { header: 'Utilization %', key: 'utilization_percent', width: 15 },
        { header: 'Variance', key: 'variance', width: 20 },
        { header: 'CFMS Head', key: 'cfms_head', width: 25 }
      ];

      financial.forEach(item => {
        worksheet.addRow({
          financial_year: item.financial_year,
          dept_name: item.dept_name,
          budget_fy: item.budget_fy,
          cumulative_fy: item.cumulative_fy,
          utilization_percent: item.utilization_percent,
          variance: item.variance,
          cfms_head: item.cfms_head
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json(financial);
    }

  } catch (err) {
    console.error("❌ Error exporting financial report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

// =============================
// EXPORT PDO REPORT
// =============================
export const exportPDOReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    const [pdoData] = await db.query(`
      SELECT 
        pi.name,
        pi.category,
        pi.unit,
        pi.target,
        pi.current,
        pi.percentage,
        pi.female_target,
        pi.youth_target
      FROM pdo_indicators pi
      ORDER BY pi.percentage ASC
    `);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('PDO Report');

      worksheet.columns = [
        { header: 'Indicator', key: 'name', width: 40 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Unit', key: 'unit', width: 15 },
        { header: 'Target', key: 'target', width: 15 },
        { header: 'Current', key: 'current', width: 15 },
        { header: 'Achievement %', key: 'percentage', width: 15 },
        { header: 'Female Target', key: 'female_target', width: 15 },
        { header: 'Youth Target', key: 'youth_target', width: 15 }
      ];

      pdoData.forEach(item => {
        worksheet.addRow({
          name: item.name,
          category: item.category,
          unit: item.unit,
          target: item.target,
          current: item.current,
          percentage: item.percentage,
          female_target: item.female_target,
          youth_target: item.youth_target
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=pdo-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json(pdoData);
    }

  } catch (err) {
    console.error("❌ Error exporting PDO report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

// =============================
// EXPORT COMPREHENSIVE REPORT
// =============================
export const exportComprehensiveReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    // Get all data
    const [stats] = await db.query(`SELECT COUNT(*) as total FROM work`);
    const [departments] = await db.query(`SELECT dept_code, COUNT(*) as count FROM work GROUP BY dept_id`);
    const [pdo] = await db.query(`SELECT AVG(percentage) as avg_pdo FROM pdo_indicators`);
    const [risk] = await db.query(`SELECT COUNT(*) as at_risk FROM milestones WHERE status = 'Delayed'`);

    const comprehensiveData = {
      stats: {
        totalSchemes: stats[0].total,
        averagePDO: Math.round(pdo[0].avg_pdo || 0),
        atRisk: risk[0].at_risk,
        departmentBreakdown: departments
      },
      generatedAt: new Date().toISOString()
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      
      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Metric', 'Value']);
      summarySheet.addRow(['Total Schemes', comprehensiveData.stats.totalSchemes]);
      summarySheet.addRow(['Average PDO', comprehensiveData.stats.averagePDO + '%']);
      summarySheet.addRow(['At Risk', comprehensiveData.stats.atRisk]);
      
      // Department Sheet
      const deptSheet = workbook.addWorksheet('Departments');
      deptSheet.columns = [
        { header: 'Department', key: 'dept_code', width: 20 },
        { header: 'Scheme Count', key: 'count', width: 15 }
      ];
      departments.forEach(dept => deptSheet.addRow(dept));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=comprehensive-report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json(comprehensiveData);
    }

  } catch (err) {
    console.error("❌ Error exporting comprehensive report:", err);
    res.status(500).json({ error: "Failed to export report", details: err.message });
  }
};

export default {
  exportDepartmentReport,
  exportSchemeReport,
  exportFinancialReport,
  exportPDOReport,
  exportComprehensiveReport
};