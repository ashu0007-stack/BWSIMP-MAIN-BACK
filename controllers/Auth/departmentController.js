import db from "../../config/db.js";

export const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, department_name FROM departments ORDER BY department_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Departments Error:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};
