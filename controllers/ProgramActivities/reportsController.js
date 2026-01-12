import db from "../../config/db.js";

export const addReportsDocumentation = async (req, res) => {
    try {
        const { trainingAssessmentId, remarks } = req.body;

        const geoPhotos = req.files["geoPhotos"] || [];
        const geo1 = geoPhotos[0]?.filename || null;
        const geo2 = geoPhotos[1]?.filename || null;
        const geo3 = geoPhotos[2]?.filename || null;
        const geo4 = geoPhotos[3]?.filename || null;

        const videos = req.files["videos"] ? req.files["videos"][0].filename : null;
        const reportFiles = req.files["reportFiles"] ? req.files["reportFiles"][0].filename : null;
        const feedbackPdf = req.files["feedbackPdf"] ? req.files["feedbackPdf"][0].filename : null;
        const billsPdf = req.files["billsPdf"] ? req.files["billsPdf"][0].filename : null;

        const [result] = await db.query(
            `INSERT INTO reports_documentation (
                training_assessment_id,
                geo_photo_1,
                geo_photo_2,
                geo_photo_3,
                geo_photo_4,
                videos,
                report_files,
                feedback_pdf,
                bills_pdf,
                remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                trainingAssessmentId,
                geo1,
                geo2,
                geo3,
                geo4,
                videos,
                reportFiles,
                feedbackPdf,
                billsPdf,
                remarks || ""
            ]
        );

        res.status(201).json({
            status: { success: true, message: "Documentation saved successfully" },
            data: { id: result.insertId }
        });

    } catch (error) {
        res.status(500).json({
            status: { success: false, message: "Error saving documentation", error: error.message }
        });
    }
};
