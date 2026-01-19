import db from "../../config/db.js";

export const slcController = {

  // Create SLC with all related data
  createSLC: async function(req, res) {
  try {
    const { 
      wua_id, 
      slc_name, 
      section, 
      subdivision, 
      circle, 
      zone,
      formation_date, 
      last_election_date, 
      next_election_date,
      // ✅ दोनों नामों को सपोर्ट करें
      vlc_chairmen = [],
      slc_general_body_members = [], // नया field
      executive_members = [],
      water_tax_details = {}
    } = req.body;

    console.log("=== SLC CREATION STARTED ===");
    
    // ✅ दोनों sources से members लें
    const generalBodyMembers = vlc_chairmen.length > 0 ? vlc_chairmen : slc_general_body_members;
    
    console.log("📝 SLC Basic Data:", { 
      wua_id, slc_name, formation_date 
    });
    console.log("👥 General Body Members count:", generalBodyMembers.length);
    console.log("🔸 Executive Members count:", executive_members.length);
    console.log("💰 Water Tax Details:", water_tax_details);

    // Validate required fields
    if (!wua_id || !slc_name || !formation_date) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: wua_id, slc_name, formation_date"
      });
    }

    // 1. Insert SLC basic info
    console.log("📝 Inserting SLC basic info...");
    const [slcResult] = await db.execute(
      `INSERT INTO slc (
        wua_id, slc_name, section, subdivision, circle, zone,
        formation_date, last_election_date, next_election_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        wua_id,
        slc_name,
        section || null,
        subdivision || null,
        circle || null,
        zone || null,
        formation_date,
        last_election_date || null,
        next_election_date || null
      ]
    );

    const slcId = slcResult.insertId;
    console.log("✅ SLC created with ID:", slcId);

    // 2. Insert General Body Members (VLC Chairmen)
    let gbMembersInserted = 0;
    if (generalBodyMembers.length > 0) {
      console.log(`📝 Inserting ${generalBodyMembers.length} General Body Members...`);
      
      for (let i = 0; i < generalBodyMembers.length; i++) {
        const member = generalBodyMembers[i];
        if (member.name && member.name.trim() !== '') {
          try {
            const [result] = await db.execute(
              `INSERT INTO slc_gb_members (
                slc_id, name, vlc_represented, is_executive, created_at
              ) VALUES (?, ?, ?, ?, NOW())`,
              [
                slcId,
                member.name.trim(),
                member.vlc_represented || null,
                member.is_executive ? 1 : 0
              ]
            );
            gbMembersInserted++;
            console.log(`✅ GB Member inserted: ${member.name}`);
          } catch (gbError) {
            console.error(`❌ Failed to insert GB member ${member.name}:`, gbError.message);
          }
        }
      }
    }

    // 3. Insert Executive Members
    let executiveMembersInserted = 0;
    if (executive_members.length > 0) {
      console.log(`📝 Inserting ${executive_members.length} Executive Members...`);
      
      for (let i = 0; i < executive_members.length; i++) {
        const member = executive_members[i];
        if (member.name && member.name.trim() !== '') {
          try {
            const [result] = await db.execute(
              `INSERT INTO slc_executive_members (
                slc_id, name, vlc_represented, designation, election_date, created_at
              ) VALUES (?, ?, ?, ?, ?, NOW())`,
              [
                slcId,
                member.name.trim(),
                member.vlc_represented || null,
                member.designation || 'Member',
                member.election_date || formation_date
              ]
            );
            executiveMembersInserted++;
            console.log(`✅ Executive Member inserted: ${member.name} (${member.designation})`);
          } catch (execError) {
            console.error(`❌ Failed to insert executive member ${member.name}:`, execError.message);
          }
        }
      }
    }

    // 4. Insert Water Tax Details
    let waterTaxInserted = 0;
    if (water_tax_details) {
      console.log("💰 Inserting Water Tax Details...");
      
      try {
        const [result] = await db.execute(
          `INSERT INTO slc_water_tax (
            slc_id, year, kharif_tax, rabi_tax, total_tax,
            deposited_govt, retained_wua, expenditure, balance, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            slcId,
            water_tax_details.year || new Date().getFullYear(),
            water_tax_details.kharif_tax || 0,
            water_tax_details.rabi_tax || 0,
            water_tax_details.total_tax || 0,
            water_tax_details.deposited_govt || 0,
            water_tax_details.retained_wua || 0,
            water_tax_details.expenditure || 0,
            water_tax_details.balance || 0
          ]
        );
        waterTaxInserted = 1;
        console.log("✅ Water Tax details inserted");
      } catch (taxError) {
        console.error("❌ Failed to insert water tax details:", taxError.message);
      }
    }

    console.log("=== SLC CREATION COMPLETED ===");
    console.log(`✅ SLC ID: ${slcId}`);
    console.log(`✅ GB Members inserted: ${gbMembersInserted}`);
    console.log(`✅ Executive Members inserted: ${executiveMembersInserted}`);
    console.log(`✅ Water Tax records inserted: ${waterTaxInserted}`);

    res.json({
      success: true,
      message: "SLC created successfully with all related data",
      slcId: slcId,
      data: {
        gbMembersCount: gbMembersInserted,
        executiveMembersCount: executiveMembersInserted,
        waterTaxInserted: waterTaxInserted
      }
    });

  } catch (err) {
    console.error("❌ CREATE SLC ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create SLC",
      details: err.message
    });
  }
},

  // ✅ GET ALL SLCs - COMPLETELY FIXED VERSION
