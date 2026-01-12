// import jwt from "jsonwebtoken";

// /**
//  * Create short-lived Access Token (for client requests)
//  */
// export const createAccessToken = (user) => {
//   if (!process.env.JWT_ACCESS_SECRET) {
//     throw new Error("JWT_ACCESS_SECRET is missing in .env");
//   }

//   return jwt.sign(
//     {
//       id: user.id,
//       role: user.role,
//       dept_id: user.dept_id,
//       project: "BWSIMP",
//     },
//     process.env.JWT_ACCESS_SECRET,
//     { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "1d" }
//   );
// };

// /**
//  * Create long-lived Refresh Token (for token rotation)
//  */
// export const createRefreshToken = (user) => {
//   if (!process.env.JWT_REFRESH_SECRET) {
//     throw new Error("JWT_REFRESH_SECRET is missing in .env");
//   }

//   return jwt.sign(
//     { id: user.id },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" }
//   );
// };
