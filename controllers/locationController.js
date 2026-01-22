import db from "../config/db.js";
/**
 * Utility function to handle query responses
 */
const sendResponse = (res, message, rows, mapper = null) => {
  const data = mapper ? rows.map(mapper) : rows;
  res.status(200).json({
    status: {
      success: true,
      message,
    },
    data,
  });
};
/**
 * Get all districts
 */
export const getDistricts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM districts");
    sendResponse(res, "District records fetched successfully", rows, row => ({
      district_id: row.district_id,
      district_name: row.district_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * Get blocks by district
 */
export const getBlocks = async (req, res) => {
  try {
    const districtId = req.params.districtId;
    const [rows] = await db.query(
      "SELECT * FROM blocks WHERE district_id = ?",
      [districtId]
    );

    sendResponse(res, "Block records fetched successfully", rows, row => ({
      districtId: row.district_id,
      block_id: row.block_id, // Changed from row.id to row.block_id
      block_name: row.block_name
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
/**
 * Get clusters by block
 */
export const getClusters = async (req, res) => {
  try {
    const { block } = req.query;
    const [rows] = await db.query("SELECT * FROM clusters WHERE block_id = ?", [block]);
    sendResponse(res, "Cluster records fetched successfully", rows, row => ({
      block_id: row.block_id,
      cluster_code: row.cluster_code,
      cluster_name: row.cluster_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * Get all panchayats or panchayats by block
 */
export const getPanchayats = async (req, res) => {
  try {
    const { block } = req.query;
    
    let query = "SELECT * FROM grampanchayat";
    let queryParams = [];
    
    if (block) {
      query += " WHERE block_id = ?";
      queryParams.push(parseInt(block));
    }
    
   
    const [rows] = await db.query(query, queryParams);
    
    sendResponse(res, "Gram panchayat records fetched successfully", rows, row => ({
      gp_id: row.gp_id,
      block_id: row.block_id,
      panchayat_name: row.gp_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get panchayats by block ID (via URL parameter)
 */
export const getPanchayatsByBlockId = async (req, res) => {
  try {
    const blockId = req.params.blockId;
    const [rows] = await db.query(
      "SELECT * FROM grampanchayat WHERE block_id = ?",
      [parseInt(blockId)] // Convert to number
    );
    
    sendResponse(res, "Gram panchayat records fetched successfully", rows, row => ({
      gp_id: row.gp_id,
      block_id: row.block_id,
      cluster_code: row.cluster_code,
      panchayat_name: row.gp_name,
    }));
  } catch (error) {
    console.error("Error fetching panchayats by block:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get villages by cluster
 */
export const getVillages = async (req, res) => {
  try {
    const { cluster } = req.query;
    const [rows] = await db.query("SELECT * FROM villages");
    sendResponse(res, "Village records fetched successfully", rows, row => ({
      // block_id: row.block_id,
      village_id: row.village_id,
      village_name: row.village_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get subdivisions
 */
export const getSubDivisions = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM sub_divisions ORDER BY sub_division_name");
    sendResponse(res, "Sub-division records fetched successfully", rows, row => ({
      subdivision_id: row.subdivision_id,
      subdivision_name: row.subdivision_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get zones
 */
export const getZones = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, zone_name, zone_code, chief_engineer_name, location, department FROM zones ORDER BY zone_name");
    sendResponse(res, "Zone records fetched successfully", rows, row => ({
      zone_id: row.id,
      zone_name: row.zone_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * Get circles
 */
export const getCircles = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM circles ORDER BY circle_name");
    sendResponse(res, "Circle records fetched successfully", rows, row => ({
      circle_id: row.id,
      circle_name: row.circle_name,
      district_id: row.district_id,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCirclesByZoneId = async (req, res) => {
  try {
    const zoneId = req.params.zoneId;
    const [rows] = await db.query("SELECT * FROM circles where zone_id = ? ORDER BY circle_name", [zoneId]);
    sendResponse(res, "Circle records fetched successfully", rows, row => ({
      circle_id: row.id,
      circle_name: row.circle_name,
      district_id: row.district_id,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * Get divisions
 */
export const getDivisions = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM divisions ORDER BY division_name");
    sendResponse(res, "Division records fetched successfully", rows, row => ({
      id: row.id,
      division_name: row.division_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getDivisionsByCiricleId = async (req, res) => {
  try {
    const cricleId = req.params.cricleId;
    const [rows] = await db.query("SELECT * FROM divisions where circle_id = ? ORDER BY division_name", [cricleId]);
    sendResponse(res, "Division records fetched successfully", rows, row => ({
      division_id: row.id,
      division_name: row.division_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDivisionByUserId = async (req, res) => {
  try {
    const divisionId = req.params.divisionId; 
    const [rows] = await db.query(
      "SELECT * FROM divisions WHERE id = ?", 
      [divisionId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Division not found" });
    }
    
    sendResponse(res, "Division record fetched successfully", rows, row => ({
      id: row.id,
      division_name: row.division_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSubDivisionsByDivistionId = async (req, res) => {
  try {
    const divisionId = req.params.divisionId;
    const [rows] = await db.query("SELECT * FROM sub_divisions where division_id = ? ORDER BY sub_division_name", [divisionId]);
    sendResponse(res, "Sub Division records fetched successfully", rows, row => ({
      sub_division_id: row.id,
      sub_division_name: row.sub_division_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getSectionBySubDivisionsId = async (req, res) => {
  try {
    const subDivisionId = req.params.subDivisionId;
    const [rows] = await db.query("SELECT * FROM sections where sub_division_id = ? ORDER BY section_name", [subDivisionId]);
    sendResponse(res, "Sub Division records fetched successfully", rows, row => ({
      sessction_id: row.id,
      section_name: row.section_name,
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
