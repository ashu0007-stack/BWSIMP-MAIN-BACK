import db from "../config/db.js";

export const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [row] = await db.query(
    `INSERT INTO refresh_tokens (user_id, refresh_token, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       refresh_token = VALUES(refresh_token),
       expires_at = VALUES(expires_at)`,
    [userId, token, expiresAt]);
  return row;
};

export const getRefreshToken = async (token) => {
  const [rows] = await db.query(
    "SELECT * FROM refresh_tokens WHERE refresh_token = ?",
    [token]
  );
  return rows[0];
};


// Delete user’s old token
export const deleteRefreshToken = async (refreshToken) => {
  const [result] = await db.execute(
    "DELETE FROM refresh_tokens WHERE refresh_token = ?",
    [refreshToken]
  );
  return result.affectedRows;
};


