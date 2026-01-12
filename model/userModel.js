import db from "../config/db.js";

export const userList = async () => {
  const [users] = await db.query(
    `SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      GROUP_CONCAT(DISTINCT rp.permission) as permissions
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_levels ul ON u.user_level_id = ul.id
      LEFT JOIN designations des ON u.designation_id = des.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN roles_permissions rp ON r.id = rp.role_id
      GROUP BY u.id
    `);

  return users;
};

export const findUserByEmail = async (email) => {
  const [users] = await db.query(
    `SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      dist.district_name,
      dd.division_name,
      c.circle_name,
      z.zone_name,
      GROUP_CONCAT(DISTINCT rp.permission) as permissions
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_levels ul ON u.user_level_id = ul.id
      LEFT JOIN designations des ON u.designation_id = des.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN divisions dd ON u.division_id = dd.id
      LEFT JOIN circles c ON u.circle_id = c.id
      LEFT JOIN zones z ON u.zone_id = z.id
      LEFT JOIN roles_permissions rp ON r.id = rp.role_id
      LEFT JOIN districts dist ON u.district_id = dist.district_id
      WHERE u.email = ? AND u.is_active = 1
      GROUP BY u.id
    `, [email]);

  return users[0];
};



export const findUserById = async (id) => {
  const [users] = await db.query(
    `SELECT 
      u.*,
      d.department_name,
      ul.level_name,
      des.designation_name,
      r.role_name,
      dist.district_name,
      dd.division_name,
      c.circle_name,
      z.zone_name,
      GROUP_CONCAT(DISTINCT rp.permission) as permissions
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_levels ul ON u.user_level_id = ul.id
      LEFT JOIN designations des ON u.designation_id = des.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN divisions dd ON u.division_id = dd.id
      LEFT JOIN circles c ON u.circle_id = c.id
      LEFT JOIN zones z ON u.zone_id = z.id
      LEFT JOIN roles_permissions rp ON r.id = rp.role_id
       LEFT JOIN districts dist ON u.district_id = dist.district_id
      WHERE u.id = ? AND u.is_active = 1
      GROUP BY u.id
    `, [id]);

  return users[0];
};


// ----------------------------------------------------
// CREATE USER MODEL
// ----------------------------------------------------
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
    `INSERT INTO users (
      employeeId, email, password, full_name,mobno,
      department_id, user_level_id, designation_id, role_id,
      state_id, zone_id, circle_id, division_id,
      sub_division_id, section_id, district_id, block_id,
      panchayat_id, cluster_id, village_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );

  return result;
};
