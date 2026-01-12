import db from '../../config/db.js';

/* =========================================================
   Helper Functions
========================================================= */

// Get uploaded file name safely
const getFile = (req, name) => {
  return req.files?.[name]?.[0]?.filename || null;
};

// Check if draft exists
const checkIfDraftExists = async (tenderId) => {
  try {
    const query = `
      SELECT COUNT(*) as draft_count 
      FROM tender_log 
      WHERE tender_id = ? 
      AND action_type IN ('DRAFT_SAVE', 'UPDATE', 'DRAFT_UPDATE')
      LIMIT 1
    `;
    
    const [results] = await db.query(query, [tenderId]);
    return results[0]?.draft_count > 0 || false;
  } catch (error) {
    console.error('Error checking draft existence:', error);
    return false;
  }
};

// Create Tender Log
const createTenderLog = async (
  tenderId,
  actionType,
  logData,
  userId = null,
  userName = 'Guest'
) => {
  try {
    await db.query(
      `
      INSERT INTO tender_log 
      (tender_id, action_type, user_id, user_name, log_data)
      VALUES (?, ?, ?, ?, ?)
      `,
      [tenderId, actionType, userId, userName, JSON.stringify(logData)]
    );
  } catch (error) {
    console.error('❌ Tender Log Error:', error);
    throw error;
  }
};

/* =========================================================
   GET: All Tenders (Search + Pagination)
========================================================= */
/* =========================================================
   GET: All Tenders (Search + Pagination) - FIXED VERSION
========================================================= */
export const getAllTenders = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Debug: Log the incoming request
    //console.log(`🔍 getAllTenders called with: search="${search}", page=${page}, limit=${limit}`);

    // Use LEFT JOIN to get division and work names
    const [rows] = await db.query(
      `
      SELECT 
        td.*,
        d.division_name,
        w.circle_id,
        w.zone_id,
        w.work_name,
        w.package_number,
        w.work_cost
      FROM tenderdetails td
      LEFT JOIN divisions d ON td.division_id = d.id
      LEFT JOIN work w ON td.work_id = w.id
      WHERE td.tenderRefNo LIKE ? 
         OR td.agreement_no LIKE ?
         OR d.division_name LIKE ?
         OR w.work_name LIKE ?
         OR td.tenderAuthority LIKE ?
      ORDER BY td.createdAt DESC
      LIMIT ? OFFSET ?
      `,
      [
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        Number(limit),
        Number(offset)
      ]
    );

    // Debug: Log the results
    // console.log(`✅ Found ${rows.length} tenders`);
    // if (rows.length > 0) {
    //   console.log('📊 First tender details:', {
    //     id: rows[0].id,
    //     division_name: rows[0].division_name,
    //     work_name: rows[0].work_name,
    //     division_id: rows[0].division_id,
    //     work_id: rows[0].work_id,
    //     tenderRefNo: rows[0].tenderRefNo
    //   });
    // }

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      data: rows,
    });
  } catch (error) {
    console.error('❌ Get All Tenders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenders', error: error.message });
  }
};

/* =========================================================
   GET: Tender By Work ID
========================================================= */
/* =========================================================
   GET: Tender By Work ID - FIXED VERSION
========================================================= */
export const getTenderByWorkId1 = async (req, res) => {
  try {
    const { work_id } = req.params;

    console.log(`🔍 getTenderByWorkId called for work_id: ${work_id}`);

    const [rows] = await db.query(
     `
     SELECT 
        td.*,
        td.tenderRefNo, td.agreement_no,
        d.division_name,
        w.work_name,
        w.package_number,
        w.work_cost
      FROM tenderdetails td
      LEFT JOIN divisions d ON td.division_id = d.id
      LEFT JOIN work w ON td.work_id = w.id
      WHERE td.work_id = ?
      ORDER BY td.createdAt DESC
      `,
      [work_id]
    );

    console.log(`✅ Found ${rows.length} tenders for work_id ${work_id}`);
    
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'No tender found for this work ID',
      });
    }

    res.json({ 
      success: true, 
      data: rows 
    });
  } catch (error) {
    console.error('❌ Get Tender By Work ID Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tender',
      error: error.message 
    });
  }
};
export const getTenderByWorkId = async (req, res) => {
  const { work_id } = req.params;
  try {
    const [rows] = await db.query(
      ` SELECT 
        td.*,
        d.division_name,
        w.work_name,
        w.package_number,
        w.work_cost
      FROM tenderdetails td
      LEFT JOIN divisions d ON td.division_id = d.id
      LEFT JOIN work w ON td.work_id = w.id
      WHERE td.work_id = ?
      ORDER BY td.createdAt DESC`,
      [work_id]
    );
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json({ tender_ref_no: "" });
    }
  } catch (err) {
    console.error("Tender fetch error:", err);
    res.status(500).json({ error: "Failed to fetch tender" });
  }
};


