import React, { useState, useEffect, useMemo } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getRationDisplayName,
  getMixerDisplayName,
  getMaterialDisplayName,
  getBatchNumberDisplayName,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
} from '../../context/LanguageContext';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  Mixer,
  FarmSettings,
  MixBatch,
  ActiveTab,
  Barn,
} from '../../types';
import {
  calculateBatchIngredients,
  calculateConsolidatedBatchIngredients,
  calculateConcentrateStock,
  calculateRationTotalKgPerHead,
  getBatchDerivedTargetWeightKg,
  getDerivedAllocationKg,
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  doesBatchBelongToCategory,
  ConsolidatedBatchIngredientItem,
  calculateRationDmStats,
  getRawMaterialDryMatterPercent,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import { useFeedback } from '../../context/FeedbackContext';
import {
  exportPreparationOrdersToExcel,
  exportSingleBatchOrderToExcel,
} from '../../utils/excelExport';
import {
  ClipboardList,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Edit2,
  Check,
  X,
  RefreshCw,
  RotateCcw,
  Info,
  Package,
  Boxes,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Sliders,
  Eye,
  Building,
} from 'lucide-react';

interface PreparationOrdersViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  mixers: Mixer[];
  settings: FarmSettings;
  barns?: Barn[];
  initialBatchId?: string;
  setActiveTab?: (tab: ActiveTab) => void;
  onPrint?: () => void;
  onOpenPrintPreview?: (batchId?: string) => void;
}