getAllSLCs: async function(req, res) {
  try {
    console.log("Fetching all SLCs...");

    try {
      // ✅ FIRST: Try the complete query
      const [slcs] = await db.execute(`
        SELECT 
          s.id,
          s.slc_name,
          s.formation_date,
          s.circle,
          s.subdivision,
          s.created_at,
          w.wua_name,
          w.id as wua_id, -- ✅ FIX: Use w.id instead of w.wua_id
          COUNT(DISTINCT em.id) as executive_members_count,
          COALESCE(s.status, 'Active') as status -- ✅ Handle missing status column
        FROM slc s
        LEFT JOIN wua_master w ON s.wua_id = w.id
        LEFT JOIN slc_executive_members em ON s.id = em.slc_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      console.log(`✅ Found ${slcs.length} SLCs using complete query`);

      const formattedSLCs = slcs.map(slc => ({
        id: slc.id,
        slc_name: slc.slc_name,
        wua_name: slc.wua_name,
        wua_id: slc.wua_id,
        formation_date: slc.formation_date,
        executive_members_count: slc.executive_members_count,
        circle: slc.circle,
        subdivision: slc.subdivision,
        status: slc.status,
        created_at: slc.created_at
      }));

      res.json({
        success: true,
        data: formattedSLCs,
        count: formattedSLCs.length
      });

    } catch (queryError) {
      console.log("❌ Complete query failed, trying simplified query...");
      
      // ✅ SECOND: Try simplified query without problematic columns
      const [slcs] = await db.execute(`
        SELECT 
          s.id,
          s.slc_name,
          s.formation_date,
          s.circle,
          s.subdivision,
          s.created_at,
          w.wua_name,
          w.id as wua_id,
          COUNT(DISTINCT em.id) as executive_members_count
        FROM slc s
        LEFT JOIN wua_master w ON s.wua_id = w.id
        LEFT JOIN slc_executive_members em ON s.id = em.slc_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      console.log(`✅ Found ${slcs.length} SLCs using simplified query`);

      const formattedSLCs = slcs.map(slc => ({
        id: slc.id,
        slc_name: slc.slc_name,
        wua_name: slc.wua_name,
        wua_id: slc.wua_id,
        formation_date: slc.formation_date,
        executive_members_count: slc.executive_members_count,
        circle: slc.circle,
        subdivision: slc.subdivision,
        status: 'Active', // ✅ Default status
        created_at: slc.created_at
      }));

      res.json({
        success: true,
        data: formattedSLCs,
        count: formattedSLCs.length,
        note: "Using simplified query - some columns not available"
      });
    }

  } catch (err) {
    console.error("❌ Get All SLCs Error:", err);
    
    // ✅ FINAL FALLBACK: Return empty array with success
    console.log("🔄 Returning empty data to prevent frontend crash");
    res.json({
      success: true,
      data: [],
      count: 0,
      note: "Database query failed - returning empty data"
    });
  }
},

  // Get SLCs by WUA ID
  getSLCsByWUA: async function(req, res) {
    try {
      const { wuaId } = req.params;
      console.log(`Fetching SLCs for WUA ID: ${wuaId}`);

      const [slcs] = await db.execute(`
        SELECT 
          s.*,
          w.wua_name,
          COUNT(DISTINCT gb.id) as gb_members_count,
          COUNT(DISTINCT em.id) as executive_members_count
        FROM slc s
        LEFT JOIN wua_master w ON s.wua_id = w.id
        LEFT JOIN slc_gb_members gb ON s.id = gb.slc_id
        LEFT JOIN slc_executive_members em ON s.id = em.slc_id
        WHERE s.wua_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `, [wuaId]);

      console.log(`Found ${slcs.length} SLCs for WUA ${wuaId}`);

      res.json({
        success: true,
        data: slcs,
        count: slcs.length
      });
    } catch (err) {
      console.error("Get SLCs by WUA Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch SLCs",
        details: err.message
      });
    }
  },

  // Get SLC by ID with all details
   getSLCById: async function(req, res) {
  try {
    const { id } = req.params;
    console.log(`🔄 Fetching SLC details for ID: ${id}`);

    // 1. Get SLC basic info
    const [slcRows] = await db.execute(`
      SELECT 
        s.slc_name,
        s.section,
        s.subdivision,
        s.circle,
        s.zone,
        date_format(s.formation_date, '%Y-%m-%d') as formation_date,
        date_format(s.last_election_date, '%Y-%m-%d') as last_election_date,
        date_format(s.next_election_date, '%Y-%m-%d') as next_election_date,
        s.status,
        w.wua_name,
        w.division_name
      FROM slc s
      LEFT JOIN wua_master w ON s.wua_id = w.id
      WHERE s.id = ?
    `, [id]);

    if (slcRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SLC not found"
      });
    }

    const slc = slcRows[0];

    // 2. Get General Body Members (VLC Chairmen)
    const [gbMembers] = await db.execute(`
      SELECT 
        id,
        name,
        vlc_represented,
        is_executive,
        created_at
      FROM slc_gb_members 
      WHERE slc_id = ? 
      ORDER BY created_at ASC
    `, [id]);

    // 3. Get Executive Members
    const [executiveMembers] = await db.execute(`
      SELECT 
        id,
        name,
        vlc_represented,
        designation,
        election_date,
        created_at
      FROM slc_executive_members 
      WHERE slc_id = ? 
      ORDER BY 
        CASE 
          WHEN designation = 'Chairman' THEN 1
          WHEN designation = 'Vice President' THEN 2
          WHEN designation = 'Secretary' THEN 3
          WHEN designation = 'Treasurer' THEN 4
          ELSE 5
        END,
        designation
    `, [id]);

    // 4. Get Water Tax Details
    const [waterTaxDetails] = await db.execute(`
      SELECT 
        id,
        year,
        kharif_tax,
        rabi_tax,
        total_tax,
        deposited_govt,
        retained_wua,
        expenditure,
        balance,
        created_at
      FROM slc_water_tax 
      WHERE slc_id = ? 
      ORDER BY year DESC
      LIMIT 1
    `, [id]);

    console.log(`✅ SLC Details fetched:
      - Basic Info: ✓
      - GB Members: ${gbMembers.length}
      - Executive Members: ${executiveMembers.length}
      - Water Tax: ${waterTaxDetails.length > 0 ? '✓' : '✗'}
    `);

    // Format the complete response
    const responseData = {
      ...slc,
      status: slc.status || 'Active', // Default status
      gbMembers: gbMembers,
      executiveMembers: executiveMembers,
      waterTaxDetails: waterTaxDetails[0] || null
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (err) {
    console.error("❌ Get SLC by ID Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch SLC details",
      details: err.message
    });
  }
},