/* =========================================================
   GET: Tender Logs By Tender ID
========================================================= */
export const getTenderLogs = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const [logs] = await db.query(
      `
      SELECT 
        id,
        tender_id,
        action_type,
        user_id,
        user_name,
        log_data,
        log_timestamp
      FROM tender_log
      WHERE tender_id = ?
      ORDER BY log_timestamp DESC
      `,
      [tenderId]
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('❌ Get Tender Logs Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

/* =========================================================
   POST: Create / Update Tender (Draft / Final)
========================================================= */

export const saveTender = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const userName = req.user?.username || 'Guest';
    console.log("📋 Received tender data:", req.body);
    
    const {
      id,
      status = 'draft',
      division_id,
      work_id,
      tender_ref_no,
      authority,
      emdfee,
      bid_security,
      validity,
      nameofpiu,
      newsprno,
      agreement_number,
      remark,
      newsdate,
      nitDate,
      saleStartDate,
      preBidDate,
      corrigendumDate,
      bidReceiptDate,
      techBidopeningDate,
      techBidevaluationDate,
      financial_eval_date,
      loa_date,
      action_type,
      _isUpdate,
      _originalData,
      created_by = userId,
      work_order_no,
      work_cost
    } = req.body;

    // Debug: Check the status value
    console.log('Status value:', status, 'Type:', typeof status, 'Is array?', Array.isArray(status));
    
    // Extract file names
    const newspaperFile = getFile(req, 'newspaper_file');
    const nitFile = getFile(req, 'nit_file');
    const saleFile = getFile(req, 'sale_file');
    const preBidFile = getFile(req, 'pre_bid_file');
    const corrigendumFile = getFile(req, 'corrigendum_file');
    const bidsFile = getFile(req, 'bids_file');
    const techOpenFile = getFile(req, 'tech_open_file');
    const techEvalFile = getFile(req, 'tech_eval_file');
    const financialEvalFile = getFile(req, 'financial_eval_file');
    const loaFile = getFile(req, 'loa_file');
    const contractFile = getFile(req, 'contract_file');

    // For existing files from form data
    const existingNewspaper = req.body.existing_newspaper_file || null;
    const existingNit = req.body.existing_nit_file || null;
    const existingSale = req.body.existing_sale_file || null;
    const existingPreBid = req.body.existing_pre_bid_file || null;
    const existingCorrigendum = req.body.existing_corrigendum_file || null;
    const existingBids = req.body.existing_bids_file || null;
    const existingTechOpen = req.body.existing_tech_open_file || null;
    const existingTechEval = req.body.existing_tech_eval_file || null;
    const existingFinancialEval = req.body.existing_financial_eval_file || null;
    const existingLoa = req.body.existing_loa_file || null;
    const existingContract = req.body.existing_contract_file || null;

    // Use new file if uploaded, otherwise keep existing file
    const finalNewspaper = newspaperFile || existingNewspaper;
    const finalNit = nitFile || existingNit;
    const finalSale = saleFile || existingSale;
    const finalPreBid = preBidFile || existingPreBid;
    const finalCorrigendum = corrigendumFile || existingCorrigendum;
    const finalBids = bidsFile || existingBids;
    const finalTechOpen = techOpenFile || existingTechOpen;
    const finalTechEval = techEvalFile || existingTechEval;
    const finalFinancialEval = financialEvalFile || existingFinancialEval;
    const finalLoa = loaFile || existingLoa;
    const finalContract = contractFile || existingContract;

    // ===== DETERMINE ACTION TYPE =====
    let actionType = action_type;
    
    if (!actionType) {
      console.log(`🔍 Determining action type. ID: ${id}, Status: ${status}`);
      
      // Handle array status
      let statusValue = status;
      if (Array.isArray(statusValue)) {
        statusValue = statusValue[0] || 'draft';
      }
      
      if (statusValue === 'finalized' || statusValue === 'SUBMITTED') {
        actionType = 'FINAL_SUBMIT';
        
        console.log('✅ Action type: FINAL_SUBMIT',work_id);
        
      } else if (statusValue === 'draft') {
        if (id) {
          const [draftLogs] = await db.query(
            `SELECT COUNT(*) as count FROM tender_log WHERE tender_id = ? AND action_type IN ('DRAFT_SAVE', 'UPDATE')`,
            [id]
          );
          
          console.log(`📊 Found ${draftLogs[0].count} previous draft logs for tender ${id}`);
          
          if (draftLogs[0].count > 0) {
            actionType = 'UPDATE';
            console.log('✅ Action type: UPDATE (updating existing draft)');
          } else {
            actionType = 'DRAFT_SAVE';
            console.log('✅ Action type: DRAFT_SAVE (first draft save)');
          }
        } else {
          actionType = 'DRAFT_SAVE';
          console.log('✅ Action type: DRAFT_SAVE (new tender)');
        }
      }
    }
    
    console.log(`🎯 Final action type: ${actionType}`);

    let logData = {};
    let tenderId = id;
    
    // Handle status array issue
    let finalStatus = status;
    if (Array.isArray(finalStatus)) {
      finalStatus = finalStatus[0] || 'draft';
    }
    
    // For FINAL_SUBMIT, force status to 'finalized'
    if (actionType === 'FINAL_SUBMIT') {
      finalStatus = 'finalized';
    }
    
    console.log(`📊 Final status: ${finalStatus}`);

    if (id) {
      // ===== UPDATE Existing Tender =====
      
      // Prepare log data
      logData = {
        action_type: actionType,
        status: finalStatus,
        division_id: division_id,
        work_id: work_id,
        tender_ref_no: tender_ref_no,
        authority: authority,
        emdfee: emdfee,
        bid_security: bid_security,
        validity: validity,
        nameofpiu: nameofpiu,
        newsprno: newsprno,
        agreement_number: agreement_number,
        remark: remark,
        dates: {
          newsdate,
          nitDate,
          saleStartDate,
          preBidDate,
          corrigendumDate,
          bidReceiptDate,
          techBidopeningDate,
          techBidevaluationDate,
          financial_eval_date,
          loa_date
        },
        files: {
          newspaper: finalNewspaper,
          nit: finalNit,
          sale: finalSale,
          pre_bid: finalPreBid,
          corrigendum: finalCorrigendum,
          bids: finalBids,
          tech_open: finalTechOpen,
          tech_eval: finalTechEval,
          financial_eval: finalFinancialEval,
          loa: finalLoa,
          contract: finalContract
        }
      };

      // If it's an update, include original data for comparison
      if (_isUpdate && _originalData) {
        logData._isUpdate = true;
        logData.original_data = _originalData;
      }

      // Update tender in database
      const updateQuery = `
        UPDATE tenderdetails SET
          division_id = ?, 
          work_id = ?, 
          tenderRefNo = ?, 
          tenderAuthority = ?,
          emdfee = ?, 
          bid_security = ?, 
          tenderValidity = ?, 
          nameofpiu = ?,
          newsprno = ?, 
          agreement_no = ?, 
          remark = ?, 
          newsdate = ?,
          nitDate = ?, 
          nitfile = ?,
          saleStartDate = ?, 
          salesfile = ?,
          preBidDate = ?, 
          preBidUpload = ?,
          corrigendumDate = ?, 
          corrigendumUpload = ?,
          bidReceiptDate = ?, 
          bidsUpload = ?,
          techBidopeningDate = ?, 
          techBidopeningUpload = ?,
          techBidevaluationDate = ?, 
          techbidevaluationUpload = ?,
          financialEvaluation = ?,
          loa_date = ?, 
          loaUpload = ?,
          contractUpload = ?,
          newspaperdetails = ?,
          status = ?, 
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      console.log('Update values:', [
        division_id,
        work_id,
        tender_ref_no,
        authority,
        emdfee || null,
        bid_security || null,
        validity || null,
        nameofpiu || '',
        newsprno || '',
        agreement_number || '',
        remark || '',
        newsdate || null,
        nitDate || null,
        finalNit || null,
        saleStartDate || null,
        finalSale || null,
        preBidDate || null,
        finalPreBid || null,
        corrigendumDate || null,
        finalCorrigendum || null,
        bidReceiptDate || null,
        finalBids || null,
        techBidopeningDate || null,
        finalTechOpen || null,
        techBidevaluationDate || null,
        finalTechEval || null,
        finalFinancialEval || null,
        loa_date || null,
        finalLoa || null,
        finalContract || null,
        finalNewspaper || null,
        finalStatus,
        id
      ]);

      await db.query(updateQuery, [
        division_id,
        work_id,
        tender_ref_no,
        authority,
        emdfee || null,
        bid_security || null,
        validity || null,
        nameofpiu || '',
        newsprno || '',
        agreement_number || '',
        remark || '',
        newsdate || null,
        nitDate || null,
        finalNit || null,
        saleStartDate || null,
        finalSale || null,
        preBidDate || null,
        finalPreBid || null,
        corrigendumDate || null,
        finalCorrigendum || null,
        bidReceiptDate || null,
        finalBids || null,
        techBidopeningDate || null,
        finalTechOpen || null,
        techBidevaluationDate || null,
        finalTechEval || null,
        finalFinancialEval || null,
        loa_date || null,
        finalLoa || null,
        finalContract || null,
        finalNewspaper || null,
        finalStatus,
        id
      ]);

      console.log(`✅ Tender ID ${id} updated successfully. Action: ${actionType}, Status: ${finalStatus}`);
     
      // ===== UPDATE WORK ORDER TABLE FOR FINAL_SUBMIT =====
      if (actionType === 'FINAL_SUBMIT') {
        try {
          let workOrderUpdated = false;
          
          // Method 1: Update using work_order_no (if provided)
          if (work_order_no) {
            const updateWorkOrderQuery = `
              UPDATE work SET isTenderCreated_flag = 1 WHERE id = ?
            `;
            
            const [workOrderResult] = await db.query(updateWorkOrderQuery, [work_id]);
            if (workOrderResult.affectedRows > 0) {
              console.log(`✅ work_orders table updated: ${workOrderResult.affectedRows} row(s) affected`);
              workOrderUpdated = true;
              logData.work_order_updated = true;
              logData.work_order_no = work_order_no;
            }
          }
          
          // Method 2: Update using work_id (alternative)
          if (!workOrderUpdated && work_id) {
            const updateByWorkIdQuery = `
              UPDATE work SET isTenderCreated_flag = 1 WHERE id = ?
            `;
            
            const [workOrderResult] = await db.query(updateByWorkIdQuery, [work_id]);
            if (workOrderResult.affectedRows > 0) {
              console.log(`✅ work_orders table updated by work_id: ${workOrderResult.affectedRows} row(s) affected`);
              workOrderUpdated = true;
              logData.work_order_updated = true;
              logData.work_id = work_id;
            }
          }
          
          // Method 3: Update using tender_ref_no (alternative)
          if (!workOrderUpdated && tender_ref_no) {
            const updateByTenderRefQuery = `
              UPDATE work_orders 
              SET status = 'SUBMITTED',
                  updated_at = CURRENT_TIMESTAMP
              WHERE tender_ref_no = ?
            `;
            
            const [workOrderResult] = await db.query(updateByTenderRefQuery, [tender_ref_no]);
            if (workOrderResult.affectedRows > 0) {
              console.log(`✅ work_orders table updated by tender_ref: ${workOrderResult.affectedRows} row(s) affected`);
              workOrderUpdated = true;
              logData.work_order_updated = true;
              logData.tender_ref_no = tender_ref_no;
            }
          }
          
          // Also update work cost if provided
          if (work_cost) {
            const updateCostQuery = `
              UPDATE work_orders 
              SET work_cost = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE (work_order_no = ? OR work_id = ? OR tender_ref_no = ?)
            `;
            
            const [costResult] = await db.query(updateCostQuery, [
              work_cost,
              work_order_no || null,
              work_id || null,
              tender_ref_no || null
            ]);
            console.log(`✅ Work cost updated: ${costResult.affectedRows} row(s) affected`);
            logData.work_cost_updated = work_cost;
          }
          
          if (!workOrderUpdated) {
            console.log(`ℹ️ No matching work order found or already updated`);
          }
          
        } catch (workOrderError) {
          console.error('❌ Error updating work_orders table:', workOrderError);
          logData.work_order_error = workOrderError.message;
          // Don't throw error - continue with tender update
        }
      }

    } else {
      // ===== INSERT New Tender =====
      
      // Prepare log data for new tender
      logData = {
        action_type: actionType,
        status: finalStatus,
        division_id: division_id,
        work_id: work_id,
        tender_ref_no: tender_ref_no,
        authority: authority,
        emdfee: emdfee,
        bid_security: bid_security,
        validity: validity,
        nameofpiu: nameofpiu,
        newsprno: newsprno,
        agreement_number: agreement_number,
        remark: remark,
        dates: {
          newsdate,
          nitDate,
          saleStartDate,
          preBidDate,
          corrigendumDate,
          bidReceiptDate,
          techBidopeningDate,
          techBidevaluationDate,
          financial_eval_date,
          loa_date
        },
        files: {
          newspaper: finalNewspaper,
          nit: finalNit,
          sale: finalSale,
          pre_bid: finalPreBid,
          corrigendum: finalCorrigendum,
          bids: finalBids,
          tech_open: finalTechOpen,
          tech_eval: finalTechEval,
          financial_eval: finalFinancialEval,
          loa: finalLoa,
          contract: finalContract
        }
      };

      // Insert new tender
      console.log(`📊 Using status for INSERT: ${finalStatus}`);
      
      const insertQuery = `
        INSERT INTO tenderdetails (
          division_id, 
          work_id, 
          tenderRefNo, 
          tenderAuthority, 
          emdfee, 
          bid_security,
          tenderValidity, 
          nameofpiu, 
          newsprno, 
          agreement_no, 
          remark,
          newsdate, 
          nitDate, 
          nitfile,
          saleStartDate, 
          salesfile,
          preBidDate, 
          preBidUpload,
          corrigendumDate, 
          corrigendumUpload,
          bidReceiptDate, 
          bidsUpload,
          techBidopeningDate, 
          techBidopeningUpload,
          techBidevaluationDate, 
          techbidevaluationUpload,
          financialEvaluation,
          loa_date, 
          loaUpload,
          contractUpload,
          newspaperdetails,
          status, 
          inserted_by_user,
          created_by,
          createdAt, 
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const insertValues = [
        division_id,
        work_id,
        tender_ref_no,
        authority,
        emdfee || null,
        bid_security || null,
        validity || null,
        nameofpiu || '',
        newsprno || '',
        agreement_number || '',
        remark || '',
        newsdate || null,
        nitDate || null,
        finalNit || null,
        saleStartDate || null,
        finalSale || null,
        preBidDate || null,
        finalPreBid || null,
        corrigendumDate || null,
        finalCorrigendum || null,
        bidReceiptDate || null,
        finalBids || null,
        techBidopeningDate || null,
        finalTechOpen || null,
        techBidevaluationDate || null,
        finalTechEval || null,
        finalFinancialEval || null,
        loa_date || null,
        finalLoa || null,
        finalContract || null,
        finalNewspaper || null,
        finalStatus,
        userId,
        created_by
      ];

      // Debug: Log the values to ensure count matches
      console.log(`📊 Column count: 36, Value count: ${insertValues.length}`);
      console.log('Insert values:', insertValues);
      
      const [result] = await db.query(insertQuery, insertValues);

      tenderId = result.insertId;
      console.log(`✅ New tender created with ID: ${tenderId}. Action: ${actionType}`);
    }

    // ===== Create Log AFTER tender is saved =====
    if (tenderId) {
      await createTenderLog(tenderId, actionType, logData, userId, userName);
    }

    // ===== Send Response =====
    res.json({
      success: true,
      message: actionType === 'FINAL_SUBMIT' 
        ? 'Tender finalized and submitted successfully' 
        : (id ? 'Tender updated successfully' : 'Tender created successfully'),
      tenderId: tenderId,
      actionType: actionType,
      status: finalStatus,
      workOrderUpdated: actionType === 'FINAL_SUBMIT' ? logData.work_order_updated || false : null
    });
    

  } catch (error) {
    console.error("❌ Error saving tender:", error);
    
    if (error.sql) {
      console.error("❌ SQL Error details:");
      console.error("SQL:", error.sql);
      console.error("SQL Message:", error.sqlMessage);
      
      // Count columns and values in the INSERT statement
      const columnMatch = error.sql.match(/INSERT INTO tenderdetails \(([^)]+)\)/);
      if (columnMatch) {
        const columns = columnMatch[1].split(',').map(col => col.trim());
        console.error(`Columns in INSERT: ${columns.length}`);
      }
      
      const valuesMatch = error.sql.match(/VALUES \(([^)]+)\)/);
      if (valuesMatch) {
        const values = valuesMatch[1].split(',').map(val => val.trim());
        console.error(`Values in INSERT: ${values.length}`);
        console.error('Values:', values);
      }
    }
    
    res.status(500).json({
      success: false,
      error: `Failed to ${req.body.id ? 'update' : 'create'} tender`,
      details: error.message,
      sqlMessage: error.sqlMessage
    });
  }
};

