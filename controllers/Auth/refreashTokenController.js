import { findUserById } from "../../model/userModel.js";
import { createAccessToken, createRefreshToken } from "./tokenController.js";
import { saveRefreshToken } from "../../model/tokenModel.js";
import {getRefreshToken, deleteRefreshToken} from "../../model/tokenModel.js"

export const refreshAccessToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken)
      return res.status(401).json({ message: "Refresh token missing" });

    // 1. Check token in DB
    const storedToken = await getRefreshToken(oldRefreshToken);
    if (!storedToken)
      return res.status(403).json({ message: "Invalid refresh token" });

    // 2. Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
      await deleteRefreshToken(storedToken.user_id);
      return res.status(403).json({ message: "Refresh token expired" });
    }

    // 3. Load user
    const user = await findUserById(storedToken.user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 4. Generate tokens
    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken();

    // 5. Update DB
    await saveRefreshToken(user.id, newRefreshToken);

    // 6. Update cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 7. Return new access token
    return res.status(200).json({
      message: "Token refreshed",
      accessToken: newAccessToken,
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
