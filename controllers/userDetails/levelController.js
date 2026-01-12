import db from "../../config/db.js";

export const getLevel = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ul.* 
            FROM user_levels ul
            ORDER BY ul.id
        `);

        res.status(200).json({
            status: {
                success: true,
                message: "Level fetched successfully",
            },
            data: rows.map(row => ({
                levelId: row.id,
                levelName: row.level_name,
            })),
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const getLevelsByDeptId  = async (req, res) => {
    try {
        const departmentId = req.params.departmentId;

        const [rows] = await db.query(
            `
           SELECT 
                dl.id,
                dl.department_id,
                d.department_name,
                dl.level_id,
                ul.level_name
            FROM department_levels dl
            JOIN departments d 
                ON dl.department_id = d.id
            JOIN user_levels ul 
                ON dl.level_id = ul.id
            WHERE dl.department_id = ?
            ORDER BY dl.department_id;
            `,
            [departmentId]
        );



        if (rows.length === 0) {
            return res.status(404).json({
                status: {
                    success: false,
                    message: "Level not found",
                },
                data: null,
            });
        }

        const row = rows[0];

        res.status(200).json({
            status: {
                success: true,
                message: "Level fetched successfully",
            },
            data: rows.map(row => ({
                departmentId: row.department_id,
                departmentName: row.department_name,
                userLevelId: row.level_id,
                userLevelName: row.level_name,
            })),
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