export const PreparationOrdersView: React.FC<PreparationOrdersViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  rations,
  rawMaterials,
  mixers,
  settings,
  barns = [],
  initialBatchId,
  setActiveTab,
  onPrint,
  onOpenPrintPreview,
}) => {
  const { showToast } = useFeedback();
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';

  // Filter batches to only those with valid target weight > 0 and assigned to barns with active animals
  const batches = useMemo(() => {
    return (dailyPlan.batches || []).filter((b) => {
      const effectiveWeight = getBatchDerivedTargetWeightKg(b, barns, categories, rations, dailyPlan);
      if (effectiveWeight <= 0 && b.targetWeightKg <= 0) return false;
      
      // Also check if all assigned barns have 0 head count
      if (b.allocations && b.allocations.length > 0) {
        const assignedBarns = barns.filter((barn) => b.allocations?.some((a) => a.barnId === barn.id));
        if (assignedBarns.length > 0 && assignedBarns.every((barn) => barn.headCount === 0)) {
          return false;
        }
      }
      return true;
    });
  }, [dailyPlan, barns, categories, rations]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchId || batches[0]?.id || ''
  );

  useEffect(() => {
    if (batches.length > 0 && !batches.some((b) => b.id === selectedBatchId)) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const category = categories.find((c) => c.id === activeBatch?.categoryId) || categories.find((c) => doesBatchBelongToCategory(activeBatch, c, barns));
  const ration = rations.find((r) => r.id === (activeBatch?.rationId || category?.rationId || (category as any)?.defaultRationId));
  const mixer = mixers.find((m) => m.id === activeBatch?.mixerId);
  const effectiveTargetWeightKg = activeBatch
    ? getBatchDerivedTargetWeightKg(activeBatch, barns, categories, rations, dailyPlan)
    : 0;

  const rationDmStats = useMemo(() => calculateRationDmStats(ration, rawMaterials), [ration, rawMaterials]);
  const batchDmKg = Math.round(effectiveTargetWeightKg * (rationDmStats.dmPercent / 100) * 10) / 10;

  // Gross vs Recycled Refusal vs Net Fresh Breakdown for active batch
  let activeBatchGrossKg = 0;
  let activeBatchRefusalKg = 0;

  if (activeBatch && activeBatch.allocations && activeBatch.allocations.length > 0) {
    activeBatch.allocations.forEach((a) => {
      const barn = barns.find((bn) => bn.id === a.barnId);
      if (barn) {
        const gross = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
        const refusal = calculateBarnRecycledRefusalKg(barn, dailyPlan);
        const pct = a.allocatedPercent !== undefined
          ? Number(a.allocatedPercent)
          : (gross > 0 ? ((a.allocatedKg || 0) / gross) * 100 : 0);
        activeBatchGrossKg += (gross * pct) / 100;
        activeBatchRefusalKg += (refusal * pct) / 100;
      }
    });
  }
  activeBatchGrossKg = Math.round(activeBatchGrossKg * 10) / 10;
  activeBatchRefusalKg = Math.round(activeBatchRefusalKg * 10) / 10;

  // Toggle or adjust refusal deduction for barns in active batch
  const handleToggleRefusalDeduction = (deduct: boolean) => {
    if (!activeBatch || !activeBatch.allocations) return;
    const targetBarnIds = activeBatch.allocations.map((a) => a.barnId);
    const updatedDailyBarnStates = { ...(dailyPlan.dailyBarnStates || {}) };

    targetBarnIds.forEach((barnId) => {
      const barn = barns.find((b) => b.id === barnId);
      if (!barn) return;
      const current = updatedDailyBarnStates[barnId] || {
        barnId,
        headCount: barn.headCount,
        feedingRatioPercent: barn.feedingRatioPercent || 100,
        rationId: barn.rationId,
      };

      if (!deduct) {
        // Zero out recycled refusal so fresh mixer feeds 100%
        updatedDailyBarnStates[barnId] = {
          ...current,
          recycledRefusalAllocatedKg: 0,
        };
      } else {
        // Restore standard refusal proportional share (~8.73% of gross demand)
        const grossDemand = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
        const restoredKg = Math.round(grossDemand * 0.0873 * 10) / 10;
        updatedDailyBarnStates[barnId] = {
          ...current,
          recycledRefusalAllocatedKg: restoredKg,
        };
      }
    });

    setDailyPlan({
      ...dailyPlan,
      dailyBarnStates: updatedDailyBarnStates,
    });
  };

  // Refusal Recycling state and logic
  // Local state for actual weights loaded into the mixer
  const [actualWeights, setActualWeights] = useState<Record<string, number>>(() => {
    return activeBatch?.actualIngredientWeights || {};
  });

  // Concentrate Pre-mix & Bagging Mode
  const isMixerActive = settings.hasConcentrateMixer !== false;
  const [usePremixMode, setUsePremixMode] = useState<boolean>(() =>
    isMixerActive ? (dailyPlan.useConcentratePremixMode ?? true) : false
  );

  // Sync premix mode state if settings or daily plan changes
  useEffect(() => {
    if (!isMixerActive) {
      setUsePremixMode(false);
    } else if (dailyPlan.useConcentratePremixMode !== undefined) {
      setUsePremixMode(dailyPlan.useConcentratePremixMode);
    }
  }, [isMixerActive, dailyPlan.useConcentratePremixMode]);

  const [showSubIngredients, setShowSubIngredients] = useState<boolean>(false);
  const bagWeightKg = dailyPlan.premixBagWeightKg || settings.defaultBagWeightKg || 50;

  const handleTogglePremixMode = (enabled: boolean) => {
    if (!isMixerActive) return;
    setUsePremixMode(enabled);
    setDailyPlan({
      ...dailyPlan,
      useConcentratePremixMode: enabled,
    });
  };

  const categoryStock = category
    ? calculateConcentrateStock(
        category.id,
        categories,
        dailyPlan,
        barns,
        rations,
        rawMaterials,
        bagWeightKg
      )
    : null;

  // Edit batch name and time for active batch
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [tempBatchName, setTempBatchName] = useState('');
  const [tempBatchTime, setTempBatchTime] = useState('');

  const startEditingBatch = () => {
    if (!activeBatch) return;
    setTempBatchName(activeBatch.batchNumber);
    setTempBatchTime(activeBatch.time || (isEn ? '08:00 AM' : '08:00 ص'));
    setIsEditingBatch(true);
  };

  const saveEditingBatch = () => {
    if (!activeBatch || !tempBatchName.trim()) {
      setIsEditingBatch(false);
      return;
    }
    const updatedBatches = (dailyPlan.batches || []).map((b) =>
      b.id === activeBatch.id
        ? {
            ...b,
            batchNumber: tempBatchName.trim(),
            time: tempBatchTime.trim() || b.time,
          }
        : b
    );
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setIsEditingBatch(false);
  };

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const targetB = batches.find((b) => b.id === batchId);
    setActualWeights(targetB?.actualIngredientWeights || {});
  };

  const handleActualChange = (rawMaterialId: string, valueKg: number) => {
    setActualWeights((prev) => ({
      ...prev,
      [rawMaterialId]: Math.max(0, valueKg),
    }));
  };

  const handleApproveAndPrepare = () => {
    if (!activeBatch) return;
    const updatedBatches = batches.map((b) =>
      b.id === activeBatch.id
        ? {
            ...b,
            targetWeightKg: effectiveTargetWeightKg,
            status: (isEn ? 'Prepared' : 'تم التحضير') as any,
            actualIngredientWeights: actualWeights,
          }
        : b
    );
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    showToast(
      isEn
        ? `Batch (${activeBatch.batchNumber}) approved and status updated to Prepared!`
        : `تم اعتماد وتحضير اللفة (${activeBatch.batchNumber}) بنجاح وتحويل حالتها إلى (تم التحضير)!`,
      'success'
    );
  };

  const calculatedIngredients: ConsolidatedBatchIngredientItem[] = activeBatch && ration
    ? calculateConsolidatedBatchIngredients(
        effectiveTargetWeightKg,
        ration,
        rawMaterials,
        usePremixMode,
        bagWeightKg,
        actualWeights
      )
    : [];

  const totalRequiredKg = calculatedIngredients.reduce((s, i) => s + i.requiredKg, 0);
  const totalActualKg = calculatedIngredients.reduce((s, i) => s + (i.actualKg || 0), 0);
  const totalDiffKg = Math.round((totalActualKg - totalRequiredKg) * 100) / 100;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Printable Formal Header */}
      <PrintHeader
        documentTitle={isEn ? 'TMR Mixer Loading & Preparation Order' : 'أمر تحضير وتحميل المكسر (المركب) TMR'}
        documentSubtitle={
          isEn
            ? 'Warehouse material requisition to mixer according to ration percentages'
            : 'نموذج صرف الخامات من المخزن إلى المكسر حسب النسبة المئوية للعليقة'
        }
        selectedDate={dailyPlan.date}
        settings={settings}
        batchInfo={
          activeBatch
            ? {
                batchNumber: activeBatch.batchNumber,
                categoryName: category?.name,
                rationName: ration?.name,
                mixerName: mixer?.name,
                time: activeBatch.time,
                targetWeightKg: effectiveTargetWeightKg,
              }
            : undefined
        }
      />

      {/* Screen Controls & Batch Picker */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
              {isEn ? 'Daily Mixer Preparation Order' : 'أمر تحضير خامات المكسر اليومي'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Accurate proportional calculation of ingredient weights per mixer load based on batch weight'
                : 'حساب نسبي دقيق لكميات الخامات لكل لفة مكسر بناءً على وزن اللفة'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApproveAndPrepare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>{isEn ? 'Approve & Prepare Batch' : 'اعتماد وتحضير اللفة'}</span>
            </button>

            {onOpenPrintPreview && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => onOpenPrintPreview(activeBatch?.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={isEn ? 'Preview current batch on A4' : 'معاينة أمر اللفة المعروضة حالياً على الورق A4'}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{isEn ? 'Preview Current' : 'معاينة اللفة الحالية'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPrintPreview('ALL')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={isEn ? 'Preview and print all mixer orders for today' : 'معاينة وطباعة جميع أوامر لفات المكسر لليوم بالكامل'}
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? `Preview All (${batches.length})` : `معاينة كل اللفات (${batches.length})`}</span>
                </button>
              </div>
            )}

            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Quick print of current order' : 'طباعة سريعة للأمر المعروض حالياً'}
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>{isEn ? 'Quick Print' : 'طباعة فورية'}</span>
            </button>

            <ExportExcelButton
              onExport={() =>
                exportPreparationOrdersToExcel(
                  dailyPlan,
                  mixers,
                  categories,
                  rations,
                  rawMaterials,
                  settings
                )
              }
              label={isEn ? 'Export to Excel' : 'تصدير للإكسيل'}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Batch Picker Grouped by Category/Department */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            {isEn ? 'Select Preparation Order (Grouped by Category):' : 'اختر أمر التحضير (اللفات مجمعة حسب الأقسام):'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories
              .filter((cat) => batches.some((b) => b.categoryId === cat.id))
              .map((cat) => {
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                return (
                  <div
                    key={cat.id}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950 bg-emerald-100/90 px-3 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-emerald-800" />
                        <span>{isEn ? `Section ${cat.name}` : `قسم ${cat.name}`}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ({catBatches.length} {isEn ? 'batches' : 'لفات'})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {catBatches.map((b) => {
                        const isSelected = b.id === activeBatch?.id;
                        const bEffective = getBatchDerivedTargetWeightKg(b, barns, categories, rations, dailyPlan);
                        const displayWeight = bEffective > 0 ? bEffective : b.targetWeightKg;

                        let bRefusalKg = 0;
                        if (b.allocations && b.allocations.length > 0) {
                          b.allocations.forEach((a) => {
                            const barn = barns.find((bn) => bn.id === a.barnId);
                            if (barn) {
                              const refusal = calculateBarnRecycledRefusalKg(barn, dailyPlan);
                              const gross = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
                              const pct = a.allocatedPercent !== undefined
                                ? Number(a.allocatedPercent)
                                : (gross > 0 ? ((a.allocatedKg || 0) / gross) * 100 : 0);
                              bRefusalKg += (refusal * pct) / 100;
                            }
                          });
                        }
                        bRefusalKg = Math.round(bRefusalKg * 10) / 10;

                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBatch(b.id)}
                            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-900 text-emerald-50 border-emerald-950 shadow-md ring-2 ring-emerald-500/40 scale-[1.02]'
                                : 'bg-white text-slate-800 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                          >
                            <span className="font-black">{b.batchNumber}</span>
                            <span className="text-[11px] opacity-80">({b.time})</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                              isSelected ? 'bg-emerald-950 text-amber-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {displayWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                            </span>
                            {bRefusalKg > 0.1 && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  isSelected
                                    ? 'bg-amber-400 text-emerald-950'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                                title={
                                  isEn
                                    ? `Deducted ${bRefusalKg.toLocaleString()} kg recycled milking refusal`
                                    : `مخصوم ${bRefusalKg.toLocaleString('ar-EG')} كجم راجع حلاب معاد تدويره`
                                }
                              >
                                - {bRefusalKg} {isEn ? 'kg refusal' : 'كجم راجع'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {activeBatch && ration ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          {/* Active Batch Name & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-900 text-white p-4 rounded-xl print:hidden">
            <div className="flex items-center gap-3">
              {isEditingBatch ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-amber-200">{isEn ? 'Name:' : 'الاسم:'}</span>
                    <input
                      type="text"
                      value={tempBatchName}
                      onChange={(e) => setTempBatchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditingBatch();
                        if (e.key === 'Escape') setIsEditingBatch(false);
                      }}
                      autoFocus
                      className="px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg text-sm border border-amber-400 focus:outline-none w-40"
                      placeholder={isEn ? 'Batch name...' : 'اسم اللفة...'}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-amber-200">{isEn ? 'Time:' : 'التوقيت:'}</span>
                    <input
                      type="text"
                      value={tempBatchTime}
                      onChange={(e) => setTempBatchTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditingBatch();
                        if (e.key === 'Escape') setIsEditingBatch(false);
                      }}
                      className="px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg text-sm border border-amber-400 focus:outline-none w-28"
                      placeholder={isEn ? 'e.g. 08:30 AM' : 'مثلاً 08:30 ص'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveEditingBatch}
                    className="p-2 bg-amber-400 hover:bg-amber-500 text-emerald-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title={isEn ? 'Save edits' : 'حفظ التعديلات'}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isEn ? 'Save' : 'حفظ'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingBatch(false)}
                    className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-xs"
                    title={isEn ? 'Cancel' : 'إلغاء'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black tracking-tight">{activeBatch.batchNumber}</h4>
                    <span className="text-xs text-amber-200 font-semibold bg-emerald-800/80 px-2 py-0.5 rounded-md border border-emerald-700">
                      ({activeBatch.time})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={startEditingBatch}
                    className="px-2.5 py-1 bg-emerald-800/80 hover:bg-emerald-700 text-amber-300 rounded-lg text-xs font-bold transition-all border border-emerald-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title={isEn ? 'Edit batch name and time' : 'تعديل اسم وتوقيت هذه اللفة'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Edit Name & Time' : 'تعديل الاسم والتوقيت'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-emerald-100 font-semibold flex items-center gap-2">
                <span>{isEn ? 'Status:' : 'الحالة:'}</span>
                <span className="bg-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-700 font-bold text-amber-300">
                  {activeBatch.status}
                </span>
              </div>
              <div className="print:hidden">
                <ExportExcelButton
                  onExport={() =>
                    exportSingleBatchOrderToExcel(
                      activeBatch,
                      dailyPlan,
                      categories,
                      rations,
                      mixers,
                      rawMaterials,
                      barns,
                      settings,
                      usePremixMode,
                      bagWeightKg,
                      actualWeights
                    )
                  }
                  label={isEn ? `Export (${activeBatch.batchNumber}) to Excel` : `تصدير أمر اللفة (${activeBatch.batchNumber}) إكسيل`}
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Active Batch Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold">
            <div>
              <span className="text-slate-500 block text-[11px]">{isEn ? 'Target Category:' : 'الفئة المستهدفة:'}</span>
              <span className="text-emerald-900 text-sm font-black">{category ? getCategoryDisplayName(category.name, isEn) : (isEn ? 'General' : 'عام')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{isEn ? 'Ration Formulation:' : 'تركيبة العليقة:'}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-900 text-sm">{getRationDisplayName(ration.name, isEn)}</span>
                <span className="text-[10px] font-black text-blue-900 bg-blue-100/90 px-1.5 py-0.2 rounded border border-blue-300">
                  {rationDmStats.dmPercent}% DM
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{isEn ? 'Mixer & Time:' : 'المكسر والوقت:'}</span>
              <span className="text-slate-900">{mixer ? getMixerDisplayName(mixer.name, isEn) : (isEn ? 'Mixer' : 'مكسر')} ({activeBatch.time})</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{isEn ? 'Mixer Feed Weight:' : 'وزن خامات المكسر المطلوب:'}</span>
              <span className="text-emerald-800 text-base font-black">
                {effectiveTargetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </span>
            </div>
            <div className={`${isRtl ? 'text-left' : 'text-right'} bg-blue-50/70 p-2 rounded-lg border border-blue-200`}>
              <span className="text-blue-900 block text-[10px] font-bold">{isEn ? 'Dry Matter in Batch:' : 'المادة الجافة المقررة للخلطة:'}</span>
              <span className="text-blue-950 text-base font-black">
                {batchDmKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-xs font-bold text-blue-700">{isEn ? 'kg DM' : 'كجم DM'}</span>
              </span>
            </div>
          </div>

          {/* Refusal Recycling Clarification & Quick Control Banner */}
          {activeBatchRefusalKg > 0.1 ? (
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-950 shadow-2xs">
              <div className="flex items-start md:items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-2xs">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-amber-950 text-sm flex items-center gap-2 flex-wrap">
                    <span>{isEn ? 'Milking Refusal Recycling in this Batch:' : 'توضيح تدوير راجع الحلاب في هذه اللفة:'}</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold text-slate-700 text-xs">
                      {isEn ? 'Gross Demand:' : 'إجمالي استهلاك القطيع:'} <strong className="text-slate-900">{activeBatchGrossKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</strong>
                    </span>
                    <span className="bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-400 font-bold text-amber-950 text-xs">
                      {isEn ? 'Deducted Refusal:' : 'راجع حلاب مخصوم:'} <strong>-{activeBatchRefusalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</strong>
                    </span>
                    <span className="bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 font-black text-emerald-950 text-xs">
                      {isEn ? 'Net Fresh Mixer Feed:' : 'صافي خامات المكسر المطلوب صرفها:'} <strong>{effectiveTargetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {isEn
                      ? `💡 Note: Gross requirement for herd is ${activeBatchGrossKg.toLocaleString()} kg. Recycled refusal of ${activeBatchRefusalKg.toLocaleString()} kg is deducted, leaving ${effectiveTargetWeightKg.toLocaleString()} kg fresh ingredients to be dispensed from warehouse.`
                      : `💡 سبب الفرق: إجمالي المقرر للرؤوس هو ${activeBatchGrossKg.toLocaleString('ar-EG')} كجم، وتم توفير ${activeBatchRefusalKg.toLocaleString('ar-EG')} كجم من راجع الحلاب المحول والمعاد تدويره للقطيع، ولذلك خامات المكسر المطلوب صرفها من المخزن هي ${effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم فقط (مطابق 100% لمجموع جدول الخامات أدناه).`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleRefusalDeduction(false)}
                  className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title={isEn ? 'Cancel refusal deduction and prepare 100% fresh feed' : 'إلغاء خصم راجع الحلاب وخلط كامل المقرر من الخامات الطازجة بالمكسر'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isEn ? `Mix full requirement (${activeBatchGrossKg.toLocaleString()} kg) fresh` : `خلط كامل الاحتياج (${activeBatchGrossKg.toLocaleString('ar-EG')} كجم) طازج`}</span>
                </button>
              </div>
            </div>
          ) : activeBatchGrossKg > effectiveTargetWeightKg + 1 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between text-slate-700">
              <span className="font-semibold">
                {isEn
                  ? `Currently mixing full herd requirement (${effectiveTargetWeightKg.toLocaleString()} kg) from fresh ingredients without refusal deduction.`
                  : `يتم حاليًا خلط كامل استهلاك القطيع (${effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم) من خامات المخزن الطازجة بدون خصم راجع الحلاب.`}
              </span>
              <button
                type="button"
                onClick={() => handleToggleRefusalDeduction(true)}
                className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-amber-700" />
                <span>{isEn ? 'Apply Refusal Deduction' : 'تطبيق خصم راجع الحلاب'}</span>
              </button>
            </div>
          ) : null}

          {/* Concentrate Pre-mix & Bagging Mode Banner */}
          {isMixerActive && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-slate-50 border border-amber-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-emerald-950 rounded-xl font-bold shrink-0 shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-slate-900 text-sm">
                      {isEn ? 'Concentrate Premix & Bagging Mode (Pre-Mix Bags):' : 'نمط المركز المسبق والشكاير (Pre-Mix Bags):'}
                    </h4>
                    {usePremixMode ? (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2 py-0.5 rounded-md">
                        {isEn ? `Active (Consolidated into ${bagWeightKg} kg bags)` : `مفعل (تجميع المركز في شكاير ${bagWeightKg} كجم)`}
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {isEn ? 'Standard (Individual ingredient weighing)' : 'تقليدي (وزن كل خامة مركزة منفصلة باللفة)'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {usePremixMode
                      ? isEn
                        ? 'The system bundles all dry concentrate ingredients into pre-packed bags for fast loading, while forages (silage, hay) remain for loader weighing.'
                        : 'يقوم السيستم بتجميع كل خامات العلف المركز الجاف في بند واحد جاهز بالشكاير لسرعة التحميل، مع بقاء المواد الخشنة (السيلاج والدريس) للودر.'
                      : isEn
                      ? 'Display each concentrate ingredient separately with individual target weights.'
                      : 'عرض خامات المركز الجافة مفككة ومحسوبة بالوزن الفردي لكل خامة.'}
                  </p>
                  {categoryStock && usePremixMode && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
                      <span className="text-slate-600">{isEn ? 'Available Bags in Inventory:' : 'رصيد الشكاير الجاهزة بالمخزن:'}</span>
                      <span className="text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                        {categoryStock.totalBagsInStock} {isEn ? 'bags' : 'شكارة'} ({categoryStock.totalKgInStock.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
                      </span>
                      {setActiveTab && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('concentrate_premix')}
                          className="text-amber-800 hover:text-amber-900 underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                        >
                          <span>{isEn ? 'Concentrate Premix View' : 'خلاطة المركز وتعبئة الشكاير'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => handleTogglePremixMode(!usePremixMode)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                    usePremixMode
                      ? 'bg-amber-500 hover:bg-amber-400 text-emerald-950 border-amber-600'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{usePremixMode ? (isEn ? 'Switch to Standard Ingredients' : 'التحويل للنمط التقليدي (خامات منفصلة)') : (isEn ? 'Activate Premix Bags Mode' : 'تفعيل نمط الشكاير والمركز المسبق')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Target Barns Assigned to this Mixer Batch */}
          {activeBatch.allocations && activeBatch.allocations.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-slate-800 border-b border-slate-200 pb-2">
                <span className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-sm">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <span>{isEn ? `Target Barns for this Batch (${activeBatch.allocations.length} barns):` : `العنابر المخصصة لتفريغ هذه اللفة (${activeBatch.allocations.length} عنابر):`}</span>
                </span>
                <span className="text-slate-600 font-bold">
                  {isEn ? 'Total Heads Benefiting:' : 'إجمالي الرؤوس المستفيدة:'} {activeBatch.allocations.reduce((sum, a) => {
                    const b = barns.find((bn) => bn.id === a.barnId);
                    return sum + (b?.headCount || 0);
                  }, 0)} {isEn ? 'heads' : 'رأس'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {activeBatch.allocations.map((alloc, aIdx) => {
                  const barn = barns.find((b) => b.id === alloc.barnId);
                  const allocKg = getDerivedAllocationKg(alloc, barn, categories, rations, dailyPlan);
                  const headShareKg = barn?.headCount ? Math.round((allocKg / barn.headCount) * 10) / 10 : 0;
                  return (
                    <div key={aIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-sm">
                          {getBarnNumberDisplayName(barn?.number, isEn)}{barn?.name ? ` (${getBarnNameDisplayName(barn.name, isEn)})` : ''}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">{barn?.headCount} {isEn ? 'hd' : 'رأس'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold">{isEn ? 'Assigned Weight:' : 'الوزن المخصص:'}</span>
                        <strong className="text-emerald-900 font-black text-sm">{allocKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1">
                        <span>{isEn ? 'Share of Batch:' : 'النسبة من اللفة:'} {alloc.allocatedPercent}%</span>
                        <span>{isEn ? 'Per Head:' : 'نصيب الرأس:'} {headShareKg} {isEn ? 'kg' : 'كجم'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mixer Loading & Mixing Sequence Instructions */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 font-black rounded text-[11px]">
                {isEn ? 'Mixer Loading Sequence:' : 'ترتيب إضافة الخامات بالمكسر:'}
              </span>
              <span className="font-semibold text-slate-800">
                {isEn
                  ? '(1) Silage & wet feeds first for chopping ➔ (2) Hay & Straw ➔ (3) Premix bags & minerals ➔ (4) Liquids if any.'
                  : '(1) السيلاج والمواد الرطبة أولاً للفرم ➔ (2) الدريس والتبن ➔ (3) شكاير المركز والأملاح ➔ (4) السوائل إن وجدت.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-950 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>{isEn ? 'Suggested mixing duration: 10 - 15 min after loading' : 'زمن الخلط المقترح: 10 - 15 دقيقة بعد اكتمال التحميل'}</span>
            </div>
          </div>

          {/* Preparation Ingredient Table */}
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm border border-slate-200 rounded-xl overflow-hidden`}>
              <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 border-l border-slate-200">#</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">{isEn ? 'Code' : 'كود الخامة'}</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">{isEn ? 'Feed Material Name' : 'اسم الخامة العلفية'}</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">{isEn ? 'Ration Ratio (kg/hd)' : 'نسبة الخامة بالعليقة (كجم/رأس)'}</th>
                  <th className="py-3.5 px-4 border-l border-slate-200 text-blue-900 bg-blue-50/70 text-center">{isEn ? 'Dry Matter % (DM)' : 'المادة الجافة % (DM)'}</th>
                  <th className="py-3.5 px-4 border-l border-slate-200 text-blue-900 bg-blue-50/70 text-center">{isEn ? 'Amount (kg DM)' : 'الكمية (كجم DM)'}</th>
                  <th className="py-3.5 px-4 border-l border-slate-200 text-emerald-950 bg-emerald-50">
                    {isEn ? 'Target Batch Weight (kg)' : 'الكمية المطلوبة للفة (كجم)'}
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200 print:table-cell">
                    {isEn ? 'Actual Loaded Weight (kg)' : 'الكمية الفعلية المحملة (كجم)'}
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200">{isEn ? 'Difference (kg)' : 'الفرق (كجم)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {calculatedIngredients.map((item, index) => {
                  if (item.isPremixConcentrate) {
                    return (
                      <React.Fragment key="premix-concentrate-block">
                        <tr className="bg-amber-50/70 hover:bg-amber-50 transition-colors border-2 border-amber-300">
                          <td className="py-3.5 px-4 text-center font-black text-amber-900 border-l border-amber-200">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-black text-amber-800 border-l border-amber-200">
                            CONC-BAGS
                          </td>
                          <td className="py-3.5 px-4 border-l border-amber-200">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm">
                                  {item.name}
                                </span>
                                <span className="bg-amber-200/90 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400">
                                  {isEn ? 'Pre-Mixed & Bagged 📦' : 'مسبق الخلط والتعبئة 📦'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-extrabold text-amber-950 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                                  {isEn ? 'Load:' : 'سحب:'} <strong>{item.bagsCount} {isEn ? 'bags' : 'شكارة'}</strong> ({isEn ? `wt ${item.bagWeightKg} kg` : `زنة ${item.bagWeightKg} كجم`})
                                  {item.looseKg ? ` + ${item.looseKg} ${isEn ? 'kg loose' : 'كجم كسر'}` : ''}
                                </span>
                                {item.subIngredients && item.subIngredients.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowSubIngredients(!showSubIngredients)}
                                    className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer inline-flex items-center gap-1 print:hidden"
                                  >
                                    <span>
                                      {showSubIngredients
                                        ? isEn ? 'Hide Premix Details' : 'إخفاء تفاصيل خامات المركز'
                                        : isEn
                                        ? `Show Premix Ingredients (${item.subIngredients.length})`
                                        : `عرض خامات المركز (${item.subIngredients.length} خامات)`}
                                    </span>
                                    {showSubIngredients ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-600 border-l border-amber-200">
                            {item.amountKgPerHead} {isEn ? 'kg/hd' : 'كجم/رأس'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-blue-900 border-l border-amber-200 bg-blue-50/40">
                            90%
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-blue-950 border-l border-amber-200 bg-blue-50/40">
                            {Math.round(item.requiredKg * 0.9 * 10) / 10} {isEn ? 'kg DM' : 'كجم DM'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-amber-950 bg-amber-100/70 border-l border-amber-200 text-base">
                            <div className="font-black text-base">
                              {item.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                            </div>
                            <div className="text-xs text-amber-800 font-bold">
                              ({item.bagsCount} {isEn ? 'bags' : 'شكارة'} {item.bagWeightKg} {isEn ? 'kg' : 'كجم'})
                            </div>
                          </td>
                          <td className="py-3.5 px-4 border-l border-amber-200">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={actualWeights['PREMIX_CONCENTRATE'] ?? item.requiredKg}
                                onChange={(e) =>
                                  handleActualChange(
                                    'PREMIX_CONCENTRATE',
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                className="w-28 px-3 py-1 bg-white border border-amber-400 rounded-lg font-black text-slate-900 text-center text-sm print:border-none print:bg-transparent print:w-auto"
                              />
                              <span className="text-xs font-bold text-slate-600 print:hidden">{isEn ? 'kg' : 'كجم'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 border-l border-amber-200 font-bold text-xs">
                            {item.diffKg === 0 ? (
                              <span className="text-emerald-700">{isEn ? 'Match (0)' : 'مطابق (0)'}</span>
                            ) : (item.diffKg || 0) > 0 ? (
                              <span className="text-rose-600">{isEn ? `+${item.diffKg} kg excess` : `زيادة +${item.diffKg} كجم`}</span>
                            ) : (
                              <span className="text-amber-600">{isEn ? `${item.diffKg} kg deficit` : `نقص ${item.diffKg} كجم`}</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Sub-ingredients Breakdown */}
                        {item.subIngredients && item.subIngredients.length > 0 && (
                          <tr className={`${showSubIngredients ? '' : 'hidden print:table-row'} bg-slate-50/90 border-b-2 border-amber-200`}>
                            <td colSpan={9} className="p-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                                  <span>
                                    {isEn
                                      ? `Premix Ingredients Breakdown (${item.requiredKg.toLocaleString()} kg concentrate):`
                                      : `تفاصيل الخامات المركزة المكونة لهذه الشكاير (${item.requiredKg.toLocaleString('ar-EG')} كجم مركز):`}
                                  </span>
                                  <span className="text-slate-500 font-medium text-[11px]">
                                    {isEn ? 'Premix ingredients pre-weighed and bagged' : 'مكونات الشكارة موزونة ومخلوطة'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:grid-cols-4">
                                  {item.subIngredients.map((sub, sIdx) => (
                                    <div key={sIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                                      <div className="font-black text-slate-900 truncate">{getMaterialDisplayName(sub.name, isEn)}</div>
                                      <div className="text-slate-500 text-[11px]">
                                        {isEn ? 'Ratio:' : 'النسبة:'} <strong>{sub.sharePercent}%</strong>
                                      </div>
                                      <div className="text-emerald-800 font-black text-[11px]">
                                        {isEn ? 'Batch Weight:' : 'الوزن باللفة:'} {sub.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }

                  // Normal roughage items (silage, hay, straw...)
                  return (
                    <tr key={`${activeBatch?.id || 'batch'}-${item.rawMaterialId || 'rm'}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 border-l border-slate-200">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600 border-l border-slate-200">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 border-l border-slate-200">
                        {getMaterialDisplayName(item.name, isEn)}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-600 border-l border-slate-200">
                        {item.amountKgPerHead} {isEn ? 'kg/hd' : 'كجم/رأس'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-900 border-l border-slate-200 bg-blue-50/20">
                        {getRawMaterialDryMatterPercent(rawMaterials.find((rm) => rm.id === item.rawMaterialId))}%
                      </td>
                      <td className="py-3 px-4 text-center font-black text-blue-950 border-l border-slate-200 bg-blue-50/20">
                        {(Math.round(item.requiredKg * (getRawMaterialDryMatterPercent(rawMaterials.find((rm) => rm.id === item.rawMaterialId)) / 100) * 10) / 10).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg DM' : 'كجم DM'}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-900 bg-emerald-50/60 border-l border-slate-200 text-base">
                        {item.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn && item.unit === 'كجم' ? 'kg' : item.unit}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={actualWeights[item.rawMaterialId] ?? item.requiredKg}
                            onChange={(e) =>
                              handleActualChange(item.rawMaterialId, e.target.value === '' ? 0 : parseFloat(e.target.value))
                            }
                            className="w-28 px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm print:border-none print:bg-transparent print:w-auto"
                          />
                          <span className="text-xs font-bold text-slate-500 print:hidden">
                            {isEn && item.unit === 'كجم' ? 'kg' : item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200 font-bold text-xs">
                        {item.diffKg === 0 ? (
                          <span className="text-emerald-600">{isEn ? 'Match (0)' : 'مطابق (0)'}</span>
                        ) : (item.diffKg || 0) > 0 ? (
                          <span className="text-rose-600">{isEn ? `+${item.diffKg} kg excess` : `زيادة +${item.diffKg} كجم`}</span>
                        ) : (
                          <span className="text-amber-600">{isEn ? `${item.diffKg} kg deficit` : `نقص ${item.diffKg} كجم`}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className={`py-4 px-4 ${isRtl ? 'text-left' : 'text-right'} border-l border-slate-200`}>
                    {isEn ? 'Total Mixer Batch Weight:' : 'إجمالي وزن خلطة المكسر:'}
                  </td>
                  <td className="py-4 px-4 text-center font-black text-blue-900 bg-blue-100/60 border-l border-slate-200">
                    {rationDmStats.dmPercent}% DM
                  </td>
                  <td className="py-4 px-4 text-center font-black text-blue-950 bg-blue-100/60 border-l border-slate-200">
                    {batchDmKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg DM' : 'كجم DM'}
                  </td>
                  <td className="py-4 px-4 text-emerald-900 font-black text-lg bg-emerald-100/80 border-l border-slate-200">
                    {totalRequiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </td>
                  <td className="py-4 px-4 text-slate-900 font-black text-lg border-l border-slate-200">
                    {totalActualKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </td>
                  <td className="py-4 px-4 text-xs font-bold">
                    {Math.abs(totalDiffKg) <= 0.01 ? (
                      <span className="text-emerald-700">{isEn ? '✓ Fully Matched' : '✓ مطابق بالكامل'}</span>
                    ) : (
                      <span className={totalDiffKg > 0 ? 'text-rose-700' : 'text-amber-700'}>
                        {isEn ? `Total Diff: ${totalDiffKg} kg` : `الفرق الإجمالي: ${totalDiffKg} كجم`}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Formal Print Signatures */}
          <PrintSignatures
            settings={settings}
            signatures={[
              {
                title: isEn ? 'Warehouse Material Dispenser' : 'مسؤول صرف خامات المخزن',
                name: settings?.warehouseManagerName || (isEn ? 'Warehouse Manager' : 'أمين المستودع'),
              },
              {
                title: isEn ? 'Mixer Wagon Driver / Operator' : 'سائق ومسؤول خلط المكسر',
                name: settings?.driverName || (isEn ? 'TMR Driver' : 'سائق المكسر'),
              },
              {
                title: isEn ? 'Nutrition Engineer Approval' : 'اعتماد مهندس التغذية',
                name: settings?.engineerName || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية'),
              },
            ]}
          />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400">
          {isEn
            ? 'This mixer has no specific ration or there are no batches allocated.'
            : 'لا يملك هذا المكسر عليقة محددة أو لا توجد لفات مخصصة.'}
        </div>
      )}
    </div>
  );
};
