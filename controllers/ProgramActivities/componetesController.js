import db from "../../config/db.js";

export const getComponents = async (req, res) => {
  try {
    

    const [subActivities] = await db.query(
      `SELECT id, components FROM programs_components`,
    );

    res.status(200).json({
      status: {
        success: true,
        message: "componetes fetched successfully",
      },
      data: subActivities.map((s) => ({
        componentId: s.id,
        componentName: s.components,
      })),
    });
  } catch (error) {
    res.status(500).json({
      status: {
        success: false,
        message: "Server error while fetching componentes",
        error: error.message,
      },
    });
  }
};




export const getTopicsByComponetes = async (req, res) => {
    try {
        const { componentId } = req.params; // or req.query if you prefer query string

        // Validate input
        if (!componentId) {
            return res.status(400).json({
                status: { success: false, message: "componete ID is required" },
            });
        }

        // Fetch topics from `program_topics`
        const [rows] = await db.query(
            `
            SELECT 
                id,
                component_id,
                topic_name
            FROM programe_topics
            WHERE component_id = ?
            `,
                [componentId]
            );

        if (rows.length === 0) {
            return res.status(404).json({
                status: { success: false, message: "No topics found for this sub activity" },
                data: [],
            });
        }

        // Map topics neatly
        const topics = rows.map((row) => ({
            id: row.id,
            componentId: row.component_id,
            topicName: row.topic_name,
        }));

        res.status(200).json({
            status: { success: true, message: "Topics fetched successfully" },
            data: topics,
        });
    } catch (error) {
        console.error("Error fetching topics:", error);
        res.status(500).json({
            status: { success: false, message: "Error fetching topics", error: error.message },
        });
    }
};