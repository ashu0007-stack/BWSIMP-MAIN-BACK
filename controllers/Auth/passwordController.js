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

    // ✅ Database update
    const [updateResult] = await db.execute(
      "UPDATE users SET resetToken = ?, resetTokenExpire = ? WHERE email = ?",
      [token, expireTime, email]
    );

    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendURL}/reset-password?token=${token}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ 
        message: "Email service configuration error. Please contact support." 
      });
    }

    // ✅ Create transporter with better configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Development ke liye
      }
    });

    // ✅ Verify transporter connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("❌ SMTP Connection failed:", verifyError);
      return res.status(500).json({ 
        message: "Email service temporarily unavailable. Please try again later." 
      });
    }

    // ✅ Email content
    const mailOptions = {
      from: `"BWSIMP Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request - BWSIMP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0;">BWSIMP Portal</h2>
            <p style="color: #6b7280; margin: 5px 0;">Password Reset Request</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0;">Hello,</p>
            <p style="margin: 0 0 15px 0;">You requested to reset your password for the BWSIMP Portal.</p>
            <p style="margin: 0;">Click the button below to reset your password:</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Reset Your Password
            </a>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">
              <strong>Or copy and paste this link in your browser:</strong>
            </p>
            <p style="margin: 0; word-break: break-all; font-size: 12px; color: #2563eb; background: white; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
          </div>

          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
              <strong>Note:</strong> This link will expire in 1 hour for security reasons.
            </p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              If you didn't request this password reset, please ignore this email. 
              Your account remains secure.
            </p>
          </div>
        </div>
      `,
    };

    // ✅ Send email
    const emailResult = await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Password reset link has been sent to your email address.",
      debug: process.env.NODE_ENV === 'development' ? {
        token: token,
        resetLink: resetLink,
        expiresAt: expireTime
      } : undefined
    });

  } catch (err) {
    console.error("❌ Forgot password error:", err);
    
    // Better error messages
    if (err.code === 'EAUTH') {
      console.error("❌ Email authentication failed - check SMTP credentials");
      return res.status(500).json({ 
        message: "Email service configuration error. Please contact support." 
      });
    } else if (err.code === 'ECONNECTION') {
      console.error("❌ SMTP connection failed");
      return res.status(500).json({ 
        message: "Unable to connect to email service. Please try again later." 
      });
    }
    
    res.status(500).json({ 
      message: "Server error while processing your request. Please try again." 
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