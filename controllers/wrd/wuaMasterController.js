import db from "../../config/db.js";

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

export const wuaMasterController = {

  // Get all WUA Master records
  getAllWUAMaster: async function(req, res) {
    try {
      console.log("Fetching WUA Master data...");
      
      const [rows] = await db.execute(`
        SELECT 
          id,
          sl_no,
          system_name,
          ce_zone,
          circle_name,
          division_name,
          subdivision_name,
          canal_name,
          wua_name,
          discharge_qusec,
          off_taking,
          position_km,
          length_km,
          villages_covered,
          gram_panchayats,
          ayacut_area_ha,
          constitution_date,
          present_status,
          expiry_date,
          block_name,
          district_name,
          remarks
        FROM wua_master 
        ORDER BY sl_no ASC
      `);
      
      console.log(`WUA Master: Found ${rows.length} records`);
      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    } catch (err) {
      console.error("Get WUA Master Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch WUA master data",
        details: err.message 
      });
    }
  },

  // Get WUA Master by ID for slc page
  getWUAMasterforSLcById: async function(req, res) {
    try {
      const { id } = req.params;
      console.log(`Fetching WUA Master with ID: ${id}`);
      
      const [rows] = await db.execute(
        `SELECT 
          id,
          sl_no,
          system_name,
          ce_zone,
          circle_name,
          division_name,
          subdivision_name,
          canal_name,
          wua_name,
          discharge_qusec,
          off_taking,
          position_km,
          length_km,
          villages_covered,
          gram_panchayats,
          ayacut_area_ha,
          constitution_date as formation_date,
          present_status,
          expiry_date,
          block_name,
          district_name,
          remarks
        FROM wua_master WHERE id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA not found" 
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      console.error("Get WUA Master by ID Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch WUA data",
        details: err.message 
      });
    }
  },

    // Get WUA Master by ID
  getWUAMasterById: async function(req, res) {
    try {
      const { id } = req.params;
      console.log(`Fetching WUA Master with ID: ${id}`);
      
      const [rows] = await db.execute(
        `SELECT 
         sl.*,
         
vm.division_name, vm.system_name,vm.villages_covered,vm.ayacut_area_ha,vm.canal_name,vm.wua_name,vm.division_name
,vm.system_name,
 (SELECT COUNT(*) FROM vlc_gb_members
     WHERE vlc_id = v.id) as vlc_general_body_count
FROM slc sl 
inner join wua_master vm ON sl.wua_id=vm.id
INNER JOIN vlc v ON v.wua_id = vm.id
 
 WHERE sl.wua_id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA not found" 
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (err) {
      console.error("Get WUA Master by ID Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch WUA data",
        details: err.message 
      });
    }
  },
  // Search WUA Master
  searchWUAMaster: async function(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({ 
          success: false,
          error: "Search query must be at least 2 characters" 
        });
      }

      const searchTerm = `%${q}%`;
      console.log(`Searching WUA Master for: ${q}`);
      
      const [rows] = await db.execute(`
        SELECT 
          id,
          sl_no,
          wua_name,
          division_name,
          subdivision_name,
          circle_name,
          ce_zone,
          villages_covered,
          ayacut_area_ha
        FROM wua_master 
        WHERE 
          wua_name LIKE ? OR
          division_name LIKE ? OR
          subdivision_name LIKE ? OR
          circle_name LIKE ? OR
          system_name LIKE ? OR
          canal_name LIKE ?
        ORDER BY wua_name ASC
        LIMIT 50
      `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
      
      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    } catch (err) {
      console.error("Search WUA Master Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to search WUA data",
        details: err.message 
      });
    }
  },

  // Create new WUA Master record
  createWUAMaster: async function(req, res) {
    try {
      const cleanedData = cleanData(req.body);
      console.log("Creating new WUA Master record:", cleanedData);
      
      const {
        sl_no,
        system_name,
        ce_zone,
        circle_name,
        division_name,
        subdivision_name,
        canal_name,
        wua_name,
        discharge_qusec,
        off_taking,
        position_km,
        length_km,
        villages_covered,
        gram_panchayats,
        ayacut_area_ha,
        constitution_date,
        present_status,
        expiry_date,
        block_name,
        district_name,
        remarks
      } = cleanedData;

      // Required field validation
      if (!wua_name || !division_name) {
        return res.status(400).json({ 
          success: false,
          error: "WUA name and division name are required" 
        });
      }

      const [result] = await db.execute(
        `INSERT INTO wua_master (
          sl_no, system_name, ce_zone, circle_name, division_name, subdivision_name,
          canal_name, wua_name, discharge_qusec, off_taking, position_km, length_km,
          villages_covered, gram_panchayats, ayacut_area_ha, constitution_date,
          present_status, expiry_date, block_name, district_name, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sl_no, system_name, ce_zone, circle_name, division_name, subdivision_name,
          canal_name, wua_name, discharge_qusec, off_taking, position_km, length_km,
          villages_covered, gram_panchayats, ayacut_area_ha, constitution_date,
          present_status, expiry_date, block_name, district_name, remarks
        ]
      );

      res.json({ 
        success: true,
        message: "WUA Master record created successfully", 
        id: result.insertId 
      });
    } catch (err) {
      console.error("Create WUA Master Error:", err);
      
      // Handle duplicate entry
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ 
          success: false,
          error: "WUA with this name or serial number already exists" 
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: "Failed to create WUA Master record",
        details: err.message 
      });
    }
  },

  // Update WUA Master record
  updateWUAMaster: async function(req, res) {
    try {
      const wuaId = req.params.id;
      const cleanedData = cleanData(req.body);

      console.log(`Updating WUA Master record ID: ${wuaId}`, cleanedData);

      // Check if record exists
      const [existing] = await db.execute(
        "SELECT id FROM wua_master WHERE id = ?",
        [wuaId]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA Master record not found" 
        });
      }

      const [result] = await db.execute(
        `UPDATE wua_master SET 
          sl_no = ?, system_name = ?, ce_zone = ?, circle_name = ?, division_name = ?,
          subdivision_name = ?, canal_name = ?, wua_name = ?, discharge_qusec = ?,
          off_taking = ?, position_km = ?, length_km = ?, villages_covered = ?,
          gram_panchayats = ?, ayacut_area_ha = ?, constitution_date = ?,
          present_status = ?, expiry_date = ?, block_name = ?, district_name = ?,
          remarks = ?
         WHERE id = ?`,
        [
          cleanedData.sl_no, cleanedData.system_name, cleanedData.ce_zone,
          cleanedData.circle_name, cleanedData.division_name, cleanedData.subdivision_name,
          cleanedData.canal_name, cleanedData.wua_name, cleanedData.discharge_qusec,
          cleanedData.off_taking, cleanedData.position_km, cleanedData.length_km,
          cleanedData.villages_covered, cleanedData.gram_panchayats, cleanedData.ayacut_area_ha,
          cleanedData.constitution_date, cleanedData.present_status, cleanedData.expiry_date,
          cleanedData.block_name, cleanedData.district_name, cleanedData.remarks,
          wuaId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA Master record not found" 
        });
      }

      res.json({ 
        success: true,
        message: "WUA Master record updated successfully" 
      });
    } catch (err) {
      console.error("Update WUA Master Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to update WUA Master record",
        details: err.message 
      });
    }
  },

  // Delete WUA Master record
  deleteWUAMaster: async function(req, res) {
    try {
      const wuaId = req.params.id;
      console.log(`Deleting WUA Master record ID: ${wuaId}`);

      // Check if record exists
      const [existing] = await db.execute(
        "SELECT id FROM wua_master WHERE id = ?",
        [wuaId]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA Master record not found" 
        });
      }

      const [result] = await db.execute(
        "DELETE FROM wua_master WHERE id = ?",
        [wuaId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          error: "WUA Master record not found" 
        });
      }

      res.json({ 
        success: true,
        message: "WUA Master record deleted successfully" 
      });
    } catch (err) {
      console.error("Delete WUA Master Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to delete WUA Master record",
        details: err.message 
      });
    }
  },

  // Get WUA Master statistics
  getWUAMasterStats: async function(req, res) {
    try {
      console.log("Fetching WUA Master statistics...");
      
      const [totalCount] = await db.execute("SELECT COUNT(*) as total FROM wua_master");
      const [zoneStats] = await db.execute(`
        SELECT ce_zone, COUNT(*) as count 
        FROM wua_master 
        WHERE ce_zone IS NOT NULL AND ce_zone != ''
        GROUP BY ce_zone
        ORDER BY count DESC
      `);
      const [circleStats] = await db.execute(`
        SELECT circle_name, COUNT(*) as count 
        FROM wua_master 
        WHERE circle_name IS NOT NULL AND circle_name != ''
        GROUP BY circle_name
        ORDER BY count DESC
      `);
      const [divisionStats] = await db.execute(`
        SELECT division_name, COUNT(*) as count 
        FROM wua_master 
        WHERE division_name IS NOT NULL AND division_name != ''
        GROUP BY division_name
        ORDER BY count DESC
      `);
      const [areaStats] = await db.execute(`
        SELECT 
          COALESCE(SUM(ayacut_area_ha), 0) as total_ayacut_area,
          COALESCE(AVG(ayacut_area_ha), 0) as avg_ayacut_area,
          COALESCE(MAX(ayacut_area_ha), 0) as max_ayacut_area,
          COALESCE(MIN(ayacut_area_ha), 0) as min_ayacut_area
        FROM wua_master
        WHERE ayacut_area_ha IS NOT NULL
      `);

      res.json({
        success: true,
        data: {
          total_count: totalCount[0].total,
          zone_distribution: zoneStats,
          circle_distribution: circleStats,
          division_distribution: divisionStats,
          area_statistics: areaStats[0]
        }
      });
    } catch (err) {
      console.error("Get WUA Master Stats Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch WUA Master statistics",
        details: err.message 
      });
    }
  },

  // Get WUA Master with completion status
  getWUAMasterWithStatus: async function(req, res) {
    try {
      console.log("Fetching WUA Master with completion status...");
      
      const [rows] = await db.execute(`
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
          (SELECT COUNT(*) FROM vlc WHERE vlc.wua_id = wm.id) as vlc_count,
          (SELECT COUNT(*) FROM slc WHERE slc.wua_id = wm.id) as slc_count,
          (SELECT COUNT(*) FROM farmers WHERE farmers.wua_id = wm.id) as farmers_count,
          (SELECT COUNT(*) FROM meetings WHERE meetings.wua_id = wm.id) as meetings_count
        FROM wua_master wm
        ORDER BY wm.sl_no ASC
      `);
      
      // Calculate completion status for each WUA
      const wuasWithStatus = rows.map(wua => {
        const hasVLC = wua.vlc_count > 0;
        const hasSLC = wua.slc_count > 0;
        const hasFarmers = wua.farmers_count > 0;
        const hasMeetings = wua.meetings_count > 0;
        
        const completedSteps = [hasVLC, hasSLC, hasFarmers, hasMeetings].filter(Boolean).length;
        const percentage = (completedSteps / 4) * 100;
        
        let status = 'vlc_pending';
        let statusText = 'VLC Creation Pending';
        
        if (percentage === 100) {
          status = 'complete';
          statusText = 'Completed';
        } else if (percentage >= 75) {
          status = 'meetings_pending';
          statusText = 'Meetings Pending';
        } else if (percentage >= 50) {
          status = 'farmers_pending';
          statusText = 'Farmers Data Pending';
        } else if (percentage >= 25) {
          status = 'slc_pending';
          statusText = 'SLC Formation Pending';
        }
        
        return {
          ...wua,
          completion_status: {
            hasVLC,
            hasSLC,
            hasFarmers,
            hasMeetings,
            completedSteps,
            percentage: Math.round(percentage),
            status,
            statusText
          }
        };
      });
      
      res.json({
        success: true,
        data: wuasWithStatus,
        count: wuasWithStatus.length
      });
    } catch (err) {
      console.error("Get WUA Master with Status Error:", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch WUA Master with status",
        details: err.message 
      });
    }
  },

  // VLC Creation
  // VLC Creation - ONLY vlcc table me data store karein
createVLC: async function(req, res) {
  try {
    const { vlcData, gbMembers, executiveMembers } = req.body;

    console.log("=== VLC CREATION STARTED ===");
    console.log("VLC Data:", vlcData);
    console.log("GB Members count:", gbMembers?.length);
    console.log("Executive Members count:", executiveMembers?.length);

    // Validate required fields
    if (!vlcData || !vlcData.wua_id || !vlcData.vlc_name || !vlcData.village_name) {
      console.log("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        success: false,
        error: "Missing required fields: wua_id, vlc_name, village_name"
      });
    }

    // 1. Insert VLC basic info - सारा data vlcc table me
    console.log("📝 Inserting VLC basic info...");
    const [vlcResult] = await db.execute(
      `INSERT INTO vlc (
        wua_id, vlc_name, village_name, gp_name, block_name, district_name,
        formation_date, registration_no, vlc_formed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        vlcData.wua_id,
        vlcData.vlc_name,
        vlcData.village_name,
        vlcData.gp_name || null,
        vlcData.block_name || null,
        vlcData.district_name || null,
        vlcData.formation_date || null,
        vlcData.registration_no || null,
        vlcData.vlc_formed !== undefined ? vlcData.vlc_formed : true
      ]
    );

    const vlcId = vlcResult.insertId;
    console.log("✅ VLC created with ID:", vlcId);

    // 2. Insert GB Members
    let gbInserted = 0;
    if (gbMembers && gbMembers.length > 0) {
      console.log(`📝 Inserting ${gbMembers.length} GB members...`);
      
      for (let i = 0; i < gbMembers.length; i++) {
        const member = gbMembers[i];
        if (member.name && member.name.trim() !== '') {
          console.log(`🔹 GB Member ${i + 1}:`, member.name);
          
          try {
            const [result] = await db.execute(
              `INSERT INTO vlc_gb_members (
                vlc_id, sl_no, name, gender, category, khata_no, plot_no, rakaba,
                position, land_size, landless, seasonal_migrant, ration_card,
                contact_no, village_name, gp_name, block_name, district_name,
                is_executive, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                vlcId,
                member.sl_no || (i + 1),
                member.name.trim(),
                member.gender || null,
                member.category || null,
                member.khata_no || null,
                member.plot_no || null,
                member.rakaba || null,
                member.position || null,
                member.land_size || null,
                member.landless ? 1 : 0,
                member.seasonal_migrant ? 1 : 0,
                member.ration_card || null,
                member.contact_no || null,
                member.village_name || vlcData.village_name,
                member.gp_name || vlcData.gp_name || null,
                member.block_name || vlcData.block_name || null,
                member.district_name || vlcData.district_name || null,
                member.is_executive ? 1 : 0
              ]
            );
            gbInserted++;
            console.log(`✅ GB Member inserted: ${member.name}`);
          } catch (gbError) {
            console.error(`❌ Failed to insert GB member ${member.name}:`, gbError.message);
          }
        }
      }
    }

    // 3. Insert Executive Members
    let executiveInserted = 0;
    if (executiveMembers && executiveMembers.length > 0) {
      console.log(`📝 Inserting ${executiveMembers.length} executive members...`);
      
      for (let i = 0; i < executiveMembers.length; i++) {
        const member = executiveMembers[i];
        if (member.name && member.name.trim() !== '') {
          console.log(`🔸 Executive Member ${i + 1}:`, member.name);
          
          try {
            const [result] = await db.execute(
              `INSERT INTO vlc_executive_members  (
                vlc_id, name, designation, election_date, gender, category,
                land_size, landless, ration_card, contact_no, khata_no, plot_no,
                rakaba, position, seasonal_migrant, village_name, gp_name,
                block_name, district_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                vlcId,
                member.name.trim(),
                member.designation || 'Member',
                member.election_date || vlcData.formation_date || new Date().toISOString().split('T')[0],
                member.gender || null,
                member.category || null,
                member.land_size || null,
                member.landless ? 1 : 0,
                member.ration_card === "Yes" ? 1 : 0,
                member.contact_no || null,
                member.khata_no || null,
                member.plot_no || null,
                member.rakaba || null,
                member.position || null,
                member.seasonal_migrant ? 1 : 0,
                member.village_name || vlcData.village_name,
                member.gp_name || vlcData.gp_name || null,
                member.block_name || vlcData.block_name || null,
                member.district_name || vlcData.district_name || null
              ]
            );
            executiveInserted++;
            console.log(`✅ Executive Member inserted: ${member.name}`);
          } catch (execError) {
            console.error(`❌ Failed to insert executive member ${member.name}:`, execError.message);
          }
        }
      }
    }

    console.log("=== VLC CREATION COMPLETED ===");
    console.log(`✅ VLC ID: ${vlcId}`);
    console.log(`✅ GB Members inserted: ${gbInserted}`);
    console.log(`✅ Executive Members inserted: ${executiveInserted}`);

    res.json({
      success: true,
      message: "VLC created successfully",
      vlcId: vlcId,
      data: {
        gbMembersCount: gbInserted,
        executiveMembersCount: executiveInserted
      }
    });

  } catch (err) {
    console.error("❌ CREATE VLC ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create VLC",
      details: err.message
    });
  }
},

  // Get VLCs by WUA ID - UPDATED WITH CHAIRMAN DATA
  // wuaMasterController.js में getVLCsByWUA function update करें:

