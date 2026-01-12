// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * Validate JWT Access Token
 */
export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    // Check format: must be "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid token format. Use: Bearer <token>" });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({ message: "Token not found" });
    }

    // Verify with the same secret used in login controller
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // attach user details
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }

    return res.status(403).json({ message: "Invalid or expired token" });
  }
};


/**
 * Role-based authorization middleware
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient role" });
    }
    next();
  };
};
