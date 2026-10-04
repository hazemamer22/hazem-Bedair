import * as XLSX from 'xlsx';
import {
  RawMaterial,
  Ration,
  AnimalCategory,
  Barn,
  Mixer,
  MixBatch,
  ConcentratePremixOrder,
  DailyOperationPlan,
  FarmSettings,
} from '../types';
import {
  calculateBarnDailyDemand,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateRationTotalKgPerHead,
  calculateRationCostPerKg,
  calculateDailyWarehouseRequirements,
  calculateBatchIngredients,
  getBatchDerivedTargetWeightKg,
  getBarnDailyState,
  calculateConcentrateStock,
  calculateMilkMetrics,
  calculateConsolidatedBatchIngredients,
  calculateConcentrateBatchFormula,
  ConcentrateBatchFormula,
  calculateRationDmStats,
  getRawMaterialDryMatterPercent,
  getBarnRation,
  calculateDairyFinancials,
  calculateFatteningFinancials,
  calculateFarmDmSummary,
  calculateBarnDmDemandKg,
  calculateBarnDmiPerHeadKg,
  calculateCategoryTotalDemand,
  calculateBarnTotalAllocatedKgToday,
  calculateBatchAllocatedKg,
} from './calculations';

/**
 * Utility to style/configure a worksheet with RTL and auto column widths
 */
function configureSheet(ws: XLSX.WorkSheet, data: any[][]) {
  if (!ws['!views']) {
    ws['!views'] = [{ rightToLeft: true }];
  }

  const colWidths: { wch: number }[] = [];
  data.forEach((row) => {
    row.forEach((cell, colIdx) => {
      const cellValue = cell !== undefined && cell !== null ? String(cell) : '';
      const len = Math.max(cellValue.length * 1.3, 10);
      colWidths[colIdx] = {
        wch: Math.max(colWidths[colIdx]?.wch || 12, Math.min(Math.ceil(len), 45)),
      };
    });
  });
  ws['!cols'] = colWidths;
}

/**
 * Helper to download a workbook as .xlsx
 */
function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, safeName);
}

