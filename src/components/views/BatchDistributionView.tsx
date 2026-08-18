import React, { useState, useEffect } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  MixBatch,
  BarnAllocation,
  Ration,
  DailyBarnState,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateRationTotalKgPerHead,
  getBarnRation,
  getBarnDailyState,
} from '../../utils/calculations';
import {
  Layers,
  Home,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Divide,
  Bot as MixerIcon,
  Trash2,
} from 'lucide-react';

interface BatchDistributionViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  mixers: Mixer[];
  rations: Ration[];
}

export const BatchDistributionView: React.FC<BatchDistributionViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  setBarns,
  mixers,
  rations,
}) => {
  const [viewMode, setViewMode] = useState<'by_barn' | 'by_batch'>('by_barn');

  // Selected filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );

  const activeCategoryBarns = barns.filter(
    (b) => b.categoryId === selectedCategoryId && b.status === 'نشط'
  );

  const [selectedBarnId, setSelectedBarnId] = useState<string>(
    activeCategoryBarns[0]?.id || ''
  );

  // Modal for delete confirmation
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string } | null>(null);

  // When category changes, default to first barn in category
  useEffect(() => {
    const firstBarn = barns.find(
      (b) => b.categoryId === selectedCategoryId && b.status === 'نشط'
    );
    if (firstBarn) {
      setSelectedBarnId(firstBarn.id);
    }
  }, [selectedCategoryId, barns]);

  const batches = dailyPlan.batches || [];
  const categoryBatches = batches.filter((b) => b.categoryId === selectedCategoryId);

  const activeBarn = barns.find((b) => b.id === selectedBarnId);
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeMixer = mixers.find((m) => m.id === activeCategory?.mixerId);
  const activeRation = activeBarn ? getBarnRation(activeBarn, categories, rations, dailyPlan) : undefined;
  const rationKgPerHead = calculateRationTotalKgPerHead(activeRation);
  const barnDailyDemandKg = activeBarn
    ? calculateBarnDailyDemand(activeBarn, categories, rations, dailyPlan)
    : 0;

  // Single Source of Truth for allocations: allocationsPercentMap
  // Format: [batchId]: { [barnId]: allocatedPercent (0-100) }
  const [allocationsPercentMap, setAllocationsPercentMap] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    batches.forEach((b) => {
      map[b.id] = {};
      if (b.allocations) {
        b.allocations.forEach((a) => {
          if (a.allocatedPercent !== undefined) {
            map[b.id][a.barnId] = Number(a.allocatedPercent) || 0;
          } else {
            const barnObj = barns.find((bn) => bn.id === a.barnId);
            const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
            map[b.id][a.barnId] = demand > 0 ? (Number(a.allocatedKg) / demand) * 100 : 0;
          }
        });
      }
    });
    return map;
  });

  // Keep allocationsPercentMap synchronized when dailyPlan.batches or date changes
  useEffect(() => {
    const map: Record<string, Record<string, number>> = {};
    (dailyPlan.batches || []).forEach((b) => {
      map[b.id] = {};
      if (b.allocations) {
        b.allocations.forEach((a) => {
          if (a.allocatedPercent !== undefined) {
            map[b.id][a.barnId] = Number(a.allocatedPercent) || 0;
          } else {
            const barnObj = barns.find((bn) => bn.id === a.barnId);
            const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
            map[b.id][a.barnId] = demand > 0 ? (Number(a.allocatedKg) / demand) * 100 : 0;
          }
        });
      }
    });
    setAllocationsPercentMap(map);
  }, [dailyPlan.batches, dailyPlan.date]);

  // Derived helper functions
  const getBarnAllocatedPercent = (batchId: string, barnId: string): number => {
    return allocationsPercentMap[batchId]?.[barnId] || 0;
  };

  const getBarnAllocatedKg = (batchId: string, barn: Barn): number => {
    const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const percent = getBarnAllocatedPercent(batchId, barn.id);
    return Math.round(((demand * percent) / 100) * 1000) / 1000;
  };

  const getBatchTotalWeightKg = (batchId: string): number => {
    return activeCategoryBarns.reduce((sum, b) => {
      return sum + getBarnAllocatedKg(batchId, b);
    }, 0);
  };

  // Handle Percentage Input change for a specific batch & barn
  const handlePercentChange = (batchId: string, barnId: string, percent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
    setAllocationsPercentMap((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [barnId]: clampedPercent,
      },
    }));
  };

  // Handle Weight Input change for a specific batch & barn (converts kg to percent)
  const handleKgChange = (batchId: string, barnId: string, kg: number) => {
    const barnObj = barns.find((b) => b.id === barnId);
    const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
    const safeKg = Math.max(0, isNaN(kg) ? 0 : kg);
    const calcPercent = demand > 0 ? (safeKg / demand) * 100 : 0;
    const clampedPercent = Math.max(0, Math.min(100, Math.round(calcPercent * 1000) / 1000));

    setAllocationsPercentMap((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [barnId]: clampedPercent,
      },
    }));
  };

  // Divide remaining percentage equally among batches for this barn
  const handleDistributeRemainingEqually = () => {
    if (!activeBarn || categoryBatches.length === 0) return;

    let currentAllocatedPercent = 0;
    categoryBatches.forEach((b) => {
      currentAllocatedPercent += allocationsPercentMap[b.id]?.[activeBarn.id] || 0;
    });

    const remainingPercent = Math.max(0, 100 - currentAllocatedPercent);
    if (remainingPercent <= 0.001) {
      alert('استحقاق هذا العنبر موزع بالكامل بالفعل (100%)!');
      return;
    }

    const emptyBatches = categoryBatches.filter(
      (b) => !(allocationsPercentMap[b.id]?.[activeBarn.id] > 0)
    );

    const targetBatches = emptyBatches.length > 0 ? emptyBatches : categoryBatches;
    const percentPerBatch = Math.round((remainingPercent / targetBatches.length) * 1000) / 1000;

    setAllocationsPercentMap((prev) => {
      const next = { ...prev };
      targetBatches.forEach((b, idx) => {
        const isLast = idx === targetBatches.length - 1;
        const valToAdd = isLast
          ? Math.round((remainingPercent - percentPerBatch * (targetBatches.length - 1)) * 1000) / 1000
          : percentPerBatch;
        const currentVal = next[b.id]?.[activeBarn.id] || 0;
        next[b.id] = {
          ...(next[b.id] || {}),
          [activeBarn.id]: Math.round((currentVal + valToAdd) * 1000) / 1000,
        };
      });
      return next;
    });
  };

  // Quick Add Batch
  const handleAddNewBatch = () => {
    const newBatchNum = batches.length + 1;
    const newBatch: MixBatch = {
      id: `batch-${Date.now()}`,
      batchNumber: `لفة ${newBatchNum}`,
      categoryId: selectedCategoryId,
      mixerId: activeCategory?.mixerId || mixers[0]?.id || '',
      time: '08:00 ص',
      targetWeightKg: 3000,
      status: 'مخططة',
      allocations: [],
    };

    const updatedBatches = [...batches, newBatch];
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
  };

  // Delete Batch
  const handleDeleteBatch = (batchId: string, batchNumber: string) => {
    setBatchToDelete({ id: batchId, name: batchNumber });
  };

  const confirmDeleteBatch = () => {
    if (!batchToDelete) return;
    const batchId = batchToDelete.id;
    const updatedBatches = (dailyPlan.batches || []).filter((b) => b.id !== batchId);
    setAllocationsPercentMap((prev) => {
      const next = { ...prev };
      delete next[batchId];
      return next;
    });
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setBatchToDelete(null);
  };

  // Direct Barn Editing Handler (Head Count, Feeding Ratio %, Name, Number)
  const handleBarnChange = (barnId: string, updates: Partial<Barn>) => {
    if (setBarns) {
      const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, ...updates } : b));
      setBarns(updatedBarns);
    }
    const barn = barns.find((b) => b.id === barnId);
    if (barn) {
      const currentDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
        barnId,
        headCount: barn.headCount,
        feedingRatioPercent: barn.feedingRatioPercent || 100,
        rationId: barn.rationId,
      };
      setDailyPlan({
        ...dailyPlan,
        dailyBarnStates: {
          ...(dailyPlan.dailyBarnStates || {}),
          [barnId]: {
            ...currentDailyBarnState,
            headCount: updates.headCount !== undefined ? updates.headCount : currentDailyBarnState.headCount,
            feedingRatioPercent:
              updates.feedingRatioPercent !== undefined
                ? updates.feedingRatioPercent
                : currentDailyBarnState.feedingRatioPercent,
            rationId: updates.rationId !== undefined ? updates.rationId : currentDailyBarnState.rationId,
            displayName: updates.name !== undefined ? updates.name : currentDailyBarnState.displayName,
            displayNumber: updates.number !== undefined ? updates.number : currentDailyBarnState.displayNumber,
          },
        },
      });
    }
  };

  // Save changes to dailyPlan
  const handleSaveAllDistributions = () => {
    const updatedBatches = batches.map((b) => {
      const bPercentMap = allocationsPercentMap[b.id] || {};
      const newAllocationsList: BarnAllocation[] = Object.entries(bPercentMap)
        .filter(([_, percent]) => Number(percent) > 0)
        .map(([barnId, allocatedPercent]) => {
          const barnObj = barns.find((bn) => bn.id === barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
          const allocatedKg = Math.round(((demand * Number(allocatedPercent)) / 100) * 1000) / 1000;
          return {
            barnId,
            allocatedKg,
            allocatedPercent: Math.round(Number(allocatedPercent) * 1000) / 1000,
          };
        });

      // Automatically recalculate target weight from sum of allocations
      const totalBatchWeight = newAllocationsList.reduce((s, a) => s + a.allocatedKg, 0);

      return {
        ...b,
        allocations: newAllocationsList,
        targetWeightKg: totalBatchWeight > 0 ? totalBatchWeight : b.targetWeightKg,
      };
    });

    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    alert('تم حفظ كافة توزيعات العنابر واللفات اليومية بنجاح!');
  };

  // Calculations for current selected Barn
  let currentBarnAllocatedPercentSum = 0;
  categoryBatches.forEach((b) => {
    currentBarnAllocatedPercentSum += allocationsPercentMap[b.id]?.[selectedBarnId] || 0;
  });
  currentBarnAllocatedPercentSum = Math.round(currentBarnAllocatedPercentSum * 1000) / 1000;

  const currentBarnAllocatedKgSum =
    Math.round(((barnDailyDemandKg * currentBarnAllocatedPercentSum) / 100) * 1000) / 1000;
  const currentBarnDiffKg = Math.round((currentBarnAllocatedKgSum - barnDailyDemandKg) * 1000) / 1000;
  const currentBarnDiffPercent = Math.round((currentBarnAllocatedPercentSum - 100) * 10) / 10;

  const activeBarnState = activeBarn ? getBarnDailyState(activeBarn, dailyPlan) : undefined;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-700" />
              الشاشة المحورية: توزيع استحقاق العنابر على لفات المكسر
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              ربط استحقاق كل عنبر (كجم) بلفات المكسر عبر النسب المئوية % مع التحديث التلقائي اللحظي عند تغير الخطة اليومية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAllDistributions}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>حفظ جميع التوزيعات</span>
            </button>
          </div>
        </div>

        {/* View Mode & Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختر الفئة الحيوانية:</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barn Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختر العنبر للتوزيع:</label>
            <select
              value={selectedBarnId}
              onChange={(e) => setSelectedBarnId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
            >
              {activeCategoryBarns.length === 0 ? (
                <option value="">لا توجد عنابر في هذه الفئة</option>
              ) : (
                activeCategoryBarns.map((b) => {
                  const bState = getBarnDailyState(b, dailyPlan);
                  return (
                    <option key={b.id} value={b.id}>
                      {bState.displayNumber || b.number} {bState.displayName ? `(${bState.displayName})` : ''} - {bState.headCount} رأس
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نمط العرض والتوزيع:</label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('by_barn')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'by_barn'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏠 التوزيع حسب العنبر
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_batch')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'by_batch'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🚜 التوزيع حسب اللفة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODE 1: BY BARN DISTRIBUTION */}
      {viewMode === 'by_barn' && activeBarn && activeBarnState && (
        <div className="space-y-6">
          {/* Barn Details Summary Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  فئة: {activeCategory?.name} | مكسر: {activeMixer?.name || 'مكسر TMR'}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <h3 className="font-black text-slate-900 text-lg flex items-center gap-1.5 shrink-0">
                    <Home className="w-5 h-5 text-emerald-700" />
                    <span>تفاصيل استحقاق:</span>
                  </h3>
                  <input
                    type="text"
                    value={activeBarnState.displayNumber || activeBarn.number}
                    onChange={(e) => handleBarnChange(activeBarn.id, { number: e.target.value })}
                    className="w-24 font-black text-slate-900 text-sm bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-center focus:bg-white focus:outline-emerald-600"
                    title="تعديل رقم العنبر"
                    placeholder="رقم العنبر"
                  />
                  <input
                    type="text"
                    value={activeBarnState.displayName || activeBarn.name || ''}
                    onChange={(e) => handleBarnChange(activeBarn.id, { name: e.target.value })}
                    className="w-32 font-bold text-slate-700 text-sm bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:bg-white focus:outline-emerald-600"
                    title="تعديل اسم العنبر"
                    placeholder="اسم العنبر (اختياري)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDistributeRemainingEqually}
                  className="px-3.5 py-2 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Divide className="w-4 h-4 text-amber-700" />
                  <span>توزيع المتبقي بالتساوي</span>
                </button>

                <button
                  onClick={handleAddNewBatch}
                  className="px-3.5 py-2 bg-slate-800 text-white hover:bg-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>إضافة لفة جديدة للمكسر</span>
                </button>
              </div>
            </div>

            {/* Formula Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-emerald-500 transition-all">
                <label className="text-slate-500 block text-[11px] mb-1">عدد الرؤوس (تعديل مباشر):</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={activeBarnState.headCount}
                    onChange={(e) =>
                      handleBarnChange(activeBarn.id, { headCount: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full font-black text-slate-900 text-base bg-white border border-slate-300 rounded-lg px-2 py-1 text-center focus:outline-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0">رأس</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">العليقة المقررة:</span>
                <span className="text-emerald-900 text-sm font-black">{activeRation?.name || '—'}</span>
                <span className="text-[10px] text-slate-500 block font-semibold">({rationKgPerHead} كجم/رأس)</span>
              </div>

              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 focus-within:border-amber-500 transition-all">
                <label className="text-amber-800 block text-[11px] mb-1">نسبة التغذية % (تعديل مباشر):</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step="any"
                    value={activeBarnState.feedingRatioPercent || 100}
                    onChange={(e) =>
                      handleBarnChange(activeBarn.id, {
                        feedingRatioPercent: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full font-black text-amber-950 text-base bg-white border border-amber-300 rounded-lg px-2 py-1 text-center focus:outline-emerald-600"
                  />
                  <span className="text-xs font-bold text-amber-800 shrink-0">%</span>
                </div>
              </div>

              <div className="bg-emerald-900 text-emerald-50 p-3 rounded-xl">
                <span className="text-emerald-300 block text-[11px]">الاستحقاق اليومي الإجمالي:</span>
                <span className="text-amber-300 text-lg font-black">
                  {barnDailyDemandKg.toLocaleString('ar-EG')} كجم/يوم
                </span>
              </div>
            </div>

            {/* 100% Distribution Status Alert Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
                Math.abs(currentBarnDiffKg) <= 1
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : currentBarnDiffKg > 1
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {Math.abs(currentBarnDiffKg) <= 1 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : currentBarnDiffKg > 1 ? (
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-black text-sm">
                    {Math.abs(currentBarnDiffKg) <= 1
                      ? 'توزيع استحقاق العنبر مكتمل بنجاح (100%)!'
                      : currentBarnDiffKg > 1
                      ? `خطأ: إجمالي التوزيع يتجاوز استحقاق العنبر (100%) بـ ${currentBarnDiffPercent}% (${currentBarnDiffKg.toLocaleString()} كجم)`
                      : `متبقي ${Math.abs(currentBarnDiffPercent)}% (${Math.abs(currentBarnDiffKg).toLocaleString()} كجم) لم يتم توزيعه على اللفات`}
                  </div>
                  <div className="opacity-80 font-medium mt-0.5">
                    إجمالي الموزع حاليًا على اللفات: {currentBarnAllocatedKgSum.toLocaleString()} كجم ({currentBarnAllocatedPercentSum}%) من أصل {barnDailyDemandKg.toLocaleString()} كجم
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-white font-black text-sm border shadow-2xs">
                  {currentBarnAllocatedPercentSum}% / 100%
                </span>
              </div>
            </div>
          </div>

          {/* Batches Distribution Interactive Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">
                  جدول لفات المكسر المتاحة لفئة ({activeCategory?.name}) لتوزيع استحقاق ({activeBarnState.displayNumber || activeBarn.number})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  النسبة % هي الأساس المحفوظ؛ عند تعديل عدد الرؤوس أو نسبة التغذية يعاد احتساب أوزان الكيلو فورياً
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                عدد اللفات: {categoryBatches.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم اللفة</th>
                    <th className="py-3.5 px-4">توقيت اللفة</th>
                    <th className="py-3.5 px-4 text-center">نسبة التوزيع % من العنبر</th>
                    <th className="py-3.5 px-4 text-center text-emerald-950 bg-emerald-50">
                      الكمية الموزعة (كجم مشتقة)
                    </th>
                    <th className="py-3.5 px-4 text-center">إجمالي وزن اللفة الناتج</th>
                    <th className="py-3.5 px-4">حالة سعة المكسر ({activeMixer?.maxCapacityKg} كجم)</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {categoryBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        لا توجد لفات مكسر محددة لهذه الفئة اليوم. انقر فوق زر "إضافة لفة جديدة للمكسر".
                      </td>
                    </tr>
                  ) : (
                    categoryBatches.map((batch) => {
                      const allocatedPercent = getBarnAllocatedPercent(batch.id, activeBarn.id);
                      const allocatedKg = getBarnAllocatedKg(batch.id, activeBarn);
                      const batchTotalWeightKg = getBatchTotalWeightKg(batch.id);

                      const mixerMaxCapacity = activeMixer?.maxCapacityKg || 3000;
                      const isOverMixerCapacity = batchTotalWeightKg > mixerMaxCapacity;
                      const overflowKg = batchTotalWeightKg - mixerMaxCapacity;

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-black text-slate-900 text-base">
                            {batch.batchNumber}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-600 text-xs">
                            {batch.time}
                          </td>

                          {/* Interactive Percentage Input */}
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={100}
                                value={allocatedPercent}
                                onChange={(e) =>
                                  handlePercentChange(
                                    batch.id,
                                    activeBarn.id,
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-20 text-center font-extrabold text-slate-900 focus:outline-emerald-600 text-sm"
                              />
                              <span className="font-bold text-slate-500 text-xs">%</span>
                            </div>
                          </td>

                          {/* Interactive Weight KG Input */}
                          <td className="py-4 px-4 text-center bg-emerald-50/50">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1 shadow-2xs">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={allocatedKg}
                                onChange={(e) =>
                                  handleKgChange(
                                    batch.id,
                                    activeBarn.id,
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-28 text-center font-black text-emerald-950 focus:outline-emerald-600 text-base bg-transparent"
                              />
                              <span className="font-bold text-emerald-800 text-xs">كجم</span>
                            </div>
                          </td>

                          {/* Total Batch Weight */}
                          <td className="py-4 px-4 text-center font-extrabold text-slate-900 text-base">
                            {batchTotalWeightKg.toLocaleString()} كجم
                          </td>

                          {/* Mixer Capacity Check & Warning */}
                          <td className="py-4 px-4 text-xs">
                            {isOverMixerCapacity ? (
                              <div className="p-2 bg-rose-50 text-rose-900 rounded-lg border border-rose-200 font-bold">
                                ⚠️ تحذير: وزن اللفة ({batchTotalWeightKg.toLocaleString()} كجم) يتجاوز سعة المكسر ({mixerMaxCapacity.toLocaleString()} كجم) بـ {overflowKg.toLocaleString()} كجم!
                              </div>
                            ) : (
                              <div className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>ضمن سعة المكسر المسموحة ({mixerMaxCapacity.toLocaleString()} كجم)</span>
                              </div>
                            )}
                          </td>

                          {/* Action: Delete Batch */}
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-all active:scale-95 border border-rose-200 cursor-pointer"
                              title="حذف اللفة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-emerald-900 text-white font-bold text-sm">
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-right">إجمالي توزيع العنبر اليومي:</td>
                    <td className="py-4 px-4 text-center text-amber-300 font-extrabold text-base">
                      {currentBarnAllocatedPercentSum}%
                    </td>
                    <td className="py-4 px-4 text-center text-amber-300 font-black text-lg bg-emerald-950">
                      {currentBarnAllocatedKgSum.toLocaleString()} كجم
                    </td>
                    <td colSpan={3} className="py-4 px-4 text-left font-medium text-emerald-200">
                      الاستحقاق اليومي المستهدف: {barnDailyDemandKg.toLocaleString()} كجم
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: BY BATCH DISTRIBUTION */}
      {viewMode === 'by_batch' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
              <MixerIcon className="w-5 h-5 text-emerald-700" />
              استعراض وتوزيع جميع عنابر الفئة ({activeCategory?.name}) حسب اللفات
            </h3>

            <div className="space-y-6">
              {categoryBatches.map((batch) => {
                const totalBatchKg = getBatchTotalWeightKg(batch.id);
                const mixerMax = activeMixer?.maxCapacityKg || 3000;
                const isOver = totalBatchKg > mixerMax;

                return (
                  <div key={batch.id} className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-900 text-emerald-50 px-3 py-1 rounded-xl font-black text-base">
                          {batch.batchNumber} ({batch.time})
                        </span>
                        <span className="text-xs font-bold text-slate-600">المكسر: {activeMixer?.name}</span>
                      </div>

                      <div className="flex items-center gap-4 text-left">
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">إجمالي وزن اللفة:</span>
                          <span className={`text-lg font-black ${isOver ? 'text-rose-700' : 'text-emerald-900'}`}>
                            {totalBatchKg.toLocaleString()} كجم / {mixerMax.toLocaleString()} كجم
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-all active:scale-95 border border-rose-200 flex items-center gap-1 text-xs shrink-0 cursor-pointer"
                          title="حذف اللفة"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف اللفة</span>
                        </button>
                      </div>
                    </div>

                    {/* Barns Inputs inside this batch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeCategoryBarns.map((barn) => {
                        const bDemand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                        const bState = getBarnDailyState(barn, dailyPlan);
                        const currPercent = getBarnAllocatedPercent(batch.id, barn.id);
                        const currKg = getBarnAllocatedKg(batch.id, barn);

                        return (
                          <div key={barn.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900">
                              <span>
                                {bState.displayNumber || barn.number}{' '}
                                {bState.displayName && `(${bState.displayName})`}
                              </span>
                              <span className="text-emerald-900 font-extrabold">
                                {bDemand.toLocaleString()} كجم/يوم
                              </span>
                            </div>

                            {/* Quick Barn Head Count & Feeding Ratio Control */}
                            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-500">رؤوس:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={bState.headCount}
                                  onChange={(e) =>
                                    handleBarnChange(barn.id, { headCount: Math.max(1, Number(e.target.value)) })
                                  }
                                  className="w-12 text-center font-bold bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-slate-900 text-xs focus:bg-white focus:outline-emerald-600"
                                  title="تعديل عدد الرؤوس"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-amber-800">نسبة%:</span>
                                <input
                                  type="number"
                                  min={10}
                                  max={200}
                                  step="any"
                                  value={bState.feedingRatioPercent || 100}
                                  onChange={(e) =>
                                    handleBarnChange(barn.id, {
                                      feedingRatioPercent: Math.max(1, Number(e.target.value)),
                                    })
                                  }
                                  className="w-12 text-center font-bold bg-amber-50 border border-amber-300 rounded px-1 py-0.5 text-amber-950 text-xs focus:bg-white focus:outline-emerald-600"
                                  title="تعديل نسبة التغذية %"
                                />
                              </div>
                            </div>

                            {/* Linked Percent and KG Inputs */}
                            <div className="grid grid-cols-2 gap-1.5 items-center">
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={100}
                                  value={currPercent}
                                  onChange={(e) =>
                                    handlePercentChange(
                                      batch.id,
                                      barn.id,
                                      e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full text-center font-bold text-slate-900 text-xs focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-500">%</span>
                              </div>

                              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1">
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  value={currKg}
                                  onChange={(e) =>
                                    handleKgChange(
                                      batch.id,
                                      barn.id,
                                      e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full text-center font-black text-emerald-950 text-xs bg-transparent focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-emerald-800">كجم</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">تأكيد حذف اللفة</h3>
                <p className="text-xs text-slate-500 font-medium">إجراء غير قابل للتراجع</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
              هل أنت متأكد من حذف <span className="font-black text-slate-900">{batchToDelete.name}</span>؟ سيتم إلغاء التوزيع الخاص بهذه اللفة من جميع العنابر.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteBatch}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
              >
                نعم، احذف اللفة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
