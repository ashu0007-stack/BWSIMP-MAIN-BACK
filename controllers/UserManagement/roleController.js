import db from "../../config/db.js";

export const getRoles = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, role_name FROM roles WHERE isShow='0' ORDER BY role_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Roles Error:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

export const getRolesByDesignation = async (req, res) => {
  try {
    const { desgnId } = req.params;
    const [rows] = await db.query(
      `SELECT r.* FROM roles r 
       JOIN designations d ON r.designation_id = d.id
       WHERE d.id = ?`,
      [desgnId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching roles by designation:", err);
    res.status(500).json({ message: "Failed to fetch roles by designation" });
  }
};