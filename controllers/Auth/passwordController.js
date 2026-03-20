// import db from "../../config/db.js";
// import crypto from "crypto";
// import bcrypt from "bcryptjs";
// import nodemailer from "nodemailer";

// /**
//  * -------------------------------
//  * FORGOT PASSWORD CONTROLLER
//  * -------------------------------
//  */
// export const forgotPassword = async (req, res) => {
//   const { email } = req.body;

//   try {
//     const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

//     if (users.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const token = crypto.randomBytes(32).toString("hex");
//     const expireTime = new Date(Date.now() + 3600000); // 1 hour validity

//     await db.execute(
//       "UPDATE users SET reset_token = ?, reset_token_expair = ? WHERE email = ?",
//       [token, expireTime, email]
//     );

//     // Link that user will click (frontend URL)
//     const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

//     // Mail transporter setup
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: `"MIS Cell" <${process.env.SMTP_USER}>`,
//       to: email,
//       subject: "Password Reset Request",
//       html: `
//         <p>You requested to reset your password for the MIS Portal.</p>
//         <p>Click the link below to reset your password:</p>
//         <a href="${resetLink}">${resetLink}</a>
//         <p><b>Note:</b> This link will expire in 1 hour.</p>
//       `,
//     });

//     res.status(200).json({ message: "Password reset link sent to your email." });
//   } catch (err) {
//     console.error("Forgot password error:", err);
//     res.status(500).json({ message: "Server error while sending reset link." });
//   }
// };

// /**
//  * -------------------------------
//  * RESET PASSWORD CONTROLLER
//  * -------------------------------
//  */
// export const resetPassword = async (req, res) => {
//   const { token } = req.params;
//   const { newPassword } = req.body;

//   try {
//     const [users] = await db.execute(
//       "SELECT * FROM users WHERE reset_token = ? AND reset_token_expair > NOW()",
//       [token]
//     );

//     if (users.length === 0) {
//       return res.status(400).json({ message: "Invalid or expired token." });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     await db.execute(
//       "UPDATE users SET password = ?, reset_token = NULL, reset_token_expair = NULL WHERE id = ?",
//       [hashedPassword, users[0].id]
//     );

//     res.status(200).json({ message: "Password has been reset successfully." });
//   } catch (err) {
//     console.error("Reset password error:", err);
//     res.status(500).json({ message: "Server error while resetting password." });
//   }
// };
import db from "../../config/db.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "../../utils/emailService.js";

/**
 * -------------------------------
 * FORGOT PASSWORD CONTROLLER
 * -------------------------------
 */


export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expireTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.execute(
      "UPDATE users SET resetToken = ?, resetTokenExpire = ? WHERE email = ?",
      [token, expireTime, email]
    );

    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendURL}/reset-password?token=${token}`;

    // ✅ Zimbra se email bhejo
    const emailResult = await sendPasswordResetEmail(
      email, 
      resetLink, 
      users[0].full_name
    );

    if (!emailResult.success) {
      console.error("Zimbra email failed:", emailResult.error);
      // Agar email fail ho jaye to bhi user ko batao ki request process hui
      // Lekin admin ko notify karo
    }

    res.status(200).json({ 
      message: "Password reset link has been sent to your email address via Zimbra.",
    });

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ 
      message: "Server error while processing your request." 
    });
  }
};
/**
 * -------------------------------
 * RESET PASSWORD CONTROLLER - FIXED
 * -------------------------------
 */
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ 
      message: "Token and new password are required." 
    });
  }

  try {
    // ✅ STEP 1: Database se token details get karo with timezone handling
    const [tokenCheck] = await db.execute(
      `SELECT 
        id, 
        email, 
        resetToken, 
        resetTokenExpire,
        CONVERT_TZ(NOW(), 'SYSTEM', '+05:30') as currentDbTime,
        TIMESTAMPDIFF(MINUTE, CONVERT_TZ(NOW(), 'SYSTEM', '+05:30'), resetTokenExpire) as minutesRemaining
       FROM users 
       WHERE resetToken = ?`,
      [token]
    );

    if (tokenCheck.length === 0) {
      return res.status(400).json({ 
        message: "Invalid token. Please request a new reset link." 
      });
    }

    const user = tokenCheck[0];
    const currentTime = new Date();
    const expiryTime = new Date(user.resetTokenExpire);
   
    // ✅ STEP 2: Multiple expiration checks
    const isExpiredByServerTime = currentTime > expiryTime;
    const isExpiredByDbTime = user.minutesRemaining < 0;
    
    if (isExpiredByServerTime || isExpiredByDbTime) {
      const timeDiffMinutes = Math.abs(user.minutesRemaining) || Math.round((currentTime - expiryTime) / 1000 / 60);
      
      // ✅ Clean up expired token
      await db.execute(
        "UPDATE users SET resetToken = NULL, resetTokenExpire = NULL WHERE id = ?",
        [user.id]
      );
      
      return res.status(410).json({ 
        message: `This reset link has expired. Please request a new password reset link.`,
        expired: true,
        redirectToForgot: true
      });
    }

    // ✅ STEP 3: Hash password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [updateResult] = await db.execute(
      "UPDATE users SET password = ?, resetToken = NULL, resetTokenExpire = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.status(200).json({ 
      message: "Password has been reset successfully. You can now login with your new password.",
      redirect: "/login"
    });

  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
};


export const testToken = async (req, res) => {
  const { token } = req.query;
  
  try {
    const [result] = await db.execute(
      `SELECT 
        email, 
        resetToken,
        resetTokenExpire,
        NOW() as currentDbTime,
        TIMEDIFF(resetTokenExpire, NOW()) as timeRemaining
       FROM users 
       WHERE resetToken = ?`,
      [token]
    );
    
    if (result.length > 0) {
      const data = result[0];
      res.json({
        status: "FOUND",
        email: data.email,
        resetToken: data.resetToken,
        resetTokenExpire: data.resetTokenExpire,
        currentDbTime: data.currentDbTime,
        timeRemaining: data.timeRemaining,
        isExpired: data.timeRemaining && data.timeRemaining.startsWith('-'),
        tokensMatch: data.resetToken === token
      });
    } else {
      res.json({
        status: "NOT_FOUND",
        message: "Token not found in database"
      });
    }
  } catch (error) {
    console.error("❌ Test token error:", error);
    res.status(500).json({ error: error.message });
  }
};