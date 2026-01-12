import db from "../../config/db.js";


export const getAllprograme = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
 
        p.id,
 
        p.financial_year,
        d.department_name,
 
        at.activity_name,
 
        ul.level_name,
 
        pc.components,
 
        pt.topic_name,
        p.resource_person,
 
        p.contact,
 
        p.coordinator_name,
 
        p.coordinator_email,
 
        p.coordinator_designation,
 
        p.target_group,
 
        p.training_date,
 
        p.venue,
 
        p.session,
 
        p.duration,
 
        p.training_mode,
 

        p.total_participants,   
 
        p.participants_male,
 
        p.participants_female,
 
        p.government_stakeholder,
 
        p.beneficiary,
        p.participants_file,
 
        p.is_reschedule,
 
        p.status,
 
        p.remarks
      FROM programs p
 
      LEFT JOIN departments d
 
        ON p.dept_agency_id = d.id
 
      LEFT JOIN activity_types at
 
        ON p.activity_type_id = at.id
 
      LEFT JOIN user_levels ul
 
        ON p.level_id = ul.id
 
      LEFT JOIN programs_components pc
 
        ON p.component_id = pc.id
 
      LEFT JOIN programe_topics pt
 
        ON p.topic_id = pt.id
 
      ORDER BY p.id DESC
    `);

    res.status(200).json({
      status: {
        success: true,
        message: "Programme data fetched successfully",
      },
      data: rows.map((p) => ({
        programId: p.id,
        financialYear: p.financial_year,

        departmentName: p.department_name,
        activityName: p.activity_name,
        levelName: p.level_name,
        componentName: p.components,
        topicName: p.topic_name,

        resourcePerson: p.resource_person ?? null,
        targetGroup: p.target_group,

        coordinator: {
          name: p.coordinator_name,
          contact: p.contact,
          email: p.coordinator_email,
          designation: p.coordinator_designation,
        },

        
        schedule: {
          date: p.training_date
             ? new Date(p.training_date).toLocaleDateString("en-CA")
            : null,
          venue: p.venue,
          session: p.session,
          duration: p.duration,
          trainingMode: p.training_mode,
        },

        participants: {
          total: p.total_participants,
          male: p.participants_male,
          female: p.participants_female,
          governmentStakeholder: p.government_stakeholder,
          beneficiary: p.beneficiary,
        },

        participantsFile: p.participants_file,
        reschedule: p.is_reschedule,
        status: p.status,
        remarks: p.remarks,
      })),
    });
  } catch (error) {
    res.status(500).json({
      status: {
        success: false,
        message: "Server error while fetching programmes",
      },
      error: error.message,
    });
  }
};



// export const addPrograme = async (req, res) => {
//   try {
//     const {
//       financialYear,
//       levelId,
//       activityTypeId,
//       subActivityId,
//       deptAgencyId,

//       rows, // ✅ multiple component-topic rows
//       engagedStakeholders,

//       trainingDate,
//       venue,
//       session,
//       duration,

//       trainingMode,
//       coordinator,
//       targetGroup,
//       participants,
//       resourcePerson,

//       remarks,
//     } = req.body;

//     // ✅ Convert rows into SQL bulk format
//     const values = rows.map((row) => [
//       financialYear,
//       levelId,
//       activityTypeId,
//       subActivityId,
//       deptAgencyId,

//       row.Component, // ✅ component from rows
//       row.topics,    // ✅ topic from rows
//       engagedStakeholders,

//       trainingDate,
//       venue,
//       session,
//       duration,

//       trainingMode,
//       coordinator,
//       targetGroup,
//       participants,
//       resourcePerson,

//       remarks,
//     ]);

//     const query = `
//       INSERT INTO programes (
//         financial_year,
//         level_id,
//         activity_type_id,
//         sub_activity_id,
//         dept_agency_id,

//         component,
//         topic,
//         engaged_stakeholders,

//         training_date,
//         venue,
//         session,
//         duration,

//         training_mode,
//         coordinator,
//         target_group,
//         participants,
//         resource_person,

//         remarks
//       ) VALUES ?
//     `;

//     const [result] = await db.query(query, [values]); // ✅ CORRECT

//     res.status(201).json({
//       status: {
//         success: true,
//         message: "Programme added successfully",
//       },
//       data: {
//         affectedRows: result.affectedRows,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: {
//         success: false,
//         message: "Server error: programme not inserted",
//         error: error.message,
//       },
//     });
//   }
// };




