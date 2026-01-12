// backend/controllers/MasterData/farmersController.js
import db from "../../config/db.js";

// ✅ Helper function outside controller
const parseLandSize = (landSize) => {
  if (!landSize) return 0;
  try {
    const match = landSize.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  } catch (error) {
    return 0;
  }
};

const farmersController = {
  
  // ✅ Get All Farmers - FIXED VERSION
  getAllFarmers: async function(req, res) {
    try {
      console.log(`🚀 getAllFarmers function called!`);

      // Simple query without complex transformation first
      const [farmers] = await db.execute(`
        SELECT 
          gm.id,
          gm.name as full_name,
          gm.gender,
          gm.category,
          gm.contact_no as mobile_number,
          gm.land_size,
          gm.landless,
          gm.seasonal_migrant,
          gm.ration_card,
          gm.position,
          gm.is_executive,
          gm.created_at as registration_date,
          v.vlc_name,
          v.village_name,
          v.gp_name,
          v.block_name,
          v.district_name,
          wm.wua_name
        FROM vlc_gb_members gm
        INNER JOIN vlc v ON gm.vlc_id = v.id
        INNER JOIN wua_master wm ON v.wua_id = wm.id
        ORDER BY wm.wua_name, v.village_name, gm.name ASC
      
      `);

      console.log(`✅ Found ${farmers.length} farmers`);

      // ✅ SIMPLE TRANSFORMATION - No this.parseLandSize
      const transformedFarmers = farmers.map(farmer => ({
        // Personal Information
        id: farmer.id,
        full_name: farmer.full_name,
        gender: farmer.gender || 'Male',
        category: farmer.category || 'General',
        mobile_number: farmer.mobile_number || 'Not Available',
        
        // Land Details
        land_size: farmer.land_size || 'Not Available',
        total_land_holding: parseLandSize(farmer.land_size), // ✅ Fixed: use helper function
        position: farmer.position || 'Not Available',
        
        // Socio-Economic Details
        landless: farmer.landless === 1,
        seasonal_migrant: farmer.seasonal_migrant === 1,
        ration_card: farmer.ration_card || 'No',
        is_executive: farmer.is_executive === 1,
        
        // Address Information
        village_name: farmer.village_name,
        gp_name: farmer.gp_name,
        block_name: farmer.block_name,
        district_name: farmer.district_name,
        
        // VLC Information
        vlc_name: farmer.vlc_name,
        
        // WUA Information
        wua_name: farmer.wua_name,
        
        // Registration
        registration_date: farmer.registration_date,
        status: 'Active'
      }));

      res.json({
        success: true,
        data: transformedFarmers,
        count: transformedFarmers.length,
        message: `Successfully retrieved ${transformedFarmers.length} farmers`
      });

    } catch (err) {
      console.error("❌ getAllFarmers ERROR:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch farmers data",
        details: err.message
      });
    }
  },

  // ✅ Get Farmers Statistics - SIMPLE VERSION
  getFarmersStatistics: async function(req, res) {
    try {
      console.log(`📊 getFarmersStatistics called`);

      // Total Farmers Count
      const [totalCount] = await db.execute('SELECT COUNT(*) as total FROM vlc_gb_members');
      
      // Gender Statistics
      const [genderStats] = await db.execute(`
        SELECT gender, COUNT(*) as count 
        FROM vlc_gb_members 
        GROUP BY gender
      `);
      
      // Category Statistics
      const [categoryStats] = await db.execute(`
        SELECT category, COUNT(*) as count 
        FROM vlc_gb_members 
        GROUP BY category
      `);
      
      // Landless Statistics
      const [landlessCount] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM vlc_gb_members 
        WHERE landless = 1
      `);

      const statistics = {
        total_farmers: totalCount[0]?.total || 0,
        gender_distribution: genderStats,
        category_distribution: categoryStats,
        landless_farmers: landlessCount[0]?.count || 0,
        summary: {
          male_farmers: genderStats.find(g => g.gender === 'Male')?.count || 0,
          female_farmers: genderStats.find(g => g.gender === 'Female')?.count || 0,
          landless_farmers: landlessCount[0]?.count || 0
        }
      };

      res.json({
        success: true,
        data: statistics
      });

    } catch (err) {
      console.error("Statistics Error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  },

  // ✅ Get Farmer by ID - SIMPLE VERSION
  getFarmerById: async function(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 getFarmerById called for ID: ${id}`);

      const [farmer] = await db.execute(`
        SELECT 
          gm.*,
          v.vlc_name,
          v.village_name,
          v.gp_name,
          v.block_name,
          v.district_name,
          wm.wua_name
        FROM vlc_gb_members gm
        INNER JOIN vlcc v ON gm.vlc_id = v.id
        INNER JOIN wua_master wm ON v.wua_id = wm.id
        WHERE gm.id = ?
      `, [id]);

      if (farmer.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Farmer not found"
        });
      }

      res.json({
        success: true,
        data: farmer[0]
      });

    } catch (err) {
      console.error("Get Farmer Error:", err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  },

  // ✅ Get WUA Coverage Statistics from wua_master
getWUACoverageStats: async function(req, res) {
  try {
    console.log(`📊 Fetching WUA coverage statistics...`);

    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT wm.id) as total_wuas,
        COUNT(DISTINCT v.id) as total_vlcs,
        COUNT(DISTINCT gm.id) as total_farmers,
        COUNT(DISTINCT v.village_name) as villages_covered,
        SUM(wm.ayacut_area_ha) as total_ayacut_area
      FROM wua_master wm
      LEFT JOIN vlcc v ON wm.id = v.wua_id
      LEFT JOIN vlc_gb_members gm ON v.id = gm.vlc_id
    `);

    // WUA-wise breakdown
    const [wuaBreakdown] = await db.execute(`
      SELECT 
        wm.id,
        wm.wua_name,
        wm.division_name,
        COUNT(DISTINCT v.id) as vlcs_count,
        COUNT(DISTINCT gm.id) as farmers_count,
        wm.ayacut_area_ha,
        wm.villages_covered
      FROM wua_master wm
      LEFT JOIN vlcc v ON wm.id = v.wua_id
      LEFT JOIN vlc_gb_members gm ON v.id = gm.vlc_id
      GROUP BY wm.id, wm.wua_name, wm.division_name
      ORDER BY farmers_count DESC
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        wua_breakdown: wuaBreakdown
      }
    });

  } catch (err) {
    console.error("WUA Coverage Stats Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
};

export default farmersController;