import db from "../../../config/db.js";

/**
 * ✅ Get all FFS Sessions with related FFS details
 */
export const ffsSessionDetails = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.id,
        s.ffs_id,
        ffs.ffs_title AS ffsTitle,
        s.session_date,
        s.session_topic,
        s.resource_person,
        s.training_methods,
        s.farmers_attended_male,
        s.farmers_attended_female,
        s.agro_ecosystem,
        s.special_topic_planned,
        s.group_dynamics,
        s.feedback_collected,
        s.issues_challenges,
        s.corrective_actions
        FROM ffs_sessions AS s
        LEFT JOIN farmer_field_schools AS ffs ON s.ffs_id = ffs.id
    `);

    const formattedData = rows.map((row) => ({
      sessionId: row.id,
      ffsId: row.ffs_id,
      ffsTitle: row.ffsTitle,
      cropTheme: row.cropTheme,
      sessionDate: row.session_date,
      sessionTopic: row.session_topic,
      resourcePerson: row.resource_person,
      trainingMethods: row.training_methods,
      farmersMale: row.farmers_attended_male,
      farmersFemale: row.farmers_attended_female,
      agroEcosystem: row.agro_ecosystem,
      specialTopic: row.special_topic_planned,
      groupDynamics: row.group_dynamics,
      feedbackCollected: !!row.feedback_collected, // convert to boolean
      issues: row.issues_challenges,
      correctiveActions: row.corrective_actions,
    }));

    res.status(200).json({
      status: {
        success: true,
        message: "FFS sessions fetched successfully",
      },
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching FFS sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching FFS sessions",
      error: error.message,
    });
  }
};

/**
 * ✅ Add a new FFS Session
 */
export const addFfsSession = async (req, res) => {
  try {
    const {
      ffs_id,
      session_date,
      session_topic,
      resource_person,
      training_methods,
      farmers_attended_male,
      farmers_attended_female,
      agro_ecosystem,
      special_topic_planned,
      group_dynamics,
      feedback_collected,
      issues_challenges,
      corrective_actions,
    } = req.body;

    // Validation
    if (!ffs_id || !session_date || !session_topic) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (ffs_id, session_date, session_topic).",
      });
    }

    const query = `
      INSERT INTO ffs_sessions (
        ffs_id,
        session_date,
        session_topic,
        resource_person,
        training_methods,
        farmers_attended_male,
        farmers_attended_female,
        agro_ecosystem,
        special_topic_planned,
        group_dynamics,
        feedback_collected,
        issues_challenges,
        corrective_actions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      ffs_id,
      session_date,
      session_topic,
      resource_person,
      training_methods,
      farmers_attended_male || 0,
      farmers_attended_female || 0,
      agro_ecosystem,
      special_topic_planned,
      group_dynamics,
      feedback_collected ? 1 : 0,
      issues_challenges,
      corrective_actions,
    ]);

    res.status(201).json({
      success: true,
      message: "FFS session added successfully!",
      data: {
        id: result.insertId,
        ffs_id,
        session_topic,
      },
    });
  } catch (error) {
    console.error("Error adding FFS session:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding FFS session.",
      error: error.message,
    });
  }
};
