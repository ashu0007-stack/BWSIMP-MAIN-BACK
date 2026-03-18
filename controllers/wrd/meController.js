import db from "../../config/db.js";

// =============================
// GET ALL M&E INDICATORS WITH AGGREGATED DATA
// =============================
export const getAllMEIndicators = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        mei.id,
        mei.indicator_name as name,
        mei.category,
        mei.unit,
        mei.target_value as target,
        mei.baseline_value as baseline,
        mei.current_value as current,
        mei.cumulative_value as cumulative,
        mei.subcomponent,
        mei.frequency,
        mei.data_source,
        mei.responsible_agency,
        pc.component_name,
        
        -- INDICATOR 1: Area under WUA and Private ISP (ID: 1)
        CASE 
          WHEN mei.id = 1 AND mei.unit = 'Hectare' THEN
            COALESCE((SELECT COALESCE(SUM(wua_cca), 0) FROM wua), 0) + 
            COALESCE((SELECT COALESCE(SUM(area_operated), 0) FROM private_isp), 0)
          
          -- INDICATOR 6: Staff and farmers trained (Total Participants)
          WHEN mei.id = 6 THEN
            COALESCE((SELECT SUM(total_participants) FROM program_conducts), 0)
          
          -- INDICATOR 18: Government staff trained
          WHEN mei.id = 18 THEN
            COALESCE((SELECT SUM(government_stakeholder) FROM program_conducts), 0)
          
          -- INDICATOR 19: Government staff trained - Female
          WHEN mei.id = 19 THEN
            COALESCE((SELECT SUM(government_stakeholder_female) FROM program_conducts), 0)
          
          -- INDICATOR 20: Farmers trained
          WHEN mei.id = 20 THEN
            COALESCE((SELECT SUM(beneficiary) FROM program_conducts), 0)
          
          -- INDICATOR 21: Farmers trained - Female
          WHEN mei.id = 21 THEN
            COALESCE((SELECT SUM(beneficiary_female) FROM program_conducts), 0)
          
          -- INDICATOR 13: Area operated by Water User Associations (WUA)
          WHEN mei.id = 13 AND mei.unit = 'Hectare' THEN
            COALESCE((SELECT SUM(wua_cca) FROM wua), 0)
          
          -- INDICATOR 14: Area operated by Private ISP
          WHEN mei.id = 14 AND mei.unit = 'Hectare' THEN
            COALESCE((SELECT SUM(area_operated) FROM private_isp), 0)
          
          -- INDICATOR 2: Women in WUA Executive Committees
          WHEN mei.id = 2 AND mei.unit = 'Percentage' THEN
            COALESCE((
              SELECT 
                ROUND(
                  (COUNT(CASE WHEN gender = 'Female' THEN 1 END) / 
                  NULLIF(COUNT(*), 0)) * 100, 2
                )
              FROM slc_executive_members
              WHERE slc_id IS NOT NULL
            ), 0)
          
          -- INDICATOR 15: Water Tax Collection (in Rs)
          WHEN mei.id = 15 THEN
            COALESCE((
              SELECT SUM(total_tax)
              FROM slc_water_tax 
              WHERE year = (SELECT MAX(year) FROM slc_water_tax)
            ), 0)
          
          -- Component 1: Other Irrigation indicators
          WHEN mei.unit = 'Hectare' AND mei.indicator_name LIKE '%Climate resilient practices%' THEN
            COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 0.4 FROM work w 
                      WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0)
          
          WHEN mei.unit = 'Metric ton' AND mei.indicator_name LIKE '%rice%' THEN
            COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 4.5 FROM work w 
                      WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0)
          
          WHEN mei.unit = 'Metric ton' AND mei.indicator_name LIKE '%wheat%' THEN
            COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 3.2 FROM work w 
                      WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0)
          
          WHEN mei.unit = 'Number' AND mei.indicator_name LIKE '%Private sector%' THEN
            COALESCE((SELECT COUNT(DISTINCT c.id) FROM contractors c
                      JOIN work w ON c.work_id = w.id
                      WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0)
          
          -- Component 2: Flood Risk indicators
          WHEN mei.unit = 'Kilometers' THEN
            COALESCE((SELECT SUM(w.target_km) FROM work w 
                      WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0)
          
          -- Component 3: PBC indicators (Yes/No)
          WHEN mei.unit = 'Yes/No' AND mei.indicator_name LIKE '%PBC #A%' THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM work w 
              WHERE w.component_id = mei.component_id 
              AND w.isAwarded_flag = 1
              AND EXISTS (SELECT 1 FROM contractors WHERE work_id = w.id)
            ) THEN 1 ELSE 0 END
          
          WHEN mei.unit = 'Yes/No' AND mei.indicator_name LIKE '%PBC #B%' THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM work w 
              WHERE w.component_id = mei.component_id 
              AND w.isAwarded_flag = 1
            ) THEN 1 ELSE 0 END
          
          WHEN mei.unit = 'Yes/No' AND mei.indicator_name LIKE '%PBC #C%' THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM work w 
              WHERE w.component_id = mei.component_id 
              AND w.isAwarded_flag = 1
            ) THEN 1 ELSE 0 END
          
          WHEN mei.unit = 'Yes/No' AND mei.indicator_name LIKE '%PBC #D%' THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM work w 
              WHERE w.component_id = mei.component_id 
              AND w.isAwarded_flag = 1
            ) THEN 1 ELSE 0 END
          
          ELSE 0
        END as calculated_current,
        
        -- Calculate percentage
        CASE 
          WHEN mei.target_value > 0 THEN 
            CASE 
              -- INDICATOR 1: Area under WUA and Private ISP
              WHEN mei.id = 1 AND mei.unit = 'Hectare' THEN
                ((COALESCE((SELECT COALESCE(SUM(wua_cca), 0) FROM wua), 0) + 
                  COALESCE((SELECT COALESCE(SUM(area_operated), 0) FROM private_isp), 0)) / 
                  mei.target_value) * 100
              
              -- INDICATOR 6: Staff and farmers trained
              WHEN mei.id = 6 THEN
                (COALESCE((SELECT SUM(total_participants) FROM program_conducts), 0) / mei.target_value) * 100
              
              -- INDICATOR 18: Government staff trained
              WHEN mei.id = 18 THEN
                (COALESCE((SELECT SUM(government_stakeholder) FROM program_conducts), 0) / mei.target_value) * 100
              
              -- INDICATOR 19: Government staff trained - Female
              WHEN mei.id = 19 THEN
                (COALESCE((SELECT SUM(government_stakeholder_female) FROM program_conducts), 0) / mei.target_value) * 100
              
              -- INDICATOR 20: Farmers trained
              WHEN mei.id = 20 THEN
                (COALESCE((SELECT SUM(beneficiary) FROM program_conducts), 0) / mei.target_value) * 100
              
              -- INDICATOR 21: Farmers trained - Female
              WHEN mei.id = 21 THEN
                (COALESCE((SELECT SUM(beneficiary_female) FROM program_conducts), 0) / mei.target_value) * 100
              
              -- INDICATOR 13: Area operated by WUA
              WHEN mei.id = 13 THEN
                (COALESCE((SELECT SUM(wua_cca) FROM wua), 0) / mei.target_value) * 100
              
              -- INDICATOR 14: Area operated by Private ISP
              WHEN mei.id = 14 THEN
                (COALESCE((SELECT SUM(area_operated) FROM private_isp), 0) / mei.target_value) * 100
              
              -- INDICATOR 2: Women in WUA Committees
              WHEN mei.id = 2 AND mei.unit = 'Percentage' THEN
                COALESCE((
                  SELECT 
                    (COUNT(CASE WHEN gender = 'Female' THEN 1 END) / 
                    NULLIF(COUNT(*), 0)) * 100
                  FROM slc_executive_members
                  WHERE slc_id IS NOT NULL
                ), 0)
              
              -- INDICATOR 15: Water Tax
              WHEN mei.id = 15 THEN
                (COALESCE((
                  SELECT SUM(total_tax)
                  FROM slc_water_tax 
                  WHERE year = (SELECT MAX(year) FROM slc_water_tax)
                ), 0) / mei.target_value) * 100
              
              -- Rest of the indicators...
              WHEN mei.unit = 'Hectare' AND mei.indicator_name LIKE '%Climate resilient practices%' THEN
                (COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 0.4 FROM work w 
                          WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0) / mei.target_value) * 100
              
              WHEN mei.unit = 'Metric ton' AND mei.indicator_name LIKE '%rice%' THEN
                (COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 4.5 FROM work w 
                          WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0) / mei.target_value) * 100
              
              WHEN mei.unit = 'Metric ton' AND mei.indicator_name LIKE '%wheat%' THEN
                (COALESCE((SELECT SUM(w.Area_Under_improved_Irrigation) * 3.2 FROM work w 
                          WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0) / mei.target_value) * 100
              
              WHEN mei.unit = 'Number' AND mei.indicator_name LIKE '%Private sector%' THEN
                (COALESCE((SELECT COUNT(DISTINCT c.id) FROM contractors c
                          JOIN work w ON c.work_id = w.id
                          WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0) / mei.target_value) * 100
              
              WHEN mei.unit = 'Kilometers' THEN
                (COALESCE((SELECT SUM(w.target_km) FROM work w 
                          WHERE w.component_id = mei.component_id AND w.isAwarded_flag = 1), 0) / mei.target_value) * 100
              
              WHEN mei.unit = 'Yes/No' THEN
                CASE WHEN EXISTS (
                  SELECT 1 FROM work w 
                  WHERE w.component_id = mei.component_id 
                  AND w.isAwarded_flag = 1
                ) THEN 100 ELSE 0 END
              
              ELSE 0
            END
          ELSE 0
        END as calculated_percentage
        
      FROM me_indicators mei
      LEFT JOIN package_component pc ON mei.component_id = pc.id
      WHERE mei.status = '1' OR mei.status IS NULL
      ORDER BY mei.component_id, mei.id
    `);

    // Format the response
    const formattedRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      unit: row.unit,
      target: row.target,
      baseline: row.baseline,
      current: row.calculated_current,
      cumulative: row.calculated_current,
      percentage: row.calculated_percentage,
      subcomponent: row.subcomponent,
      frequency: row.frequency,
      data_source: row.data_source,
      responsible_agency: row.responsible_agency,
      component_name: row.component_name
    }));

    res.json({
      success: true,
      count: formattedRows.length,
      indicators: formattedRows
    });
  } catch (err) {
    console.error("❌ Error fetching M&E indicators:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch indicators", 
      details: err.message 
    });
  }
};

// =============================
// GET TRAINING/PROGRAM DETAILS FOR INDICATOR 6, 18, 19, 20, 21
// =============================
export const getTrainingDetails = async (req, res) => {
  try {
    // Get summary statistics
    const [summary] = await db.query(`
      SELECT 
        COUNT(*) as total_programs,
        COUNT(CASE WHEN field_visit = 1 THEN 1 END) as field_visits,
        COUNT(CASE WHEN is_reschedule = 1 THEN 1 END) as rescheduled_programs,
        COALESCE(SUM(total_participants), 0) as total_participants,
        COALESCE(SUM(government_stakeholder), 0) as total_government_stakeholders,
        COALESCE(SUM(government_stakeholder_female), 0) as total_govt_female,
        COALESCE(SUM(government_stakeholder_male), 0) as total_govt_male,
        COALESCE(SUM(beneficiary), 0) as total_beneficiaries,
        COALESCE(SUM(beneficiary_female), 0) as total_beneficiary_female,
        COALESCE(SUM(beneficiary_male), 0) as total_beneficiary_male,
        ROUND(
          (COALESCE(SUM(beneficiary_female), 0) / 
          NULLIF(COALESCE(SUM(beneficiary), 0), 0)) * 100, 2
        ) as female_beneficiary_percentage,
        ROUND(
          (COALESCE(SUM(government_stakeholder_female), 0) / 
          NULLIF(COALESCE(SUM(government_stakeholder), 0), 0)) * 100, 2
        ) as female_govt_percentage
      FROM program_conducts
    `);

    // Get monthly breakdown
    const [monthlyBreakdown] = await db.query(`
      SELECT 
        DATE_FORMAT(conduct_date, '%Y-%m') as month,
        COUNT(*) as program_count,
        COALESCE(SUM(total_participants), 0) as participants,
        COALESCE(SUM(beneficiary), 0) as beneficiaries,
        COALESCE(SUM(government_stakeholder), 0) as government_stakeholders,
        COUNT(CASE WHEN field_visit = 1 THEN 1 END) as field_visits
      FROM program_conducts
      GROUP BY DATE_FORMAT(conduct_date, '%Y-%m')
      ORDER BY month DESC
    `);

    // Get detailed program list
    const [programs] = await db.query(`
      SELECT 
        pc.id,
        pc.program_id,
        p.name as program_name,
        pc.conducted_by,
        pc.designation,
        pc.email,
        pc.contact,
        pc.conduct_date,
        pc.total_participants,
        pc.government_stakeholder,
        pc.government_stakeholder_female,
        pc.government_stakeholder_male,
        pc.beneficiary,
        pc.beneficiary_female,
        pc.beneficiary_male,
        pc.field_visit,
        pc.is_reschedule,
        pc.remarks,
        pc.created_at
      FROM program_conducts pc
      LEFT JOIN programs p ON pc.program_id = p.id
      ORDER BY pc.conduct_date DESC
    `);

    res.json({
      success: true,
      summary: summary[0],
      monthlyBreakdown: monthlyBreakdown,
      programs: programs
    });
  } catch (err) {
    console.error("❌ Error fetching training details:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch training details",
      details: err.message 
    });
  }
};

// =============================
// GET M&E SUMMARY FOR DASHBOARD
// =============================
export const getMESummary = async (req, res) => {
  try {
    // Get WUA total CCA for Indicator 1
    const [wuaTotal] = await db.query(`
      SELECT COALESCE(SUM(wua_cca), 0) as total_wua_cca FROM wua
    `);

    // Get Female members data for Indicator 2
    const [femaleData] = await db.query(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN name LIKE '%a' OR name LIKE '%i' OR name LIKE '%u' OR 
                        name LIKE '%A' OR name LIKE '%I' OR name LIKE '%U' THEN 1 END) as female_members,
        ROUND(
          (COUNT(CASE WHEN name LIKE '%a' OR name LIKE '%i' OR name LIKE '%u' OR 
                          name LIKE '%A' OR name LIKE '%I' OR name LIKE '%U' THEN 1 END) / 
          COUNT(*)) * 100, 2
        ) as female_percentage
      FROM slc_executive_members
      WHERE slc_id IS NOT NULL
    `);

    // Get Training/Program data for Indicators 6, 18, 19, 20, 21
    const [trainingData] = await db.query(`
      SELECT 
        COUNT(*) as total_programs,
        COALESCE(SUM(total_participants), 0) as total_participants,
        COALESCE(SUM(government_stakeholder), 0) as total_government_stakeholders,
        COALESCE(SUM(government_stakeholder_female), 0) as total_govt_female,
        COALESCE(SUM(beneficiary), 0) as total_beneficiaries,
        COALESCE(SUM(beneficiary_female), 0) as total_beneficiary_female
      FROM program_conducts
    `);

    // Get Water Tax total for Indicator 15
    const [waterTaxTotal] = await db.query(`
      SELECT 
        COALESCE(SUM(total_tax), 0) as total_tax,
        COALESCE(SUM(total_tax) / 100000, 0) as total_tax_lakhs,
        COUNT(DISTINCT slc_id) as slc_count
      FROM slc_water_tax
      WHERE year = (SELECT MAX(year) FROM slc_water_tax)
    `);

    // Get component-wise progress from package_component table
    const [componentProgress] = await db.query(`
      SELECT 
        pc.id,
        pc.component_name,
        pc.component_cost,
        COUNT(DISTINCT w.id) as total_works,
        COALESCE(SUM(w.target_km), 0) as total_km,
        COALESCE(SUM(w.Area_Under_improved_Irrigation), 0) as total_area,
        COALESCE(SUM(w.work_cost), 0) as total_budget,
        COUNT(mei.id) as indicator_count
      FROM package_component pc
      LEFT JOIN work w ON pc.id = w.component_id AND w.isAwarded_flag = 1
      LEFT JOIN me_indicators mei ON pc.id = mei.component_id AND (mei.status = '1' OR mei.status IS NULL)
      GROUP BY pc.id, pc.component_name, pc.component_cost
      HAVING indicator_count > 0
    `);

    // Get category counts from me_indicators
    const [categoryCounts] = await db.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(target_value) as total_target
      FROM me_indicators
      WHERE status = '1' OR status IS NULL
      GROUP BY category
    `);

    // Get overall totals from work table
    const [totals] = await db.query(`
      SELECT 
        COALESCE(SUM(target_km), 0) as total_km,
        COALESCE(SUM(Area_Under_improved_Irrigation), 0) as total_area,
        COALESCE(SUM(work_cost), 0) as total_budget,
        COUNT(DISTINCT id) as total_works
      FROM work
      WHERE isAwarded_flag = 1
    `);

    const intermediate = categoryCounts.find(c => c.category === 'INTERMEDIATE') || { count: 0, total_target: 0 };
    const pbc = categoryCounts.find(c => c.category === 'PBC') || { count: 0, total_target: 0 };

    // Calculate overall percentage
    const totalTarget = intermediate.total_target + pbc.total_target;
    const totalAchieved = (totals[0]?.total_area || 0) + 
                         (wuaTotal[0]?.total_wua_cca || 0) + 
                         (trainingData[0]?.total_participants || 0) +
                         (waterTaxTotal[0]?.total_tax_lakhs || 0);
    const overallPercentage = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

    res.json({
      success: true,
      summary: {
        totalIndicators: categoryCounts.reduce((sum, cat) => sum + cat.count, 0),
        intermediateCount: intermediate.count,
        pbcCount: pbc.count,
        totalWorks: totals[0]?.total_works || 0,
        totalArea: totals[0]?.total_area || 0,
        totalWuaCca: wuaTotal[0]?.total_wua_cca || 0,
        femaleMembers: {
          totalMembers: femaleData[0]?.total_members || 0,
          femaleMembers: femaleData[0]?.female_members || 0,
          femalePercentage: femaleData[0]?.female_percentage || 0
        },
        trainingPrograms: {
          totalPrograms: trainingData[0]?.total_programs || 0,
          totalParticipants: trainingData[0]?.total_participants || 0,
          totalGovernmentStakeholders: trainingData[0]?.total_government_stakeholders || 0,
          totalGovtFemale: trainingData[0]?.total_govt_female || 0,
          totalBeneficiaries: trainingData[0]?.total_beneficiaries || 0,
          totalBeneficiaryFemale: trainingData[0]?.total_beneficiary_female || 0
        },
        totalWaterTax: waterTaxTotal[0]?.total_tax_lakhs || 0,
        totalWaterTaxRaw: waterTaxTotal[0]?.total_tax || 0,
        slcCount: waterTaxTotal[0]?.slc_count || 0,
        totalKm: totals[0]?.total_km || 0,
        totalBudget: totals[0]?.total_budget || 0,
        overallPercentage: overallPercentage,
        componentProgress,
        categoryBreakdown: categoryCounts,
        intermediateTarget: intermediate.total_target || 0,
        pbcTarget: pbc.total_target || 0
      }
    });
  } catch (err) {
    console.error("❌ Error fetching summary:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch summary",
      details: err.message 
    });
  }
};

// =============================
// GET INDICATORS BY COMPONENT
// =============================
export const getIndicatorsByComponent = async (req, res) => {
  try {
    const { componentId } = req.params;

    const [rows] = await db.query(`
      SELECT 
        mei.id,
        mei.indicator_name as name,
        mei.category,
        mei.unit,
        mei.target_value as target,
        mei.baseline_value as baseline,
        mei.current_value as current,
        mei.cumulative_value as cumulative,
        mei.subcomponent,
        mei.frequency,
        mei.data_source,
        mei.responsible_agency,
        pc.component_name,
        
        -- Include data from various tables based on indicator
        CASE 
          WHEN mei.id = 1 AND mei.unit = 'Hectare' THEN
            COALESCE((SELECT SUM(wua_cca) FROM wua), 0)
          WHEN mei.id = 2 AND mei.unit = 'Percentage' THEN
            COALESCE((
              SELECT 
                ROUND(
                  (COUNT(CASE WHEN name LIKE '%a' OR name LIKE '%i' OR name LIKE '%u' OR 
                                  name LIKE '%A' OR name LIKE '%I' OR name LIKE '%U' THEN 1 END) / 
                  COUNT(*)) * 100, 2
                )
              FROM slc_executive_members
              WHERE slc_id IS NOT NULL
            ), 0)
          WHEN mei.id = 6 THEN
            COALESCE((SELECT SUM(total_participants) FROM program_conducts), 0)
          WHEN mei.id = 18 THEN
            COALESCE((SELECT SUM(government_stakeholder) FROM program_conducts), 0)
          WHEN mei.id = 19 THEN
            COALESCE((SELECT SUM(government_stakeholder_female) FROM program_conducts), 0)
          WHEN mei.id = 20 THEN
            COALESCE((SELECT SUM(beneficiary) FROM program_conducts), 0)
          WHEN mei.id = 21 THEN
            COALESCE((SELECT SUM(beneficiary_female) FROM program_conducts), 0)
          WHEN mei.id = 15 THEN
            COALESCE((
              SELECT SUM(total_tax) / 100000 
              FROM slc_water_tax 
              WHERE year = (SELECT MAX(year) FROM slc_water_tax)
            ), 0)
          ELSE mei.current_value
        END as calculated_current
        
      FROM me_indicators mei
      LEFT JOIN package_component pc ON mei.component_id = pc.id
      WHERE mei.component_id = ? AND (mei.status = '1' OR mei.status IS NULL)
      ORDER BY mei.id
    `, [componentId]);

    res.json({
      success: true,
      count: rows.length,
      indicators: rows
    });
  } catch (err) {
    console.error("❌ Error fetching indicators by component:", err);
    res.status(500).json({ 
      success: false,   
      error: "Failed to fetch indicators", 
      details: err.message 
    });
  }
};