getVLCsByWUA: async function(req, res) {
  try {
    const { wuaId } = req.params;
    console.log(`Fetching VLCs with executive members for WUA ID: ${wuaId}`);

    // Step 1: सभी VLCs लें
    const [vlcs] = await db.execute(`
      SELECT 
        v.id,
        v.vlc_name,
        v.village_name,
        v.gp_name,
        v.block_name,
        v.district_name,
        v.formation_date,
        -- Executive members count
        (SELECT COUNT(*) FROM vlc_executive_members WHERE vlc_id = v.id) as executive_members_count,
        -- GB members count
        (SELECT COUNT(*) FROM vlc_gb_members WHERE vlc_id = v.id) as gb_members_count,
        -- Chairman details
        (SELECT name FROM vlc_executive_members  
         WHERE vlc_id = v.id AND designation = 'Chairman' 
         LIMIT 1) as chairman_name,
        (SELECT contact_no FROM vlc_executive_members  
         WHERE vlc_id = v.id AND designation = 'Chairman' 
         LIMIT 1) as chairman_contact
      FROM vlc v
      WHERE v.wua_id = ?
      ORDER BY v.vlc_name ASC
    `, [wuaId]);

    console.log(`Found ${vlcs.length} VLCs for WUA ${wuaId}`);

    // Step 2: प्रत्येक VLC के लिए executive members लें
    const vlcsWithMembers = await Promise.all(
      vlcs.map(async (vlc) => {
        const [executiveMembers] = await db.execute(`
          SELECT 
            id,
            name,
            designation,
            election_date,
            gender,
            category,
            land_size,
            contact_no,
            village_name
          FROM vlc_executive_members 
          WHERE vlc_id = ?
          ORDER BY 
            CASE 
              WHEN designation = 'Chairman' THEN 1
              WHEN designation LIKE 'Vice President%' THEN 2
              WHEN designation = 'Secretary' THEN 3
              WHEN designation = 'Treasurer' THEN 4
              ELSE 5
            END
        `, [vlc.id]);

        return {
          ...vlc,
          executive_members: executiveMembers || [],
          // ✅ Total beneficiaries = GB members + Executive members
          total_beneficiaries: (vlc.gb_members_count || 0) + (vlc.executive_members_count || 0)
        };
      })
    );

    res.json({
      success: true,
      data: vlcsWithMembers,
      count: vlcsWithMembers.length
    });
  } catch (err) {
    console.error("Get VLCs by WUA Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch VLCs",
      details: err.message
    });
  }
},
  // Get VLC by ID
  getVLCById: async function(req, res) {
    try {
      const { id } = req.params;
      console.log(`Fetching VLC with ID: ${id}`);

      // Get VLC basic info
      const [vlcRows] = await db.execute(`
        SELECT v.*, w.wua_name, w.division_name
        FROM vlc v
        LEFT JOIN wua_master w ON v.wua_id = w.id
        WHERE v.id = ?
      `, [id]);

      if (vlcRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "VLC not found"
        });
      }

      const vlc = vlcRows[0];

      // Get GB Members
      const [gbMembers] = await db.execute(`
        SELECT * FROM vlc_gb_members 
        WHERE vlc_id = ? 
        ORDER BY sl_no ASC
      `, [id]);

      // Get Executive Members
      const [executiveMembers] = await db.execute(`
        SELECT * FROM vlc_executive_members 
        WHERE vlc_id = ? 
        ORDER BY 
          CASE 
            WHEN designation = 'Chairman' THEN 1
            WHEN designation LIKE 'Vice President%' THEN 2
            WHEN designation = 'Secretary' THEN 3
            WHEN designation = 'Treasurer' THEN 4
            ELSE 5
          END,
          designation
      `, [id]);

      res.json({
        success: true,
        data: {
          ...vlc,
          gbMembers,
          executiveMembers
        }
      });
    } catch (err) {
      console.error("Get VLC by ID Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch VLC data",
        details: err.message
      });
    }
  },

  // Update VLC Status
  updateVLCStatus: async function(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log(`Updating VLC status for ID: ${id} to: ${status}`);

      const [result] = await db.execute(
        'UPDATE vlc SET vlc_formed = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "VLC not found"
        });
      }

      res.json({
        success: true,
        message: "VLC status updated successfully"
      });
    } catch (err) {
      console.error("Update VLC Status Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to update VLC status",
        details: err.message
      });
    }
  },

  // Get WUAs with VLCs for SLC formation
  getWUAsWithVLCs: async function (req, res) {
    try {
      console.log("Fetching WUAs with VLCs for SLC formation...");

      const [rows] = await db.execute(`
        SELECT 
          w.id AS wua_id,
          w.wua_name,
          w.division_name,
          w.circle_name,
          w.ce_zone,
          v.id AS vlc_id,
          v.vlc_name,
          v.village_name,
          v.gp_name,
          v.block_name,
          v.district_name
        FROM wua_master w
        LEFT JOIN vlc v ON v.wua_id = w.id
        WHERE v.id IS NOT NULL
        ORDER BY w.wua_name ASC, v.vlc_name ASC
      `);

      // Group VLCs under their WUA
      const grouped = {};

      rows.forEach(r => {
        if (!grouped[r.wua_id]) {
          grouped[r.wua_id] = {
            wua_id: r.wua_id,
            wua_name: r.wua_name,
            division_name: r.division_name,
            circle_name: r.circle_name,
            ce_zone: r.ce_zone,
            vlcs: []
          };
        }

        grouped[r.wua_id].vlcs.push({
          vlc_id: r.vlc_id,
          vlc_name: r.vlc_name,
          village_name: r.village_name,
          gp_name: r.gp_name,
          block_name: r.block_name,
          district_name: r.district_name
        });
      });

      res.json({
        success: true,
        data: Object.values(grouped)
      });

    } catch (err) {
      console.error("getWUAsWithVLCs Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch WUAs with VLCs",
        details: err.message
      });
    }
  },

  /* ---------------------------------------------------
   ✅ Get WUAs with BOTH VLC and SLC (for display/edit)
---------------------------------------------------- */
getWUAsWithBothVLCandSLC: async function (req, res) {
  try {
    console.log("Fetching WUAs with BOTH VLC and SLC...");

    const [rows] = await db.execute(`
      select 
	sl.wua_id AS wua_id,
	sl.section,
    sl.circle,
    sl.zone,
    sl.id AS slc_id,
    sl.slc_name,
    sl.formation_date,
    sl.next_election_date,
    vm.wua_name,
    vm.division_name,
 (SELECT COUNT(*) FROM vlc_gb_members
     WHERE vlc_id = v.id) as vlc_general_body_count,
    (SELECT COUNT(*) FROM vlc where wua_id=vm.id) as vlc_count
 from slc sl
INNER JOIN vlc v ON v.wua_id = sl.wua_id
inner join wua_master vm on vm.id=sl.wua_id
WHERE v.vlc_formed = 1 and vm.is_Formed_wua=0
order by 6
    `);

    console.log(`Found ${rows.length} records from WUAs with BOTH VLC and SLC`);

    // Group VLCs and SLCs under their WUA
    const grouped = {};
    
    rows.forEach(r => {
      if (!grouped[r.wua_id]) {
        grouped[r.wua_id] = {
          wua_id: r.wua_id,
          wua_name: r.wua_name,
          division_name: r.division_name,
          circle_name: r.circle_name,
          ce_zone: r.ce_zone,
          has_slc: true,
          slc_data: {
            slc_id: r.slc_id,
            slc_name: r.slc_name,
            formation_date: r.formation_date
           
          },
          vlcs: []
        };
      }

      // Add VLC if not already added
      if (!grouped[r.wua_id].vlcs.find(vlc => vlc.vlc_id === r.vlc_id)) {
        grouped[r.wua_id].vlcs.push({
          vlc_id: r.vlc_id,
          vlc_name: r.vlc_name,
          village_name: r.village_name,
          gp_name: r.gp_name,
          block_name: r.block_name,
          district_name: r.district_name,
          chairman_name: r.chairman_name,
          vlc_general_body_count: r.vlc_general_body_count
        });
      }
    });

    const wuaCount = Object.keys(grouped).length;

    res.json({
      success: true,
      data: Object.values(grouped),
      count: wuaCount,
      message: `Found ${wuaCount} WUAs with both VLC and SLC`
    });

  } catch (err) {
    console.error("getWUAsWithBothVLCandSLC Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch WUAs with both VLC and SLC",
      details: err.message
    });
  }
},
createWUA: async (req, res) => {
  try {
    console.log("📥 Received WUA creation request:", req.body);
    
    const { formData, villages = [] } = req.body;
    
    if (!formData) {
      return res.status(400).json({
        success: false,
        error: "Form data is required"
      });
    }

    const cleanedData = cleanData(formData);
    
    const {
      project_name, project_id, ce_zone, se_circle, division, subdivision, section,
      wua_name, wua_id, formation_year, tenure_completion_year, registration_no,
      account_holder, bank_name, account_number, ifsc_code,
      wua_cca, total_outlets, total_plots, total_beneficiaries,
      branch_canal, canal_category, canal_name,
      total_villages, total_vlcs_formed, vlcs_not_formed, total_gps, total_blocks
    } = cleanedData;

    // ✅ Data validation
    const validatedData = {
      project_name: project_name || '',
      project_id: project_id || '',
      ce_zone: ce_zone || '',
      se_circle: se_circle || '',
      division: division || '',
      subdivision: subdivision || '',
      section: section || '',
      wua_name: wua_name || '',
      wua_id: wua_id || '',
      formation_year: formation_year || null,
      tenure_completion_year: tenure_completion_year || null,
      registration_no: registration_no || '',
      account_holder: account_holder || '',
      bank_name: bank_name || '',
      account_number: account_number || '',
      ifsc_code: ifsc_code || '',
      branch_canal: branch_canal || '',
      canal_category: canal_category || '',
      canal_name: canal_name || '',
      wua_cca: parseFloat(wua_cca) || 0,
      total_outlets: parseInt(total_outlets) || 0,
      total_plots: parseInt(total_plots) || 0,
      total_beneficiaries: parseInt(total_beneficiaries) || 0,
      total_villages: parseInt(total_villages) || villages.length || 0,
      total_vlcs_formed: parseInt(total_vlcs_formed) || 0,
      vlcs_not_formed: parseInt(vlcs_not_formed) || 0,
      total_gps: parseInt(total_gps) || 0,
      total_blocks: parseInt(total_blocks) || 0
    };

    console.log("📊 Inserting WUA data:", validatedData);
    console.log("🏘️ Villages to save:", villages);

    // 1. WUA TABLE MEIN DATA INSERT KAREIN
    const [wuaResult] = await db.execute(
      `INSERT INTO wua (
        project_name, project_id, ce_zone, se_circle, division, subdivision, section,
        wua_name, wua_id, formation_year, tenure_completion_year, registration_no,
        account_holder, bank_name, account_number, ifsc_code,
        wua_cca, total_outlets, total_plots, total_beneficiaries,
        branch_canal, canal_category, canal_name,
        total_villages, total_vlcs_formed, vlcs_not_formed, total_gps, total_blocks,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        validatedData.project_name,
        validatedData.project_id,
        validatedData.ce_zone,
        validatedData.se_circle,
        validatedData.division,
        validatedData.subdivision,
        validatedData.section,
        validatedData.wua_name,
        validatedData.wua_id,
        validatedData.formation_year,
        validatedData.tenure_completion_year,
        validatedData.registration_no,
        validatedData.account_holder,
        validatedData.bank_name,
        validatedData.account_number,
        validatedData.ifsc_code,
        validatedData.wua_cca,
        validatedData.total_outlets,
        validatedData.total_plots,
        validatedData.total_beneficiaries,
        validatedData.branch_canal,
        validatedData.canal_category,
        validatedData.canal_name,
        validatedData.total_villages,
        validatedData.total_vlcs_formed,
        validatedData.vlcs_not_formed,
        validatedData.total_gps,
        validatedData.total_blocks,
        'active'
      ]
    );

    const wuaId = wuaResult.insertId;
    console.log("✅ WUA created with ID:", wuaId);
    
    // 2. WUA_VILLAGES TABLE MEIN DATA INSERT KAREIN
    let villagesInserted = 0;
    let villagesErrors = [];

    if (villages && villages.length > 0) {
      console.log(`📝 Saving ${villages.length} villages to wua_villages table...`);
      
      for (let i = 0; i < villages.length; i++) {
        const village = villages[i];
        
        if (village.village_name && village.village_name.trim() !== '') {
          try {
            await db.execute(
              `INSERT INTO wua_villages (
                wua_id, village_name, vlc_formed, gp_name, block_name, district_name, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
              [
                wuaId,
                village.village_name.trim(),
                village.vlc_formed ? 1 : 0,
                village.gp_name || null,
                village.block_name || null,
                village.district_name || null
              ]
            );
            villagesInserted++;
            console.log(`✅ Village inserted: ${village.village_name}`);
          } catch (villageError) {
            console.error(`❌ Failed to insert village ${village.village_name}:`, villageError.message);
            villagesErrors.push({
              village: village.village_name,
              error: villageError.message
            });
          }
        }
      }
    }

    console.log("🎉 WUA and Villages created successfully!");
    console.log(`✅ WUA ID: ${wua_id}`);
    console.log(`✅ Villages inserted: ${villagesInserted}/${villages.length}`);
    await db.query(`update wua_master set is_Formed_wua=1 where id=?`, [wua_id]);
    res.json({ 
      success: true,
      message: "WUA and villages created successfully", 
      id: wuaId,
      villages: {
        total: villages.length,
        inserted: villagesInserted,
        errors: villagesErrors
      }
    });
    
  } catch (err) {
    console.error("❌ Create WUA Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to create WUA and villages",
      details: err.message 
    });
  }
},

