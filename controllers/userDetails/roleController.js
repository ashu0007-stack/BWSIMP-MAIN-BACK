import db from "../../config/db.js";

export const getRoles = async (req, res) => {
    try {
        const [roles] = await db.query(
            `SELECT 
                r.*,
                d.department_name,
                des.designation_name,
                GROUP_CONCAT(DISTINCT rp.permission) as permissions
            FROM roles r
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN designations des ON r.designation_id = des.id
            LEFT JOIN roles_permissions rp ON r.id = rp.role_id
            GROUP BY r.id
            ORDER BY r.id
        `);

         // Parse permissions into arrays
        const rolesWithPermissions = roles.map(role => ({
            ...role,
            permissions: role.permissions ? role.permissions.split(',') : []
        }));

        res.status(200).json({
            status: {
                success: true,
                message: "Level fetched successfully",
            },
           data: rolesWithPermissions,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// export const getRolesbyDesig = async (req, res) => {
//     const { designationId } = req.params;
//     try {
//         const [roles] = await db.query(
//             `SELECT 
//     r.*,
//     d.department_name,
//     des.designation_name,
//     GROUP_CONCAT(DISTINCT rp.permission) AS permissions
// FROM roles r
// LEFT JOIN departments d ON r.department_id = d.id
// LEFT JOIN designations des ON r.designation_id = des.id
// LEFT JOIN roles_permissions rp ON r.id = rp.role_id
// WHERE r.designation_id = ?
// GROUP BY r.id
// ORDER BY r.id;
//         `);

//          // Parse permissions into arrays
//         const rolesWithPermissions = roles.map(role => ({
//             ...role,
//             permissions: role.permissions ? role.permissions.split(',') : []
//         }));

//         res.status(200).json({
//             status: {
//                 success: true,
//                 message: "Level fetched successfully",
//             },
//            data: rolesWithPermissions,
//         });

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


export const getRolesbyDesig = async (req, res) => {
  try {
    const { designationId } = req.params; // 👈 get id from route

    const [roles] = await db.query(
      `
      SELECT 
          dr.id,
          dr.role_id,
          r.role_name,
          dr.department_id,
          d.department_name,
          dr.designation_id,
          des.designation_name
      FROM designation_roles dr
      LEFT JOIN roles r ON dr.role_id = r.id
      LEFT JOIN departments d ON dr.department_id = d.id
      LEFT JOIN designations des ON dr.designation_id = des.id
      WHERE dr.designation_id = ?
      ORDER BY r.id
      `,
      [designationId] // ✅ THIS WAS MISSING
    );

    const rolesWithPermissions = roles.map(role => ({
      ...role,
      permissions: role.permissions ? role.permissions.split(",") : [],
    }));

    res.status(200).json({
      status: { success: true },
      data: rolesWithPermissions,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
