import React, { useState, useEffect, useMemo } from 'react';
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
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  doesBatchBelongToCategory,
  ConsolidatedBatchIngredientItem,
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
}) => {
  const { showToast } = useFeedback();
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
  const ration = rations.find((r) => r.id === category?.rationId);
  const mixer = mixers.find((m) => m.id === activeBatch?.mixerId);
  const effectiveTargetWeightKg = activeBatch
    ? getBatchDerivedTargetWeightKg(activeBatch, barns, categories, rations, dailyPlan)
    : 0;

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
    setTempBatchTime(activeBatch.time || '08:00 ص');
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
            status: 'تم التحضير' as const,
            actualIngredientWeights: actualWeights,
          }
        : b
    );
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    showToast(`تم اعتماد وتحضير اللفة (${activeBatch.batchNumber}) بنجاح وتحويل حالتها إلى (تم التحضير)!`, 'success');
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
    <div className="space-y-6">
      {/* Printable Formal Header */}
      <PrintHeader
        documentTitle="أمر تحضير وتحميل المكسر (المركب) TMR"
        documentSubtitle="نموذج صرف الخامات من المخزن إلى المكسر حسب النسبة المئوية للعليقة"
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
              أمر تحضير خامات المكسر اليومي
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              حساب نسبي دقيق لكميات الخامات لكل لفة مكسر بناءً على وزن اللفة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApproveAndPrepare}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>اعتماد وتحضير اللفة</span>
            </button>
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة أمر التحضير</span>
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
              label="تصدير الأوامر للإكسيل"
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Batch Picker Grouped by Category/Department */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">اختر أمر التحضير (اللفات مجمعة حسب الأقسام):</label>
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
                        <span>قسم {cat.name}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ({catBatches.length} لفات)
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
                              {displayWeight.toLocaleString('ar-EG')} كجم
                            </span>
                            {bRefusalKg > 0.1 && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  isSelected
                                    ? 'bg-amber-400 text-emerald-950'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                                title={`مخصوم ${bRefusalKg.toLocaleString('ar-EG')} كجم راجع حلاب معاد تدويره`}
                              >
                                - {bRefusalKg} كجم راجع
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
                    <span className="text-xs font-bold text-amber-200">الاسم:</span>
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
                      placeholder="اسم اللفة..."
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-amber-200">التوقيت:</span>
                    <input
                      type="text"
                      value={tempBatchTime}
                      onChange={(e) => setTempBatchTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditingBatch();
                        if (e.key === 'Escape') setIsEditingBatch(false);
                      }}
                      className="px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg text-sm border border-amber-400 focus:outline-none w-28"
                      placeholder="مثلاً 08:30 ص"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveEditingBatch}
                    className="p-2 bg-amber-400 hover:bg-amber-500 text-emerald-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="حفظ التعديلات"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingBatch(false)}
                    className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer text-xs"
                    title="إلغاء"
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
                    title="تعديل اسم وتوقيت هذه اللفة"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل الاسم والتوقيت</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-emerald-100 font-semibold flex items-center gap-2">
                <span>الحالة:</span>
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
                  label={`تصدير أمر اللفة (${activeBatch.batchNumber}) إكسيل`}
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Active Batch Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold">
            <div>
              <span className="text-slate-500 block text-[11px]">الفئة المستهدفة:</span>
              <span className="text-emerald-900 text-sm font-black">{category?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">تركيبة العليقة:</span>
              <span className="text-slate-900 text-sm">{ration.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">المكسر والوقت:</span>
              <span className="text-slate-900">{mixer?.name} ({activeBatch.time})</span>
            </div>
            <div className="text-left">
              <span className="text-slate-500 block text-[11px]">وزن خامات المكسر المطلوب:</span>
              <span className="text-emerald-800 text-base font-black">
                {effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم
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
                    <span>توضيح تدوير راجع الحلاب في هذه اللفة:</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold text-slate-700 text-xs">
                      إجمالي استهلاك القطيع: <strong className="text-slate-900">{activeBatchGrossKg.toLocaleString('ar-EG')} كجم</strong>
                    </span>
                    <span className="bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-400 font-bold text-amber-950 text-xs">
                      راجع حلاب مخصوم: <strong>-{activeBatchRefusalKg.toLocaleString('ar-EG')} كجم</strong>
                    </span>
                    <span className="bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 font-black text-emerald-950 text-xs">
                      صافي خامات المكسر المطلوب صرفها: <strong>{effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم</strong>
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    💡 سبب الفرق: إجمالي المقرر للرؤوس هو <strong>{activeBatchGrossKg.toLocaleString('ar-EG')} كجم</strong>، وتم توفير <strong>{activeBatchRefusalKg.toLocaleString('ar-EG')} كجم</strong> من راجع الحلاب المحول والمعاد تدويره للقطيع، ولذلك خامات المكسر المطلوب صرفها من المخزن هي <strong>{effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم</strong> فقط (مطابق 100% لمجموع جدول الخامات أدناه).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleRefusalDeduction(false)}
                  className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="إلغاء خصم راجع الحلاب وخلط كامل المقرر من الخامات الطازجة بالمكسر"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>خلط كامل الاحتياج ({activeBatchGrossKg.toLocaleString('ar-EG')} كجم) طازج</span>
                </button>
              </div>
            </div>
          ) : activeBatchGrossKg > effectiveTargetWeightKg + 1 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between text-slate-700">
              <span className="font-semibold">
                يتم حاليًا خلط كامل استهلاك القطيع ({effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم) من خامات المخزن الطازجة بدون خصم راجع الحلاب.
              </span>
              <button
                type="button"
                onClick={() => handleToggleRefusalDeduction(true)}
                className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-amber-700" />
                <span>تطبيق خصم راجع الحلاب</span>
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
                      نمط المركز المسبق والشكاير (Pre-Mix Bags):
                    </h4>
                    {usePremixMode ? (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2 py-0.5 rounded-md">
                        مفعل (تجميع المركز في شكاير {bagWeightKg} كجم)
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        تقليدي (وزن كل خامة مركزة منفصلة باللفة)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {usePremixMode
                      ? `يقوم السيستم بتجميع كل خامات العلف المركز الجاف في بند واحد جاهز بالشكاير لسرعة التحميل، مع بقاء المواد الخشنة (السيلاج والدريس) للودر.`
                      : `عرض خامات المركز الجافة مفككة ومحسوبة بالوزن الفردي لكل خامة.`}
                  </p>
                  {categoryStock && usePremixMode && (
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
                      <span className="text-slate-600">رصيد الشكاير الجاهزة بالمخزن:</span>
                      <span className="text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                        {categoryStock.totalBagsInStock} شكارة ({categoryStock.totalKgInStock.toLocaleString()} كجم)
                      </span>
                      {setActiveTab && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('concentrate_premix')}
                          className="text-amber-800 hover:text-amber-900 underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                        >
                          <span>خلاطة المركز وتعبئة الشكاير</span>
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
                  <span>{usePremixMode ? 'التحويل للنمط التقليدي (خامات منفصلة)' : 'تفعيل نمط الشكاير والمركز المسبق'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Preparation Ingredient Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 border-l border-slate-200">م</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">كود الخامة</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">اسم الخامة العلفية</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">نسبة الخامة بالعليقة (كجم/رأس)</th>
                  <th className="py-3.5 px-4 border-l border-slate-200 text-emerald-950 bg-emerald-50">
                    الكمية المطلوبة للفة (كجم)
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200 print:table-cell">
                    الكمية الفعلية المحملة (كجم)
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200">الفرق (كجم)</th>
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
                                  مسبق الخلط والتعبئة 📦
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-extrabold text-amber-950 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                                  سحب: <strong>{item.bagsCount} شكارة</strong> (زنة {item.bagWeightKg} كجم)
                                  {item.looseKg ? ` + ${item.looseKg} كجم كسر` : ''}
                                </span>
                                {item.subIngredients && item.subIngredients.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowSubIngredients(!showSubIngredients)}
                                    className="text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer inline-flex items-center gap-1 print:hidden"
                                  >
                                    <span>
                                      {showSubIngredients ? 'إخفاء تفاصيل خامات المركز' : `عرض خامات المركز (${item.subIngredients.length} خامات)`}
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
                            {item.amountKgPerHead} كجم/رأس
                          </td>
                          <td className="py-3.5 px-4 font-black text-amber-950 bg-amber-100/70 border-l border-amber-200 text-base">
                            <div className="font-black text-base">
                              {item.requiredKg.toLocaleString('ar-EG')} كجم
                            </div>
                            <div className="text-xs text-amber-800 font-bold">
                              ({item.bagsCount} شكارة {item.bagWeightKg} كجم)
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
                              <span className="text-xs font-bold text-slate-600 print:hidden">كجم</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 border-l border-amber-200 font-bold text-xs">
                            {item.diffKg === 0 ? (
                              <span className="text-emerald-700">مطابق (0)</span>
                            ) : (item.diffKg || 0) > 0 ? (
                              <span className="text-rose-600">زيادة +{item.diffKg} كجم</span>
                            ) : (
                              <span className="text-amber-600">نقص {item.diffKg} كجم</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Sub-ingredients Breakdown */}
                        {showSubIngredients && item.subIngredients && (
                          <tr className="bg-slate-50/90 border-b-2 border-amber-200 print:hidden">
                            <td colSpan={7} className="p-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="text-xs font-black text-slate-700 flex items-center justify-between">
                                  <span>تفاصيل الخامات المركزة المكونة لهذه الشكاير ({item.requiredKg.toLocaleString()} كجم مركز):</span>
                                  <span className="text-slate-500 font-medium">تم خلطها مسبقاً وتعبئتها في الشكاير</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {item.subIngredients.map((sub, sIdx) => (
                                    <div key={sIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                                      <div className="font-black text-slate-900 truncate">{sub.name}</div>
                                      <div className="text-slate-500 text-[11px]">
                                        النسبة: <strong>{sub.sharePercent}%</strong>
                                      </div>
                                      <div className="text-emerald-800 font-black text-[11px]">
                                        الوزن باللفة: {sub.requiredKg.toLocaleString()} كجم
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
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-600 border-l border-slate-200">
                        {item.amountKgPerHead} كجم/رأس
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-900 bg-emerald-50/60 border-l border-slate-200 text-base">
                        {item.requiredKg.toLocaleString('ar-EG')} {item.unit}
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
                          <span className="text-xs font-bold text-slate-500 print:hidden">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200 font-bold text-xs">
                        {item.diffKg === 0 ? (
                          <span className="text-emerald-600">مطابق (0)</span>
                        ) : (item.diffKg || 0) > 0 ? (
                          <span className="text-rose-600">زيادة +{item.diffKg} كجم</span>
                        ) : (
                          <span className="text-amber-600">نقص {item.diffKg} كجم</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-left border-l border-slate-200">
                    إجمالي وزن خلطة المكسر:
                  </td>
                  <td className="py-4 px-4 text-emerald-900 font-black text-lg bg-emerald-100/80 border-l border-slate-200">
                    {totalRequiredKg.toLocaleString('ar-EG')} كجم
                  </td>
                  <td className="py-4 px-4 text-slate-900 font-black text-lg border-l border-slate-200">
                    {totalActualKg.toLocaleString('ar-EG')} كجم
                  </td>
                  <td className="py-4 px-4 text-xs font-bold">
                    {Math.abs(totalDiffKg) <= 0.01 ? (
                      <span className="text-emerald-700">✓ مطابق بالكامل</span>
                    ) : (
                      <span className={totalDiffKg > 0 ? 'text-rose-700' : 'text-amber-700'}>
                        الفرق الإجمالي: {totalDiffKg} كجم
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Formal Print Signatures */}
          <PrintSignatures settings={settings} />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400">
          لا يملك هذا المكسر عليقة محددة أو لا توجد لفات مخصصة.
        </div>
      )}
    </div>
  );
};
