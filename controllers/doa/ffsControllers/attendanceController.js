import db from "../../../config/db.js";

export const getAttendanceRecords = async (req, res) => {
    try {
        const [attendance] = await db.query(`
            SELECT 
            fa.id,
            fa.session_id,
            fa.farmer_id,
            fa.attended,
            fa.attendance_date,
            fa.photo_1,
            fa.photo_2,
            fa.remarks,
            fs.session_topic,
            f.farmer_name,
            f.father_or_husband_name
            FROM farmer_attendance fa
            INNER JOIN ffs_sessions fs ON fa.session_id = fs.id
            INNER JOIN farmers f ON fa.farmer_id = f.id
        `);
        res.status(200).json(attendance);
    } catch (error) {
        console.error("Error fetching attendance records:", error);
        res.status(500).json({ message: "Server error" });
    }
}




export const addAttendance = async (req, res) => {
  try {
    const { sessionId, farmer_id, attended, attendance_date, photo_1, photo_2, remarks } = req.body;

    if (!session_id || !farmer_id || !attendance_date) {
      return res.status(400).json({ message: "session_id, farmer_id and attendance_date are required." });
    }

    const query = `
      INSERT INTO farmer_attendance 
        (session_id, farmer_id, attended, attendance_date, photo_1, photo_2, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(query, [
      session_id,
      farmer_id,
      attended ?? 0,
      attendance_date,
      photo_1 || null,
      photo_2 || null,
      remarks || null,
    ]);

    res.status(201).json({ message: "Attendance record added successfully." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Attendance already exists for this farmer in this session." });
    } else {
      console.error("Error adding attendance record:", error);
      res.status(500).json({ message: "Failed to add attendance record." });
    }
  }
};
