import db from "../../config/db.js";

/**
 * GET ALL DESIGNATIONS (Admin / Listing)
 */
export const getDesignations = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.designation_name,
        dep.department_name,
        ul.level_name
       FROM designations d
       JOIN departments dep ON dep.id = d.department_id
       JOIN user_levels ul ON ul.id = d.user_level_id
       ORDER BY dep.id, ul.id, d.id`
    );

    res.status(200).json({
      status: {
        success: true,
        message: "Designations fetched successfully",
      },
     data: rows.map(row => ({
        designationId: row.id,
        designationName: row.designation_name,
      })),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: {
        success: false,
        message: "Internal server error",
      },
      data: [],
    });
  }
};


/**
 * GET DESIGNATION BY ID
 */
export const getDesignationsById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.designation_name,
        dep.department_name,
        ul.level_name
       FROM designations d
       JOIN departments dep ON dep.id = d.department_id
       JOIN user_levels ul ON ul.id = d.user_level_id
       WHERE d.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        status: {
          success: false,
          message: "Designation not found",
        },
        data: [],
      });
    }

    res.status(200).json({
      status: {
        success: true,
        message: "Designation fetched successfully",
      },
      data: rows.map(row => ({
        designationId: row.id,
        designationName: row.designation_name,
      })),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: {
        success: false,
        message: "Internal server error",
      },
      data: [],
    });
  }
};


/**
 * ✅ CORRECT DROPDOWN API
 * Department → Level → Designation
 */
export const getDesignationsByDeptLevel = async (req, res) => {
  try {
    const departmentId = Number(req.query.departmentId);
    const levelId = Number(req.query.levelId);

    if (!Number.isInteger(departmentId)) {
      return res.status(400).json({
        status: { success: false },
        message: "Invalid department ID",
        data: [],
      });
    }

    if (!Number.isInteger(levelId)) {
      return res.status(400).json({
        status: { success: false },
        message: "Invalid level ID",
        data: [],
      });
    }

    const [rows] = await db.query(
      `SELECT 
        d.id,
        d.designation_name,
        dept.department_name,
        ul.level_name
        FROM designations d
        JOIN departments dept 
          ON dept.id = d.department_id
        JOIN user_levels ul 
          ON ul.id = d.user_level_id
        WHERE d.department_id = ?
          AND d.user_level_id = ?`,
      [departmentId, levelId]
    );

    return res.status(200).json({
      status: {
        success: true,
        message: "Designations fetched successfully",
      },
      data: rows.map(row => ({
        designationId: row.id,
        designationName: row.designation_name,
      })),
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      status: { success: false },
      message: "Internal server error",
      data: [],
    });
  }
};