export const addPrograme = async (req, res) => {
  try {
    const {
      financialYear,
      deptAgencyId,
      activityTypeId,
      levelId,
      rows, // [{ componentId, topicId }]
      resourcePerson,
      targetGroup,

      coordinatorName,
      coordinatorContact,
      coordinatorEmail,
      coordinatorDesignation,

      trainingDate,
      venue,
      session,
      duration,
      trainingMode,
      
      totalParticipants,
      participantsMale,
      participantsFemale, 
      governmentStakeholder,
      beneficiary,
      participantsFile,

      remarks,
    } = req.body;

    // Validation
    if (!rows || !rows.length) {
      return res.status(400).json({
        status: { success: false, message: "Component-topic rows required" },
      });
    }

    // Prepare bulk insert values
    const values = rows.map((row) => [
      financialYear,     
      deptAgencyId,
      activityTypeId,
      levelId,
      row.componentId,
      row.topicId,
      resourcePerson,
      targetGroup,

      trainingDate,
      venue,
      session,
      duration,
      trainingMode,

      coordinatorName,
      coordinatorContact,
      coordinatorEmail,
      coordinatorDesignation,


      totalParticipants,
      participantsMale,
      participantsFemale,
      governmentStakeholder,
      beneficiary,
      participantsFile,

      remarks
    ]);

    const query = `
      INSERT INTO programs (
        financial_year,
        dept_agency_id,
        activity_type_id,
        level_id,
        component_id,
        topic_id,
        resource_person,
        target_group,

        training_date,
        venue,
        session,
        duration,
        training_mode,

        coordinator_name,
        contact,
        coordinator_email,
        coordinator_designation,

        total_participants,
        participants_male,
        participants_female,
        government_stakeholder,
        beneficiary,
        participants_file,
  
        remarks
      ) VALUES ?
    `;

    const [result] = await db.query(query, [values]);

    res.status(201).json({
      status: {
        success: true,
        message: "Programme added successfully",
      },
      data: {
        insertedRows: result.affectedRows,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: {
        success: false,
        message: "Server error: programme not inserted",
      },
      error: error.message,
    });
  }
};



// update program


export const updateProgram = async (req, res) => {
  try {
    const {
      programId,

      financialYear,
      deptAgencyId,
      activityTypeId,
      levelId,
      rows,

      resourcePerson,
      targetGroup,

      coordinatorName,
      coordinatorContact,
      coordinatorEmail,
      coordinatorDesignation,

      trainingDate,
      venue,
      session,
      duration,
      trainingMode,

      totalParticipants,
      participantsMale,
      participantsFemale,
      governmentStakeholder,
      beneficiary,
      participantsFile,

      remarks,
    } = req.body;

    if (!programId) {
      return res.status(400).json({
        status: { success: false, message: "Program ID is required" },
      });
    }

    /* ---------------- FETCH OLD DATE ---------------- */
    const [oldRows] = await db.query(
      `SELECT training_date FROM programs WHERE id = ? LIMIT 1`,
      [programId]
    );

    if (!oldRows.length) {
      return res.status(404).json({
        status: { success: false, message: "Program not found" },
      });
    }

    const oldDate = oldRows[0].training_date;

    /* ---------------- CHECK DATE CHANGE ---------------- */
    const isReschedule =
      new Date(oldDate).toISOString().split("T")[0] !==
      new Date(trainingDate).toISOString().split("T")[0];

    /* ---------------- UPDATE SAME ROW ---------------- */
    await db.query(
      `
      UPDATE programs SET
        financial_year = ?,
        dept_agency_id = ?,
        activity_type_id = ?,
        level_id = ?,
        resource_person = ?,
        target_group = ?,

        training_date = ?,
        venue = ?,
        session = ?,
        duration = ?,
        training_mode = ?,

        coordinator_name = ?,
        contact = ?,
        coordinator_email = ?,
        coordinator_designation = ?,

        total_participants = ?,
        participants_male = ?,
        participants_female = ?,
        government_stakeholder = ?,
        beneficiary = ?,
        participants_file = ?,
        remarks = ?,

        is_reschedule = ?

      WHERE id = ?
      `,
      [
        financialYear,
        deptAgencyId,
        activityTypeId,
        levelId,
        resourcePerson,
        targetGroup,

        trainingDate,
        venue,
        session,
        duration,
        trainingMode,

        coordinatorName,
        coordinatorContact,
        coordinatorEmail,
        coordinatorDesignation,

        totalParticipants,
        participantsMale,
        participantsFemale,
        governmentStakeholder,
        beneficiary,
        participantsFile,
        remarks,

        isReschedule ? 1 : 0,
        programId,
      ]
    );

    return res.json({
      status: {
        success: true,
        message: isReschedule
          ? "Programme updated & marked as rescheduled"
          : "Programme updated successfully",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: { success: false, message: "Server error" },
      error: error.message,
    });
  }
};








export const deletePrograme = async (req, res) => {
  try {
    const { programId } = req.body; // ya req.params agar route /api/program/:id hai

    console.log("prog id", programId)

    if (!programId) {
      return res.status(400).json({
        status: { success: false, message: "Programme ID is required" },
      });
    }

    const [result] = await db.query(
      "DELETE FROM programs WHERE id = ?",
      [programId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: { success: false, message: "Programme not found" },
      });
    }

    res.status(200).json({
      status: { success: true, message: "Programme deleted successfully" },
    });
  } catch (error) {
    res.status(500).json({
      status: { success: false, message: "Server error while deleting programme" },
      error: error.message,
    });
  }
};


