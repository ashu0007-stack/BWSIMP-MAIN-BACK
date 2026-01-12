import bcrypt from "bcryptjs";
import { userList, findUserByEmail, createUserModal } from "../../model/userModel.js";

export const createUser = async (req, res) => {
  try {
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
    } = req.body;

    // ✅ 1. Basic Validation
    if (!email || !password || !employeeId) {
      return res.status(400).json({
        message: "employeeId, Email and Password are required",
      });
    }

    // ✅ 2. Check Duplicate User
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    // ✅ 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 4. Save User
    const result = await createUserModal({
      employeeId,
      email,
      password: hashedPassword,
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
    });

    // ✅ 5. Success Response
    return res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });

  } catch (error) {
    console.error("Create User Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      const msg = error.sqlMessage || "";

      if (msg.includes("username")) {
        return res.status(409).json({
          message: "employee Id already exists",
        });
      }

      if (msg.includes("email")) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      return res.status(409).json({
        message: "Duplicate entry",
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