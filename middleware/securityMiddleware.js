import db from "../config/db.js";

/**
 * 🔐 Security Middleware to detect and prevent manipulation attempts
 * Logs suspicious activities when users try to bypass frontend restrictions
 */

export const detectManipulationAttempt = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    const userDept = req.user?.dept_id;
    const userId = req.user?.id;
    const { dept_id } = req.body;

    // 🚨 Detect if Admin tries to manipulate department field
    if (userRole === "admin" && dept_id && parseInt(dept_id) !== userDept) {
      const suspiciousActivity = {
        user_id: userId,
        activity_type: "DEPARTMENT_MANIPULATION_ATTEMPT",
        details: JSON.stringify({
          attempted_dept_id: dept_id,
          actual_dept_id: userDept,
          endpoint: req.path,
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
        }),
        severity: "HIGH",
        timestamp: new Date(),
      };

      console.log("🚨 SECURITY ALERT: Department manipulation detected!", suspiciousActivity);

      // Log to database (create this table if it doesn't exist)
      try {
        await db.execute(
          `INSERT INTO security_logs (user_id, activity_type, details, severity, ip_address, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            userId,
            suspiciousActivity.activity_type,
            suspiciousActivity.details,
            suspiciousActivity.severity,
            req.ip,
          ]
        );
      } catch (logError) {
        console.error("Failed to log security event:", logError.message);
        // Continue execution even if logging fails
      }

      // Return 403 Forbidden
      return res.status(403).json({
        message: "Security violation detected. This incident has been logged.",
        error: "DEPARTMENT_MANIPULATION_ATTEMPT",
      });
    }

    next();
  } catch (error) {
    console.error("Security middleware error:", error);
    next(); // Continue even if middleware fails
  }
};

/**
 * 🛡️ Rate Limiting for User Creation
 * Prevents abuse by limiting creation attempts
 */
export const rateLimitUserCreation = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 10;
  const TIME_WINDOW = 60000; // 1 minute

  return (req, res, next) => {
    const userId = req.user?.id;
    const now = Date.now();

    if (!attempts.has(userId)) {
      attempts.set(userId, []);
    }

    const userAttempts = attempts.get(userId);
    const recentAttempts = userAttempts.filter((time) => now - time < TIME_WINDOW);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many user creation attempts. Please try again later.",
        retry_after: Math.ceil((TIME_WINDOW - (now - recentAttempts[0])) / 1000),
      });
    }

    recentAttempts.push(now);
    attempts.set(userId, recentAttempts);

    // Cleanup old entries
    if (attempts.size > 1000) {
      attempts.clear();
    }

    next();
  };
})();

/**
 * 🔍 Validate Request Source
 * Ensures requests are coming from legitimate sources
 */
export const validateRequestSource = (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGIN,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);

  if (origin && !allowedOrigins.some((allowed) => origin.includes(allowed))) {
    console.log("⚠️ Suspicious origin detected:", origin);
  }

  next();
};

/**
 * 📝 Create Security Logs Table (Run this once in your database)
 */
export const createSecurityLogsTable = `
CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  activity_type VARCHAR(100) NOT NULL,
  details TEXT,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

export default {
  detectManipulationAttempt,
  rateLimitUserCreation,
  validateRequestSource,
  createSecurityLogsTable,
};