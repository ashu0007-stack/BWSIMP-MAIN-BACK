import db from "../../config/db.js";
import fs from "fs";
import path from "path";

// Helper function to convert empty strings to null
const cleanData = (data) => {
  const cleaned = { ...data };
  for (const key in cleaned) {
    if (cleaned[key] === '' || cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  }
  return cleaned;
};

// Meetings Controllers
export const meetingsController = {
  createMeeting: async (req, res) => {
    try {
      console.log('📨 Backend - Received body:', req.body);
      console.log('📁 Backend - Received files:', req.files);

      const cleanedData = cleanData(req.body);

      const {
        wua_id, meeting_date, agenda_topic, venue,
        attendance_male, attendance_female, meeting_outcome, training_feedback,
        water_tax_collected, water_tax_remarks, maintenance_fund_received, maintenance_fund_remarks,
        ofd_work_identified, communication_done, communicated_to, status, created_by
      } = cleanedData;

      if (!wua_id) {
        return res.status(400).json({ error: "WUA ID is required" });
      }

      // Get WUA name for display
      const [wuaData] = await db.execute("SELECT wua_name FROM wua WHERE id = ?", [wua_id]);
      const wua_name = wuaData.length > 0 ? wuaData[0].wua_name : 'Unknown WUA';

      const total_attendance = (parseInt(attendance_male) || 0) + (parseInt(attendance_female) || 0);

      console.log('💾 Inserting meeting data...');

      // Insert meeting data
      const [result] = await db.execute(
        `INSERT INTO meetings (
        wua_id, wua_name, meeting_date, agenda_topic, venue,
        attendance_male, attendance_female, total_attendance, meeting_outcome, training_feedback,
        water_tax_collected, water_tax_remarks, maintenance_fund_received, maintenance_fund_remarks,
        ofd_work_identified, communication_done, communicated_to, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wua_id, wua_name, meeting_date, agenda_topic, venue,
          attendance_male, attendance_female, total_attendance,
          meeting_outcome, training_feedback,
          water_tax_collected, water_tax_remarks, maintenance_fund_received, maintenance_fund_remarks,
          ofd_work_identified, communication_done, communicated_to, status, created_by
        ]
      );

      const meetingId = result.insertId;
      console.log('✅ Meeting created with ID:', meetingId);

      // ✅ DOCUMENTS INSERTION CODE
      if (req.files && req.files.length > 0) {
        console.log(`📄 Processing ${req.files.length} documents for meeting ${meetingId}`);

        const uploadsDir = path.join(process.cwd(), 'uploads', 'meetings');

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
          console.log('📁 Created uploads directory:', uploadsDir);
        }

        let savedDocumentsCount = 0;

        for (const file of req.files) {
          try {
            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const uniqueFileName = `meeting_${meetingId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
            const filePath = path.join(uploadsDir, uniqueFileName);

            console.log(`💾 Saving document: ${file.originalname} as ${uniqueFileName}`);
            console.log(`📁 File path: ${filePath}`);
            console.log(`📏 File size: ${file.size} bytes`);
            console.log(`📄 MIME type: ${file.mimetype}`);

            // Move file to uploads directory
            if (file.buffer) {
              fs.writeFileSync(filePath, file.buffer);
              console.log(`✅ File saved to disk: ${filePath}`);
            } else {
              console.log('❌ No file buffer found');
              continue;
            }

            // Insert document record into meeting_documents table
            console.log('💾 Inserting document record into database...');
            const [docResult] = await db.execute(
              `INSERT INTO meeting_documents 
            (meeting_id, original_name, file_name, file_path, file_size, mime_type) 
            VALUES (?, ?, ?, ?, ?, ?)`,
              [
                meetingId,
                file.originalname,
                uniqueFileName,
                filePath,
                file.size,
                file.mimetype
              ]
            );

            console.log(`✅ Document saved to database with ID: ${docResult.insertId}`);
            savedDocumentsCount++;

          } catch (fileError) {
            console.error('❌ Error saving document:', fileError);
            console.error('File error details:', fileError.message);
            // Continue with other files even if one fails
          }
        }

        console.log(`📊 Document processing completed: ${savedDocumentsCount}/${req.files.length} documents saved`);
      } else {
        console.log('📭 No documents received for this meeting');
      }

      res.json({
        message: "Meeting created successfully",
        id: meetingId,
        documents_saved: req.files ? req.files.length : 0
      });

    } catch (err) {
      console.error("Create Meeting Error:", err);
      console.error("Error details:", err.message);
      res.status(500).json({ error: "Failed to create meeting: " + err.message });
    }
  },
  getAllMeetings: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT m.*, w.wua_name,
               (SELECT COUNT(*) FROM meeting_documents WHERE meeting_id = m.id) as document_count
        FROM meetings m 
        LEFT JOIN wua w ON m.wua_id = w.id 
        ORDER BY m.meeting_date DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error("Get Meetings Error:", err);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  },

  getMeetingsByWUA: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT m.*, w.wua_name
        FROM meetings m 
        LEFT JOIN wua w ON m.wua_id = w.id 
        WHERE m.wua_id = ?
        ORDER BY m.meeting_date DESC
      `, [req.params.wua_id]);
      res.json(rows);
    } catch (err) {
      console.error("Get Meetings by WUA Error:", err);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  },

  getMeetingById: async (req, res) => {
    try {
      const [meetingRows] = await db.execute("SELECT * FROM meetings WHERE id = ?", [req.params.id]);

      if (meetingRows.length === 0) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get documents for this meeting
      const [documentRows] = await db.execute(
        "SELECT * FROM meeting_documents WHERE meeting_id = ?",
        [req.params.id]
      );

      const meeting = meetingRows[0];

      // Fix date format for frontend
      if (meeting.meeting_date) {
        const date = new Date(meeting.meeting_date);
        date.setDate(date.getDate() + 1);
        meeting.meeting_date = date.toISOString().split('T')[0];
      }

      res.json({
        ...meeting,
        documents: documentRows
      });
    } catch (err) {
      console.error("Get Meeting Error:", err);
      res.status(500).json({ error: "Failed to fetch meeting" });
    }
  },

  updateMeeting: async (req, res) => {
    try {
      const meetingId = req.params.id;
      const cleanedData = cleanData(req.body);

      const {
        wua_id, meeting_date, agenda_topic, venue,
        attendance_male, attendance_female, meeting_outcome, training_feedback,
        water_tax_collected, water_tax_remarks, maintenance_fund_received, maintenance_fund_remarks,
        ofd_work_identified, communication_done, communicated_to, status
      } = cleanedData;

      // Get WUA name for display
      const [wuaData] = await db.execute("SELECT wua_name FROM wua WHERE id = ?", [wua_id]);
      const wua_name = wuaData.length > 0 ? wuaData[0].wua_name : 'Unknown WUA';

      const total_attendance = (parseInt(attendance_male) || 0) + (parseInt(attendance_female) || 0);

      // Update meeting data
      const [result] = await db.execute(
        `UPDATE meetings SET 
          wua_id = ?, wua_name = ?, meeting_date = ?, agenda_topic = ?, venue = ?,
          attendance_male = ?, attendance_female = ?, total_attendance = ?, meeting_outcome = ?, training_feedback = ?,
          water_tax_collected = ?, water_tax_remarks = ?, maintenance_fund_received = ?, maintenance_fund_remarks = ?,
          ofd_work_identified = ?, communication_done = ?, communicated_to = ?, status = ?
         WHERE id = ?`,
        [
          wua_id, wua_name, meeting_date, agenda_topic, venue,
          attendance_male, attendance_female, total_attendance,
          meeting_outcome, training_feedback,
          water_tax_collected, water_tax_remarks, maintenance_fund_received, maintenance_fund_remarks,
          ofd_work_identified, communication_done, communicated_to, status,
          meetingId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      res.json({ message: "Meeting updated successfully" });
    } catch (err) {
      console.error("Update Meeting Error:", err);
      res.status(500).json({ error: "Failed to update meeting" });
    }
  },

  deleteMeeting: async (req, res) => {
    try {
      // Get documents for this meeting to delete files
      const [docRows] = await db.execute(
        "SELECT * FROM meeting_documents WHERE meeting_id = ?",
        [req.params.id]
      );

      // Delete documents from database
      await db.execute("DELETE FROM meeting_documents WHERE meeting_id = ?", [req.params.id]);

      // Delete meeting
      const [result] = await db.execute("DELETE FROM meetings WHERE id = ?", [req.params.id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Delete physical files
      docRows.forEach(doc => {
        try {
          if (fs.existsSync(doc.file_path)) {
            fs.unlinkSync(doc.file_path);
          }
        } catch (fileError) {
          console.error("Error deleting file:", fileError);
        }
      });

      res.json({ message: "Meeting deleted successfully" });
    } catch (err) {
      console.error("Delete Meeting Error:", err);
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  },

  updateMeetingStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['Draft', 'Submitted', 'Approved'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [result] = await db.execute(
        "UPDATE meetings SET status = ? WHERE id = ?",
        [status, req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      res.json({ message: `Meeting status updated to ${status}` });
    } catch (err) {
      console.error("Update Meeting Status Error:", err);
      res.status(500).json({ error: "Failed to update meeting status" });
    }
  },

  deleteDocument: async (req, res) => {
    try {
      // Get document info before deleting
      const [docRows] = await db.execute(
        "SELECT * FROM meeting_documents WHERE id = ?",
        [req.params.id]
      );

      if (docRows.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      const document = docRows[0];

      // Delete from database
      const [result] = await db.execute(
        "DELETE FROM meeting_documents WHERE id = ?",
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete physical file
      try {
        if (fs.existsSync(document.file_path)) {
          fs.unlinkSync(document.file_path);
        }
      } catch (fileError) {
        console.error("Error deleting file:", fileError);
      }

      res.json({ message: "Document deleted successfully" });
    } catch (err) {
      console.error("Delete Document Error:", err);
      res.status(500).json({ error: "Failed to delete document" });
    }
  },

  downloadDocument: async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM meeting_documents WHERE id = ?",
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      const document = rows[0];

      if (!fs.existsSync(document.file_path)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(document.file_path, document.original_name);
    } catch (err) {
      console.error("Download Document Error:", err);
      res.status(500).json({ error: "Failed to download document" });
    }
  }
};

// Reports Controllers
export const reportsController = {
  getSummary: async (req, res) => {
    try {
      console.log("📊 Fetching comprehensive reports summary...");

      // Get all basic counts
      const counts = {
        total_wuas: 0,
        total_vlcs: 0,
        total_slcs: 0,
        total_farmers: 0,
        total_meetings: 0,
        total_wua_master: 0
      };

      // Get counts from all tables with proper error handling
      const tableQueries = [
        { key: 'total_wuas', query: "SELECT COUNT(*) as total FROM wua" },
        { key: 'total_vlcs', query: "SELECT COUNT(*) as total FROM vlc" },
        { key: 'total_slcs', query: "SELECT COUNT(*) as total FROM slc" },
        { key: 'total_farmers', query: "SELECT COUNT(*) as total FROM vlc_executive_members" },
        { key: 'total_meetings', query: "SELECT COUNT(*) as total FROM meetings" },
        { key: 'total_wua_master', query: "SELECT COUNT(*) as total FROM wua_master" }
      ];

      for (const table of tableQueries) {
        try {
          const [result] = await db.execute(table.query);
          counts[table.key] = result[0].total;
          console.log(`✅ ${table.key}: ${result[0].total}`);
        } catch (err) {
          console.warn(`❌ ${table.key} query failed:`, err.message);
        }
      }

      // Get detailed statistics
      const stats = {
        wua_status: [],
        vlc_status: [],
        farmers_stats: { by_gender: [], by_category: [] },
        meetings_stats: {
          total_meetings: counts.total_meetings,
          total_attendance: 0,
          by_month: [],
          by_wua: []
        },
        water_tax_summary: {
          total_collected: 0,
          total_deposited: 0,
          total_retained: 0
        },
        completion_rates: {
          wua_with_vlc: 0,
          wua_with_slc: 0,
          wua_with_meetings: 0
        }
      };

      // WUA Status Distribution
      try {
        const [wuaStatus] = await db.execute(`
          SELECT 
            COALESCE(status, 'active') as status, 
            COUNT(*) as count 
          FROM wua 
          GROUP BY COALESCE(status, 'active')
          ORDER BY count DESC
        `);
        stats.wua_status = wuaStatus;
      } catch (err) {
        console.warn("WUA status query failed:", err.message);
      }

      // VLC Status Distribution
      try {
        const [vlcStatus] = await db.execute(`
          SELECT 
            CASE 
              WHEN vlc_formed = 1 THEN 'Active'
              WHEN vlc_formed = 0 THEN 'Inactive'
              ELSE 'Unknown'
            END as status,
            COUNT(*) as count
          FROM vlc
          GROUP BY vlc_formed
          ORDER BY count DESC
        `);
        stats.vlc_status = vlcStatus;
      } catch (err) {
        console.warn("VLC status query failed:", err.message);
      }

      // Farmers Statistics
      try {
        // Farmers by Gender
        const [farmersByGender] = await db.execute(`
          SELECT 
            COALESCE(gender, 'Not Specified') as gender,
            COUNT(*) as count
          FROM farmers 
          GROUP BY COALESCE(gender, 'Not Specified')
          ORDER BY count DESC
        `);
        stats.farmers_stats.by_gender = farmersByGender;

        // Farmers by Category
        const [farmersByCategory] = await db.execute(`
          SELECT 
            COALESCE(category, 'General') as category,
            COUNT(*) as count
          FROM farmers 
          GROUP BY COALESCE(category, 'General')
          ORDER BY count DESC
        `);
        stats.farmers_stats.by_category = farmersByCategory;
      } catch (err) {
        console.warn("Farmers stats query failed:", err.message);
      }

      // Meetings Statistics
      try {
        // Total attendance
        const [attendance] = await db.execute(`
          SELECT 
            COALESCE(SUM(total_attendance), 0) as total_attendance
          FROM meetings
        `);
        stats.meetings_stats.total_attendance = attendance[0].total_attendance;

        // Meetings by month (last 6 months)
        const [meetingsByMonth] = await db.execute(`
          SELECT 
            DATE_FORMAT(meeting_date, '%Y-%m') as month,
            COUNT(*) as meeting_count,
            SUM(total_attendance) as total_attendance
          FROM meetings 
          WHERE meeting_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          GROUP BY DATE_FORMAT(meeting_date, '%Y-%m')
          ORDER BY month DESC
        `);
        stats.meetings_stats.by_month = meetingsByMonth;

        // Meetings by WUA
        const [meetingsByWUA] = await db.execute(`
          SELECT 
            w.wua_name,
            COUNT(m.id) as meeting_count,
            SUM(m.total_attendance) as total_attendance
          FROM meetings m
          LEFT JOIN wua w ON m.wua_id = w.id
          GROUP BY w.wua_name, m.wua_id
          ORDER BY meeting_count DESC
          LIMIT 10
        `);
        stats.meetings_stats.by_wua = meetingsByWUA;
      } catch (err) {
        console.warn("Meetings stats query failed:", err.message);
      }

      // Water Tax Summary
      try {
        const [waterTax] = await db.execute(`
          SELECT 
            COALESCE(SUM(total_tax), 0) as total_collected,
            COALESCE(SUM(deposited_govt), 0) as total_deposited,
            COALESCE(SUM(retained_wua), 0) as total_retained
          FROM slc_water_tax
        `);
        stats.water_tax_summary = waterTax[0];
      } catch (err) {
        console.warn("Water tax query failed:", err.message);
      }

      // Completion Rates
      try {
        const [completionRates] = await db.execute(`
          SELECT 
            COUNT(DISTINCT w.id) as total_wuas,
            COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN w.id END) as wua_with_vlc,
            COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN w.id END) as wua_with_slc,
            COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN w.id END) as wua_with_meetings
          FROM wua w
          LEFT JOIN vlc v ON v.wua_id = w.id
          LEFT JOIN slc s ON s.wua_id = w.id
          LEFT JOIN meetings m ON m.wua_id = w.id
        `);

        const rates = completionRates[0];
        stats.completion_rates = {
          wua_with_vlc: rates.total_wuas > 0 ? Math.round((rates.wua_with_vlc / rates.total_wuas) * 100) : 0,
          wua_with_slc: rates.total_wuas > 0 ? Math.round((rates.wua_with_slc / rates.total_wuas) * 100) : 0,
          wua_with_meetings: rates.total_wuas > 0 ? Math.round((rates.wua_with_meetings / rates.total_wuas) * 100) : 0
        };
      } catch (err) {
        console.warn("Completion rates query failed:", err.message);
      }

      console.log("✅ All reports data fetched successfully");

      res.json({
        success: true,
        summary: counts,
        statistics: stats,
        message: "Comprehensive report generated successfully"
      });

    } catch (err) {
      console.error("❌ Get Reports Summary Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch reports summary",
        details: err.message
      });
    }
  },

  getMeetingsDetailed: async (req, res) => {
    try {
      console.log("📋 Fetching meetings detailed report...");

      const [rows] = await db.execute(`
        SELECT 
          m.*,
          w.wua_name,
          wm.division_name,
          wm.subdivision_name,
          (SELECT COUNT(*) FROM meeting_documents WHERE meeting_id = m.id) as document_count,
          ROUND((m.attendance_female / NULLIF(m.total_attendance, 0)) * 100, 2) as female_percentage,
          CASE 
            WHEN m.total_attendance > 100 THEN 'High'
            WHEN m.total_attendance > 50 THEN 'Medium'
            ELSE 'Low'
          END as attendance_level
        FROM meetings m
        LEFT JOIN wua w ON m.wua_id = w.id
        LEFT JOIN wua_master wm ON w.wua_name = wm.wua_name
        ORDER BY m.meeting_date DESC
      `);

      console.log(`✅ Meetings Detailed: Found ${rows.length} records`);

      // Calculate meeting statistics
      const stats = rows.reduce((acc, meeting) => {
        acc.total_meetings++;
        acc.total_attendance += meeting.total_attendance || 0;
        acc.total_male += meeting.attendance_male || 0;
        acc.total_female += meeting.attendance_female || 0;

        if (meeting.water_tax_collected === 'Yes') acc.meetings_with_tax++;
        if (meeting.maintenance_fund_received === 'Yes') acc.meetings_with_fund++;
        if (meeting.ofd_work_identified === 'Yes') acc.meetings_with_ofd++;

        return acc;
      }, {
        total_meetings: 0,
        total_attendance: 0,
        total_male: 0,
        total_female: 0,
        meetings_with_tax: 0,
        meetings_with_fund: 0,
        meetings_with_ofd: 0
      });

      res.json({
        success: true,
        data: rows,
        statistics: stats,
        count: rows.length
      });
    } catch (err) {
      console.error("Get Meetings Detailed Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch meetings detailed report",
        details: err.message
      });
    }
  },

  getDashboardStats: async (req, res) => {
    try {
      console.log("📈 Fetching dashboard statistics...");

      // Get real-time counts
      const [wuaCount] = await db.execute("SELECT COUNT(*) as total FROM wua");
      const [vlcCount] = await db.execute("SELECT COUNT(*) as total FROM vlc");
      const [slcCount] = await db.execute("SELECT COUNT(*) as total FROM slc");
      const [farmersCount] = await db.execute("SELECT COUNT(*) as total FROM farmers");
      const [meetingsCount] = await db.execute("SELECT COUNT(*) as total FROM meetings");

      // Get recent activities
      const [recentMeetings] = await db.execute(`
        SELECT m.*, w.wua_name 
        FROM meetings m 
        LEFT JOIN wua w ON m.wua_id = w.id 
        ORDER BY m.created_at DESC 
        LIMIT 5
      `);

      // Get water tax overview
      const [waterTaxOverview] = await db.execute(`
        SELECT 
          COALESCE(SUM(total_tax), 0) as total_collected,
          COUNT(DISTINCT slc_id) as slcs_collecting_tax
        FROM slc_water_tax
      `);

      // Get completion rates
      const [completionRates] = await db.execute(`
        SELECT 
          COUNT(*) as total_wuas,
          COUNT(DISTINCT v.wua_id) as wuas_with_vlc,
          COUNT(DISTINCT s.wua_id) as wuas_with_slc,
          COUNT(DISTINCT m.wua_id) as wuas_with_meetings
        FROM wua w
        LEFT JOIN vlc v ON v.wua_id = w.id
        LEFT JOIN slc s ON s.wua_id = w.id
        LEFT JOIN meetings m ON m.wua_id = w.id
      `);

      const rates = completionRates[0];

      res.json({
        success: true,
        data: {
          counts: {
            wuas: wuaCount[0].total,
            vlcs: vlcCount[0].total,
            slcs: slcCount[0].total,
            farmers: farmersCount[0].total,
            meetings: meetingsCount[0].total
          },
          water_tax: waterTaxOverview[0],
          completion_rates: {
            wua_with_vlc: rates.total_wuas > 0 ? Math.round((rates.wuas_with_vlc / rates.total_wuas) * 100) : 0,
            wua_with_slc: rates.total_wuas > 0 ? Math.round((rates.wuas_with_slc / rates.total_wuas) * 100) : 0,
            wua_with_meetings: rates.total_wuas > 0 ? Math.round((rates.wuas_with_meetings / rates.total_wuas) * 100) : 0
          },
          recent_activities: recentMeetings
        }
      });
    } catch (err) {
      console.error("Get Dashboard Stats Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
        details: err.message
      });
    }
  },


  exportReport: async (req, res) => {
    try {
      const { type, format = 'json' } = req.query;

      let data;
      switch (type) {
        case 'wua':
          data = await db.execute("SELECT * FROM wua ORDER BY created_at DESC");
          break;
        case 'vlc':
          data = await db.execute("SELECT * FROM  ORDER BY created_at DESC");
          break;
        case 'slc':
          data = await db.execute("SELECT * FROM slc ORDER BY created_at DESC");
          break;
        case 'meetings':
          data = await db.execute("SELECT * FROM meetings ORDER BY meeting_date DESC");
          break;
        case 'water-tax':
          data = await db.execute("SELECT * FROM slc_water_tax ORDER BY year DESC");
          break;
        default:
          return res.status(400).json({ error: "Invalid report type" });
      }

      if (format === 'csv') {
        // Basic CSV conversion (you can enhance this)
        const csv = convertToCSV(data[0]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
        return res.send(csv);
      }

      res.json({
        success: true,
        type: type,
        data: data[0],
        exported_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Export Report Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to export report",
        details: err.message
      });
    }
  },

  generateStats: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();

      // Calculate actual statistics from database
      const [totalWuas] = await db.execute("SELECT COUNT(*) as count FROM wua");
      const [functionalWuas] = await db.execute("SELECT COUNT(*) as count FROM wua WHERE status = 'active'");
      const [taxCollectingWuas] = await db.execute(`
        SELECT COUNT(DISTINCT s.wua_id) as count 
        FROM slc_water_tax wt 
        JOIN slc s ON wt.slc_id = s.id 
        WHERE wt.total_tax > 0
      `);
      const [totalWaterTax] = await db.execute("SELECT COALESCE(SUM(total_tax), 0) as total FROM slc_water_tax");
      const [totalFarmers] = await db.execute("SELECT COUNT(*) as count FROM farmers");
      const [womenFarmers] = await db.execute("SELECT COUNT(*) as count FROM farmers WHERE gender = 'Female'");
      const [womenExecutives] = await db.execute("SELECT COUNT(*) as count FROM slc_executive_members -- WHERE gender = 'Female'");

      // Meeting participation for current year
      const [meetingParticipation] = await db.execute(`
        SELECT COALESCE(SUM(total_attendance), 0) as total_participation
        FROM meetings 
       -- WHERE YEAR(meeting_date) = ? -- AND status = 'Approved'
      `, [currentYear]);

      // Additional meeting statistics
      const [totalMeetings] = await db.execute(`
        SELECT COUNT(*) as total_meetings
        FROM meetings 
        WHERE YEAR(meeting_date) = ? -- AND status = 'Approved'
      `, [currentYear]);

      const functionalPercent = totalWuas[0].count > 0 ?
        (functionalWuas[0].count / totalWuas[0].count * 100).toFixed(2) : 0;

      // Update or insert PIM impact data
      await db.execute(
        `INSERT INTO pim_impact_reports (
          year, wuas_formed, wuas_functional_percent, wuas_collecting_tax,
          water_tax_collected, farmers_participation_meetings, women_members,
          women_ec_members
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          wuas_formed = VALUES(wuas_formed),
          wuas_functional_percent = VALUES(wuas_functional_percent),
          wuas_collecting_tax = VALUES(wuas_collecting_tax),
          water_tax_collected = VALUES(water_tax_collected),
          farmers_participation_meetings = VALUES(farmers_participation_meetings),
          women_members = VALUES(women_members),
          women_ec_members = VALUES(women_ec_members)`,
        [
          currentYear,
          totalWuas[0].count,
          functionalPercent,
          taxCollectingWuas[0].count,
          totalWaterTax[0].total,
          meetingParticipation[0].total_participation,
          womenFarmers[0].count,
          womenExecutives[0].count
        ]
      );

      res.json({
        message: "Statistics generated successfully",
        data: {
          year: currentYear,
          total_waas: totalWuas[0].count,
          functional_percent: functionalPercent,
          tax_collecting_waas: taxCollectingWuas[0].count,
          total_water_tax: totalWaterTax[0].total,
          total_farmers: totalFarmers[0].count,
          farmers_participation_meetings: meetingParticipation[0].total_participation,
          women_farmers: womenFarmers[0].count,
          women_executives: womenExecutives[0].count,
          total_meetings: totalMeetings[0].total_meetings
        }
      });
    } catch (err) {
      console.error("Generate Stats Error:", err);
      res.status(500).json({ error: "Failed to generate statistics" });
    }
  },

  getWUADetailed: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT 
          w.*,
          (SELECT COUNT(*) FROM vlc WHERE wua_id = w.id) as vlc_count,
          (SELECT COUNT(*) FROM farmers WHERE wua_id = w.id) as farmers_count,
          (SELECT COUNT(*) FROM slc WHERE wua_id = w.id) as slc_count
        FROM wua w
        ORDER BY w.created_at DESC
      `);

      console.log(`WUA Detailed Report: Found ${rows.length} records`);
      res.json(rows);
    } catch (err) {
      console.error("Get WUA Detailed Report Error:", err);
      res.status(500).json({ error: "Failed to fetch WUA detailed report" });
    }
  },

  getVLCDetailed: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT 
          v.*,
          w.wua_name,
          w.wua_id as parent_wua_id,
          (SELECT COUNT(*) FROM vlc_gb_members WHERE vlc_id = v.id) as gb_members,
          (SELECT COUNT(*) FROM vlc_executive_members WHERE vlc_id = v.id) as exec_members
        FROM vlc v
        LEFT JOIN wua w ON v.wua_id = w.id
        ORDER BY v.created_at DESC
      `);

      console.log(`VLC Detailed Report: Found ${rows.length} records`);
      res.json(rows);
    } catch (err) {
      console.error("Get VLC Detailed Report Error:", err);
      res.status(500).json({ error: "Failed to fetch VLC detailed report" });
    }
  },

  getSLCDetailed: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT 
          s.*,
          w.wua_name,
          w.wua_id as parent_wua_id,
          (SELECT COUNT(*) FROM slc_gb_members WHERE slc_id = s.id) as gb_members,
          (SELECT COUNT(*) FROM slc_executive_members WHERE slc_id = s.id) as exec_members,
          (SELECT COALESCE(SUM(total_tax), 0) FROM slc_water_tax WHERE slc_id = s.id) as total_water_tax
        FROM slc s
        LEFT JOIN wua w ON s.wua_id = w.id
        ORDER BY s.created_at DESC
      `);

      console.log(`SLC Detailed Report: Found ${rows.length} records`);
      res.json(rows);
    } catch (err) {
      console.error("Get SLC Detailed Report Error:", err);
      res.status(500).json({ error: "Failed to fetch SLC detailed report" });
    }
  },

  getWaterTaxReport: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT 
          wt.*,
          s.slc_name,
          w.wua_name
        FROM slc_water_tax wt
        LEFT JOIN slc s ON wt.slc_id = s.id
        LEFT JOIN wua w ON s.wua_id = w.id
        ORDER BY wt.year DESC, wt.created_at DESC
      `);

      console.log(`Water Tax Report: Found ${rows.length} records`);
      res.json(rows);
    } catch (err) {
      console.error("Get Water Tax Report Error:", err);
      res.status(500).json({ error: "Failed to fetch water tax report" });
    }
  },

  getPIMImpactDetailed: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT * FROM pim_impact_reports 
        ORDER BY year DESC
      `);

      res.json(rows);
    } catch (err) {
      console.error("Get PIM Impact Detailed Error:", err);
      res.status(500).json({ error: "Failed to fetch PIM impact data" });
    }
  },

  savePIMImpactData: async (req, res) => {
    try {
      const {
        year, pim_coverage_area, wuas_formed, wuas_functional_percent, wuas_collecting_tax,
        wuas_depositing_tax, farmers_participation_meetings, women_members, women_ec_members,
        training_conducted, water_scheduling_meetings, conflicts_resolved, irrigation_intensity,
        irrigated_area, water_productivity, cropping_intensity, average_crop_yield,
        average_farm_income, tail_end_farmers_benefitted, water_tax_collected,
        maintenance_work_executed, migration_labour_percent, canal_maintenance_km,
        field_channel_maintenance_km
      } = req.body;

      const [result] = await db.execute(
        `INSERT INTO pim_impact_reports (
          year, pim_coverage_area, wuas_formed, wuas_functional_percent, wuas_collecting_tax,
          wuas_depositing_tax, farmers_participation_meetings, women_members, women_ec_members,
          training_conducted, water_scheduling_meetings, conflicts_resolved, irrigation_intensity,
          irrigated_area, water_productivity, cropping_intensity, average_crop_yield,
          average_farm_income, tail_end_farmers_benefitted, water_tax_collected,
          maintenance_work_executed, migration_labour_percent, canal_maintenance_km,
          field_channel_maintenance_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pim_coverage_area = VALUES(pim_coverage_area),
          wuas_formed = VALUES(wuas_formed),
          wuas_functional_percent = VALUES(wuas_functional_percent),
          wuas_collecting_tax = VALUES(wuas_collecting_tax),
          wuas_depositing_tax = VALUES(wuas_depositing_tax),
          farmers_participation_meetings = VALUES(farmers_participation_meetings),
          women_members = VALUES(women_members),
          women_ec_members = VALUES(women_ec_members),
          training_conducted = VALUES(training_conducted),
          water_scheduling_meetings = VALUES(water_scheduling_meetings),
          conflicts_resolved = VALUES(conflicts_resolved),
          irrigation_intensity = VALUES(irrigation_intensity),
          irrigated_area = VALUES(irrigated_area),
          water_productivity = VALUES(water_productivity),
          cropping_intensity = VALUES(cropping_intensity),
          average_crop_yield = VALUES(average_crop_yield),
          average_farm_income = VALUES(average_farm_income),
          tail_end_farmers_benefitted = VALUES(tail_end_farmers_benefitted),
          water_tax_collected = VALUES(water_tax_collected),
          maintenance_work_executed = VALUES(maintenance_work_executed),
          migration_labour_percent = VALUES(migration_labour_percent),
          canal_maintenance_km = VALUES(canal_maintenance_km),
          field_channel_maintenance_km = VALUES(field_channel_maintenance_km)`,
        [
          year, pim_coverage_area, wuas_formed, wuas_functional_percent, wuas_collecting_tax,
          wuas_depositing_tax, farmers_participation_meetings, women_members, women_ec_members,
          training_conducted, water_scheduling_meetings, conflicts_resolved, irrigation_intensity,
          irrigated_area, water_productivity, cropping_intensity, average_crop_yield,
          average_farm_income, tail_end_farmers_benefitted, water_tax_collected,
          maintenance_work_executed, migration_labour_percent, canal_maintenance_km,
          field_channel_maintenance_km
        ]
      );

      res.json({ message: "PIM impact data saved successfully", id: result.insertId });
    } catch (err) {
      console.error("Save PIM Impact Data Error:", err);
      res.status(500).json({ error: "Failed to save PIM impact data" });
    }
  }
};

