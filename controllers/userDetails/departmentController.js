import db from "../../config/db.js";

export const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM departments ORDER BY id");

    res.status(200).json({
      status: {
        success: true,
        message: "Departments fetched successfully",
      },
      data: rows.map(row => ({
        departmentId: row.id,
        departmentName: row.department_name,
      })),
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getDepartmentById = async (req, res) => {
  try {
    const departmentId = req.params.id;

    const [rows] = await db.query(
      "SELECT * FROM departments WHERE id = ?",
      [departmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: {
          success: false,
          message: "Department not found",
        },
        data: null,
      });
    }

    const row = rows[0];

    res.status(200).json({
      status: {
        success: true,
        message: "Department fetched successfully",
      },
      data: {
        departmentId: row.department_id,
        departmentName: row.department_name,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