getAllWUAs: async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM wua ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error("Get WUAs Error:", err);
      res.status(500).json({ error: "Failed to fetch WUAs" });
    }
  },

  // Get all VLCs with details
getAllVLCs: async function(req, res) {
  try {
    console.log("Fetching all VLCs with details...");
    
    const [rows] = await db.execute(`
      SELECT 
        v.id,
        v.vlc_name,
        v.village_name,
        v.gp_name,
        v.block_name,
        v.district_name,
        v.formation_date,
        v.registration_no,
        v.vlc_formed,
        v.created_at,
        w.wua_name,
        w.division_name,
        w.circle_name,
        w.ce_zone,
        -- Chairman details
        (SELECT name FROM vlc_executive_members  
         WHERE vlc_id = v.id AND designation = 'Chairman' 
         LIMIT 1) as chairman_name,
        (SELECT contact_no FROM vlc_executive_members  
         WHERE vlc_id = v.id AND designation = 'Chairman' 
         LIMIT 1) as chairman_contact,
        -- Member counts
        COUNT(DISTINCT gb.id) as gb_members_count,
        COUNT(DISTINCT em.id) as executive_members_count
      FROM vlc v
      LEFT JOIN wua_master w ON v.wua_id = w.id
      LEFT JOIN vlc_gb_members gb ON v.id = gb.vlc_id
      LEFT JOIN vlc_executive_members em ON v.id = em.vlc_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `);
    
    console.log(`Found ${rows.length} VLCs`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (err) {
    console.error("Get All VLCs Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch VLCs",
      details: err.message 
    });
  }
},

// Alternative: Get all VLCs with pagination
getAllVLCsWithPagination: async function(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    console.log(`Fetching VLCs - Page: ${page}, Limit: ${limit}, Search: ${search}`);
    
    let query = `
      SELECT 
        v.id,
        v.vlc_name,
        v.village_name,
        v.gp_name,
        v.block_name,
        v.district_name,
        v.formation_date,
        v.registration_no,
        v.vlc_formed,
        v.created_at,
        w.wua_name,
        w.division_name,
        COUNT(DISTINCT gb.id) as gb_members_count,
        COUNT(DISTINCT em.id) as executive_members_count
      FROM vlc v
      LEFT JOIN wua_master w ON v.wua_id = w.id
      LEFT JOIN vlc_gb_members gb ON v.id = gb.vlc_id
      LEFT JOIN vlc_executive_members em ON v.id = em.vlc_id
    `;
    
    let countQuery = `
      SELECT COUNT(DISTINCT v.id) as total
      FROM vlc v
      LEFT JOIN wua_master w ON v.wua_id = w.id
    `;
    
    const queryParams = [];
    const countParams = [];
    
    if (search) {
      const searchTerm = `%${search}%`;
      query += ` WHERE v.vlc_name LIKE ? OR v.village_name LIKE ? OR w.wua_name LIKE ? OR v.district_name LIKE ?`;
      countQuery += ` WHERE v.vlc_name LIKE ? OR v.village_name LIKE ? OR w.wua_name LIKE ? OR v.district_name LIKE ?`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ` GROUP BY v.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await db.execute(query, queryParams);
    const [countResult] = await db.execute(countQuery, countParams);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    console.log(`Found ${rows.length} VLCs out of ${total} total`);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error("Get All VLCs with Pagination Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch VLCs",
      details: err.message 
    });
  }
},

// Get VLC statistics
getVLCStats: async function(req, res) {
  try {
    console.log("Fetching VLC statistics...");
    
    const [totalCount] = await db.execute("SELECT COUNT(*) as total FROM vlc");
    const [activeCount] = await db.execute("SELECT COUNT(*) as active FROM vlc WHERE vlc_formed = 1");
    const [districtStats] = await db.execute(`
      SELECT district_name, COUNT(*) as count 
      FROM vlc 
      WHERE district_name IS NOT NULL AND district_name != ''
      GROUP BY district_name
      ORDER BY count DESC
    `);
    const [memberStats] = await db.execute(`
      SELECT 
        COALESCE(SUM(gb_count), 0) as total_gb_members,
        COALESCE(SUM(exec_count), 0) as total_executive_members
      FROM (
        SELECT 
          v.id,
          COUNT(DISTINCT gb.id) as gb_count,
          COUNT(DISTINCT em.id) as exec_count
        FROM vlc v
        LEFT JOIN vlc_gb_members gb ON v.id = gb.vlc_id
        LEFT JOIN vlc_executive_members em ON v.id = em.vlc_id
        GROUP BY v.id
      ) as counts
    `);
    
    res.json({
      success: true,
      data: {
        total_vlcs: totalCount[0].total,
        active_vlcs: activeCount[0].active,
        inactive_vlcs: totalCount[0].total - activeCount[0].active,
        district_distribution: districtStats,
        member_statistics: memberStats[0]
      }
    });
  } catch (err) {
    console.error("Get VLC Stats Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch VLC statistics",
      details: err.message 
    });
  }
}
};

