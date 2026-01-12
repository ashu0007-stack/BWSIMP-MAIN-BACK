import db from "../../../config/db.js";

/**
 * ✅ Get all farmers with their FFS and location details
 */
export const farmersDetails = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                f.id,
                f.ffs_id,
                f.farmer_reg_no,
                f.farmer_name,
                f.father_or_husband_name,
                f.gender,
                f.age,
                f.category,
                f.contact_number,
                f.address,
                f.village_id,
                f.cluster_code,
                f.block_id,
                f.district_id,
                f.land_holding_size,
                f.irrigated_area,
                f.member_of_wua,
                f.major_crops_grown,
                ffs.ffs_title AS ffsTitle,
                ffs.crop_theme AS cropTheme
            FROM farmers AS f
            LEFT JOIN farmer_field_schools AS ffs ON f.ffs_id = ffs.id
            WHERE ffs_id IS NOT NULL`
        );


        const formattedData = rows.map((row) => ({
            farmerId: row.id,
            ffsId: row.ffs_id,
            ffsTitle: row.ffsTitle,
            cropTheme: row.cropTheme,
            farmerRegNo: row.farmer_reg_no,
            farmerName: row.farmer_name,
            fatherOrHusbandName: row.father_or_husband_name,
            gender: row.gender,
            age: row.age,
            category: row.category,
            contactNumber: row.contact_number,
            address: row.address,
            village: row.village,
            cluster: row.cluster,
            block: row.block,
            district: row.district,
            landHoldingSize: row.land_holding_size,
            irrigatedArea: row.irrigated_area,
            memberOfWua: !!row.member_of_wua, // convert to boolean
            majorCropsGrown: row.major_crops_grown,
        }));

        res.status(200).json({
            status: {
                success: true,
                message: "Farmers fetched successfully",
            },
            data: formattedData,
        });
    } catch (error) {
        console.error("Error fetching farmers:", error);
        res.status(500).json({
            success: false,
            message: "Server error fetching farmers",
            error: error.message,
        });
    }
};

/**
 * ✅ Add a new farmer
 */
export const addFarmerDetails = async (req, res) => {
    try {
        const {
            ffs_id,
            farmer_reg_no,
            farmer_name,
            father_or_husband_name,
            gender,
            age,
            category,
            contact_number,
            address,
            district_id,
            block_id,
            cluster_code,
            village_id,
            land_holding_size,
            irrigated_area,
            member_of_wua,
            major_crops_grown
        } = req.body;

        // ✅ Validation
        if ( !farmer_name || !village_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields ( farmer_name, village_id).",
            });
        }

        const query = `
      INSERT INTO farmers (
        ffs_id, farmer_reg_no, farmer_name, father_or_husband_name,
        gender, age, category, contact_number, address,
        district_id, block_id, cluster_code, village_id,
        land_holding_size, irrigated_area, member_of_wua, major_crops_grown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await db.query(query, [
            ffs_id,
            farmer_reg_no,
            farmer_name,
            father_or_husband_name,
            gender,
            age,
            category,
            contact_number,
            address,
            district_id,
            block_id,
            cluster_code,
            village_id,
            land_holding_size || 0,
            irrigated_area || 0,
            member_of_wua ? 1 : 0,
            major_crops_grown
        ]);

        res.status(201).json({
            success: true,
            message: "Farmer added successfully!",
            data: {
                id: result.insertId,
                farmer_name,
                ffs_id,
                village_id,
            },
        });
    } catch (error) {
        console.error("Error adding farmer:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding farmer.",
            error: error.message,
        });
    }
};

