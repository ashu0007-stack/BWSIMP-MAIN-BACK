import db from "../../config/db.js";

// ✅ Fetch all components
export const getAllComponents = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, component_name FROM package_component ORDER BY component_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Components Error:", err);
    res.status(500).json({ error: "Failed to fetch components" });
  }
};

// ✅ Fetch subcomponents by component ID
export const getSubcomponentsByComponentId = async (req, res) => {
  try {
    const { componentId } = req.params;
    const [rows] = await db.execute(
      "SELECT id, work_component_name FROM work_component WHERE component_id = ? ORDER BY work_component_name",
      [componentId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Subcomponents Error:", err);
    res.status(500).json({ error: "Failed to fetch subcomponents" });
  }
};

// ✅ Fetch subcomponents by component ID
export const getSubworkcomponentsByworkComponentId = async (req, res) => {
  try {
    const { workcomponentId } = req.params;
    console.log("Fetching subworkcomponents for work_component_id:", workcomponentId);
    
    const [rows] = await db.execute(
      "SELECT id, work_package_name, work_component_id,length_of_work,package_number FROM work_package_component WHERE work_component_id = ? ORDER BY work_package_name",
      [workcomponentId]
    );
    
    console.log("Subworkcomponents found:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("Subworkcomponents Error:", err);
    res.status(500).json({ error: "Failed to fetch subworkcomponents" });
  }
};


// ✅ Fetch all subcomponents (fallback)
export const getAllSubcomponents = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, work_component_name, component_id FROM work_component ORDER BY work_component_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Subcomponents Error:", err);
    res.status(500).json({ error: "Failed to fetch subcomponents" });
  }
};
