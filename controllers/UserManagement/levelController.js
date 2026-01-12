import db from "../../config/db.js";

export const getLevels = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, dept_id,  level_name FROM department_levels ORDER BY dept_id"
    );
    res.json(rows);
  } catch (err) {
    console.error("Levels Error:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
};

export const getLevelsByDeptId = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await db.execute(
      "SELECT id, dept_id,  level_name FROM department_levels WHERE dept_id = ? ORDER BY dept_id",
      [deptId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Levels by Dept Error:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
};


export const getLevelsByDesignation = async (req, res) => {
  try {
    const { desgnId } = req.params;

    const [rows] = await db.query(
      `SELECT dl.* FROM department_levels dl
       JOIN designations d ON dl.dept_id = d.dept_id AND dl.id = d.depart_level
       WHERE d.id = ?`,
      [desgnId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching levels by designation:", err);
    res.status(500).json({ message: "Failed to fetch levels by designation" });
  }
};