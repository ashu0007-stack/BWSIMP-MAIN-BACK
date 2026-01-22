import bcrypt from "bcryptjs";
import {
  userList,
  findUserByEmailOrEmployeeId,
  createUserModal,
  checkRoleExists,
  checkDepartmentExists,
  checkDesignationExists,
  updateUserById,
  findUserById
} from "../../model/userModel.js";

export const createUser = async (req, res) => {
  try {
    let {
      employeeId,
      email,
      password,
      full_name,
      mobno,
      department_id,
      role_id,
      designation_id,
      user_level_id,
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
    } = req.body;

    // Role-based security
    const loggedInRole = req.user?.role?.toLowerCase();
    const loggedInDept = req.user?.dept_id;

    if (loggedInRole === "admin") {
      department_id = loggedInDept; // override frontend
    }

    //  Duplicate check
    const existingUser = await findUserByEmailOrEmployeeId(email, employeeId);
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with same email or employee ID",
      });
    }

    // Foreign key validation
    if (!(await checkRoleExists(role_id))) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (!(await checkDepartmentExists(department_id))) {
      return res.status(400).json({ message: "Invalid department selected" });
    }

    if (!(await checkDesignationExists(designation_id))) {
      return res.status(400).json({ message: "Invalid designation selected" });
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    //  Create user
    const result = await createUserModal({
      employeeId: employeeId.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      full_name: full_name?.trim(),
      mobno,
      department_id,
      role_id,
      designation_id,
      user_level_id,
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
    });

    return res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });

  } catch (error) {
    console.error("❌ Create User Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Duplicate entry detected",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



export const getUsersList = async (req, res) => {
  try {
    const users = await userList();

    return res.status(200).json({
      status: { success: true },
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      status: { success: false },
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};



export const updateUser = async (req, res) => {
  const userId = req.params.id; // e.g., /users/:id
  const { full_name, mobno } = req.body;

  try {
    //  Check user exists
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Update
    const result = await updateUserById(userId, { full_name, mobno });

    if (result === null) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      updatedFields: { full_name, mobno },
    });
  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};