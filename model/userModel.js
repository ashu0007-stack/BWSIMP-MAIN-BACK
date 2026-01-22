import db from "../config/db.js";

/* =====================================================
   👥 USER LIST (Admin / Superadmin)
===================================================== */
export const userList = async () => {
  const [users] = await db.query(`
    SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      GROUP_CONCAT(DISTINCT rp.permission) AS permissions
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN user_levels ul ON u.user_level_id = ul.id
    LEFT JOIN designations des ON u.designation_id = des.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id
    -- WHERE u.is_active = 1
    GROUP BY u.id
  `);

  return users;
};

/* =====================================================
   🔐 FIND USER BY EMAIL (LOGIN)
===================================================== */
export const findUserByEmail = async (email) => {
  const [users] = await db.query(
    `
    SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      dist.district_name,
      divi.division_name,
      c.circle_name,
      z.zone_name,
      GROUP_CONCAT(DISTINCT rp.permission) AS permissions
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN user_levels ul ON u.user_level_id = ul.id
    LEFT JOIN designations des ON u.designation_id = des.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN divisions divi ON u.division_id = divi.id
    LEFT JOIN circles c ON u.circle_id = c.id
    LEFT JOIN zones z ON u.zone_id = z.id
    LEFT JOIN districts dist ON u.district_id = dist.district_id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id
    WHERE u.email = ? AND u.is_active = 1
    GROUP BY u.id
    `,
    [email.toLowerCase().trim()]
  );

  return users[0] || null;
};

/* =====================================================
   👤 FIND USER BY ID (PROFILE / TOKEN)
===================================================== */
export const findUserById = async (id) => {
  const [users] = await db.query(
    `
    SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      dist.district_name,
      divi.division_name,
      c.circle_name,
      z.zone_name,
      GROUP_CONCAT(DISTINCT rp.permission) AS permissions
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN user_levels ul ON u.user_level_id = ul.id
    LEFT JOIN designations des ON u.designation_id = des.id
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN divisions divi ON u.division_id = divi.id
    LEFT JOIN circles c ON u.circle_id = c.id
    LEFT JOIN zones z ON u.zone_id = z.id
    LEFT JOIN districts dist ON u.district_id = dist.district_id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id
    WHERE u.id = ? AND u.is_active = 1
    GROUP BY u.id
    `,
    [id]
  );

  return users[0] || null;
};

/* =====================================================
   🔍 DUPLICATE CHECK (CREATE / UPDATE USER)
===================================================== */
export const findUserByEmailOrEmployeeId = async (email, employeeId) => {
  const [users] = await db.query(
    `
    SELECT id, email, employeeId
    FROM users
    WHERE email = ? OR employeeId = ?
    LIMIT 1
    `,
    [email.toLowerCase().trim(), employeeId.trim()]
  );

  return users.length ? users[0] : null;
};

/* =====================================================
   ✅ FOREIGN KEY VALIDATIONS
===================================================== */
export const checkRoleExists = async (role_id) => {
  const [rows] = await db.query(
    `SELECT id FROM roles WHERE id = ? LIMIT 1`,
    [role_id]
  );
  return rows.length > 0;
};

export const checkDepartmentExists = async (department_id) => {
  const [rows] = await db.query(
    `SELECT id FROM departments WHERE id = ? LIMIT 1`,
    [department_id]
  );
  return rows.length > 0;
};

export const checkDesignationExists = async (designation_id) => {
  const [rows] = await db.query(
    `SELECT id FROM designations WHERE id = ? LIMIT 1`,
    [designation_id]
  );
  return rows.length > 0;
};

/* =====================================================
   ➕ CREATE USER
===================================================== */
export const createUserModal = async (user) => {
  const {
    employeeId,
    email,
    password,
    full_name,
    mobno,
    department_id,
    user_level_id,
    designation_id,
    role_id,
    state_id,
    zone_id,
    circle_id,
    division_id,
    sub_division_id,
    section_id,
    district_id,
    block_id,
    panchayat_id,
    cluster_id,
    village_id,
  } = user;

  const [result] = await db.query(
    `
    INSERT INTO users (
      employeeId,
      email,
      password,
      full_name,
      mobno,
      department_id,
      user_level_id,
      designation_id,
      role_id,
      state_id,
      zone_id,
      circle_id,
      division_id,
      sub_division_id,
      section_id,
      district_id,
      block_id,
      panchayat_id,
      cluster_id,
      village_id,
      is_active,
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
    )
    `,
    [
      employeeId.trim(),
      email.toLowerCase().trim(),
      password,
      full_name?.trim() || null,
      mobno || null,
      department_id,
      user_level_id || null,
      designation_id,
      role_id,
      state_id || null,
      zone_id || null,
      circle_id || null,
      division_id || null,
      sub_division_id || null,
      section_id || null,
      district_id || null,
      block_id || null,
      panchayat_id || null,
      cluster_id || null,
      village_id || null,
    ]
  );

  return result;
};



// UPDATE USER NAME & MOBILE
export const updateUserById = async (id, { full_name, mobno }) => {
  const updates = [];
  const values = [];

  if (full_name) {
    updates.push("full_name = ?");
    values.push(full_name.trim());
  }

  if (mobno) {
    updates.push("mobno = ?");
    values.push(mobno);
  }

  if (updates.length === 0) return null; // Nothing to update

  values.push(id); // WHERE id = ?

  const [result] = await db.query(
    `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    values
  );

  return result;
};
