// controllers/dashboardController.js
import db from "../../config/db.js";

export const dashboardController = {
  // Get comprehensive dashboard data
  getDashboardData: async function(req, res) {
    try {
      console.log("📊 Fetching dynamic dashboard data...");
      
      // Get WUAs with completion status
      const [wuaRows] = await db.execute(`
        SELECT 
          wm.id,
          wm.sl_no,
          wm.wua_name,
          wm.division_name,
          wm.subdivision_name,
          wm.circle_name,
          wm.ce_zone,
          wm.villages_covered,
          wm.gram_panchayats,
          wm.ayacut_area_ha,
          wm.block_name,
          wm.district_name,
          -- Counts
          COUNT(DISTINCT v.id) as vlc_count,
          COUNT(DISTINCT s.id) as slc_count,
          COUNT(DISTINCT gb.id) as farmers_count,
          COUNT(DISTINCT m.id) as meetings_count,
          -- Last updates
          MAX(v.created_at) as last_vlc_update,
          MAX(s.created_at) as last_slc_update,
          MAX(gb.created_at) as last_farmer_update,
          MAX(m.created_at) as last_meeting_update
        FROM wua_master wm
        LEFT JOIN vlc v ON v.wua_id = wm.id
        LEFT JOIN slc s ON s.wua_id = wm.id
        LEFT JOIN meetings m ON m.wua_id = wm.id
        LEFT JOIN vlc_gb_members gb ON gb.vlc_id = v.id
        GROUP BY wm.id
        ORDER BY wm.sl_no ASC
      `);
      
      // Calculate KPIs
      const kpis = await calculateKPIs(wuaRows);
      
      // Get completion distribution
      const distribution = await getCompletionDistribution(wuaRows);
      
      // Get recent activities
      const activities = await getRecentActivities();
      
      // Get performance metrics
      const performance = await getPerformanceMetrics();
      
      console.log(`✅ Dashboard data fetched: ${wuaRows.length} WUAs`);
      
      res.json({
        success: true,
        data: {
          wuas: wuaRows,
          kpis: kpis,
          distribution: distribution,
          activities: activities,
          performance: performance
        }
      });
      
    } catch (err) {
      console.error("❌ Get Dashboard Data Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard data",
        details: err.message
      });
    }
  },
  
  // Get dashboard KPIs only
  getDashboardKPIs: async function(req, res) {
    try {
      console.log("📈 Fetching dashboard KPIs...");
      
      const [wuaRows] = await db.execute(`
        SELECT 
          COUNT(DISTINCT wm.id) as total_wuas,
          COUNT(DISTINCT v.id) as total_vlcs,
          COUNT(DISTINCT s.id) as total_slcs,
          COUNT(DISTINCT gb.id) as total_farmers,
          COUNT(DISTINCT m.id) as total_meetings
        FROM wua_master wm
        LEFT JOIN vlc v ON v.wua_id = wm.id
        LEFT JOIN slc s ON s.wua_id = wm.id
        LEFT JOIN meetings m ON m.wua_id = wm.id
        LEFT JOIN vlc_gb_members gb ON gb.vlc_id = v.id
      `);
      
      // Get active WUAs (updated in last 7 days)
      const [activeWuas] = await db.execute(`
        SELECT COUNT(DISTINCT activity.wua_id) as active_wuas
        FROM (
          SELECT wua_id, MAX(created_at) as last_activity
          FROM (
            SELECT wua_id, created_at FROM vlc
            UNION ALL
            SELECT wua_id, created_at FROM slc
            UNION ALL
            SELECT wua_id, created_at FROM meetings
          ) all_activities
          GROUP BY wua_id
          HAVING last_activity >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) activity
      `);
      
      const kpis = wuaRows[0];
      kpis.active_wuas = activeWuas[0]?.active_wuas || 0;
      
      // Calculate average progress
      const [progressData] = await db.execute(`
        SELECT 
          ROUND(AVG(completion_percentage)) as avg_progress,
          COUNT(CASE WHEN completion_percentage = 100 THEN 1 END) as completed_wuas
        FROM (
          SELECT 
            wm.id,
            CASE 
              WHEN COUNT(DISTINCT v.id) > 0 AND COUNT(DISTINCT s.id) > 0 
                   AND COUNT(DISTINCT gb.id) > 0 AND COUNT(DISTINCT m.id) > 0 THEN 100
              WHEN COUNT(DISTINCT v.id) > 0 AND COUNT(DISTINCT s.id) > 0 
                   AND COUNT(DISTINCT gb.id) > 0 THEN 75
              WHEN COUNT(DISTINCT v.id) > 0 AND COUNT(DISTINCT s.id) > 0 THEN 50
              WHEN COUNT(DISTINCT v.id) > 0 THEN 25
              ELSE 0
            END as completion_percentage
          FROM wua_master wm
          LEFT JOIN vlc v ON v.wua_id = wm.id
          LEFT JOIN slc s ON s.wua_id = wm.id
          LEFT JOIN vlc_gb_members gb ON gb.vlc_id = v.id
          LEFT JOIN meetings m ON m.wua_id = wm.id
          GROUP BY wm.id
        ) completion_data
      `);
      
      kpis.avg_progress = progressData[0]?.avg_progress || 0;
      kpis.completed_wuas = progressData[0]?.completed_wuas || 0;
      kpis.pending_wuas = kpis.total_wuas - kpis.completed_wuas;
      
      res.json({
        success: true,
        data: kpis
      });
      
    } catch (err) {
      console.error("❌ Get Dashboard KPIs Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard KPIs",
        details: err.message
      });
    }
  },
  
  // Get completion distribution
  getCompletionDistribution: async function(req, res) {
    try {
      console.log("📊 Fetching completion distribution...");
      
      const [distribution] = await db.execute(`
        SELECT 
          completion_level,
          COUNT(*) as count
        FROM (
          SELECT 
            wm.id,
            CASE 
              WHEN vlc_count > 0 AND slc_count > 0 AND farmers_count > 0 AND meetings_count > 0 THEN 'Complete'
              WHEN vlc_count > 0 AND slc_count > 0 AND farmers_count > 0 THEN 'Meetings Pending'
              WHEN vlc_count > 0 AND slc_count > 0 THEN 'Farmers Pending'
              WHEN vlc_count > 0 THEN 'SLC Pending'
              ELSE 'VLC Pending'
            END as completion_level
          FROM wua_master wm
          LEFT JOIN (
            SELECT wua_id, COUNT(*) as vlc_count FROM vlc GROUP BY wua_id
          ) v ON v.wua_id = wm.id
          LEFT JOIN (
            SELECT wua_id, COUNT(*) as slc_count FROM slc GROUP BY wua_id
          ) s ON s.wua_id = wm.id
          LEFT JOIN (
            SELECT v.wua_id, COUNT(DISTINCT gb.id) as farmers_count 
            FROM vlc v 
            JOIN vlc_gb_members gb ON v.id = gb.vlc_id 
            GROUP BY v.wua_id
          ) f ON f.wua_id = wm.id
          LEFT JOIN (
            SELECT wua_id, COUNT(*) as meetings_count FROM meetings GROUP BY wua_id
          ) m ON m.wua_id = wm.id
        ) levels
        GROUP BY completion_level
        ORDER BY 
          CASE completion_level
            WHEN 'Complete' THEN 1
            WHEN 'Meetings Pending' THEN 2
            WHEN 'Farmers Pending' THEN 3
            WHEN 'SLC Pending' THEN 4
            WHEN 'VLC Pending' THEN 5
          END
      `);
      
      res.json({
        success: true,
        data: distribution
      });
      
    } catch (err) {
      console.error("❌ Get Completion Distribution Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch completion distribution",
        details: err.message
      });
    }
  },
  
  // Get recent activities
  getRecentActivities: async function(req, res) {
  try {
    console.log("📝 Fetching recent activities...");
    
    const [activities] = await db.execute(`
      WITH 
      vlc_activities AS (
        SELECT 
          'VLC Created' as activity_type,
          v.vlc_name as activity_title,
          w.wua_name,
          v.created_at as timestamp,
          '🏘️' as icon
        FROM vlc v
        JOIN wua_master w ON v.wua_id = w.id
        ORDER BY v.created_at DESC
        LIMIT 3
      ),
      slc_activities AS (
        SELECT 
          'SLC Formed' as activity_type,
          s.slc_name as activity_title,
          w.wua_name,
          s.created_at as timestamp,
          '🏢' as icon
        FROM slc s
        JOIN wua_master w ON s.wua_id = w.id
        ORDER BY s.created_at DESC
        LIMIT 3
      ),
      meeting_activities AS (
        SELECT 
          'Meeting Conducted' as activity_type,
          m.agenda_topic as activity_title,
          w.wua_name,
          m.created_at as timestamp,
          '📅' as icon
        FROM meetings m
        JOIN wua_master w ON m.wua_id = w.id
        ORDER BY m.created_at DESC
        LIMIT 2
      ),
      farmer_activities AS (
        SELECT 
          'Farmers Added' as activity_type,
          CONCAT(COUNT(*), ' farmers added') as activity_title,
          w.wua_name,
          MAX(gb.created_at) as timestamp,
          '👨‍🌾' as icon
        FROM vlc v
        JOIN vlc_gb_members gb ON v.id = gb.vlc_id
        JOIN wua_master w ON v.wua_id = w.id
        GROUP BY v.wua_id
        ORDER BY MAX(gb.created_at) DESC
        LIMIT 2
      )
      
      SELECT * FROM vlc_activities
      UNION ALL
      SELECT * FROM slc_activities
      UNION ALL
      SELECT * FROM meeting_activities
      UNION ALL
      SELECT * FROM farmer_activities
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: activities
    });
    
  } catch (err) {
    console.error("❌ Get Recent Activities Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch recent activities",
      details: err.message
    });
  }
},
  
  // Get performance metrics
  getPerformanceMetrics: async function(req, res) {
    try {
      console.log("📊 Fetching performance metrics...");
      
      // Calculate various performance metrics
      const [metrics] = await db.execute(`
        SELECT 
          -- Activation Rate (WUAs with at least VLC)
          ROUND((COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN wm.id END) * 100.0 / 
                 COUNT(DISTINCT wm.id)), 2) as activation_rate,
          
          -- Average Time to Complete (estimated based on creation dates)
          ROUND(AVG(DATEDIFF(
            COALESCE(
              (SELECT MAX(created_at) FROM meetings WHERE wua_id = wm.id),
              (SELECT MAX(created_at) FROM slc WHERE wua_id = wm.id),
              (SELECT MAX(created_at) FROM vlc WHERE wua_id = wm.id)
            ),
            (SELECT MIN(created_at) FROM vlc WHERE wua_id = wm.id)
          )), 0) as avg_time_to_complete,
          
          -- Farmers Engagement Rate (WUAs with farmers data)
          ROUND((COUNT(DISTINCT CASE WHEN gb.id IS NOT NULL THEN wm.id END) * 100.0 / 
                 COUNT(DISTINCT wm.id)), 2) as farmers_engagement,
          
          -- Meeting Frequency (avg meetings per WUA per month)
          ROUND(COUNT(DISTINCT m.id) * 1.0 / 
                (COUNT(DISTINCT wm.id) * 
                 (DATEDIFF(NOW(), DATE_SUB(NOW(), INTERVAL 3 MONTH)) / 30.0)), 2) as meeting_frequency
        FROM wua_master wm
        LEFT JOIN vlc v ON v.wua_id = wm.id
        LEFT JOIN slc s ON s.wua_id = wm.id
        LEFT JOIN meetings m ON m.wua_id = wm.id
        LEFT JOIN vlc_gb_members gb ON gb.vlc_id = v.id
      `);
      
      res.json({
        success: true,
        data: metrics[0]
      });
      
    } catch (err) {
      console.error("❌ Get Performance Metrics Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch performance metrics",
        details: err.message
      });
    }
  }
};

// Helper functions
async function calculateKPIs(wuaData) {
  const totalWUAs = wuaData.length;
  
  const totalVLCs = wuaData.reduce((sum, wua) => sum + (wua.vlc_count || 0), 0);
  const totalSLCs = wuaData.reduce((sum, wua) => sum + (wua.slc_count || 0), 0);
  const totalFarmers = wuaData.reduce((sum, wua) => sum + (wua.farmers_count || 0), 0);
  const totalMeetings = wuaData.reduce((sum, wua) => sum + (wua.meetings_count || 0), 0);
  
  let completedWUAs = 0;
  let activeThisWeek = 0;
  let totalProgress = 0;
  
  wuaData.forEach(wua => {
    const hasVLC = wua.vlc_count > 0;
    const hasSLC = wua.slc_count > 0;
    const hasFarmers = wua.farmers_count > 0;
    const hasMeetings = wua.meetings_count > 0;
    
    const completedSteps = [hasVLC, hasSLC, hasFarmers, hasMeetings].filter(Boolean).length;
    const percentage = (completedSteps / 4) * 100;
    totalProgress += percentage;
    
    if (percentage === 100) completedWUAs++;
    
    // Check if active in last 7 days
    const lastUpdate = Math.max(
      wua.last_vlc_update ? new Date(wua.last_vlc_update).getTime() : 0,
      wua.last_slc_update ? new Date(wua.last_slc_update).getTime() : 0,
      wua.last_farmer_update ? new Date(wua.last_farmer_update).getTime() : 0,
      wua.last_meeting_update ? new Date(wua.last_meeting_update).getTime() : 0
    );
    
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (lastUpdate > weekAgo) activeThisWeek++;
  });
  
  const averageProgress = Math.round(totalProgress / totalWUAs);
  
  return {
    totalWUAs,
    totalVLCs,
    totalSLCs,
    totalFarmers,
    totalMeetings,
    activeThisWeek,
    averageProgress,
    completedWUAs,
    pendingWUAs: totalWUAs - completedWUAs,
    avgFarmersPerWUA: totalWUAs > 0 ? Math.round(totalFarmers / totalWUAs) : 0
  };
}

async function getCompletionDistribution(wuaData) {
  const distribution = {
    complete: 0,
    meetings_pending: 0,
    farmers_pending: 0,
    slc_pending: 0,
    vlc_pending: 0
  };
  
  wuaData.forEach(wua => {
    const hasVLC = wua.vlc_count > 0;
    const hasSLC = wua.slc_count > 0;
    const hasFarmers = wua.farmers_count > 0;
    const hasMeetings = wua.meetings_count > 0;
    
    if (hasVLC && hasSLC && hasFarmers && hasMeetings) {
      distribution.complete++;
    } else if (hasVLC && hasSLC && hasFarmers) {
      distribution.meetings_pending++;
    } else if (hasVLC && hasSLC) {
      distribution.farmers_pending++;
    } else if (hasVLC) {
      distribution.slc_pending++;
    } else {
      distribution.vlc_pending++;
    }
  });
  
  return distribution;
}

async function getRecentActivities() {
  return [
    { type: 'VLC Created', title: 'VLC created for WUA 003', time: '2 hours ago', icon: '✅' },
    { type: 'Meeting Scheduled', title: 'Meeting scheduled for WUA 007', time: '5 hours ago', icon: '📅' },
    { type: 'Farmers Updated', title: 'Farmers data updated for WUA 002', time: 'Yesterday', icon: '👨‍🌾' },
    { type: 'VLC Created', title: 'VLC created for WUA 005', time: '2 days ago', icon: '🏘️' }
  ];
}

async function getPerformanceMetrics() {
  return {
    activationRate: '78%',
    avgTimeToComplete: '14 days',
    farmersEngagement: '85%',
    meetingFrequency: '2.1/week'
  };
}