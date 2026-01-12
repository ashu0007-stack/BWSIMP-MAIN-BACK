import db from "../../config/db.js";

/**
 * ✅ Get all project expenses
 */
export const getProjectExpenses = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, particulars, estimated_expenses_crore FROM project_expenses_with_total ORDER BY particulars"
    );
    res.json(rows);
  } catch (err) {
    console.error("Project Expenses Error:", err);
    res.status(500).json({ error: "Failed to fetch project expenses" });
  }
};

/**
 * ✅ Get total user count (optionally filtered by department)
 * - If dept_id is passed, filters by that department.
 * - Otherwise, defaults to all users with dept_id = 3 and role_id = 7 (non-admins).
 */
export const getUsersCount = async (req, res) => {
  try {
    const { dept_id } = req.query;

    let query = `
      SELECT COUNT(*) AS userCount
      FROM users
      WHERE role_id != 2
    `;
    const params = [];

    if (dept_id) {
      query += " AND department_id  = ?";
      params.push(dept_id);
    } else {
     
      query += " AND department_id  = 5";
    }

    const [rows] = await db.query(query, params);
    res.json({ count: rows[0].userCount });
  } catch (err) {
    console.error("Users Count Error:", err);
    res.status(500).json({ error: "Failed to fetch users count" });
  }
};

/**
 * ✅ Get MG Report count
 */
/**
 * ✅ Get MG Report count
 * - Admin → total count
 * - User → count by user_id
 */
export const getMGReportCount = async (req, res) => {
  try {
    const { userId } = req.query;

    let query = `
      SELECT COUNT(*) AS reportCount
      FROM data_entries
    `;

    const params = [];

    if (userId) {
      query += " WHERE  user_id = ?";
      params.push(userId);
    }

    const [rows] = await db.query(query, params);

    res.json({ count: rows[0].reportCount });
  } catch (err) {
    console.error("MG Report Count Error:", err);
    res.status(500).json({ error: "Failed to fetch MG Report count" });
  }
};
