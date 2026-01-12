import db from "../../config/db.js";
 
export const getAllConductprograme = async (req, res) => {
  try {
    const [rows] = await db.query(`
       SELECT
  pc.id AS conduct_id,
  pc.conduct_date,
  pc.is_reschedule,
 
  pc.conducted_by,
  pc.designation,
  pc.email,
  pc.contact,
  pc.total_participants,
  pc.participants_female,
  pc.participants_male,
  pc.government_stakeholder,
  pc.beneficiary,
  pc.field_visit,
  pc.remarks,
  pc.created_at,
 
  -- Program Info
  p.id AS program_id,
  p.financial_year,
  p.training_date,
  p.target_group,
  p.resource_person,
 
  d.department_name,
  ul.id AS level_id,
  a.activity_name,
 
  -- Files
  GROUP_CONCAT(
    JSON_OBJECT(
      'id', f.id,
      'type', f.file_type,
      'path', f.file_path
    )
  ) AS files
 
FROM program_conducts pc
JOIN programs p ON p.id = pc.program_id
LEFT JOIN departments d ON d.id = p.dept_agency_id
LEFT JOIN user_levels ul ON ul.id = p.level_id
LEFT JOIN activity_types a ON a.id = p.activity_type_id
LEFT JOIN program_conduct_files f ON f.conduct_id = pc.id
 
GROUP BY pc.id
ORDER BY pc.created_at DESC
      `);
 
    const result = rows.map(row => ({
      ...row,

          // ✅ FORMAT DATES
      training_date: row.training_date
        ? new Date(row.training_date).toLocaleDateString("en-CA")
        : null,

      conduct_date: row.conduct_date
        ? new Date(row.conduct_date).toLocaleDateString("en-CA")
        : null,


      field_visit: row.field_visit === 1 ? "YES" : "NO",
      files: row.files ? JSON.parse(`[${row.files}]`) : []
    }));
 
    res.status(200).json({
      status: {
        success: true,
        message: "Conduct programme data fetched successfully"
      },
      data: result
    });
 
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: {
        success: false,
        message: "Server error while fetching conduct programmes"
      },
      error: error.message
    });
  }
};
 
 
 
export const addProgramConduct = async (req, res) => {
  try {
    const {
      programId,
      conductedBy,
      designation,
      email,
      contact,
      conductDate,
      totalParticipants,
      participantsFemale,
      participantsMale,
      governmentStakeholder,
      beneficiary,
      fieldVisit,
      remarks
    } = req.body;
 
    const [rows] = await db.query(
      `CALL sp_add_program_conduct(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        programId,
        conductedBy,
        designation,
        email,
        contact || null,
        conductDate,
        totalParticipants,
        participantsFemale,
        participantsMale,
        governmentStakeholder,
        beneficiary,
        fieldVisit === "YES" ? 1 : 0,
        remarks || null
      ]
    );
 
    const result = rows[0][0];
 
    res.status(201).json({
      status: {
        success: true,
        message: "Program conduct added successfully"
      },
      data: {
        conductId: result.conduct_id,
        is_reschedule: result.is_reschedule
      }
    });
 
  } catch (error) {
    console.error("ADD CONDUCT SP ERROR:", error);
    res.status(500).json({
      status: {
        success: false,
        message: "Error while adding program conduct"
      },
      error: error.message
    });
  }
};