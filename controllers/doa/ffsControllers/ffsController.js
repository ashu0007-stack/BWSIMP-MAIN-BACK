import db from "../../../config/db.js";

// Get all FFS records with location names
export const ffsDetails = async (req, res) => {
  try {
    
    const [rows] = await db.query(`
      SELECT 
        ffs.id,
        ffs.ffs_title,
        ffs.crop_theme,
        ffs.name_of_facilitator,
        ffs.facilitator_contact,
        ffs.season_year,
        DATE(ffs.start_date) AS start_date,   -- ✅ Only date part
        DATE(ffs.end_date) AS end_date,       -- ✅ Only date part
        ffs.sessions_planned,
        ffs.sessions_conducted,
        ffs.farmers_enrolled,
        ffs.farmers_attending,
        ffs.cluster_code,
        ffs.district_id,        
        ffs.block_id,            
        ffs.cluster_code,
        ffs.village_id,
        d.district_name AS district,
        b.block_name AS block,
        c.cluster_name AS cluster,
        v.village_name AS village
      FROM farmer_field_schools AS ffs
      LEFT JOIN districts AS d ON ffs.district_id = d.district_id
      LEFT JOIN blocks AS b ON ffs.block_id = b.block_id
      LEFT JOIN clusters AS c ON ffs.cluster_code = c.cluster_code
      LEFT JOIN villages AS v ON ffs.village_id = v.village_id
    `);

    // ✅ Clean response (with formatted keys)
    const formattedData = rows.map((row) => ({
      ffsId: row.id,
      ffsTitle: row.ffs_title,
      cropTheme: row.crop_theme,
      nameOfFacilitator: row.name_of_facilitator,
      facilitatorContact: row.facilitator_contact,
      seasonYear: row.season_year,
      startDate: row.start_date ? row.start_date.toISOString?.().split("T")[0] || row.start_date : null,
      endDate: row.end_date ? row.end_date.toISOString?.().split("T")[0] || row.end_date : null,
      sessionsPlanned: row.sessions_planned,
      sessionsConducted: row.sessions_conducted,
      farmersEnrolled: row.farmers_enrolled,
      farmersAttending: row.farmers_attending,
      district_id: row.district_id,
      district: row.district,
      block_id: row.block_id,
      block: row.block,
      clusterCode: row.cluster_code,
      cluster: row.cluster,
      village_id: row.village_id,
      village: row.village,
    }));

    res.status(200).json({
      status: {
        success: true,
        message: "Farmer Field School records fetched successfully",
      },
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching FFS:", error);
    res.status(500).json({
      
      success: false,
      message: "Server error fetching records",
      error: error.message,
    });
  }
};



// add new ffs details in table

export const addFfsDetails = async (req, res) => {
  try {
    const {
      district_id,
      block_id,
      cluster_code,
      village_id,
      ffsTitle,
      cropTheme,
      nameOfFacilitator,
      facilitatorContact,
      seasonYear,
      startDate,
      endDate,
      sessionsPlanned,
      sessionsConducted,
      farmersEnrolled,
      farmersAttending
    } = req.body;


    if (!district_id || !block_id || !cluster_code || !village_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required location fields (district_id, block_id, cluster_code, village_id).",
      });
    }

    // ✅ SQL Insert Query
    const query = `
      INSERT INTO farmer_field_schools 
      (district_id, block_id, cluster_code, village_id, ffs_title, crop_theme, 
      name_of_facilitator, facilitator_contact, season_year, start_date, end_date, 
      sessions_planned, sessions_conducted, farmers_enrolled, farmers_attending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute query
    const [result] = await db.query(query, [
      district_id,
      block_id,
      cluster_code,
      village_id,
      ffsTitle,
      cropTheme,
      nameOfFacilitator,
      facilitatorContact,
      seasonYear,
      startDate,
      endDate,
      sessionsPlanned || 0,
      sessionsConducted || 0,
      farmersEnrolled || 0,
      farmersAttending || 0
    ]);

    // Return success response
    res.status(201).json({
      status: {
        success: true,
        message: "FFS details added successfully!",
      },
      data: {
        id: result.insertId,
        district_id,
        block_id,
        cluster_code,
        village_id,
        ffsTitle,
        cropTheme,
        nameOfFacilitator,
        facilitatorContact,
        seasonYear,
        startDate,
        endDate,
        sessionsPlanned,
        sessionsConducted,
        farmersEnrolled,
        farmersAttending
      },
    });
  } catch (error) {
    console.error("Error adding FFS details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding FFS details.",
      error: error.message,
    });
  }
};

