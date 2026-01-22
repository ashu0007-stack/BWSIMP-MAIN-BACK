import db from "../../config/db.js";
import { getFileUrl, deleteFile } from "../../middleware/uploadContractor.js";
import fs from 'fs';
import path from 'path';


const saveBase64File = (base64String, contractorId, docType, index) => {
  try {
    if (!base64String || !base64String.startsWith('data:')) {
      return null;
    }

    // Create directories
    const baseDir = 'uploads';
    const typeDir = `${baseDir}/contractors/${docType}`;
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    // Extract MIME type and base64 data
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Determine file extension
    let extension = '';
    if (mimeType.includes('pdf')) {
      extension = '.pdf';
    } else if (mimeType.includes('msword') || mimeType.includes('wordprocessingml')) {
      extension = '.docx';
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      extension = '.jpg';
    } else if (mimeType.includes('png')) {
      extension = '.png';
    } else {
      extension = '.bin';
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${contractorId}_${docType}_${index}_${timestamp}_${randomStr}${extension}`;
    const filePath = path.join(typeDir, filename);

    // Save file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Return relative path for database
    return `contractors/${docType}/${filename}`;
  } catch (error) {
    console.error(`❌ Error saving ${docType} file:`, error);
    return null;
  }
};
// ===== Controller Functions =====

// ✅ Get all contracts
export const getAllContracts = async (req, res) => {
  try {
    const [rows] = await db.query(`
  SELECT 
  c.id,
  c.contractor_name,
  c.agreement_no,
  c.tenderrefno,
  c.division_id,
  c.work_id,
   w.circle_id,
  cir.circle_name, 
  w.zone_id,
  z.zone_name,     
  w.work_name,
  c.contract_awarded_amount,
  DATE_FORMAT(c.work_commencement_date, '%d-%m-%Y') as work_commencement_date,
  DATE_FORMAT(c.work_stipulated_date, '%d-%m-%Y') as work_stipulated_date,
  c.nameofauthrizeperson,
  c.mobileno,
  c.status,
  DATE_FORMAT(c.createdAt, '%d-%m-%Y') as createdAt, 
  DATE_FORMAT(c.updatedAt, '%d-%m-%Y') as updatedAt,  
  c.agency_address,
  c.email,
  -- Count key personnel
  (SELECT COUNT(*) FROM contractor_key_personnel WHERE contractor_id = c.id) as personnel_count,
  -- Count equipment
  (SELECT COUNT(*) FROM contractor_equipment WHERE contractor_id = c.id) as equipment_count,
  -- Count social data
  (SELECT COUNT(*) FROM contractor_social_data WHERE contractor_id = c.id) as social_count,
  -- Count environmental data
  (SELECT COUNT(*) FROM contractor_environmental_data WHERE contractor_id = c.id) as environmental_count,
  -- Count work methodology
  (SELECT COUNT(*) FROM contractor_work_methodology WHERE contractor_id = c.id) as methodology_count
FROM contractors c
LEFT JOIN work w ON w.id = c.work_id
LEFT JOIN circles cir ON cir.id = w.circle_id   
LEFT JOIN zones z ON z.id = w.zone_id         
ORDER BY c.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching contracts:", err);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
};
// ✅ Get key personnel for a contract
export const getContractKeyPersonnel = async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const [rows] = await db.query(`
     SELECT 
        id,
         contractor_id,
         work_id,
        personnel_type,
        name,
        mobile_no,
        is_primary,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
      FROM contractor_key_personnel 
      WHERE contractor_id = ?
      ORDER BY is_primary DESC, id ASC
    `, [contractorId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching key personnel:", err);
    res.status(500).json({ error: "Failed to fetch key personnel" });
  }
};

// ✅ Get equipment for a contract
export const getContractEquipment = async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const [rows] = await db.query(`
     SELECT 
        id,
        contractor_id,
         work_id,
        equipment_type,
        Quantity_per_bid_document,
        Quantity_per_site,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
      FROM contractor_equipment 
      WHERE contractor_id = ?
      ORDER BY id ASC
    `, [contractorId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching equipment:", err);
    res.status(500).json({ error: "Failed to fetch equipment" });
  }
};

export const getContractSocialData = async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        id,
        contractor_id,
        sn,
        particular,
        other_particular,
        obtained,
        DATE_FORMAT(issue_date, '%Y-%m-%d') as issue_date,
        DATE_FORMAT(valid_up_to, '%Y-%m-%d') as valid_up_to,
        document,
        remarks,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
      FROM contractor_social_data 
      WHERE contractor_id = ?
      ORDER BY sn ASC
    `, [contractorId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching social data:", err);
    res.status(500).json({ error: "Failed to fetch social data" });
  }
};

// ✅ Get environmental data for a contract
export const getContractEnvironmentalData = async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        id,
        contractor_id,
        sno,
        clearance_authorization,
        other_clearance,
        obtained,
        DATE_FORMAT(issue_date, '%Y-%m-%d') as issue_date,
        DATE_FORMAT(valid_up_to, '%Y-%m-%d') as valid_up_to,
        document,
        remarks,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
      FROM contractor_environmental_data 
      WHERE contractor_id = ?
      ORDER BY sno ASC
    `, [contractorId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching environmental data:", err);
    res.status(500).json({ error: "Failed to fetch environmental data" });
  }
};

// ✅ Get work methodology data for a contract
export const getContractWorkMethodology = async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        id,
        contractor_id,
        sn,
        document_name,
        other_document,
        DATE_FORMAT(contractor_submission_date, '%Y-%m-%d') as contractor_submission_date,
        DATE_FORMAT(approval_date, '%Y-%m-%d') as approval_date,
        review_status,
        DATE_FORMAT(resubmission_date, '%Y-%m-%d') as resubmission_date,
        document,
        remark,
        DATE_FORMAT(created_at,'%d-%m-%Y') as created_at
      FROM contractor_work_methodology 
      WHERE contractor_id = ?
      ORDER BY sn ASC
    `, [contractorId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching work methodology data:", err);
    res.status(500).json({ error: "Failed to fetch work methodology data" });
  }
};

// ✅ Create new contract
export const createContract = async (req, res) => {
  try {
    const {
      work_id,
      tenderRefNo,
      agreement_no,
      agency_name,
      authorized,
      phone,
      email,
      alternate_phone,
      alternate_email,
      address,
      contract_amount,
      start_date,
      stipulated_date,
      actual_date_of_completion,
      key_personnel = [],
      equipment = [],
      social_data=[],
      environmental_data=[],
      work_methodology_data=[],
      inserted_by,
      division_id
    } = req.body;

    const formatValueForDB = (value) => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    };

    // ✅ CORRECTED INSERT QUERY WITH ALL 21 COLUMNS
    const [result] = await db.query(
      `INSERT INTO contractors 
        (work_id, tenderrefno, agreement_no, contractor_name, nameofauthrizeperson,
         mobileno, email, alternate_mobile, alternate_email, agency_address,
         contract_awarded_amount, work_commencement_date, work_stipulated_date,
         actual_date_of_completion, inserted_by, status, createdAt, updatedAt,
         updated_by, division_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'A', NOW(), NOW(), ?, ?)`,
      [
        work_id,
        tenderRefNo,
        agreement_no,
        agency_name,
        authorized,
        phone,
        email,
        formatValueForDB(alternate_phone), 
        formatValueForDB(alternate_email),  
        address,
        contract_amount,
        start_date,
        stipulated_date,
        actual_date_of_completion,
        inserted_by,
        // status = 'A' (already in query)
        // createdAt = NOW() (already in query)
        // updatedAt = NOW() (already in query)
        null, // updated_by for new record (can be null)
        division_id
      ]
    );

 const contractorId = result.insertId;
  // 2. Insert key personnel records
    if (key_personnel && key_personnel.length > 0) {
      for (const personnel of key_personnel) {
        for (const person of personnel.persons) {
          await db.query(
            `INSERT INTO contractor_key_personnel 
              (contractor_id,work_id, personnel_type, name, mobile_no, is_primary)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              contractorId,
              work_id,
              personnel.role,
              person.name || '',
              person.contact || null,
              false // Default is_primary
            ]
          );
        }
      }
    }

    // 3. Insert equipment records
    if (equipment && equipment.length > 0) {
      for (const equip of equipment) {
        await db.query(
          `INSERT INTO contractor_equipment 
            (contractor_id,work_id, equipment_type, Quantity_per_bid_document, Quantity_per_site)
           VALUES (?, ?, ?, ?, ?)`,
          [
            contractorId,
            work_id,
            equip.type,
            parseInt(equip.quantity_bid) || 0,
            parseInt(equip.quantity_site) || 0,
          ]
        );
      }
    }

     if (social_data && social_data.length > 0) {
      const socialInsertPromises = [];
      
      for (let i = 0; i < social_data.length; i++) {
        const social = social_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (social.document && typeof social.document === 'string' && social.document.startsWith('data:')) {
          documentPath = saveBase64File(social.document, contractorId, 'social', i);
          
          if (documentPath) {
          } else {
          }
        } else if (social.document) {
          documentPath = social.document; 
        }
        
        socialInsertPromises.push(
          db.query(
            `INSERT INTO contractor_social_data 
              (contractor_id, sn, particular, other_particular, obtained, issue_date, valid_up_to, document, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contractorId,
              social.sn || (i + 1).toString(),
              social.particular,
              social.other_particular || null,
              social.obtained || 'no',
              social.issue_date || null,
              social.valid_up_to || null,
              documentPath, // Store file path only (not base64)
              social.remarks || null
            ]
          )
        );
      }
      
      await Promise.all(socialInsertPromises);
    }

    // 5. Insert environmental data records with file saving
    if (environmental_data && environmental_data.length > 0) {
      const envInsertPromises = [];
      
      for (let i = 0; i < environmental_data.length; i++) {
        const env = environmental_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (env.document && typeof env.document === 'string' && env.document.startsWith('data:')) {
          documentPath = saveBase64File(env.document, contractorId, 'environmental', i);
          
          if (documentPath) {
          } else {
          }
        } else if (env.document) {
          documentPath = env.document; // Assume it's already a path
        }
        
        envInsertPromises.push(
          db.query(
            `INSERT INTO contractor_environmental_data 
              (contractor_id, sno, clearance_authorization, other_clearance, obtained, issue_date, valid_up_to, document, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contractorId,
              env.sno || (i + 1).toString(),
              env.clearance_authorization,
              env.other_clearance || null,
              env.obtained || 'no',
              env.issue_date || null,
              env.valid_up_to || null,
              documentPath, // Store file path only (not base64)
              env.remarks || null
            ]
          )
        );
      }
      
      await Promise.all(envInsertPromises);
    }

    // 6. Insert work methodology data records with file saving
    if (work_methodology_data && work_methodology_data.length > 0) {
      const methodInsertPromises = [];
      
      for (let i = 0; i < work_methodology_data.length; i++) {
        const method = work_methodology_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (method.document && typeof method.document === 'string' && method.document.startsWith('data:')) {
          documentPath = saveBase64File(method.document, contractorId, 'work_methodology', i);
          
          if (documentPath) {
          } else {
          }
        } else if (method.document) {
          documentPath = method.document; // Assume it's already a path
        }
        
        methodInsertPromises.push(
          db.query(
            `INSERT INTO contractor_work_methodology 
              (contractor_id, sn, document_name, other_document, contractor_submission_date, approval_date, review_status, resubmission_date, document, remark)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contractorId,
              method.sn || (i + 1).toString(),
              method.document_name,
              method.other_document || null,
              method.contractor_submission_date || null,
              method.approval_date || null,
              method.review_status || null,
              method.resubmission_date || null,
              documentPath, // Store file path only (not base64)
              method.remark || null
            ]
          )
        );
      }
      
      await Promise.all(methodInsertPromises);
    }
const [[{ num_of_milestones }]] = await db.query(
  `SELECT num_of_milestones FROM components WHERE work_id = ? LIMIT 1`,
  [work_id]
);

const milestoneCount = Number(num_of_milestones);

if (!milestoneCount || milestoneCount === 0) {
  throw new Error("No milestones defined in components");
}

// Get all components for this work
const [components] = await db.query(
  `SELECT id, nameofcomponent, total_qty, unitname FROM components WHERE work_id = ? ORDER BY id ASC`,
  [work_id]
);

if (components.length === 0) {
  throw new Error("No component records found");
}

// Total duration in days
const startDate = new Date(start_date);
const endDate = new Date(stipulated_date);
const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
const daysPerMilestone = Math.floor(totalDays / milestoneCount);

// Calculate milestone dates (SAME for all components)
const milestoneDates = [];
let currentStartDate = new Date(startDate);

for (let i = 1; i <= milestoneCount; i++) {
  let milestoneEndDate = new Date(currentStartDate);
  
  if (i === milestoneCount) {
    // Last milestone gets exact end date
    milestoneEndDate = new Date(endDate);
  } else {
    milestoneEndDate.setDate(milestoneEndDate.getDate() + daysPerMilestone - 1);
  }
  
  milestoneDates.push({
    milestone_number: i,
    start_date: new Date(currentStartDate),
    end_date: new Date(milestoneEndDate),
    duration_days: Math.ceil((milestoneEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1
  });
  
  // Next milestone starts from next day
  currentStartDate = new Date(milestoneEndDate);
  currentStartDate.setDate(currentStartDate.getDate() + 1);
}


milestoneDates.forEach(m => {
});

// For each component, update its milestones
for (const component of components) {
  
  // Calculate quantity per milestone for this component
  const qtyPerMilestone = component.total_qty / milestoneCount;
  
  // Update or create milestones for this component
  for (let i = 0; i < milestoneDates.length; i++) {
    const milestoneDate = milestoneDates[i];
    const milestoneNumber = milestoneDate.milestone_number;
    
    // Calculate milestone quantity (adjust last milestone for rounding)
    let milestoneQty;
    if (milestoneNumber === milestoneCount) {
      // Last milestone gets remaining quantity
      milestoneQty = component.total_qty - (qtyPerMilestone * (milestoneCount - 1));
    } else {
      milestoneQty = qtyPerMilestone;
    }
    
    // Check if milestone already exists
    const [existingMilestone] = await db.query(
      `SELECT id FROM milestones 
       WHERE work_id = ? AND component_id = ? AND milestone_number = ?`,
      [work_id, component.id, milestoneNumber]
    );
    
    if (existingMilestone && existingMilestone.length > 0) {
      // Update existing milestone
      await db.query(
        `UPDATE milestones 
         SET work_start_date = ?,
             work_stipulated_date = ?,
             
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          milestoneDate.start_date,
          milestoneDate.end_date,
      
          existingMilestone[0].id
        ]
      );
      
    } 
  }
}
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Error saving contract:", err);
    res.status(500).json({ error: err.message });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type, contractorId, field } = req.body;
    
    // Validate type
    const allowedTypes = ['social', 'environmental', 'work_methodology'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Create file path
    const filePath = `contractors/${type}/${req.file.filename}`;
    
    res.json({
      success: true,
      filePath: filePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// ✅ Get file by path
export const getFile = async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Validate type
    const allowedTypes = ['social', 'environmental', 'work_methodology'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(__dirname, `../../../uploads/contractors/${type}/${filename}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
};

export const getWorkstender = async (req, res) => {
  try {
    const [rows] = await db.query(`
   SELECT 
        w.id,
        w.work_name,
        w.package_number,
        w.work_cost,
        w.target_km,
        w.dept_id,
        w.created_by,
        w.created_email,
        w.created_at,
        w.zone_id,
        w.circle_id,
        w.division_id,
        w.Area_Under_improved_Irrigation,
        -- Award status display using CASE
        CASE 
            WHEN w.isAwarded_flag = 1 THEN 'Awarded'
            WHEN w.isAwarded_flag = 0 THEN 'Not Awarded'
            ELSE 'Unknown'
        END as award_status,
        w.isAwarded_flag,
        c.contractor_name,
        c.agreement_no,
        c.contract_awarded_amount,
        c.nameofauthrizeperson,
        c.work_commencement_date,
        c.work_stipulated_date,
        c.email AS contractor_email,
        d.division_name as division_name,
        c.agency_address
      FROM work w
      INNER JOIN divisions d ON w.division_id = d.id
      LEFT JOIN contractors c ON w.id = c.work_id
      INNER JOIN tenderdetails td ON w.id = td.work_id
      WHERE w.isAwarded_flag = '0'  and w.isTenderCreated_flag='1'
      ORDER BY w.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching works:", err);
    res.status(500).json({ error: "Failed to fetch works", details: err.message });
  }
};

// ✅ Get contract by ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [contractRows] = await db.query(`
    SELECT 
  c.id,
  c.work_id,
  c.tenderrefno,
  c.agreement_no,
  c.contractor_name,
  c.nameofauthrizeperson,
  c.mobileno,
  c.email,
  c.alternate_mobile,
  c.alternate_email,
  c.agency_address,
  c.contract_awarded_amount,
  c.work_commencement_date,
  c.work_stipulated_date,
  c.actual_date_of_completion,
  c.inserted_by,
  c.status,
  DATE_FORMAT(c.createdAt, '%Y-%m-%d') as createdAt, 
  DATE_FORMAT(c.updatedAt, '%Y-%m-%d') as updatedAt,  
  w.work_name,
  DATE_FORMAT(c.work_commencement_date, '%Y-%m-%d') as start_date_formatted,
  DATE_FORMAT(c.work_stipulated_date, '%Y-%m-%d') as completion_date_formatted
FROM contractors c
LEFT JOIN work w ON w.id = c.work_id
      WHERE c.id = ?
    `, [id]);

    if (contractRows.length === 0) {
      return res.status(404).json({ error: "Contract not found" });
    }

    const contract = contractRows[0];

    // Get key personnel
    const [personnelRows] = await db.query(
      `SELECT * FROM contractor_key_personnel WHERE contractor_id = ?`,
      [id]
    );

    // Get equipment
    const [equipmentRows] = await db.query(
      `SELECT * FROM contractor_equipment WHERE contractor_id = ?`,
      [id]
    );

    // Get social data
    const [socialRows] = await db.query(
      `SELECT * FROM contractor_social_data WHERE contractor_id = ?`,
      [id]
    );

    // Get environmental data
    const [environmentalRows] = await db.query(
      `SELECT * FROM contractor_environmental_data WHERE contractor_id = ?`,
      [id]
    );

    // Get work methodology data
    const [methodologyRows] = await db.query(
      `SELECT * FROM contractor_work_methodology WHERE contractor_id = ?`,
      [id]
    );
    

    res.json({
      ...contract,
      key_personnel: personnelRows,
      equipment: equipmentRows,
      social_data: socialRows,
      environmental_data: environmentalRows,
      work_methodology_data: methodologyRows
    });

  } catch (err) {
    console.error("Error fetching contract:", err);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
};
// ✅ Update existing contract WITHOUT deleting all records
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      work_id,
      tenderRefNo,
      agreement_no,
      agency_name,
      authorized,
      phone,
      email,
      alternate_phone,
      alternate_email,
      address,
      contract_amount,
      start_date,
      stipulated_date,
      actual_date_of_completion,
      key_personnel = [],
      equipment = [],
      social_data = [],
      environmental_data = [],
      work_methodology_data = [],
      updated_by
    } = req.body;

    // Helper function to format values for database
    const formatValueForDB = (value) => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      return value;
    };

    // Check if contract exists
    const [existingContract] = await db.query(
      'SELECT * FROM contractors WHERE id = ?',
      [id]
    );

    if (!existingContract || existingContract.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contract not found' 
      });
    }

    // 1. Update main contract record
    await db.query(
      `UPDATE contractors SET
        work_id = ?,
        tenderrefno = ?,
        agreement_no = ?,
        contractor_name = ?,
        nameofauthrizeperson = ?,
        mobileno = ?,
        email = ?,
        alternate_mobile = ?,
        alternate_email = ?,
        agency_address = ?,
        contract_awarded_amount = ?,
        work_commencement_date = ?,
        work_stipulated_date = ?,
        actual_date_of_completion = ?,
        updatedAt = CURRENT_TIMESTAMP,
        updated_by= ?
      WHERE id = ?`,
      [
        work_id,
        tenderRefNo,
        agreement_no,
        agency_name,
        authorized,
        phone,
        email,
        formatValueForDB(alternate_phone),
        formatValueForDB(alternate_email),
        address,
        contract_amount,
        start_date,
        stipulated_date,
        formatValueForDB(actual_date_of_completion),
        updated_by,
        id
      ]
    );

    // 2. Handle key personnel - Delete existing and insert new
    if (key_personnel && key_personnel.length > 0) {
      // Delete existing personnel
      await db.query(
        'DELETE FROM contractor_key_personnel WHERE contractor_id = ?',
        [id]
      );

      // Insert new personnel
      for (const personnel of key_personnel) {
        if (personnel.persons && personnel.persons.length > 0) {
          for (const person of personnel.persons) {
            await db.query(
              `INSERT INTO contractor_key_personnel 
                (contractor_id, work_id, personnel_type, name, mobile_no, is_primary)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                id,
                work_id,
                personnel.role,
                person.name || '',
                person.contact || null,
                false
              ]
            );
          }
        }
      }
    }

    // 3. Handle equipment - Delete existing and insert new
    if (equipment && equipment.length > 0) {
      // Delete existing equipment
      await db.query(
        'DELETE FROM contractor_equipment WHERE contractor_id = ?',
        [id]
      );

      // Insert new equipment
      for (const equip of equipment) {
        await db.query(
          `INSERT INTO contractor_equipment 
            (contractor_id, work_id, equipment_type, Quantity_per_bid_document, Quantity_per_site)
           VALUES (?, ?, ?, ?, ?)`,
          [
            id,
            work_id,
            equip.type,
            parseInt(equip.quantity_bid) || 0,
            parseInt(equip.quantity_site) || 0
          ]
        );
      }
    }

    // 4. Handle social data - Delete existing and insert new
    if (social_data && social_data.length > 0) {
      // Delete existing social data
      await db.query(
        'DELETE FROM contractor_social_data WHERE contractor_id = ?',
        [id]
      );

      // Insert new social data
      const socialInsertPromises = [];
      
      for (let i = 0; i < social_data.length; i++) {
        const social = social_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (social.document && typeof social.document === 'string' && social.document.startsWith('data:')) {
          documentPath = saveBase64File(social.document, id, 'social', i);
          
          if (documentPath) {
          } else {
          }
        } else if (social.document) {
          documentPath = social.document; // Assume it's already a path
        }
        
        socialInsertPromises.push(
          db.query(
            `INSERT INTO contractor_social_data 
              (contractor_id, sn, particular, other_particular, obtained, issue_date, valid_up_to, document, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              social.sn || (i + 1).toString(),
              social.particular,
              social.other_particular || null,
              social.obtained || 'no',
              formatValueForDB(social.issue_date),
              formatValueForDB(social.valid_up_to),
              documentPath,
              social.remarks || null
            ]
          )
        );
      }
      
      await Promise.all(socialInsertPromises);
    }

    // 5. Handle environmental data - Delete existing and insert new
    if (environmental_data && environmental_data.length > 0) {
      // Delete existing environmental data
      await db.query(
        'DELETE FROM contractor_environmental_data WHERE contractor_id = ?',
        [id]
      );

      // Insert new environmental data
      const envInsertPromises = [];
      
      for (let i = 0; i < environmental_data.length; i++) {
        const env = environmental_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (env.document && typeof env.document === 'string' && env.document.startsWith('data:')) {
          documentPath = saveBase64File(env.document, id, 'environmental', i);
          
          if (documentPath) {
          } else {
          }
        } else if (env.document) {
          documentPath = env.document; // Assume it's already a path
        }
        
        envInsertPromises.push(
          db.query(
            `INSERT INTO contractor_environmental_data 
              (contractor_id, sno, clearance_authorization, other_clearance, obtained, issue_date, valid_up_to, document, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              env.sno || (i + 1).toString(),
              env.clearance_authorization,
              env.other_clearance || null,
              env.obtained || 'no',
              formatValueForDB(env.issue_date),
              formatValueForDB(env.valid_up_to),
              documentPath,
              env.remarks || null
            ]
          )
        );
      }
      
      await Promise.all(envInsertPromises);
    }

    // 6. Handle work methodology data - Delete existing and insert new
    if (work_methodology_data && work_methodology_data.length > 0) {
      // Delete existing methodology data
      await db.query(
        'DELETE FROM contractor_work_methodology WHERE contractor_id = ?',
        [id]
      );

      // Insert new methodology data
      const methodInsertPromises = [];
      
      for (let i = 0; i < work_methodology_data.length; i++) {
        const method = work_methodology_data[i];
        
        let documentPath = null;
        
        // Check if document is base64 string
        if (method.document && typeof method.document === 'string' && method.document.startsWith('data:')) {
          documentPath = saveBase64File(method.document, id, 'work_methodology', i);
          
          if (documentPath) {
          } else {
          }
        } else if (method.document) {
          documentPath = method.document; // Assume it's already a path
        }
        
        methodInsertPromises.push(
          db.query(
            `INSERT INTO contractor_work_methodology 
              (contractor_id, sn, document_name, other_document, contractor_submission_date, approval_date, review_status, resubmission_date, document, remark)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              method.sn || (i + 1).toString(),
              method.document_name,
              method.other_document || null,
              formatValueForDB(method.contractor_submission_date),
              formatValueForDB(method.approval_date),
              method.review_status || null,
              formatValueForDB(method.resubmission_date),
              documentPath,
              method.remark || null
            ]
          )
        );
      }
      
      await Promise.all(methodInsertPromises);
    }
    
const [[{ num_of_milestones }]] = await db.query(
  `SELECT num_of_milestones FROM components WHERE work_id = ? LIMIT 1`,
  [work_id]
);

const milestoneCount = Number(num_of_milestones);

if (!milestoneCount || milestoneCount === 0) {
  throw new Error("No milestones defined in components");
}

// Get all components for this work
const [components] = await db.query(
  `SELECT id, nameofcomponent, total_qty, unitname FROM components WHERE work_id = ? ORDER BY id ASC`,
  [work_id]
);

if (components.length === 0) {
  throw new Error("No component records found");
}

// Total duration in days
const startDate = new Date(start_date);
const endDate = new Date(stipulated_date);
const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
const daysPerMilestone = Math.floor(totalDays / milestoneCount);

// Calculate milestone dates (SAME for all components)
const milestoneDates = [];
let currentStartDate = new Date(startDate);

for (let i = 1; i <= milestoneCount; i++) {
  let milestoneEndDate = new Date(currentStartDate);
  
  if (i === milestoneCount) {
    // Last milestone gets exact end date
    milestoneEndDate = new Date(endDate);
  } else {
    milestoneEndDate.setDate(milestoneEndDate.getDate() + daysPerMilestone - 1);
  }
  
  milestoneDates.push({
    milestone_number: i,
    start_date: new Date(currentStartDate),
    end_date: new Date(milestoneEndDate),
    duration_days: Math.ceil((milestoneEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1
  });
  
  // Next milestone starts from next day
  currentStartDate = new Date(milestoneEndDate);
  currentStartDate.setDate(currentStartDate.getDate() + 1);
}


milestoneDates.forEach(m => {
  });

// For each component, update its milestones
for (const component of components) {
  
  // Calculate quantity per milestone for this component
  const qtyPerMilestone = component.total_qty / milestoneCount;
  
  // Update or create milestones for this component
  for (let i = 0; i < milestoneDates.length; i++) {
    const milestoneDate = milestoneDates[i];
    const milestoneNumber = milestoneDate.milestone_number;
    
    // Calculate milestone quantity (adjust last milestone for rounding)
    let milestoneQty;
    if (milestoneNumber === milestoneCount) {
      // Last milestone gets remaining quantity
      milestoneQty = component.total_qty - (qtyPerMilestone * (milestoneCount - 1));
    } else {
      milestoneQty = qtyPerMilestone;
    }
    
    // Check if milestone already exists
    const [existingMilestone] = await db.query(
      `SELECT id FROM milestones 
       WHERE work_id = ? AND component_id = ? AND milestone_number = ?`,
      [work_id, component.id, milestoneNumber]
    );
    
    if (existingMilestone && existingMilestone.length > 0) {
      // Update existing milestone
      await db.query(
        `UPDATE milestones 
         SET work_start_date = ?,
             work_stipulated_date = ?,
             
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          milestoneDate.start_date,
          milestoneDate.end_date,
      
          existingMilestone[0].id
        ]
      );
      
    } 
  }
}
   
  } catch (err) {
    console.error("❌ Error updating contract:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to update contract", 
      details: err.message,
      sql: err.sql 
    });
  }
};


