// utils/emailService.js - Zimbra Version (CORRECTED)
import nodemailer from "nodemailer";
import db from "../config/db.js";

// Create transporter for Zimbra
const createTransporter = () => {
  // Screenshot se liye gaye details:
  const host = process.env.ZIMBRA_HOST || "10.172.120.22"; // IP from screenshot
  const port = parseInt(process.env.ZIMBRA_PORT) || 587;
  const user = process.env.ZIMBRA_USER || "mis_pmtc@fmiscwrdbihar.gov.in";
  const pass = process.env.ZIMBRA_PASS || "mi$@123#MPtc";

  console.log("📧 Zimbra Config:", { 
    host, 
    port, 
    user,
    timestamp: new Date().toISOString()
  });

  return nodemailer.createTransport({
    host: host,  // Direct IP use kar rahe hain
    port: port,
    secure: false, // 587 ke liye false
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false, // Self-signed certificate ke liye
      ciphers: 'SSLv3'
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    debug: true, // Debug on
    logger: true // Log on
  });
};

// Send welcome email to new user via Zimbra
export const sendWelcomeEmail = async (email, full_name, employeeId, password) => {
  console.log("📨 Preparing to send welcome email to:", email);
  
  try {
    const transporter = createTransporter();
    
    // Verify connection
    console.log("🔍 Verifying Zimbra connection...");
    await transporter.verify();
    console.log("✅ Zimbra SMTP connection successful");
    
    const mailOptions = {
      from: `"BWSIMP Portal" <mis_pmtc@fmiscwrdbihar.gov.in>`,
      to: email,
      subject: "Welcome to BWSIMP Portal - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin: 0;">BWSIMP Portal</h2>
            <p style="color: #6b7280; margin: 5px 0;">Account Created Successfully</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0;">Dear ${full_name || 'User'},</p>
            <p style="margin: 0 0 15px 0;">Your account has been created successfully in BWSIMP Portal. Below are your login credentials:</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Employee ID:</td>
                <td style="padding: 8px;">${employeeId}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Temporary Password:</td>
                <td style="padding: 8px; font-family: monospace; background: #fff; padding: 5px; border-radius: 4px;">${password}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>⚠️ Important:</strong> Please change your password after first login for security reasons.
            </p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;
                      font-weight: bold;">
              Login to Portal
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            This is an automated message from FMISC System. Please do not reply to this email.
          </p>
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">
            FMISC, Bihar Government
          </p>
        </div>
      `
    };

    console.log("📤 Sending email via Zimbra...");
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully!", {
      to: email,
      messageId: info.messageId,
      response: info.response
    });
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };
    
  } catch (error) {
    console.error("❌ Failed to send welcome email:", {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    // Agar email fail ho jaye to database mein log karo
    try {
      await db.execute(
        "INSERT INTO email_logs (recipient, subject, error, created_at) VALUES (?, ?, ?, NOW())",
        [email, "Welcome Email", error.message]
      );
      console.log("📝 Email failure logged to database");
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

// Forgot password email via Zimbra
export const sendPasswordResetEmail = async (email, resetLink, full_name) => {
  console.log("📨 Preparing to send reset email to:", email);
  
  try {
    const transporter = createTransporter();
    
    // Verify connection
    await transporter.verify();
    
    const mailOptions = {
      from: `"BWSIMP Support" <mis_pmtc@fmiscwrdbihar.gov.in>`,
      to: email,
      subject: "Password Reset Request - BWSIMP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Dear ${full_name || 'User'},</p>
          <p>We received a request to reset your password for BWSIMP Portal.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #2563eb; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy this link: ${resetLink}</p>
          <p><strong>Note:</strong> This link will expire in 1 hour.</p>
          
          <hr>
          <p style="color: #6b7280; font-size: 12px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Reset email sent to:", email);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("❌ Failed to send reset email:", error);
    return { success: false, error: error.message };
  }
};

// Test Zimbra configuration
export const testZimbraConfig = async () => {
  console.log("🔧 Testing Zimbra Configuration...");
  
  try {
    const transporter = createTransporter();
    
    console.log("🔄 Verifying connection...");
    await transporter.verify();
    
    console.log("✅ Zimbra SMTP connection successful");
    console.log("📊 Configuration:", {
      host: process.env.ZIMBRA_HOST || "10.172.120.22",
      port: process.env.ZIMBRA_PORT || 587,
      user: process.env.ZIMBRA_USER || "mis_pmtc@fmiscwrdbihar.gov.in",
      secure: false
    });
    
    // Test email bhejo
    console.log("📧 Sending test email...");
    const testResult = await transporter.sendMail({
      from: `"Test" <mis_pmtc@fmiscwrdbihar.gov.in>`,
      to: "mis_pmtc@fmiscwrdbihar.gov.in",
      subject: "Zimbra Connection Test",
      text: `Test successful at ${new Date().toISOString()}`
    });
    
    console.log("✅ Test email sent:", testResult.messageId);
    
    return { 
      success: true, 
      message: "Zimbra configured successfully",
      messageId: testResult.messageId
    };
    
  } catch (error) {
    console.error("❌ Zimbra test failed:", {
      message: error.message,
      code: error.code,
      command: error.command
    });
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      suggestion: getErrorMessage(error.code)
    };
  }
};

// Helper function for error messages
function getErrorMessage(code) {
  const messages = {
    'ENOTFOUND': 'Server not found - Check hostname/IP and network connection',
    'ECONNREFUSED': 'Connection refused - Check if port is correct and server is running',
    'ETIMEDOUT': 'Connection timeout - Check firewall and network',
    'EAUTH': 'Authentication failed - Check username/password',
    'ESOCKET': 'Socket error - Check TLS/SSL settings'
  };
  return messages[code] || 'Unknown error - Check configuration';
}

// Email logs table create karo
// export const createEmailLogsTable = async () => {
//   try {
//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS email_logs (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         recipient VARCHAR(255) NOT NULL,
//         subject VARCHAR(255),
//         error TEXT,
//         status ENUM('sent', 'failed') DEFAULT 'failed',
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);
//     console.log("✅ Email logs table ready");
//   } catch (error) {
//     console.error("Failed to create email_logs table:", error);
//   }
// };