/* =========================================================
   PUT: Dedicated Endpoint for Final Submit Only
========================================================= */
export const finalSubmitTender = async (req, res) => {
  try {
    const { tenderId } = req.params;
    const { work_order_no, work_id, tender_ref_no } = req.body;
    const userId = req.user?.id || null;
    const userName = req.user?.username || 'Guest';
    
    console.log(`🚀 Final Submit endpoint called for tender: ${tenderId}`);
    
    if (!tenderId) {
      return res.status(400).json({
        success: false,
        message: 'Tender ID is required'
      });
    }
    
    // ===== 1. UPDATE tenderdetails table =====
    const updateTenderQuery = `
      UPDATE tenderdetails 
      SET status = 'finalized',
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const [tenderResult] = await db.query(updateTenderQuery, [tenderId]);
      
    if (tenderResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Tender with ID ${tenderId} not found`
      });
    }
    
    console.log(`✅ tenderdetails updated for ID: ${tenderId}`);
    
    // ===== 2. UPDATE work_orders table =====
    let workOrderUpdated = false;
    
    // Try multiple ways to find and update the work order
    if (work_order_no) {
      const [result1] = await db.query(
        `UPDATE work_orders SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE work_order_no = ?`,
        [work_order_no]
      );
      if (result1.affectedRows > 0) {
        workOrderUpdated = true;
        console.log(`✅ work_orders updated by work_order_no: ${work_order_no}`);
      }
    }
    
    if (!workOrderUpdated && work_id) {
      const [result2] = await db.query(
        `UPDATE work_orders SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE work_id = ?`,
        [work_id]
      );
      if (result2.affectedRows > 0) {
        workOrderUpdated = true;
        console.log(`✅ work_orders updated by work_id: ${work_id}`);
      }
    }
    
    if (!workOrderUpdated && tender_ref_no) {
      const [result3] = await db.query(
        `UPDATE work_orders SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE tender_ref_no = ?`,
        [tender_ref_no]
      );
      if (result3.affectedRows > 0) {
        workOrderUpdated = true;
        console.log(`✅ work_orders updated by tender_ref_no: ${tender_ref_no}`);
      }
    }
    
    if (!workOrderUpdated) {
      console.log(`ℹ️ No matching work order found or already updated`);
    }
    
    // ===== 3. CREATE LOG =====
    const logData = {
      action_type: 'FINAL_SUBMIT',
      tender_id: tenderId,
      work_order_no: work_order_no,
      work_id: work_id,
      tender_ref_no: tender_ref_no,
      tables_updated: {
        tenderdetails: true,
        work_orders: workOrderUpdated
      }
    };
    
    await createTenderLog(tenderId, 'FINAL_SUBMIT', logData, userId, userName);
    console.log(`✅ Final submit completed successfully for tender: ${tenderId}`);
   
    res.json({
      success: true,
      message: 'Tender finalized and submitted successfully',
      tenderId: tenderId,
      tablesUpdated: {
        tenderdetails: true,
        work_orders: workOrderUpdated
      }
    });
    
  } catch (error) {
    console.error('❌ Final submit error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to finalize tender',
      error: error.message
    });
  }
};