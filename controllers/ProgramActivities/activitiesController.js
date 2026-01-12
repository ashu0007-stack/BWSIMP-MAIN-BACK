import db from "../../config/db.js";


export const getActivities = async(req, res) => {


    try {

        const [activity] = await db.query(`SELECT a.id, a.activity_name FROM activity_types AS a`);

        res.status(200).json({
            status:{
                success: true,
                message:"Activities data succesfuly get"
            },
            data: activity.map((a) => ({
                activityId: a.id,
                activityName: a.activity_name
            }))
        });
        
    }catch (error) {
         res.status(500).json({
            status:{
                success: false,
                message:"server error fatching recodes",
                error : error.message 
            },
            
        });

    }

}