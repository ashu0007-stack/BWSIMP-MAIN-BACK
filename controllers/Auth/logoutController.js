import { getRefreshToken, deleteRefreshToken } from "../../model/tokenModel.js";

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({ message: "Already logged out" });
    }

    // Decode token to get user_id OR fetch user_id from DB
    await getRefreshToken(refreshToken);

      // 🔴 Delete refresh token from DB
    await deleteRefreshToken(refreshToken);

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({ message: "Logged out successfully" });

  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