// PIM Comparative Study Controllers
export const pimComparativeController = {
  getAllComparativeStudies: async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT * FROM pim_comparative_study 
        ORDER BY year DESC, impact_area
      `);

      console.log(`PIM Comparative Study: Found ${rows.length} records`);
      res.json(rows);
    } catch (err) {
      console.error("Get Comparative Studies Error:", err);
      res.status(500).json({ error: "Failed to fetch comparative study data" });
    }
  },

  getComparativeStudyById: async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM pim_comparative_study WHERE id = ?",
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Comparative study record not found" });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error("Get Comparative Study Error:", err);
      res.status(500).json({ error: "Failed to fetch comparative study record" });
    }
  },

  createComparativeStudy: async (req, res) => {
    try {
      const {
        year,
        impact_area,
        unit,
        pim_value,
        non_pim_value,
        difference_percent,
        remarks
      } = req.body;

      // Validation
      if (!year || !impact_area || pim_value === undefined || non_pim_value === undefined) {
        return res.status(400).json({
          error: "Year, impact area, PIM value and Non-PIM value are required"
        });
      }

      // Calculate difference percentage if not provided
      let calculatedDifference = difference_percent;
      if (calculatedDifference === undefined && non_pim_value !== 0) {
        calculatedDifference = ((parseFloat(pim_value) - parseFloat(non_pim_value)) / parseFloat(non_pim_value)) * 100;
        calculatedDifference = parseFloat(calculatedDifference.toFixed(2));
      }

      const [result] = await db.execute(
        `INSERT INTO pim_comparative_study 
        (year, impact_area, unit, pim_value, non_pim_value, difference_percent, remarks) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          year,
          impact_area,
          unit || '',
          parseFloat(pim_value),
          parseFloat(non_pim_value),
          calculatedDifference,
          remarks || ''
        ]
      );

      res.json({
        message: "Comparative study record added successfully",
        id: result.insertId,
        calculated_difference: calculatedDifference
      });
    } catch (err) {
      console.error("Create Comparative Study Error:", err);
      res.status(500).json({ error: "Failed to add comparative study record" });
    }
  },

  updateComparativeStudy: async (req, res) => {
    try {
      const recordId = req.params.id;
      const {
        year,
        impact_area,
        unit,
        pim_value,
        non_pim_value,
        difference_percent,
        remarks
      } = req.body;

      // Validation
      if (!year || !impact_area || pim_value === undefined || non_pim_value === undefined) {
        return res.status(400).json({
          error: "Year, impact area, PIM value and Non-PIM value are required"
        });
      }

      // Check if record exists
      const [existing] = await db.execute(
        "SELECT * FROM pim_comparative_study WHERE id = ?",
        [recordId]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: "Comparative study record not found" });
      }

      // Calculate difference percentage if not provided
      let calculatedDifference = difference_percent;
      if (calculatedDifference === undefined && non_pim_value !== 0) {
        calculatedDifference = ((parseFloat(pim_value) - parseFloat(non_pim_value)) / parseFloat(non_pim_value)) * 100;
        calculatedDifference = parseFloat(calculatedDifference.toFixed(2));
      }

      const [result] = await db.execute(
        `UPDATE pim_comparative_study 
        SET year = ?, impact_area = ?, unit = ?, pim_value = ?, non_pim_value = ?, 
            difference_percent = ?, remarks = ?
        WHERE id = ?`,
        [
          year,
          impact_area,
          unit || '',
          parseFloat(pim_value),
          parseFloat(non_pim_value),
          calculatedDifference,
          remarks || '',
          recordId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Comparative study record not found" });
      }

      res.json({
        message: "Comparative study record updated successfully",
        calculated_difference: calculatedDifference
      });
    } catch (err) {
      console.error("Update Comparative Study Error:", err);
      res.status(500).json({ error: "Failed to update comparative study record" });
    }
  },

  deleteComparativeStudy: async (req, res) => {
    try {
      // Check if record exists
      const [existing] = await db.execute(
        "SELECT * FROM pim_comparative_study WHERE id = ?",
        [req.params.id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: "Comparative study record not found" });
      }

      const [result] = await db.execute(
        "DELETE FROM pim_comparative_study WHERE id = ?",
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Comparative study record not found" });
      }

      res.json({ message: "Comparative study record deleted successfully" });
    } catch (err) {
      console.error("Delete Comparative Study Error:", err);
      res.status(500).json({ error: "Failed to delete comparative study record" });
    }
  },

  getImpactAreas: async (req, res) => {
    try {
      const impactAreas = [
        { value: 'irrigation_intensity', label: 'Irrigation Intensity', unit: '%' },
        { value: 'cropping_intensity', label: 'Cropping Intensity', unit: '%' },
        { value: 'water_use_efficiency', label: 'Water Use Efficiency', unit: '%' },
        { value: 'crop_yield', label: 'Crop Yield', unit: 'q/ha' },
        { value: 'farm_income', label: 'Farm Income', unit: '₹/ha' },
        { value: 'water_tax_collection', label: 'Water Tax Collection', unit: '₹' },
        { value: 'farmer_participation', label: 'Farmer Participation', unit: '%' },
        { value: 'women_participation', label: 'Women Participation', unit: '%' },
        { value: 'maintenance_fund', label: 'Maintenance Fund', unit: '₹' },
        { value: 'crop_diversification', label: 'Crop Diversification', unit: 'index' },
        { value: 'water_productivity', label: 'Water Productivity', unit: 'kg/m³' },
        { value: 'canal_maintenance', label: 'Canal Maintenance', unit: 'km' },
        { value: 'conflicts_resolved', label: 'Conflicts Resolved', unit: 'count' },
        { value: 'training_conducted', label: 'Training Conducted', unit: 'count' }
      ];

      res.json(impactAreas);
    } catch (err) {
      console.error("Get Impact Areas Error:", err);
      res.status(500).json({ error: "Failed to fetch impact areas" });
    }
  },

  getComparativeStats: async (req, res) => {
    try {
      // Get latest year data
      const [latestYear] = await db.execute(`
        SELECT MAX(year) as latest_year FROM pim_comparative_study
      `);

      const latestYearValue = latestYear[0].latest_year || new Date().getFullYear();

      // Get statistics for latest year
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as total_indicators,
          AVG(difference_percent) as avg_improvement,
          MAX(difference_percent) as max_improvement,
          MIN(difference_percent) as min_improvement,
          COUNT(CASE WHEN difference_percent > 0 THEN 1 END) as positive_indicators,
          COUNT(CASE WHEN difference_percent < 0 THEN 1 END) as negative_indicators
        FROM pim_comparative_study 
        WHERE year = ?
      `, [latestYearValue]);

      // Get top 3 improvements
      const [topImprovements] = await db.execute(`
        SELECT impact_area, difference_percent 
        FROM pim_comparative_study 
        WHERE year = ? AND difference_percent > 0
        ORDER BY difference_percent DESC 
        LIMIT 3
      `, [latestYearValue]);

      res.json({
        latest_year: latestYearValue,
        statistics: stats[0],
        top_improvements: topImprovements
      });
    } catch (err) {
      console.error("Get Comparative Stats Error:", err);
      res.status(500).json({ error: "Failed to fetch comparative stats" });
    }
  },

  bulkCreateComparativeStudy: async (req, res) => {
    try {
      const { year, data } = req.body;

      if (!year || !data || !Array.isArray(data)) {
        return res.status(400).json({
          error: "Year and data array are required"
        });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const item of data) {
        try {
          const {
            impact_area,
            unit,
            pim_value,
            non_pim_value,
            remarks
          } = item;

          if (!impact_area || pim_value === undefined || non_pim_value === undefined) {
            errorCount++;
            errors.push(`Invalid data for ${impact_area || 'unknown'}`);
            continue;
          }

          // Calculate difference percentage
          let calculatedDifference = 0;
          if (non_pim_value !== 0) {
            calculatedDifference = ((parseFloat(pim_value) - parseFloat(non_pim_value)) / parseFloat(non_pim_value)) * 100;
            calculatedDifference = parseFloat(calculatedDifference.toFixed(2));
          }

          await db.execute(
            `INSERT INTO pim_comparative_study 
            (year, impact_area, unit, pim_value, non_pim_value, difference_percent, remarks) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              year,
              impact_area,
              unit || '',
              parseFloat(pim_value),
              parseFloat(non_pim_value),
              calculatedDifference,
              remarks || ''
            ]
          );

          successCount++;
        } catch (itemError) {
          errorCount++;
          errors.push(`Error for ${item.impact_area}: ${itemError.message}`);
        }
      }

      res.json({
        message: `Bulk insert completed: ${successCount} successful, ${errorCount} failed`,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err) {
      console.error("Bulk Create Comparative Study Error:", err);
      res.status(500).json({ error: "Failed to bulk create comparative study" });
    }
  },

  importFromImpactData: async (req, res) => {
    try {
      const { year } = req.body;
      const currentYear = year || new Date().getFullYear();

      // Get latest PIM impact data
      const [impactData] = await db.execute(`
        SELECT * FROM pim_impact_reports 
        WHERE year = ?
        ORDER BY created_at DESC 
        LIMIT 1
      `, [currentYear]);

      if (impactData.length === 0) {
        return res.status(404).json({ error: "No PIM impact data found for the specified year" });
      }

      const impact = impactData[0];

      // Define default non-PIM values
      const defaultNonPimValues = {
        irrigation_intensity: 45,
        cropping_intensity: 120,
        water_use_efficiency: 35,
        crop_yield: 25,
        farm_income: 45000,
        water_tax_collection: 50000,
        farmer_participation: 30,
        women_participation: 15,
        maintenance_fund: 20000,
        training_conducted: 2
      };

      const importedData = [];

      // Create comparative study entries based on impact data
      if (impact.irrigation_intensity) {
        importedData.push({
          impact_area: 'irrigation_intensity',
          unit: '%',
          pim_value: impact.irrigation_intensity,
          non_pim_value: defaultNonPimValues.irrigation_intensity,
          remarks: 'Automatically imported from PIM impact data'
        });
      }

      if (impact.cropping_intensity) {
        importedData.push({
          impact_area: 'cropping_intensity',
          unit: '%',
          pim_value: impact.cropping_intensity,
          non_pim_value: defaultNonPimValues.cropping_intensity,
          remarks: 'Automatically imported from PIM impact data'
        });
      }

      // Insert imported data
      let importedCount = 0;
      for (const item of importedData) {
        try {
          let calculatedDifference = 0;
          if (item.non_pim_value !== 0) {
            calculatedDifference = ((parseFloat(item.pim_value) - parseFloat(item.non_pim_value)) / parseFloat(item.non_pim_value)) * 100;
            calculatedDifference = parseFloat(calculatedDifference.toFixed(2));
          }

          await db.execute(
            `INSERT INTO pim_comparative_study 
            (year, impact_area, unit, pim_value, non_pim_value, difference_percent, remarks) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              currentYear,
              item.impact_area,
              item.unit,
              parseFloat(item.pim_value),
              parseFloat(item.non_pim_value),
              calculatedDifference,
              item.remarks
            ]
          );

          importedCount++;
        } catch (itemError) {
          console.error(`Error importing ${item.impact_area}:`, itemError);
        }
      }

      res.json({
        message: `Successfully imported ${importedCount} indicators from PIM impact data`,
        imported_count: importedCount,
        year: currentYear,
        data: importedData
      });
    } catch (err) {
      console.error("Import From Impact Data Error:", err);
      res.status(500).json({ error: "Failed to import from PIM impact data" });
    }
  }
};