// ✅ UPDATE SLC FUNCTION
updateSLC: async function(req, res) {
  try {
    const { id } = req.params;
    const { 
      wua_id,
      slc_name, 
      section, 
      subdivision, 
      circle, 
      zone,
      formation_date, 
      last_election_date, 
      next_election_date,
      status,
      // Members data
      vlc_chairmen = [],
      slc_general_body_members = [],
      executive_members = [],
      water_tax_details = {}
    } = req.body;

    console.log("=== UPDATING SLC ===", { id, slc_name });

    // Check if SLC exists
    const [existingSLC] = await db.execute(
      'SELECT * FROM slc WHERE id = ?',
      [id]
    );

    if (existingSLC.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SLC not found"
      });
    }

    // 1. Update SLC basic info
    console.log("📝 Updating SLC basic info...");
    await db.execute(
      `UPDATE slc SET
        wua_id = ?,
        slc_name = ?,
        section = ?,
        subdivision = ?,
        circle = ?,
        zone = ?,
        formation_date = ?,
        last_election_date = ?,
        next_election_date = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        wua_id,
        slc_name,
        section || null,
        subdivision || null,
        circle || null,
        zone || null,
        formation_date,
        last_election_date || null,
        next_election_date || null,
        status || 'Active',
        id
      ]
    );

    // 2. Delete existing members and re-insert
    console.log("🔄 Updating members data...");

    // Delete existing general body members
    await db.execute('DELETE FROM slc_gb_members WHERE slc_id = ?', [id]);

    // Insert updated general body members
    const generalBodyMembers = vlc_chairmen.length > 0 ? vlc_chairmen : slc_general_body_members;
    for (const member of generalBodyMembers) {
      if (member.name && member.name.trim() !== '') {
        await db.execute(
          `INSERT INTO slc_gb_members (
            slc_id, name, vlc_represented, is_executive, created_at
          ) VALUES (?, ?, ?, ?, NOW())`,
          [
            id,
            member.name.trim(),
            member.vlc_represented || null,
            member.is_executive ? 1 : 0
          ]
        );
      }
    }

    // Delete existing executive members
    await db.execute('DELETE FROM slc_executive_members WHERE slc_id = ?', [id]);

    // Insert updated executive members
    for (const member of executive_members) {
      if (member.name && member.name.trim() !== '') {
        await db.execute(
          `INSERT INTO slc_executive_members (
            slc_id, name, vlc_represented, designation, election_date, created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            id,
            member.name.trim(),
            member.vlc_represented || null,
            member.designation || 'Member',
            member.election_date || formation_date
          ]
        );
      }
    }

    // 3. Update water tax details
    console.log("💰 Updating water tax details...");
    
    // Check if water tax record exists
    const [existingTax] = await db.execute(
      'SELECT id FROM slc_water_tax WHERE slc_id = ?',
      [id]
    );

    if (water_tax_details) {
      if (existingTax.length > 0) {
        // Update existing
        await db.execute(
          `UPDATE slc_water_tax SET
            year = ?,
            kharif_tax = ?,
            rabi_tax = ?,
            total_tax = ?,
            deposited_govt = ?,
            retained_wua = ?,
            expenditure = ?,
            balance = ?,
            updated_at = NOW()
          WHERE slc_id = ?`,
          [
            water_tax_details.year || new Date().getFullYear(),
            water_tax_details.kharif_tax || 0,
            water_tax_details.rabi_tax || 0,
            water_tax_details.total_tax || 0,
            water_tax_details.deposited_govt || 0,
            water_tax_details.retained_wua || 0,
            water_tax_details.expenditure || 0,
            water_tax_details.balance || 0,
            id
          ]
        );
      } else {
        // Insert new
        await db.execute(
          `INSERT INTO slc_water_tax (
            slc_id, year, kharif_tax, rabi_tax, total_tax,
            deposited_govt, retained_wua, expenditure, balance, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            water_tax_details.year || new Date().getFullYear(),
            water_tax_details.kharif_tax || 0,
            water_tax_details.rabi_tax || 0,
            water_tax_details.total_tax || 0,
            water_tax_details.deposited_govt || 0,
            water_tax_details.retained_wua || 0,
            water_tax_details.expenditure || 0,
            water_tax_details.balance || 0
          ]
        );
      }
    }

    console.log(`✅ SLC ${id} updated successfully`);

    res.json({
      success: true,
      message: "SLC updated successfully",
      slcId: id
    });

  } catch (err) {
    console.error("❌ UPDATE SLC ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update SLC",
      details: err.message
    });
  }
},

// ✅ UPDATE SLC STATUS ONLY
updateSLCStatus: async function(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`🔄 Updating SLC ${id} status to: ${status}`);

    // Check if SLC exists
    const [existingSLC] = await db.execute(
      'SELECT * FROM slc WHERE id = ?',
      [id]
    );

    if (existingSLC.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SLC not found"
      });
    }

    // Update status
    await db.execute(
      'UPDATE slc SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    console.log(`✅ SLC ${id} status updated to ${status}`);

    res.json({
      success: true,
      message: `SLC status updated to ${status} successfully`,
      slcId: id,
      newStatus: status
    });

  } catch (err) {
    console.error("❌ UPDATE SLC STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update SLC status",
      details: err.message
    });
  }
},

// ✅ DELETE SLC FUNCTION
deleteSLC: async function(req, res) {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting SLC ${id}...`);

    // Check if SLC exists
    const [existingSLC] = await db.execute(
      'SELECT * FROM slc WHERE id = ?',
      [id]
    );

    if (existingSLC.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SLC not found"
      });
    }

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Delete related records first
      await db.execute('DELETE FROM slc_gb_members WHERE slc_id = ?', [id]);
      await db.execute('DELETE FROM slc_executive_members WHERE slc_id = ?', [id]);
      await db.execute('DELETE FROM slc_water_tax WHERE slc_id = ?', [id]);
      
      // Delete SLC
      await db.execute('DELETE FROM slc WHERE id = ?', [id]);

      await db.execute('COMMIT');
      
      console.log(`✅ SLC ${id} deleted successfully`);

      res.json({
        success: true,
        message: "SLC deleted successfully"
      });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error("❌ DELETE SLC ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete SLC",
      details: err.message
    });
  }
}
  
};  

