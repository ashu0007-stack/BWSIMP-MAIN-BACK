import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Create Access Token (15 minutes)
export const createAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      id: user.id,
      department_id: user.department_id,
      role_id: user.role_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// Create Refresh Token (40-byte random hex)
export const createRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};
