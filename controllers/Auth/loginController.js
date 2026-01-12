import bcrypt from "bcryptjs";
import { findUserByEmail } from "../../model/userModel.js";
import { createAccessToken, createRefreshToken } from "./tokenController.js";
import { saveRefreshToken } from "../../model/tokenModel.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Get single user record
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Store refresh token
    await saveRefreshToken(user.id, refreshToken);

    // Set cookie for refresh token
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    

    res.status(200).json({
      status: {
        message: "Login successful",
        accessToken,
      },
      userDetails: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        department_id: user.department_id,
        department_name: user.department_name,
        user_level_id: user.user_level_id,
        level_name: user.level_name,
        designation_id: user.designation_id,
        designation_name: user.designation_name,
        role_id: user.role_id,
        role_name: user.role_name,
        zone_id: user.zone_id,
        zone_name: user.zone_name,
        circle_id: user.circle_id,
        circle_name: user.circle_name,
        division_id: user.division_id,
        division_name: user.division_name,
        district_id: user.district_id,
        district_name: user.district_name,
        is_super_admin: user.is_super_admin,
        is_system_role: user.is_system_role,
        permissions: user.permissions ? user.permissions.split(',') : []
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
