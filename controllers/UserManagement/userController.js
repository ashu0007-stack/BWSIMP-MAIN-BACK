import db from "../../config/db.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

/* ======================================================
   🛡️ VALIDATION HELPERS
====================================================== */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateMobile = (mobno) => {
  const mobileRegex = /^[6-9]\d{9}$/; // Indian mobile number
  return mobileRegex.test(mobno);
};

// ✅ UPDATED: Employee ID Validation - Maximum 10 alphanumeric characters
const validateEmployeeId = (employeeId) => {
  const employeeIdRegex = /^[a-zA-Z0-9]{1,10}$/;
  return employeeId && employeeIdRegex.test(employeeId.trim());
};

// ✅ NEW: HRMS ID Validation - Maximum 10 alphanumeric characters
const validateHrmsId = (hrms) => {
  if (!hrms) return true; // HRMS is optional, so empty is valid
  const hrmsRegex = /^[a-zA-Z0-9]{1,10}$/;
  return hrmsRegex.test(hrms.trim());
};

const validatePassword = (password) => {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

// ✅ NEW: Username Validation - Only letters and spaces
const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z\s]+$/;
  return username && username.trim().length >= 3 && usernameRegex.test(username.trim());
};

/* ======================================================
   ✅ CREATE USER (with validation)
====================================================== */
export const createUser = async (req, res) => {

  let {
    employeeId,
    username,
    mobno,
    state = "10",
    district_id,
    email,
    role_id,
    dept_id,
    desgn_id,
    level_id,
    zone_id = null,
    circle_id = null,
    division_id = null,
    block_id = null,
    hrms = null // ✅ ADDED HRMS FIELD
  } = req.body;

  const userRole = req.user?.role?.toLowerCase();
  const userDept = req.user?.dept_id;

  // 🔒 CRITICAL: Force department for Admin users (prevent frontend manipulation)
  if (userRole === "admin") {
    dept_id = userDept; // Override whatever was sent from frontend
  }

  // 🔍 Field Validation
  const requiredFields = [
    "employeeId",
    "username",
    "email",
    "role_id",
    "dept_id",
    "desgn_id",
    "level_id",
  ];
  const missingFields = requiredFields.filter((field) => !req.body[field] && field !== "dept_id");
  
  // Add dept_id check after override
  if (!dept_id) {
    missingFields.push("dept_id");
  }
  
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      message: "Missing required fields", 
      missing: missingFields 
    });
  }

  // ✅ Username Validation - Must be letters and spaces only
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      message: "Username must be at least 3 characters and contain only letters and spaces." 
    });
  }

  // ✅ Email Validation
  if (!validateEmail(email)) {
    return res.status(400).json({ 
      message: "Invalid email format. Please enter a valid email address." 
    });
  }

  // ✅ Mobile Validation (if provided)
  if (mobno && !validateMobile(mobno)) {
    return res.status(400).json({ 
      message: "Invalid mobile number. Must be 10 digits starting with 6-9." 
    });
  }

  // ✅ UPDATED: Employee ID Validation - Max 10 alphanumeric
  if (!validateEmployeeId(employeeId)) {
    return res.status(400).json({ 
      message: "Employee ID must be maximum 10 alphanumeric characters." 
    });
  }

  // ✅ NEW: HRMS ID Validation - Max 10 alphanumeric
  if (hrms && !validateHrmsId(hrms)) {
    return res.status(400).json({ 
      message: "HRMS ID must be maximum 10 alphanumeric characters." 
    });
  }

  try {
    const userRole = req.user?.role?.toLowerCase();
    const userDept = req.user?.dept_id;

    // 🔒 Department Admin Restriction
    let finalDeptId = dept_id;
    if (userRole === "admin") {
      finalDeptId = userDept;
      const [targetRole] = await db.execute(
        `SELECT role_name FROM roles WHERE id = ?`,
        [role_id]
      );
      if (targetRole.length && targetRole[0].role_name.toLowerCase() === "superadmin") {
        return res.status(403).json({
          message: "Department Admins are not allowed to create Super Admin users",
        });
      }
    }

    // 🧩 Check existing user (UPDATED with HRMS duplicate check)
    const [existingUsers] = await db.execute(
      "SELECT id, email, employeeId, hrms FROM users WHERE email = ? OR employeeId = ? OR hrms = ?",
      [email, employeeId, hrms]
    );
    
    if (existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      
      if (duplicate.email === email && duplicate.employeeId === employeeId) {
        return res.status(409).json({
          message: "User with same email and employee ID already exists",
        });
      } else if (duplicate.email === email) {
        return res.status(409).json({
          message: "Email already registered with another user",
        });
      } else if (duplicate.employeeId === employeeId) {
        return res.status(409).json({
          message: "Employee ID already exists",
        });
      } else if (hrms && duplicate.hrms === hrms) {
        return res.status(409).json({
          message: "HRMS ID already exists",
        });
      }
    }

    // 🔍 Validate Foreign Keys
    const [roleCheck] = await db.execute("SELECT id FROM roles WHERE id = ?", [role_id]);
    if (roleCheck.length === 0) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const [deptCheck] = await db.execute("SELECT id FROM departments WHERE id = ?", [finalDeptId]);
    if (deptCheck.length === 0) {
      return res.status(400).json({ message: "Invalid department selected" });
    }

    const [desgnCheck] = await db.execute("SELECT id FROM designations WHERE id = ?", [desgn_id]);
    if (desgnCheck.length === 0) {
      return res.status(400).json({ message: "Invalid designation selected" });
    }

    // 🔐 Default password
    const plainPassword = "Welcome@123";
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    // 📊 Fetch Level Name
    let levelName = null;
    if (level_id) {
      const [levelRows] = await db.execute(
        "SELECT level_name FROM department_levels WHERE id = ?",
        [level_id]
      );
      if (levelRows.length > 0) {
        levelName = levelRows[0].level_name;
      } else {
        return res.status(400).json({ message: "Invalid level selected" });
      }
    }

    // 💾 Insert (UPDATED with hrms field)
    const [result] = await db.execute(
      `INSERT INTO users 
        (employeeId, username, mobile_no, state, district, email, password,  
         role_id, dept_id, desgn_id, user_level, user_level_name, zone_id, circle_id, division_id, block_id, hrms,
         created_at, updated_at, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
      [
        employeeId.trim(),
        username.trim(),
        mobno || null,
        state,
        district_id || null,
        email.toLowerCase().trim(),
        hashedPassword,
        parseInt(role_id),
        parseInt(finalDeptId),
        parseInt(desgn_id),
        parseInt(level_id),
        levelName,
        zone_id ? parseInt(zone_id) : null,
        circle_id ? parseInt(circle_id) : null,
        division_id ? parseInt(division_id) : null,
        block_id ? parseInt(block_id) : null,
        hrms ? hrms.trim() : null, // ✅ ADDED HRMS FIELD
      ]
    );

    // ✅ Send email with default password
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS, 
        },
        tls: { rejectUnauthorized: false },
      });

      const mailOptions = {
        from: `"BWSIMP Portal" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your BWSIMP Account Created",
        html: `
          <h2>Hello ${username},</h2>
          <p>Your account has been created successfully in BWSIMP portal.</p>
          <p><b>Employee ID:</b> ${employeeId}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Default Password:</b> ${plainPassword}</p>
          <p>Please login and change your password immediately.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      console.error("❌ Email sending failed:", emailErr);
      // Don't fail user creation if email fails
    }
    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
      defaultPassword: plainPassword,
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({
      message: "Database error",
      error: err.message,
      sqlMessage: err.sqlMessage,
    });
  }
};

/* ======================================================
   ✅ GET ALL USERS (UPDATED with hrms field)
====================================================== */
export const getUsers = async (req, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    const userDept = req.user?.dept_id;

    let query = `
      SELECT 
        u.id, 
        u.employeeId AS EmployeeCode, 
        u.username AS UserName, 
        s.state_name AS State, 
        dis.district_name AS District, 
        u.email AS Email_id, 
        r.id AS role_id, 
        r.role_name AS Role, 
        d.id AS dept_id, 
        d.department_name AS Department, 
        des.id AS desgn_id, 
        des.designation_name AS Designation, 
        u.user_level AS Level, 
        u.user_level_name AS LevelName,
        u.mobile_no,
        u.hrms,
        u.isActive AS isActive,
        DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS created_at, 
        DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.dept_id = d.id
      LEFT JOIN designations des ON u.desgn_id = des.id
      LEFT JOIN districts dis ON u.district = dis.district_id
      LEFT JOIN state s ON u.state = s.state_code
    `;

    const params = [];
    if (userRole === "admin") {
      query += ` WHERE u.dept_id = ?`;
      params.push(userDept);
    }
    query += ` ORDER BY u.created_at DESC`;

    const [users] = await db.execute(query, params);
    res.json(users);
  } catch (err) {
    console.error("❌ Fetch Users Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ======================================================
   ✅ UPDATE USER DETAILS (UPDATED with hrms field and validation)
====================================================== */
export const updateUser = async (req, res) => {
  const userId = req.params.id;
  const {
    username,
    email,
    role_id,
    dept_id,
    desgn_id,
    level_id,
    mobile_no,
    district_id,
    zone_id,
    circle_id,
    division_id,
    block_id,
    hrms
  } = req.body;

  try {
    // 🔐 Logged-in user's details
    const loggedInUser = req.user;
    const loggedInRole = loggedInUser?.role?.toLowerCase();
    const loggedInDept = loggedInUser?.dept_id;

    // ✅ Fetch target user
    const [existingRows] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);
    if (!existingRows.length) {
      return res.status(404).json({ message: "User not found" });
    }
    const existing = existingRows[0];

    // 🔒 Permission checks
    if (loggedInRole === "admin") {
      const [targetRole] = await db.execute("SELECT role_name FROM roles WHERE id = ?", [role_id || existing.role_id]);
      const targetRoleName = targetRole[0]?.role_name?.toLowerCase();
      if (["superadmin", "admin"].includes(targetRoleName)) {
        return res.status(403).json({ message: "Admins cannot change role to Admin/Superadmin" });
      }
    }

    // ✅ Username Validation - Only letters and spaces
    if (username && !validateUsername(username)) {
      return res.status(400).json({ 
        message: "Username must be at least 3 characters and contain only letters and spaces" 
      });
    }

    // ✅ Email Validation
    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Mobile Validation
    if (mobile_no && !validateMobile(mobile_no)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // ✅ HRMS ID Validation - Max 10 alphanumeric
    if (hrms && !validateHrmsId(hrms)) {
      return res.status(400).json({ 
        message: "HRMS ID must be maximum 10 alphanumeric characters." 
      });
    }

    // ✅ Check for HRMS ID duplicate (excluding current user)
    if (hrms && hrms !== existing.hrms) {
      const [hrmsCheck] = await db.execute(
        "SELECT id FROM users WHERE hrms = ? AND id != ?",
        [hrms, userId]
      );
      if (hrmsCheck.length > 0) {
        return res.status(409).json({
          message: "HRMS ID already exists for another user",
        });
      }
    }

    // 🧠 Admin is restricted to their own department
    const finalDeptId = loggedInRole === "admin" ? loggedInDept : dept_id || existing.dept_id;

    const safeValues = [
      username ? username.trim() : existing.username,
      email || existing.email,
      role_id || existing.role_id,
      finalDeptId,
      desgn_id || existing.desgn_id,
      level_id || existing.user_level,
      mobile_no || existing.mobile_no,
      district_id || existing.district,
      zone_id ?? existing.zone_id ?? null,
      circle_id ?? existing.circle_id ?? null,
      division_id ?? existing.division_id ?? null,
      block_id ?? existing.block_id ?? null,
      hrms ? hrms.trim() : (existing.hrms ?? null), 
      userId,
    ];

    await db.execute(
      `UPDATE users 
       SET username=?, email=?, role_id=?, dept_id=?, desgn_id=?, user_level=?, 
           mobile_no=?, district=?, zone_id=?, circle_id=?, division_id=?, block_id=?, hrms=?, updated_at=NOW() 
       WHERE id=?`,
      safeValues
    );

    res.json({ message: "✅ User updated successfully" });
  } catch (err) {
    console.error("❌ Update user error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/* ======================================================
   ✅ ENABLE / DISABLE USER
====================================================== */
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute("SELECT is_active FROM users WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const newStatus = rows[0].is_active === '1' ? '0' : '1';
    await db.execute("UPDATE users SET is_active=?, updated_at=NOW() WHERE id=?", [newStatus, id]);

    res.json({
      message: `User ${newStatus === '0' ? "enabled" : "disabled"} successfully`,
      isActive: newStatus,
    });
  } catch (err) {
    console.error("❌ Toggle User Status Error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/* ======================================================
   ✅ CHANGE PASSWORD (Enhanced with Validation)
====================================================== */
export const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  // ✅ Validation
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ 
      message: "Old and new passwords are required" 
    });
  }

  if (oldPassword === newPassword) {
    return res.status(400).json({ 
      message: "New password must be different from old password" 
    });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ 
      message: "Password must be at least 8 characters with uppercase, lowercase, number and special character" 
    });
  }

  try {
    const [rows] = await db.execute("SELECT password FROM users WHERE id = ?", [userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.execute(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", 
      [hashedPassword, userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ Change password error:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};