// ==========================================
// 1. Raw Materials Export (قاعدة الخامات)
// ==========================================
export function exportRawMaterialsToExcel(rawMaterials: RawMaterial[]) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    ['قاعدة بيانات الخامات العلفية بالمزرعة'],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    [
      'كود الخامة',
      'اسم الخامة',
      'الوحدة',
      'نوع الخامة',
      'نسبة المادة الجافة %',
      'سعر الكيلو (ج.م)',
      'سعر الطن التقديري (ج.م)',
      'الرصيد الحالي بالمخزن (كجم)',
      'الحد الأدنى للأمان (كجم)',
      'الحالة',
      'ملاحظات',
    ],
  ];

  rawMaterials.forEach((m) => {
    const isLow =
      m.currentStockKg !== undefined &&
      m.minStockKg !== undefined &&
      m.currentStockKg <= m.minStockKg;

    const typeLabel =
      m.materialType === 'concentrate'
        ? 'مركز جاف'
        : m.materialType === 'roughage'
        ? 'مادة خشنة / مالئة'
        : m.materialType === 'mineral'
        ? 'أملاح ومكملات'
        : m.materialType === 'liquid'
        ? 'سوائل'
        : 'أخرى';

    data.push([
      m.code || m.id,
      m.name,
      m.unit || 'كجم',
      typeLabel,
      m.dryMatterPercent ?? 88,
      m.price ?? 0,
      m.price ? m.price * 1000 : 0,
      m.currentStockKg ?? 0,
      m.minStockKg ?? 0,
      isLow ? '⚠️ رصيد منخفض' : m.status || 'نشطة',
      m.notes || '-',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  configureSheet(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, 'الخامات العلفية');
  downloadWorkbook(wb, `الخامات_العلفية_${new Date().toISOString().split('T')[0]}`);
}

// ==========================================
// 2. Rations Export (تركيبات العلائق)
// ==========================================
export function exportRationsToExcel(rations: Ration[], rawMaterials: RawMaterial[]) {
  const wb = XLSX.utils.book_new();

  // Master Summary Sheet
  const summaryData: any[][] = [
    ['دليل تركيبات العلائق الغذائية'],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    [
      'كود العليقة',
      'اسم العليقة',
      'نوع الحساب',
      'إجمالي الوزن As-Fed (كجم)',
      'المادة الجافة DM (كجم)',
      'نسبة المادة الجافة (DM %)',
      'تكلفة الكيلو (ج.م)',
      'تكلفة الرأس اليومية (ج.م)',
      'عدد المكونات',
      'ملاحظات',
    ],
  ];

  rations.forEach((r) => {
    const totalKg = calculateRationTotalKgPerHead(r);
    const dmStats = calculateRationDmStats(r, rawMaterials);
    const costPerKg = calculateRationCostPerKg(r, rawMaterials);
    const costPerHead = totalKg * costPerKg;

    summaryData.push([
      r.code || r.id,
      r.name,
      r.calculationType === 'fixed_tonnage' ? 'تركيبة بالطن (1000 كجم)' : 'بالرأس (كجم/رأس)',
      totalKg.toFixed(2),
      dmStats.totalDmKgPerHead.toFixed(2),
      `${dmStats.dmPercent}%`,
      costPerKg.toFixed(2),
      costPerHead.toFixed(2),
      r.ingredients?.length || 0,
      r.notes || '-',
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  configureSheet(wsSummary, summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص العلائق');

  // Detailed Sheet for Each Ration
  rations.forEach((r) => {
    const totalKg = calculateRationTotalKgPerHead(r);
    const dmStats = calculateRationDmStats(r, rawMaterials);
    const costPerKg = calculateRationCostPerKg(r, rawMaterials);

    const detailData: any[][] = [
      [`تفاصيل تركيبة عليقة: ${r.name}`],
      [
        `النوع: ${
          r.calculationType === 'fixed_tonnage' ? 'تركيبة طن' : 'عليقة يومية بالرأس'
        } | إجمالي وزن As-Fed: ${totalKg.toFixed(2)} كجم | المادة الجافة: ${dmStats.totalDmKgPerHead.toFixed(2)} كجم DM (${dmStats.dmPercent}% DM) | تكلفة الكيلو: ${costPerKg.toFixed(2)} ج.م`,
      ],
      [],
      [
        'كود الخامة',
        'اسم الخامة',
        'الكمية الرطبة (كجم)',
        'النسبة المئوية %',
        'المادة الجافة (% DM)',
        'وزن المادة الجافة (كجم DM)',
        'طريقة التحميل / الخلط',
        'سعر الكيلو (ج.م)',
        'تكلفة المكون (ج.م)',
      ],
    ];

    r.ingredients?.forEach((ing) => {
      const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      const pct = totalKg > 0 ? (ing.amountKgPerHead / totalKg) * 100 : 0;
      const matDm = getRawMaterialDryMatterPercent(mat);
      const ingDmKg = ing.amountKgPerHead * (matDm / 100);
      const matPrice = mat?.price || 0;
      const ingCost = ing.amountKgPerHead * matPrice;

      detailData.push([
        mat?.code || ing.rawMaterialId,
        mat?.name || ing.rawMaterialId,
        ing.amountKgPerHead,
        `${pct.toFixed(1)}%`,
        `${matDm}%`,
        Number(ingDmKg.toFixed(2)),
        ing.inConcentratePremix ? 'خلاطة المركز والشكاير' : 'تحميل مباشر بمكسر TMR',
        matPrice.toFixed(2),
        ingCost.toFixed(2),
      ]);
    });

    // Add totals row
    detailData.push([
      'الإجمالي الكلي',
      '-',
      Number(totalKg.toFixed(2)),
      '100%',
      `${dmStats.dmPercent}% DM`,
      Number(dmStats.totalDmKgPerHead.toFixed(2)),
      '-',
      '-',
      Number((totalKg * costPerKg).toFixed(2)),
    ]);

    const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
    configureSheet(wsDetail, detailData);
    const sheetName = r.name.substring(0, 28).replace(/[\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, wsDetail, sheetName);
  });

  downloadWorkbook(wb, `تركيبات_العلائق_${new Date().toISOString().split('T')[0]}`);
}

// ==========================================
// 3. Animal Categories Export (الفئات الحيوانية)
// ==========================================
export function exportCategoriesToExcel(
  categories: AnimalCategory[],
  rations: Ration[],
  mixers: Mixer[],
  barns: Barn[] = []
) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    ['دليل الفئات والقطعان الحيوانية بالمزرعة'],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    [
      'اسم الفئة',
      'العليقة المخصصة',
      'المكسر المعتمد',
      'نوع الحساب والتشغيل',
      'إجمالي عدد الرؤوس بالعنابر',
      'عدد العنابر التابعة',
      'ملاحظات',
    ],
  ];

  categories.forEach((cat) => {
    const rat = rations.find((r) => r.id === cat.rationId);
    const mix = mixers.find((m) => m.id === cat.mixerId);
    const catBarns = barns.filter((b) => b.categoryId === cat.id);
    const totalHeads = catBarns.reduce((s, b) => s + (b.headCount || 0), 0);

    data.push([
      cat.name,
      rat?.name || '-',
      mix?.name || '-',
      cat.isPeriodicMixer ? 'مكسر دوري بالطن' : 'خلط يومي مباشر',
      totalHeads,
      catBarns.length,
      cat.notes || '-',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  configureSheet(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, 'الفئات الحيوانية');
  downloadWorkbook(wb, `الفئات_الحيوانية_${new Date().toISOString().split('T')[0]}`);
}

// ==========================================
// 4. Barns Export (العنابر والأحواش)
// ==========================================
export function exportBarnsToExcel(
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[] = []
) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    ['سجل العنابر والأحواش بالمزرعة'],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    [
      'رقم / كود العنبر',
      'اسم العنبر',
      'الفئة التابع لها',
      'العليقة المستخدمة',
      'عدد الرؤوس (رأس)',
      'سحب الرأس الأساسي (كجم)',
      'نسبة التغذية %',
      'الاستحقاق الإجمالي اليومي (كجم)',
      'نوع الراجع',
      'قيمة الراجع',
      'راجع حلاب محول (كجم)',
      'الحالة',
      'ملاحظات',
    ],
  ];

  let totalHeads = 0;
  let totalGrossDemand = 0;

  barns.forEach((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const rat = rations.find((r) => r.id === (b.rationId || cat?.rationId));
    const demand = calculateBarnDailyDemand(b, categories, rations);

    totalHeads += b.headCount || 0;
    totalGrossDemand += demand;

    data.push([
      b.number,
      b.name || '-',
      cat?.name || '-',
      rat?.name || '-',
      b.headCount || 0,
      b.baseFeedKgPerHead || 0,
      `${b.feedingRatioPercent || 100}%`,
      Math.round(demand),
      b.refusalType === 'kg' ? 'وزن مباشر (كجم)' : 'نسبة مئوية (%)',
      b.refusalValue ?? 0,
      b.recycledRefusalAllocatedKg ?? 0,
      b.status || 'نشط',
      b.notes || '-',
    ]);
  });

  data.push([]);
  data.push(['الإجمالي', '', '', '', totalHeads, '', '', Math.round(totalGrossDemand), '', '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  configureSheet(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, 'العنابر والأحواش');
  downloadWorkbook(wb, `العنابر_والأحواش_${new Date().toISOString().split('T')[0]}`);
}

// ==========================================
// 5. Mixers Export (مكسرات وخلاطات العلف)
// ==========================================
export function exportMixersToExcel(mixers: Mixer[]) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    ['دليل مكسرات وخلاطات العلف بالمزرعة (TMR Mixers)'],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    [
      'كود المكسر',
      'اسم المكسر',
      'السعة القصوى (كجم)',
      'السعة بالطن',
      'ملاحظات',
    ],
  ];

  mixers.forEach((m) => {
    data.push([
      m.id,
      m.name,
      m.maxCapacityKg,
      (m.maxCapacityKg / 1000).toFixed(1),
      m.notes || '-',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  configureSheet(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, 'المكسرات والخلاطات');
  downloadWorkbook(wb, `المكسرات_والخلاطات_${new Date().toISOString().split('T')[0]}`);
}

// ==========================================
// 6. Daily Plan Export (الخطة التشغيلية لليوم)
// ==========================================
export function exportDailyPlanToExcel(
  dailyPlan: DailyOperationPlan,
  categories: AnimalCategory[],
  mixers: Mixer[],
  rations: Ration[],
  barns: Barn[],
  rawMaterials: RawMaterial[] = []
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Batches
  const batchesData: any[][] = [
    [`الخطة اليومية للفات المكسر - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'رقم اللفة',
      'المكسر',
      'الفئة / العليقة',
      'نسبة DM %',
      'وقت التشغيل',
      'الوزن المخطط (كجم)',
      'الوزن المحسوب المشتق (كجم)',
      'الوزن بالمادة الجافة (كجم DM)',
      'عدد العنابر الموزع عليها',
      'تفاصيل التوزيع على العنابر',
      'الحالة',
      'ملاحظات',
    ],
  ];

  let totalPlannedWeight = 0;
  let totalPlannedDmWeight = 0;

  dailyPlan.batches.forEach((b, idx) => {
    const mix = mixers.find((m) => m.id === b.mixerId);
    const cat = categories.find((c) => c.id === b.categoryId);
    const rat = rations.find((r) => r.id === (b.rationId || cat?.rationId));
    const derivedWeight = getBatchDerivedTargetWeightKg(b, barns, categories, rations, dailyPlan);
    const dmStats = calculateRationDmStats(rat, rawMaterials);
    const batchDm = Math.round(derivedWeight * (dmStats.dmPercent / 100));

    const allocDetails = (b.allocations || [])
      .map((al) => {
        const barnObj = barns.find((bn) => bn.id === al.barnId);
        return `${barnObj?.number || al.barnId} (${Math.round(al.allocatedKg)} كجم)`;
      })
      .join(' | ');

    totalPlannedWeight += b.targetWeightKg;
    totalPlannedDmWeight += batchDm;

    batchesData.push([
      b.batchNumber || `لفة #${idx + 1}`,
      mix?.name || '-',
      `${cat?.name || '-'} (${rat?.name || '-'})`,
      `${dmStats.dmPercent}%`,
      b.time || '-',
      b.targetWeightKg,
      Math.round(derivedWeight),
      batchDm,
      b.allocations?.length || 0,
      allocDetails || 'لا يوجد توزيع',
      b.status || 'مخططة',
      b.notes || '-',
    ]);
  });

  batchesData.push([]);
  batchesData.push(['الإجمالي', '', '', '', '', totalPlannedWeight, '', totalPlannedDmWeight, '', '', '', '']);

  const wsBatches = XLSX.utils.aoa_to_sheet(batchesData);
  configureSheet(wsBatches, batchesData);
  XLSX.utils.book_append_sheet(wb, wsBatches, 'لفات المكسر');

  // Sheet 2: Barns Daily State
  const barnsData: any[][] = [
    [`بيانات واستحقاق العنابر والمادة الجافة لليوم - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'رقم العنبر',
      'اسم العنبر',
      'الفئة',
      'العليقة',
      'نسبة DM %',
      'عدد الرؤوس لليوم',
      'سحب الرأس (كجم As-Fed)',
      'نسبة التغذية %',
      'الاستحقاق الإجمالي (كجم)',
      'الاستحقاق بالمادة الجافة (كجم DM)',
      'مأكول الرأس (كجم DMI)',
      'الراجع اليومي (كجم)',
      'المأكول الفعلي (كجم)',
    ],
  ];

  [...barns]
    .sort((a, b) => (a.orderIndex !== undefined ? a.orderIndex : 9999) - (b.orderIndex !== undefined ? b.orderIndex : 9999))
    .forEach((b) => {
    const dailyState = getBarnDailyState(b, dailyPlan);
    const cat = categories.find((c) => c.id === b.categoryId);
    const rat = getBarnRation(b, categories, rations, dailyPlan);
    const dmStats = calculateRationDmStats(rat, rawMaterials);
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    const refusal = calculateBarnRefusalKg(b, categories, rations, dailyPlan);
    const actualIntake = calculateBarnActualIntakeKg(b, categories, rations, dailyPlan);
    const barnDmKg = Math.round(demand * (dmStats.dmPercent / 100));
    const dmiKg =
      dailyState.headCount > 0
        ? Math.round((actualIntake * (dmStats.dmPercent / 100) / dailyState.headCount) * 100) / 100
        : 0;

    barnsData.push([
      dailyState.displayNumber || b.number,
      dailyState.displayName || b.name || '-',
      cat?.name || '-',
      rat?.name || '-',
      `${dmStats.dmPercent}%`,
      dailyState.headCount,
      dailyState.baseFeedKgPerHead || b.baseFeedKgPerHead,
      `${dailyState.feedingRatioPercent}%`,
      Math.round(demand),
      barnDmKg,
      dmiKg,
      Math.round(refusal),
      Math.round(actualIntake),
    ]);
  });

  const wsBarns = XLSX.utils.aoa_to_sheet(barnsData);
  configureSheet(wsBarns, barnsData);
  XLSX.utils.book_append_sheet(wb, wsBarns, 'استحقاق العنابر');

  downloadWorkbook(wb, `الخطة_اليومية_${dailyPlan.date}`);
}

// ==========================================
// 7. Preparation Orders Export (أوامر تحضير المكسر)
// ==========================================
export function exportPreparationOrdersToExcel(
  dailyPlan: DailyOperationPlan,
  mixers: Mixer[],
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  settings?: FarmSettings
) {
  const wb = XLSX.utils.book_new();

  // Matrix Sheet
  const matrixData: any[][] = [
    [`أوامر تحضير وتحميل خامات المكسر لجميع اللفات والمادة الجافة - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'رقم اللفة',
      'المكسر',
      'الفئة / العليقة',
      'الوزن الإجمالي للدفعة (كجم)',
      'اسم الخامة',
      'المادة الجافة % (DM)',
      'الكمية بالمادة الجافة (كجم DM)',
      'الوزن المطلوب (كجم As-Fed)',
      'الوزن الفعلي (كجم)',
      'طريقة التحميل والخلط',
    ],
  ];

  dailyPlan.batches.forEach((b, idx) => {
    const mix = mixers.find((m) => m.id === b.mixerId);
    const cat = categories.find((c) => c.id === b.categoryId);
    const rat = rations.find((r) => r.id === (b.rationId || cat?.rationId));

    const ingCalc = calculateBatchIngredients(
      b.targetWeightKg,
      rat,
      rawMaterials,
      b.actualIngredientWeights
    );

    ingCalc.forEach((item) => {
      const mat = rawMaterials.find((m) => m.id === item.rawMaterialId);
      const actualLoaded = b.actualIngredientWeights?.[item.rawMaterialId];
      const matDm = getRawMaterialDryMatterPercent(mat);
      const dmKg = Math.round(item.requiredKg * (matDm / 100) * 10) / 10;

      matrixData.push([
        b.batchNumber || `لفة #${idx + 1}`,
        mix?.name || '-',
        `${cat?.name || '-'} (${rat?.name || '-'})`,
        b.targetWeightKg,
        mat?.name || item.name || item.rawMaterialId,
        `${matDm}%`,
        dmKg,
        Math.round(item.requiredKg),
        actualLoaded !== undefined ? actualLoaded : '',
        mat?.materialType === 'concentrate' ? 'شيكارة مركز مسبق' : 'تحميل مباشر بالمكسر',
      ]);
    });
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  configureSheet(wsMatrix, matrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'أوامر تحضير المكسر');

  downloadWorkbook(wb, `أوامر_تحضير_المكسر_${dailyPlan.date}`);
}

// ==========================================
// 8. Driver Distribution Sheet Export (كشف السائق)
// ==========================================
export function exportDriverSheetToExcel(
  dailyPlan: DailyOperationPlan,
  mixers: Mixer[],
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[] = []
) {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [
    [`كشف توزيع ومسار عربة المكسر (خاص بالسائق) - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'رقم اللفة',
      'المكسر',
      'وقت التحميل والتوزيع',
      'الفئة / القطيع',
      'رقم العنبر المستهدف',
      'اسم العنبر',
      'الوزن المطلوب تفريغه (كجم)',
      'الوزن الفعلي المنفذ (كجم)',
      'تأكيد التفريغ والتوقيع',
    ],
  ];

  let totalAllocatedKg = 0;

  dailyPlan.batches.forEach((b, idx) => {
    const mix = mixers.find((m) => m.id === b.mixerId);
    const cat = categories.find((c) => c.id === b.categoryId);

    if (b.allocations && b.allocations.length > 0) {
      [...b.allocations]
        .sort((a1, b1) => {
          const barnA = barns.find((bn) => bn.id === a1.barnId);
          const barnB = barns.find((bn) => bn.id === b1.barnId);
          const orderA = barnA?.orderIndex !== undefined ? barnA.orderIndex : 9999;
          const orderB = barnB?.orderIndex !== undefined ? barnB.orderIndex : 9999;
          return orderA - orderB;
        })
        .forEach((al) => {
        const barnObj = barns.find((bn) => bn.id === al.barnId);
        const dailyState = barnObj ? getBarnDailyState(barnObj, dailyPlan) : null;
        totalAllocatedKg += al.allocatedKg;

        data.push([
          b.batchNumber || `لفة #${idx + 1}`,
          mix?.name || '-',
          b.time || '-',
          cat?.name || '-',
          dailyState?.displayNumber || barnObj?.number || al.barnId,
          dailyState?.displayName || barnObj?.name || '-',
          Math.round(al.allocatedKg),
          '',
          '☐ تم التفريغ',
        ]);
      });
    } else {
      data.push([
        b.batchNumber || `لفة #${idx + 1}`,
        mix?.name || '-',
        b.time || '-',
        cat?.name || '-',
        'غير محدد',
        '-',
        b.targetWeightKg,
        '',
        '☐ تم التفريغ',
      ]);
    }
  });

  data.push([]);
  data.push(['الإجمالي الكلي الموزع', '', '', '', '', '', Math.round(totalAllocatedKg), '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  configureSheet(ws, data);
  XLSX.utils.book_append_sheet(wb, ws, 'كشف توزيع السائق');
  downloadWorkbook(wb, `كشف_توزيع_السائق_${dailyPlan.date}`);
}

// ==========================================
// 9. Warehouse & Ledger Export (المخزن وحركة الخامات)
// ==========================================
export function exportWarehouseToExcel(
  dailyPlan: DailyOperationPlan,
  rawMaterials: RawMaterial[],
  categories: AnimalCategory[],
  rations: Ration[],
  barns: Barn[]
) {
  const wb = XLSX.utils.book_new();

  // Daily Requirements & Stock Sheet
  const reqData: any[][] = [
    [`تقرير حركة ومصروفات المخزن اليومية - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'كود الخامة',
      'اسم الخامة',
      'الوحدة',
      'نوع الخامة',
      'الرصيد بالمخزن (كجم)',
      'الكمية المطلوبة للخطة (كجم)',
      'التكلفة المقدرة (ج.م)',
      'حالة كفاية المخزون',
    ],
  ];

  const warehouseReqs = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  warehouseReqs.forEach((item) => {
    const mat = rawMaterials.find((m) => m.id === item.rawMaterialId);
    const stock = mat?.currentStockKg ?? 0;
    const required = item.totalRequiredKgToday;
    const isDeficit = stock < required;
    const isLow = mat?.minStockKg !== undefined && stock <= mat.minStockKg;

    reqData.push([
      mat?.code || item.rawMaterialId,
      mat?.name || item.name,
      mat?.unit || 'كجم',
      mat?.materialType === 'concentrate' ? 'مركزات' : 'مالئات وخشنة',
      Math.round(stock),
      Math.round(required),
      Math.round(item.totalCostToday),
      isDeficit ? '❌ عجز بالمخزن' : isLow ? '⚠️ رصيد حرج' : '✓ رصيد كافٍ',
    ]);
  });

  const wsReq = XLSX.utils.aoa_to_sheet(reqData);
  configureSheet(wsReq, reqData);
  XLSX.utils.book_append_sheet(wb, wsReq, 'حركة المخزن اليومية');

  // Transactions Sheet if any
  if (dailyPlan.warehouseTransactions && dailyPlan.warehouseTransactions.length > 0) {
    const txData: any[][] = [
      [`سجل حركات وأذونات المخزن (واردات / تسويات) - تاريخ: ${dailyPlan.date}`],
      [],
      [
        'رقم الحركة',
        'التاريخ',
        'اسم الخامة',
        'نوع الحركة',
        'الكمية (كجم)',
        'اسم المورد / الجهة',
        'رقم الفاتورة / الإذن',
        'رقم السيارة',
        'ملاحظات',
      ],
    ];

    dailyPlan.warehouseTransactions.forEach((tx) => {
      const mat = rawMaterials.find((m) => m.id === tx.rawMaterialId);
      txData.push([
        tx.id,
        tx.date,
        mat?.name || tx.rawMaterialId,
        tx.type === 'INCOMING' ? 'وارد جديد' : tx.type === 'WASTE' ? 'هالك وتالف' : 'تسوية جردية',
        tx.quantityKg,
        tx.supplierName || '-',
        tx.invoiceNumber || '-',
        tx.vehicleNumber || '-',
        tx.notes || '-',
      ]);
    });

    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    configureSheet(wsTx, txData);
    XLSX.utils.book_append_sheet(wb, wsTx, 'أذونات التوريد والتسوية');
  }

  downloadWorkbook(wb, `تقرير_المخزن_${dailyPlan.date}`);
}

// ==========================================
// 10. Concentrate Premix Orders Export (أوامر خلط المركز والشكاير)
// ==========================================
export function exportConcentratePremixToExcel(
  dailyPlan: DailyOperationPlan,
  rations: Ration[],
  rawMaterials: RawMaterial[],
  categories: AnimalCategory[],
  barns: Barn[] = []
) {
  const wb = XLSX.utils.book_new();

  // Stock overview
  const stockData: any[][] = [
    [`رصيد شكاير المركزات الجاهزة - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'الفئة المستهدفة',
      'وزن الشكارة (كجم)',
      'الشكاير الجاهزة بالمخزن',
      'الفرط بالمخزن (كجم)',
      'إجمالي الوزن بالرصيد (كجم)',
      'الإنتاج اليومي (شكارة)',
      'السحب اليومي (شكارة)',
      'نسبة التغطية %',
    ],
  ];

  categories.forEach((cat) => {
    const stock = calculateConcentrateStock(
      cat.id,
      categories,
      dailyPlan,
      barns,
      rations,
      rawMaterials,
      50
    );

    stockData.push([
      stock.categoryName,
      stock.bagWeightKg,
      stock.totalBagsInStock,
      stock.looseKgInStock,
      stock.totalKgInStock,
      stock.producedBagsToday,
      stock.consumedBagsToday,
      `${stock.coverageRatioPercent}%`,
    ]);
  });

  const wsStock = XLSX.utils.aoa_to_sheet(stockData);
  configureSheet(wsStock, stockData);
  XLSX.utils.book_append_sheet(wb, wsStock, 'رصيد شكاير المركز');

  // Orders Sheet
  if (dailyPlan.concentrateOrders && dailyPlan.concentrateOrders.length > 0) {
    const ordersData: any[][] = [
      [`أوامر تشغيل خلاطة المركز وتعبئة الشكاير - تاريخ: ${dailyPlan.date}`],
      [],
      [
        'رقم الأمر',
        'الفئة المستهدفة',
        'وزن الخلطة (كجم)',
        'وزن الشكارة (كجم)',
        'عدد الشكاير المنتجة',
        'المتبقي فرط (كجم)',
        'التكلفة الإجمالية (ج.م)',
        'تكلفة الشكارة (ج.م)',
        'الحالة',
        'تاريخ الإنشاء',
      ],
    ];

    dailyPlan.concentrateOrders.forEach((ord) => {
      const cat = categories.find((c) => c.id === ord.categoryId);
      ordersData.push([
        ord.orderNumber,
        cat?.name || ord.categoryId,
        ord.batchWeightKg,
        ord.bagWeightKg,
        ord.totalBags,
        ord.remainingLooseKg,
        ord.totalCost?.toFixed(2) ?? '-',
        ord.costPerBag?.toFixed(2) ?? '-',
        ord.status,
        ord.createdAt,
      ]);
    });

    const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
    configureSheet(wsOrders, ordersData);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'أوامر تعبئة الشكاير');
  }

  downloadWorkbook(wb, `أوامر_خلط_المركز_${dailyPlan.date}`);
}

// ==========================================
// 11. Nutrition & Comprehensive Farm Report Export (التقرير الشامل)
// ==========================================
export function exportNutritionReportToExcel(
  dailyPlan: DailyOperationPlan,
  categories: AnimalCategory[],
  barns: Barn[],
  mixers: Mixer[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  settings?: FarmSettings
) {
  const wb = XLSX.utils.book_new();

  const activeBarns = barns.filter((b) => b.status === 'نشط');

  // Summary Metrics
  const totalHeads = activeBarns.reduce((s, b) => {
    const ds = getBarnDailyState(b, dailyPlan);
    return s + ds.headCount;
  }, 0);

  const totalDemandKg = activeBarns.reduce((s, b) => {
    return s + calculateBarnDailyDemand(b, categories, rations, dailyPlan);
  }, 0);

  const totalRefusalKg = activeBarns.reduce((s, b) => {
    return s + calculateBarnRefusalKg(b, categories, rations, dailyPlan);
  }, 0);

  const totalIntakeKg = Math.max(0, totalDemandKg - totalRefusalKg);

  const totalAllocatedKg = activeBarns.reduce((s, b) => {
    return s + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan);
  }, 0);

  // Total Feed Cost Today
  const totalFeedCostToday = activeBarns.reduce((sum, b) => {
    const ration = getBarnRation(b, categories, rations, dailyPlan);
    const costPerKg = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    return sum + demand * costPerKg;
  }, 0);

  const avgFeedCostPerHead = totalHeads > 0 ? totalFeedCostToday / totalHeads : 0;
  const avgFeedCostPerKgAsFed = totalDemandKg > 0 ? totalFeedCostToday / totalDemandKg : 0;

  // Dry Matter Summary
  const farmDmSummary = calculateFarmDmSummary(
    activeBarns,
    categories,
    rations,
    dailyPlan,
    rawMaterials
  );

  // Dairy Financials
  const milkData = dailyPlan.milkProduction;
  const effectiveMilkPrice =
    milkData?.milkPricePerKg && milkData.milkPricePerKg > 0
      ? milkData.milkPricePerKg
      : settings?.defaultMilkPricePerKg || 20;

  const dairyFinancials = calculateDairyFinancials(
    milkData,
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    effectiveMilkPrice
  );

  // Fattening Financials
  const effectiveAdg =
    dailyPlan.fatteningAdgKg && dailyPlan.fatteningAdgKg > 0
      ? dailyPlan.fatteningAdgKg
      : 1.5;

  const fatteningFinancials = calculateFatteningFinancials(
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    effectiveAdg
  );

  const currency = settings?.currency || 'ج.م';

  // ==========================================
  // Sheet 1: General & Financial KPIs
  // ==========================================
  const summaryData: any[][] = [
    [`التقرير الفني والمالي الشامل لتغذية المزرعة - تاريخ: ${dailyPlan.date}`],
    [`اسم المزرعة: ${settings?.farmName || 'المزرعة النموذجية'}`],
    [`المسؤول الفني: ${settings?.engineerName || '-'}`],
    [],
    ['المؤشر الفني العام', 'القيمة'],
    ['إجمالي رؤوس القطيع النشط لليوم', `${totalHeads.toLocaleString('ar-EG')} رأس`],
    ['عدد العنابر النشطة', `${activeBarns.length} عنبر`],
    ['إجمالي العلف المطلوب (Gross Demand)', `${Math.round(totalDemandKg).toLocaleString('ar-EG')} كجم`],
    ['إجمالي الراجع اليومي (Refusals)', `${Math.round(totalRefusalKg).toLocaleString('ar-EG')} كجم (${totalDemandKg > 0 ? ((totalRefusalKg / totalDemandKg) * 100).toFixed(1) : 0}%)`],
    ['صافي العلف المأكول الفعلي (Net Intake)', `${Math.round(totalIntakeKg).toLocaleString('ar-EG')} كجم`],
    ['إجمالي الموزع بالمكسرات', `${Math.round(totalAllocatedKg).toLocaleString('ar-EG')} كجم (${totalDemandKg > 0 ? Math.round((totalAllocatedKg / totalDemandKg) * 100) : 0}% استيفاء)`],
    ['عدد لفات المكسر اليومية', `${dailyPlan.batches?.length || 0} لفة`],
    [],
    ['مؤشرات المادة الجافة (Dry Matter)', ''],
    ['إجمالي مقرر المادة الجافة (DM Demand)', `${Math.round(farmDmSummary.totalDmDemandKg).toLocaleString('ar-EG')} كجم DM`],
    ['إجمالي المأكول الفعلي مادة جافة (DMI)', `${Math.round(farmDmSummary.totalActualDmiKg).toLocaleString('ar-EG')} كجم DM`],
    ['متوسط المادة الجافة بالعلائق %', `${farmDmSummary.averageDmPercent}% DM`],
    ['متوسط استهلاك الرأس من المادة الجافة', `${farmDmSummary.averageDmiPerHeadKg} كجم DM/رأس`],
    [],
    ['مؤشرات التكلفة المالية للعلف', ''],
    ['إجمالي تكلفة العلف لليوم (Gross Cost)', `${Math.round(totalFeedCostToday).toLocaleString('ar-EG')} ${currency}`],
    ['متوسط تكلفة علف الرأس لليوم', `${avgFeedCostPerHead.toFixed(2)} ${currency}/رأس`],
    ['متوسط تكلفة كيلو العلف الطازج', `${avgFeedCostPerKgAsFed.toFixed(2)} ${currency}/كجم`],
    [],
    ['مؤشرات قطيع الحلاب والجدوى (IOFC)', ''],
    ['عدد الأبقار الحلابة', `${dairyFinancials.milkingHeadCount} بقرة`],
    ['إجمالي إنتاج اللبن اليومي', `${dairyFinancials.totalMilkKg.toLocaleString('ar-EG')} كجم`],
    ['سعر بيع كيلو الحليب', `${dairyFinancials.milkPricePerKg.toFixed(2)} ${currency}`],
    ['إجمالي إيراد اللبن اليومي', `${dairyFinancials.totalMilkRevenue.toLocaleString('ar-EG')} ${currency}`],
    ['إجمالي تكلفة علف الحلاب اليومي', `${dairyFinancials.totalMilkingFeedCost.toLocaleString('ar-EG')} ${currency}`],
    ['تكلفة علف كيلو اللبن', `${dairyFinancials.costPerKgMilkFeedCost.toFixed(2)} ${currency}/كجم لبن`],
    ['عائد اللبن فوق العلف (IOFC) للرأس', `${dairyFinancials.iofcPerCowPerDay.toFixed(2)} ${currency}/بقرة/يوم`],
    ['صافي العائد اليومي لقطيع الحلاب (IOFC)', `${dairyFinancials.totalIofcPerDay.toLocaleString('ar-EG')} ${currency}`],
    [],
    ['مؤشرات قطيع التسمين والتحويل اللحمي', ''],
    ['عدد رؤوس التسمين', `${fatteningFinancials.totalFatteningHeads} رأس`],
    ['إجمالي علف التسمين اليومي', `${Math.round(fatteningFinancials.totalDailyDemandKg).toLocaleString('ar-EG')} كجم`],
    ['إجمالي تكلفة علف التسمين', `${Math.round(fatteningFinancials.totalDailyFeedCost).toLocaleString('ar-EG')} ${currency}`],
    ['تكلفة علف عجل التسمين اليومي', `${fatteningFinancials.feedCostPerHeadPerDay.toFixed(2)} ${currency}/عجل/يوم`],
    ['معدل النمو اليومي المفترض (ADG)', `${fatteningFinancials.assumedAdgKg} كجم/يوم`],
    ['تكلفة كجم النمو واللحم من العلف', `${fatteningFinancials.feedCostPerKgGain.toFixed(2)} ${currency}/كجم زيادة`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  configureSheet(wsSummary, summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'المؤشرات العامة والمالية');

  // ==========================================
  // Sheet 2: Category Breakdown Table
  // ==========================================
  const categoryRows: any[][] = [
    [`بيان الفئات الحيوانية والعلائق وتكاليف التغذية - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'الفئة الحيوانية',
      'اسم العليقة',
      `سعر العليقة (${currency}/كجم)`,
      'عدد الرؤوس',
      'الاحتياج اليومي (كجم)',
      'المادة الجافة % (DM)',
      'مقرر DM (كجم)',
      `إجمالي التكلفة اليومية (${currency})`,
      `متوسط تكلفة الرأس (${currency})`,
      'الموزع بالمكسرات (كجم)',
    ],
  ];

  categories.forEach((cat) => {
    const catBarns = activeBarns.filter((b) => b.categoryId === cat.id);
    const catHeads = catBarns.reduce((sum, b) => {
      const s = getBarnDailyState(b, dailyPlan);
      return sum + s.headCount;
    }, 0);
    const catDemand = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
    const defaultRation = rations.find((r) => r.id === cat.rationId);
    const defaultRationCost = defaultRation ? calculateRationCostPerKg(defaultRation, rawMaterials) : 0;

    let catTotalCost = 0;
    let catDmKg = 0;
    catBarns.forEach((b) => {
      const bRation = getBarnRation(b, categories, rations, dailyPlan);
      const bCost = bRation ? calculateRationCostPerKg(bRation, rawMaterials) : 0;
      const bDemand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
      const bDm = calculateBarnDmDemandKg(b, categories, rations, dailyPlan, rawMaterials);
      catTotalCost += bDemand * bCost;
      catDmKg += bDm;
    });
    catDmKg = Math.round(catDmKg * 10) / 10;
    const effectiveCostPerKg = catDemand > 0 ? catTotalCost / catDemand : defaultRationCost;
    const dmStats = defaultRation ? calculateRationDmStats(defaultRation, rawMaterials) : { dmPercent: 0 };
    const dmPercent = catDemand > 0 ? Math.round((catDmKg / catDemand) * 1000) / 10 : dmStats.dmPercent;
    const catBatches = (dailyPlan.batches || []).filter((b) => b.categoryId === cat.id);
    const catAllocated = catBatches.reduce((sum, b) => sum + calculateBatchAllocatedKg(b), 0);
    const costPerHead = catHeads > 0 ? catTotalCost / catHeads : 0;

    categoryRows.push([
      cat.name,
      defaultRation?.name || '—',
      Number(effectiveCostPerKg.toFixed(2)),
      catHeads,
      Math.round(catDemand),
      `${dmPercent}%`,
      Math.round(catDmKg),
      Math.round(catTotalCost),
      Number(costPerHead.toFixed(1)),
      Math.round(catAllocated),
    ]);
  });

  // Category Total Row
  categoryRows.push([
    'الإجمالي الكلي لجميع الفئات',
    '—',
    Number(avgFeedCostPerKgAsFed.toFixed(2)),
    totalHeads,
    Math.round(totalDemandKg),
    `${farmDmSummary.averageDmPercent}%`,
    Math.round(farmDmSummary.totalDmDemandKg),
    Math.round(totalFeedCostToday),
    Number(avgFeedCostPerHead.toFixed(1)),
    Math.round(totalAllocatedKg),
  ]);

  const wsCategories = XLSX.utils.aoa_to_sheet(categoryRows);
  configureSheet(wsCategories, categoryRows);
  XLSX.utils.book_append_sheet(wb, wsCategories, 'بيان الفئات والعلائق');

  // ==========================================
  // Sheet 3: Barns Performance Breakdown Sheet
  // ==========================================
  const barnsBreakdown: any[][] = [
    [`تفاصيل استهلاك وأداء وتكاليف العنابر - تاريخ: ${dailyPlan.date}`],
    [],
    [
      'رقم العنبر',
      'اسم العنبر',
      'الفئة',
      'العليقة',
      `سعر الكيلو (${currency})`,
      'عدد الرؤوس',
      'نسبة التغذية %',
      'المقرر (كجم)',
      'مقرر DM (كجم)',
      'الراجع (كجم)',
      'المأكول الفعلي (كجم)',
      'DMI للرأس (كجم)',
      `تكلفة العلف (${currency})`,
      `تكلفة الرأس (${currency})`,
      'الموزع بالمكسر (كجم)',
      'نسبة الراجع %',
    ],
  ];

  activeBarns.forEach((b) => {
    const ds = getBarnDailyState(b, dailyPlan);
    const cat = categories.find((c) => c.id === b.categoryId);
    const rat = getBarnRation(b, categories, rations, dailyPlan);
    const costPerKg = rat ? calculateRationCostPerKg(rat, rawMaterials) : 0;
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    const barnDm = calculateBarnDmDemandKg(b, categories, rations, dailyPlan, rawMaterials);
    const barnDmi = calculateBarnDmiPerHeadKg(b, categories, rations, dailyPlan, rawMaterials);
    const refusal = calculateBarnRefusalKg(b, categories, rations, dailyPlan);
    const intake = calculateBarnActualIntakeKg(b, categories, rations, dailyPlan);
    const allocated = calculateBarnTotalAllocatedKgToday(b.id, dailyPlan);
    const barnTotalCost = Math.round(demand * costPerKg);
    const costPerHead = ds.headCount > 0 ? barnTotalCost / ds.headCount : 0;
    const refusalPct = demand > 0 ? (refusal / demand) * 100 : 0;

    barnsBreakdown.push([
      ds.displayNumber || b.number,
      ds.displayName || b.name || '-',
      cat?.name || '-',
      rat?.name || '-',
      Number(costPerKg.toFixed(2)),
      ds.headCount,
      `${ds.feedingRatioPercent}%`,
      Math.round(demand),
      Math.round(barnDm),
      Math.round(refusal),
      Math.round(intake),
      Number(barnDmi.toFixed(2)),
      barnTotalCost,
      Number(costPerHead.toFixed(1)),
      Math.round(allocated),
      `${refusalPct.toFixed(1)}%`,
    ]);
  });

  // Barns Total Row
  barnsBreakdown.push([
    'الإجمالي لكافة العنابر النشطة',
    '—',
    '—',
    '—',
    Number(avgFeedCostPerKgAsFed.toFixed(2)),
    totalHeads,
    '—',
    Math.round(totalDemandKg),
    Math.round(farmDmSummary.totalDmDemandKg),
    Math.round(totalRefusalKg),
    Math.round(totalIntakeKg),
    Number(farmDmSummary.averageDmiPerHeadKg.toFixed(2)),
    Math.round(totalFeedCostToday),
    Number(avgFeedCostPerHead.toFixed(1)),
    Math.round(totalAllocatedKg),
    `${totalDemandKg > 0 ? ((totalRefusalKg / totalDemandKg) * 100).toFixed(1) : 0}%`,
  ]);

  const wsBarns = XLSX.utils.aoa_to_sheet(barnsBreakdown);
  configureSheet(wsBarns, barnsBreakdown);
  XLSX.utils.book_append_sheet(wb, wsBarns, 'تحليل استهلاك وتكاليف العنابر');

  downloadWorkbook(wb, `التقرير_الشامل_للتغذية_${dailyPlan.date}`);
}

// ==========================================
// 12. Full Farm Workbook Export (المصنف الشامل للمزرعة)
// ==========================================
export interface FullFarmExportParams {
  dailyPlan: DailyOperationPlan;
  rawMaterials: RawMaterial[];
  rations: Ration[];
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  settings?: FarmSettings;
}

export function exportFullFarmWorkbookToExcel(params: FullFarmExportParams) {
  const { dailyPlan, rawMaterials, rations, categories, barns, mixers, settings } = params;
  const wb = XLSX.utils.book_new();

  // Sheet 1: General Info
  const generalData: any[][] = [
    [`المصنف الشامل لإدارة تغذية المزرعة - ${settings?.farmName || 'المزرعة النموذجية'}`],
    [`التاريخ: ${dailyPlan.date}`],
    [`مسؤول التغذية: ${settings?.engineerName || '-'}`],
    [`أمين المخزن: ${settings?.warehouseManagerName || '-'}`],
    [`سائق المكسر: ${settings?.driverName || '-'}`],
    [],
    ['القسم', 'إجمالي السجلات'],
    ['الخامات العلفية', rawMaterials.length],
    ['تركيبات العلائق', rations.length],
    ['الفئات الحيوانية', categories.length],
    ['العنابر والأحواش', barns.length],
    ['مكسرات وخلاطات العلف', mixers.length],
    ['لفات المكسر اليومية', dailyPlan.batches?.length || 0],
  ];
  const wsGen = XLSX.utils.aoa_to_sheet(generalData);
  configureSheet(wsGen, generalData);
  XLSX.utils.book_append_sheet(wb, wsGen, '1- ملخص المزرعة');

  // Sheet 2: Raw Materials
  const rawData: any[][] = [
    ['كود الخامة', 'اسم الخامة', 'الوحدة', 'النوع', 'المادة الجافة %', 'السعر (ج.م)', 'الرصيد بالمخزن (كجم)', 'الحالة'],
  ];
  rawMaterials.forEach((m) => {
    rawData.push([
      m.code || m.id,
      m.name,
      m.unit || 'كجم',
      m.materialType || 'concentrate',
      m.dryMatterPercent ?? 88,
      m.price ?? 0,
      m.currentStockKg ?? 0,
      m.status || 'نشطة',
    ]);
  });
  const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
  configureSheet(wsRaw, rawData);
  XLSX.utils.book_append_sheet(wb, wsRaw, '2- الخامات العلفية');

  // Sheet 3: Rations
  const ratData: any[][] = [
    ['كود العليقة', 'اسم العليقة', 'نوع الحساب', 'إجمالي وزن الرأس (كجم)', 'تكلفة الكيلو (ج.م)'],
  ];
  rations.forEach((r) => {
    ratData.push([
      r.code || r.id,
      r.name,
      r.calculationType === 'fixed_tonnage' ? 'بالطن' : 'بالرأس',
      calculateRationTotalKgPerHead(r).toFixed(2),
      calculateRationCostPerKg(r, rawMaterials).toFixed(2),
    ]);
  });
  const wsRat = XLSX.utils.aoa_to_sheet(ratData);
  configureSheet(wsRat, ratData);
  XLSX.utils.book_append_sheet(wb, wsRat, '3- العلائق');

  // Sheet 4: Categories
  const catData: any[][] = [
    ['اسم الفئة', 'العليقة المرتبطة', 'المكسر المرتبط', 'طريقة التشغيل', 'ملاحظات'],
  ];
  categories.forEach((c) => {
    const rat = rations.find((r) => r.id === c.rationId);
    const mix = mixers.find((m) => m.id === c.mixerId);
    catData.push([c.name, rat?.name || '-', mix?.name || '-', c.isPeriodicMixer ? 'دوري بالطن' : 'يومي', c.notes || '-']);
  });
  const wsCat = XLSX.utils.aoa_to_sheet(catData);
  configureSheet(wsCat, catData);
  XLSX.utils.book_append_sheet(wb, wsCat, '4- الفئات الحيوانية');

  // Sheet 5: Barns
  const barnData: any[][] = [
    ['رقم العنبر', 'اسم العنبر', 'الفئة', 'عدد الرؤوس', 'سحب الرأس (كجم)', 'نسبة التغذية %', 'الاستحقاق اليومي (كجم)', 'الحالة'],
  ];
  barns.forEach((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    barnData.push([
      b.number,
      b.name || '-',
      cat?.name || '-',
      b.headCount,
      b.baseFeedKgPerHead,
      `${b.feedingRatioPercent}%`,
      Math.round(demand),
      b.status,
    ]);
  });
  const wsBarn = XLSX.utils.aoa_to_sheet(barnData);
  configureSheet(wsBarn, barnData);
  XLSX.utils.book_append_sheet(wb, wsBarn, '5- العنابر والأحواش');

  // Sheet 6: Batches
  const batchData: any[][] = [
    ['رقم اللفة', 'المكسر', 'الفئة', 'الوقت', 'الوزن المخطط (كجم)', 'الحالة'],
  ];
  dailyPlan.batches?.forEach((b, idx) => {
    const mix = mixers.find((m) => m.id === b.mixerId);
    const cat = categories.find((c) => c.id === b.categoryId);
    batchData.push([
      b.batchNumber || `لفة #${idx + 1}`,
      mix?.name || '-',
      cat?.name || '-',
      b.time || '-',
      b.targetWeightKg,
      b.status,
    ]);
  });
  const wsBatch = XLSX.utils.aoa_to_sheet(batchData);
  configureSheet(wsBatch, batchData);
  XLSX.utils.book_append_sheet(wb, wsBatch, '6- خطة اللفات');

  downloadWorkbook(wb, `المصنف_الشامل_للمزرعة_${dailyPlan.date}`);
}

export const exportAllSystemDataToExcel = exportFullFarmWorkbookToExcel;

// ==========================================
// 12. Single Batch Mixer Order Export (أمر لفة مكسر منفردة)
// ==========================================
export function exportSingleBatchOrderToExcel(
  batch: MixBatch,
  dailyPlan: DailyOperationPlan,
  categories: AnimalCategory[],
  rations: Ration[],
  mixers: Mixer[],
  rawMaterials: RawMaterial[],
  barns: Barn[],
  settings?: FarmSettings,
  usePremixMode: boolean = false,
  bagWeightKg: number = 50,
  actualWeights?: Record<string, number>
) {
  const wb = XLSX.utils.book_new();
  const cat = categories.find((c) => c.id === batch.categoryId);
  const ration = rations.find((r) => r.id === cat?.rationId);
  const mixer = mixers.find((m) => m.id === batch.mixerId);
  const effectiveTargetWeightKg = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
  const targetWeight = effectiveTargetWeightKg > 0 ? effectiveTargetWeightKg : batch.targetWeightKg;

  const ingredients = ration
    ? calculateConsolidatedBatchIngredients(
        targetWeight,
        ration,
        rawMaterials,
        usePremixMode,
        bagWeightKg,
        actualWeights || batch.actualIngredientWeights
      )
    : [];

  const sheetData: any[][] = [
    [settings?.farmName || 'مزرعة الإنتاج الحيواني', ''],
    [`أمر تحضير وتحميل لفة مكسر TMR - ${batch.batchNumber}`, ''],
    ['التاريخ', dailyPlan.date],
    ['اسم المكسر / الخلاطة', mixer?.name || 'مكسر التغذية'],
    ['الفئة المستهدفة', cat?.name || '-'],
    ['تركيبة العليقة', ration?.name || '-'],
    ['توقيت اللفة', batch.time || '-'],
    ['وزن اللفة المخطط', `${targetWeight.toLocaleString('ar-EG')} كجم`],
    ['حالة اللفة', batch.status || 'مجدولة'],
    [],
    ['=== جدول تسلسل تحميل وصرف خامات المكسر ===', ''],
    ['م (تسلسل)', 'كود الخامة', 'اسم الخامة العلفية', 'النسبة من العليقة %', 'الوزن المطلوب (كجم)', 'الوزن الفعلي المعبأ (كجم)', 'الفارق (كجم)', 'طريقة الصرف والتحميل', 'تم التحميل (☑)'],
  ];

  let totalRequiredKg = 0;
  let totalActualKg = 0;

  ingredients.forEach((ing, idx) => {
    const req = ing.requiredKg || 0;
    const act = ing.actualKg !== undefined ? ing.actualKg : req;
    const diff = Math.round((act - req) * 10) / 10;
    totalRequiredKg += req;
    totalActualKg += act;

    const rawMat = rawMaterials.find((r) => r.id === ing.rawMaterialId);
    const isLiquid = (rawMat?.name || '').includes('مولاس') || (rawMat?.name || '').includes('سائل');
    const isRoughage =
      (rawMat?.name || '').includes('سيلاج') ||
      (rawMat?.name || '').includes('دريس') ||
      (rawMat?.name || '').includes('تبن') ||
      (rawMat?.name || '').includes('قش');

    let loadingMethod = 'لودر / صوامع (مباشر)';
    if (ing.isPremixConcentrate) {
      loadingMethod = `شكاير مركز جاهز (${ing.bagsCount || 0} شكارة)`;
    } else if (isLiquid) {
      loadingMethod = 'ضخ سائل / تانك';
    } else if (isRoughage) {
      loadingMethod = 'لودر / بالات خشنة';
    }

    const pctString = targetWeight > 0 ? `${((req / targetWeight) * 100).toFixed(1)}%` : '-';

    sheetData.push([
      idx + 1,
      ing.code || ing.rawMaterialId,
      ing.name,
      pctString,
      req,
      act,
      diff,
      loadingMethod,
      '[  ]',
    ]);
  });

  sheetData.push([
    'الإجمالي',
    '',
    '',
    '100%',
    Math.round(totalRequiredKg * 10) / 10,
    Math.round(totalActualKg * 10) / 10,
    Math.round((totalActualKg - totalRequiredKg) * 10) / 10,
    '',
    '',
  ]);

  // Barn Unloading Distribution Table
  sheetData.push([]);
  sheetData.push(['=== جدول توزيع وتفريغ اللفة على العنابر والأحواش ===', '']);
  sheetData.push(['رقم العنبر', 'اسم العنبر', 'عدد الرؤوس', 'النسبة المخصصة %', 'الوزن المقرر للتفريغ (كجم)', 'الوزن الفعلي المفرغ (كجم)', 'توقيع المستلم']);

  let totalBarnAllocatedKg = 0;
  if (batch.allocations && batch.allocations.length > 0) {
    batch.allocations.forEach((alloc) => {
      const barn = barns.find((b) => b.id === alloc.barnId);
      const allocatedKg = alloc.allocatedKg || 0;
      totalBarnAllocatedKg += allocatedKg;
      sheetData.push([
        barn?.number || '-',
        barn?.name || `عنبر #${barn?.number || ''}`,
        barn?.headCount || 0,
        `${alloc.allocatedPercent || 0}%`,
        allocatedKg,
        '',
        '',
      ]);
    });
  } else {
    sheetData.push(['-', 'تفريغ مباشر حسب تعليمات المهندس', '-', '100%', targetWeight, '', '']);
  }

  sheetData.push([
    'إجمالي التفريغ',
    '',
    '',
    '100%',
    totalBarnAllocatedKg > 0 ? totalBarnAllocatedKg : targetWeight,
    '',
    '',
  ]);

  // Signatures
  sheetData.push([]);
  sheetData.push(['مسؤول التغذية والتشغيل', settings?.engineerName || 'مهندس الموقع', '', 'سائق المكسر', '', 'أمين مخزن الخامات', '']);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  configureSheet(ws, sheetData);
  XLSX.utils.book_append_sheet(wb, ws, `لفة_${batch.batchNumber}`);

  const safeBatchName = (batch.batchNumber || 'لفة_مكسر').replace(/[\\/:*?"<>|]/g, '_');
  downloadWorkbook(wb, `أمر_تحميل_${safeBatchName}_${dailyPlan.date}`);
}

// ==========================================
// 13. Single Concentrate Premix Order Export (أمر تشغيل خلاطة المركز)
// ==========================================
export function exportSingleConcentrateOrderToExcel(
  order: ConcentratePremixOrder,
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  settings?: FarmSettings,
  dailyPlanDate?: string
) {
  const wb = XLSX.utils.book_new();
  const cat = categories.find((c) => c.id === order.categoryId);
  const ration = rations.find((r) => r.id === cat?.rationId);
  const bagWeight = order.bagWeightKg || 50;

  const formula = calculateConcentrateBatchFormula(
    ration,
    rawMaterials,
    order.batchWeightKg,
    bagWeight
  );

  const sheetData: any[][] = [
    [settings?.farmName || 'مزرعة الإنتاج الحيواني', ''],
    [`أمر خلط مركز وتعبئة شكاير - ${order.orderNumber}`, ''],
    ['التاريخ', dailyPlanDate || new Date().toISOString().split('T')[0]],
    ['الفئة المستهدفة', cat?.name || '-'],
    ['تركيبة العليقة', ration?.name || '-'],
    ['الخلاطة المستخدمة', order.mixerName || 'خلاطة المركز الجاف'],
    ['إجمالي وزن الدفعة (طن)', (order.batchWeightKg / 1000).toFixed(2)],
    ['إجمالي وزن الدفعة (كجم)', order.batchWeightKg.toLocaleString('ar-EG')],
    ['وزن الشكارة الموحد', `${bagWeight} كجم`],
    ['عدد الشكاير التامة المعبأة', `${order.totalBags} شكارة`],
    ['الفرط المتبقي (كسر)', `${formula.remainingLooseKg} كجم`],
    ['التكلفة الإجمالية للدفعة', `${formula.totalCost.toLocaleString('ar-EG')} ${settings?.currency || 'ج.م'}`],
    ['تكلفة الشكارة الواحدة', `${formula.costPerBag.toLocaleString('ar-EG')} ${settings?.currency || 'ج.م'}`],
    ['ملاحظات التشغيل', order.notes || 'لا توجد'],
    [],
    ['=== جدول نسب وموازين الخامات لخلاطة المركز ومعايرة الشكارة ===', ''],
    [
      'م',
      'كود الخامة',
      'اسم الخامة المركزة',
      'النسبة من خلطة المركز %',
      'الوزن المطلوب بالخلطة (كجم)',
      'الوزن لكل شكارة (كجم/شكارة)',
      'الوزن لكل شكارة (جرام/شكارة)',
      'سعر الكيلو (ج.م)',
      'إجمالي القيمة (ج.م)',
      'تم الوزن بالخلاطة (☑)',
    ],
  ];

  let totalKgInBatch = 0;
  let totalKgPerBag = 0;
  let totalCost = 0;

  formula.items.forEach((item, idx) => {
    const kgPerBag = bagWeight > 0 ? (item.percentageInConcentrate / 100) * bagWeight : 0;
    const gramsPerBag = Math.round(kgPerBag * 1000);
    const itemCost = item.requiredKg * (item.costPerKg || 0);

    totalKgInBatch += item.requiredKg;
    totalKgPerBag += kgPerBag;
    totalCost += itemCost;

    sheetData.push([
      idx + 1,
      item.code || item.rawMaterialId,
      item.name,
      `${item.percentageInConcentrate}%`,
      item.requiredKg,
      Math.round(kgPerBag * 100) / 100,
      gramsPerBag,
      item.costPerKg || 0,
      Math.round(itemCost * 10) / 10,
      '[  ]',
    ]);
  });

  sheetData.push([
    'الإجمالي',
    '',
    '',
    '100%',
    Math.round(totalKgInBatch * 10) / 10,
    Math.round(totalKgPerBag * 10) / 10,
    Math.round(totalKgPerBag * 1000),
    '',
    Math.round(totalCost * 10) / 10,
    '',
  ]);

  // Bag Packaging Quality & Count Log
  sheetData.push([]);
  sheetData.push(['=== سجل فحص تعبئة وخياطة الشكاير (عينة الجودة) ===', '']);
  sheetData.push(['رقم الشكارة / النطاق', 'الوزن المستهدف (كجم)', 'الوزن الفعلي للمعايرة (كجم)', 'فحص الخياطة والإحكام', 'توقيع فني التعبئة']);

  const sampleCount = Math.min(order.totalBags, 10);
  for (let i = 1; i <= sampleCount; i++) {
    sheetData.push([`شكارة #${i}`, bagWeight, '', '[  ] سليم', '']);
  }
  if (order.totalBags > sampleCount) {
    sheetData.push([`باقي الشكاير (من #${sampleCount + 1} إلى #${order.totalBags})`, bagWeight, '', '[  ] سليم', '']);
  }

  // Signatures
  sheetData.push([]);
  sheetData.push(['فني ومسؤول الخلاطة', '', 'أمين مخزن المركزات والشكاير', '', 'مهندس التغذية المعتمد', settings?.engineerName || '']);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  configureSheet(ws, sheetData);
  XLSX.utils.book_append_sheet(wb, ws, `أمر_مركز_${order.orderNumber}`);

  const safeOrderName = (order.orderNumber || 'أمر_خلطة').replace(/[\\/:*?"<>|]/g, '_');
  downloadWorkbook(wb, `أمر_خلاطة_مركز_${safeOrderName}_${dailyPlanDate || ''}`);
}

// ==========================================
// 14. Live Concentrate Formula Export (تصدير معادلة المركز المخصصة الحالية)
// ==========================================
export function exportConcentrateFormulaToExcel(
  formula: ConcentrateBatchFormula,
  categoryName: string,
  rationName: string,
  mixerName: string,
  settings?: FarmSettings,
  date?: string,
  notes?: string
) {
  const wb = XLSX.utils.book_new();
  const bagWeight = formula.bagWeightKg || 50;

  const sheetData: any[][] = [
    [settings?.farmName || 'مزرعة الإنتاج الحيواني', ''],
    ['معادلة تشغيل خلاطة المركز الجاف وتعبئة الشكاير', ''],
    ['التاريخ', date || new Date().toISOString().split('T')[0]],
    ['الفئة المستهدفة', categoryName],
    ['تركيبة العليقة', rationName],
    ['الخلاطة', mixerName],
    ['إجمالي وزن الدفعة (طن)', (formula.targetBatchKg / 1000).toFixed(2)],
    ['إجمالي وزن الدفعة (كجم)', formula.targetBatchKg.toLocaleString('ar-EG')],
    ['وزن الشكارة', `${bagWeight} كجم`],
    ['عدد الشكاير الناتجة', `${formula.totalBags} شكارة`],
    ['الفرط المتبقي', `${formula.remainingLooseKg} كجم`],
    ['التكلفة التقديرية للدفعة', `${formula.totalCost.toLocaleString('ar-EG')} ${settings?.currency || 'ج.م'}`],
    ['تكلفة الطن التقديرية', `${(formula.costPerKg * 1000).toLocaleString('ar-EG')} ${settings?.currency || 'ج.م'}`],
    ['تكلفة الشكارة', `${formula.costPerBag.toLocaleString('ar-EG')} ${settings?.currency || 'ج.م'}`],
    ['ملاحظات', notes || ''],
    [],
    ['=== جدول موازين الخامات بالخلاطة والشكارة ===', ''],
    [
      'م',
      'كود الخامة',
      'اسم الخامة المركزة',
      'النسبة من خلطة المركز %',
      'الوزن المطلوب بالخلطة (كجم)',
      'الوزن لكل شكارة (كجم/شكارة)',
      'الوزن لكل شكارة (جرام/شكارة)',
      'سعر الكيلو (ج.م)',
      'إجمالي القيمة (ج.م)',
    ],
  ];

  let totalKg = 0;
  let totalCost = 0;

  formula.items.forEach((item, idx) => {
    const kgPerBag = bagWeight > 0 ? (item.percentageInConcentrate / 100) * bagWeight : 0;
    const gramsPerBag = Math.round(kgPerBag * 1000);
    const itemCost = item.requiredKg * (item.costPerKg || 0);
    totalKg += item.requiredKg;
    totalCost += itemCost;

    sheetData.push([
      idx + 1,
      item.code || item.rawMaterialId,
      item.name,
      `${item.percentageInConcentrate}%`,
      item.requiredKg,
      Math.round(kgPerBag * 100) / 100,
      gramsPerBag,
      item.costPerKg || 0,
      Math.round(itemCost * 10) / 10,
    ]);
  });

  sheetData.push([
    'الإجمالي',
    '',
    '',
    '100%',
    Math.round(totalKg * 10) / 10,
    bagWeight,
    bagWeight * 1000,
    '',
    Math.round(totalCost * 10) / 10,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  configureSheet(ws, sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'معادلة_خلطة_المركز');

  downloadWorkbook(wb, `معادلة_خلاطة_مركز_${categoryName.replace(/\s+/g, '_')}_${formula.targetBatchKg}كجم`);
}

// ==========================================
// 13. Whole-Farm Economics & IOFC Export
// ==========================================
export function exportFarmEconomicsToExcel(
  summary: {
    totalFarmHeads: number;
    activeBarnsCount: number;
    totalFarmDemandKg: number;
    totalFarmDemandTons: number;
    totalFarmDailyFeedCost: number;
    averageFeedCostPerHead: number;
    totalMilkRevenue: number;
    totalMeatGainRevenue: number;
    totalFarmDailyRevenue: number;
    averageRevenuePerHead: number;
    wholeFarmNetMarginOverFeed: number;
    wholeFarmNetMarginPerHead: number;
    wholeFarmFeedCostPercentOfRevenue: number;
    dairyOnlyFeedCost: number;
    dairyOnlyRevenue: number;
    dairyOnlyIofc: number;
    dairyTotalHeads: number;
    dairyAverageIofcPerHead: number;
    fatteningOnlyFeedCost: number;
    fatteningOnlyRevenue: number;
    fatteningOnlyMofc: number;
    fatteningTotalHeads: number;
    fatteningAverageMofcPerHead: number;
    nonProducingFeedCost: number;
    nonProducingHeads: number;
    milkPricePerKg: number;
    liveMeatPricePerKg: number;
    fatteningAdgKg: number;
    categoriesBreakdown: any[];
  },
  farmName: string = 'مزرعة الماشية',
  dateStr: string = new Date().toISOString().split('T')[0],
  currency: string = 'ج.م'
) {
  const wb = XLSX.utils.book_new();

  const sheetData: any[][] = [
    [`تقرير التحليل المالي واقتصاديات المزرعة و IOFC - ${farmName}`],
    [`تاريخ التشغيل: ${dateStr}`, `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    ['=== ملخص الميزان المالي الشامل للمزرعة (Whole-Farm Net Margin) ==='],
    ['إجمالي رؤوس المزرعة', summary.totalFarmHeads, 'رأس'],
    ['إجمالي العنابر النشطة', summary.activeBarnsCount, 'عنبر'],
    ['إجمالي استهلاك العلف اليومي', summary.totalFarmDemandKg, 'كجم', `(${summary.totalFarmDemandTons} طن)`],
    ['إجمالي تكلفة العلف اليومية (كل الفئات)', summary.totalFarmDailyFeedCost, currency],
    ['متوسط تكلفة تغذية الرأس الواحدة', summary.averageFeedCostPerHead, `${currency} / رأس / يوم`],
    ['إجمالي إيراد الحليب المقدر', summary.totalMilkRevenue, currency, `(بسعر ${summary.milkPricePerKg} ${currency}/كجم)`],
    ['إجمالي إيراد التحويل اللحمي للتسمين', summary.totalMeatGainRevenue, currency, `(بسعر ${summary.liveMeatPricePerKg} ${currency}/كجم و ADG ${summary.fatteningAdgKg} كجم)`],
    ['إجمالي الإيرادات اليومية للمزرعة', summary.totalFarmDailyRevenue, currency],
    ['صافي عائد المزرعة بعد تغذية الكل (Net Margin Over Feed)', summary.wholeFarmNetMarginOverFeed, `${currency} / يوم`],
    ['صافي الربح اليومي لكل رأس بالمزرعة', summary.wholeFarmNetMarginPerHead, `${currency} / رأس / يوم`],
    ['نسبة تكلفة العلف الشامل من الإيراد', `${summary.wholeFarmFeedCostPercentOfRevenue}%`],
    [],
    ['=== مقارنة قطاعات الإنتاج والرعاية ==='],
    ['القطاع', 'عدد الرؤوس', `تكلفة العلف اليومية (${currency})`, `الإيراد اليومي (${currency})`, `صافي العائد (${currency})`, `العائد / الرأس (${currency})`],
    ['قطاع أبقار الحلاب (Dairy IOFC)', summary.dairyTotalHeads, summary.dairyOnlyFeedCost, summary.dairyOnlyRevenue, summary.dairyOnlyIofc, summary.dairyAverageIofcPerHead],
    ['قطاع عجول التسمين (Beef MOFC)', summary.fatteningTotalHeads, summary.fatteningOnlyFeedCost, summary.fatteningOnlyRevenue, summary.fatteningOnlyMofc, summary.fatteningAverageMofcPerHead],
    ['قطيع الرعاية والاستثمار (جاف، عشار، نامي، رضع)', summary.nonProducingHeads, summary.nonProducingFeedCost, 0, -summary.nonProducingFeedCost, summary.nonProducingHeads > 0 ? -Math.round(summary.nonProducingFeedCost / summary.nonProducingHeads) : 0],
    [],
    ['=== تفصيل تكلفة وعائد كل فئة حيوانية على حدة ==='],
    [
      'م',
      'الفئة الحيوانية',
      'النوع الإنتاجي',
      'العنابر',
      'عدد الرؤوس',
      'العلف اليومي (كجم)',
      'العليقة',
      `سعر كجم العليقة (${currency})`,
      `إجمالي تكلفة العلف (${currency})`,
      `تكلفة الرأس/يوم (${currency})`,
      'الحصة من علف المزرعة %',
      'طبيعة العائد',
      `الإيراد اليومي (${currency})`,
      `إيراد الرأس/يوم (${currency})`,
      'صافي العائد (IOFC/MOFC)',
      `صافي الرأس/يوم (${currency})`,
      'نسبة العلف من الدخل %',
    ],
  ];

  summary.categoriesBreakdown.forEach((cat, idx) => {
    sheetData.push([
      idx + 1,
      cat.categoryName,
      cat.categoryType === 'milking'
        ? 'إنتاج حليب (حلاب)'
        : cat.categoryType === 'fattening'
        ? 'تسمين لحم'
        : cat.categoryType === 'dry'
        ? 'أبقار جافة'
        : cat.categoryType === 'heifer'
        ? 'عجلات نامية/عشار'
        : cat.categoryType === 'calf'
        ? 'رضيع وفطام'
        : 'أخرى',
      cat.barnNames?.join('، ') || cat.barnCount,
      cat.totalHeads,
      cat.dailyDemandKg,
      cat.rationName,
      cat.rationCostPerKg,
      cat.totalDailyFeedCost,
      cat.feedCostPerHeadPerDay,
      `${cat.feedCostSharePercent}%`,
      cat.revenueTypeLabel,
      cat.dailyRevenue,
      cat.revenuePerHeadPerDay,
      cat.netMarginOverFeed,
      cat.netMarginPerHeadPerDay,
      cat.isRevenueGenerating ? `${cat.feedCostPercentOfRevenue}%` : '-',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  configureSheet(ws, sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'اقتصاديات_المزرعة_IOFC');

  downloadWorkbook(wb, `اقتصاديات_المزرعة_IOFC_${dateStr}`);
}

