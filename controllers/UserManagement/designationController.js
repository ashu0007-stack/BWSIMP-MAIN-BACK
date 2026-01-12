import db from "../../config/db.js";

export const getDesignations = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, designation_name, dept_id FROM designations ORDER BY designation_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Designations Error:", err);
    res.status(500).json({ error: "Failed to fetch designations" });
  }
};

export const getDesignationsByDeptId = async (req, res) => {
  try {
    const { deptId } = req.params;
    const [rows] = await db.execute(
      "SELECT id, designation_name FROM designations WHERE dept_id = ? ORDER BY designation_name",
      [deptId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Designations by Dept Error:", err);
    res.status(500).json({ error: "Failed to fetch designations" });
  }
};


