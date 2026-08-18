import React, { useState } from 'react';
import {
  DailyOperationPlan,
  MixBatch,
  AnimalCategory,
  Mixer,
  Barn,
  Ration,
  RawMaterial,
} from '../../types';
import {
  calculateCategoryTotalDemand,
  calculateRationTotalKgPerHead,
  calculateBarnDailyDemand,
  getBarnRation,
  getBarnDailyState,
} from '../../utils/calculations';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Scale,
  Calendar,
  Percent,
  Beef,
  Wheat,
  ListFilter,
  Calculator,
} from 'lucide-react';

interface DailyPlanViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  mixers: Mixer[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  rations: Ration[];
  rawMaterials: RawMaterial[];
}

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  mixers,
  barns,
  setBarns,
  rations,
  rawMaterials,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'program' | 'batches'>('program');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    dailyPlan.date || new Date().toISOString().split('T')[0]
  );

  // Modal state for Batches
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<MixBatch | null>(null);

  // Form states for Batch
  const [batchNumber, setBatchNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mixerId, setMixerId] = useState('');
  const [time, setTime] = useState('06:00 ص');
  const [targetWeightKg, setTargetWeightKg] = useState<number>(3000);
  const [status, setStatus] = useState<MixBatch['status']>('مخططة');
  const [notes, setNotes] = useState('');

  const batches = dailyPlan.batches || [];

  // Update feeding ratio inline in the table
  const handleFeedingRatioChange = (barnId: string, newRatio: number) => {
    const clampedRatio = Math.max(1, Math.min(200, isNaN(newRatio) ? 100 : newRatio));
    const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, feedingRatioPercent: clampedRatio } : b));
    if (setBarns) {
      setBarns(updatedBarns);
    }

    const currentBarn = barns.find((b) => b.id === barnId);
    const prevDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
      barnId,
      headCount: currentBarn?.headCount || 0,
      feedingRatioPercent: currentBarn?.feedingRatioPercent || 100,
      rationId: currentBarn?.rationId,
    };

    const nextDailyPlan: DailyOperationPlan = {
      ...dailyPlan,
      dailyBarnStates: {
        ...(dailyPlan.dailyBarnStates || {}),
        [barnId]: {
          ...prevDailyBarnState,
          feedingRatioPercent: clampedRatio,
        },
      },
    };

    // Recalculate batch allocatedKg for allocations with allocatedPercent
    const updatedBatches = (dailyPlan.batches || []).map((b) => {
      if (!b.allocations || b.allocations.length === 0) return b;
      let changed = false;
      const newAllocs = b.allocations.map((a) => {
        if (a.allocatedPercent !== undefined) {
          const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextDailyPlan) : 0;
          const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
          if (newAllocatedKg !== a.allocatedKg) {
            changed = true;
          }
          return { ...a, allocatedKg: newAllocatedKg };
        }
        return a;
      });

      if (changed) {
        const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
        return {
          ...b,
          allocations: newAllocs,
          targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg,
        };
      }
      return b;
    });

    setDailyPlan({
      ...nextDailyPlan,
      batches: updatedBatches,
    });
  };

  // Generic barn direct update handler
  const handleBarnUpdate = (barnId: string, updates: Partial<Barn>) => {
    const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, ...updates } : b));
    if (setBarns) {
      setBarns(updatedBarns);
    }

    const currentBarn = barns.find((b) => b.id === barnId);
    const prevDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
      barnId,
      headCount: currentBarn?.headCount || 0,
      feedingRatioPercent: currentBarn?.feedingRatioPercent || 100,
      rationId: currentBarn?.rationId,
    };

    const nextDailyPlan: DailyOperationPlan = {
      ...dailyPlan,
      dailyBarnStates: {
        ...(dailyPlan.dailyBarnStates || {}),
        [barnId]: {
          ...prevDailyBarnState,
          headCount: updates.headCount !== undefined ? updates.headCount : prevDailyBarnState.headCount,
          feedingRatioPercent:
            updates.feedingRatioPercent !== undefined
              ? updates.feedingRatioPercent
              : prevDailyBarnState.feedingRatioPercent,
          rationId: updates.rationId !== undefined ? updates.rationId : prevDailyBarnState.rationId,
          displayName: updates.name !== undefined ? updates.name : prevDailyBarnState.displayName,
          displayNumber: updates.number !== undefined ? updates.number : prevDailyBarnState.displayNumber,
        },
      },
    };

    // Recalculate batch allocatedKg for allocations with allocatedPercent
    const updatedBatches = (dailyPlan.batches || []).map((b) => {
      if (!b.allocations || b.allocations.length === 0) return b;
      let changed = false;
      const newAllocs = b.allocations.map((a) => {
        if (a.allocatedPercent !== undefined) {
          const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextDailyPlan) : 0;
          const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
          if (newAllocatedKg !== a.allocatedKg) {
            changed = true;
          }
          return { ...a, allocatedKg: newAllocatedKg };
        }
        return a;
      });

      if (changed) {
        const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
        return {
          ...b,
          allocations: newAllocs,
          targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg,
        };
      }
      return b;
    });

    setDailyPlan({
      ...nextDailyPlan,
      batches: updatedBatches,
    });
  };

  // Batch modal handlers
  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    const nextNum = batches.length + 1;
    setBatchNumber(`لفة ${nextNum}`);
    const defaultCat = categories[0]?.id || '';
    setCategoryId(defaultCat);
    const matchedCategory = categories.find((c) => c.id === defaultCat);
    setMixerId(matchedCategory?.mixerId || mixers[0]?.id || '');
    setTime('06:00 ص');
    setTargetWeightKg(3000);
    setStatus('مخططة');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditBatch = (batch: MixBatch) => {
    setEditingBatch(batch);
    setBatchNumber(batch.batchNumber);
    setCategoryId(batch.categoryId);
    setMixerId(batch.mixerId);
    setTime(batch.time);
    setTargetWeightKg(batch.targetWeightKg);
    setStatus(batch.status);
    setNotes(batch.notes || '');
    setIsModalOpen(true);
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const selectedCat = categories.find((c) => c.id === catId);
    if (selectedCat && selectedCat.mixerId) {
      setMixerId(selectedCat.mixerId);
    }
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber || !categoryId || !mixerId || targetWeightKg <= 0) {
      alert('يرجى ملء جميع الحقول المطلوبة ووزن اللفة بشكل صحيح');
      return;
    }

    let updatedBatches: MixBatch[];
    if (editingBatch) {
      updatedBatches = batches.map((b) =>
        b.id === editingBatch.id
          ? {
              ...b,
              batchNumber,
              categoryId,
              mixerId,
              time,
              targetWeightKg,
              status,
              notes,
            }
          : b
      );
    } else {
      const newBatch: MixBatch = {
        id: `batch-${Date.now()}`,
        batchNumber,
        categoryId,
        mixerId,
        time,
        targetWeightKg,
        status,
        allocations: [],
        notes,
      };
      updatedBatches = [...batches, newBatch];
    }

    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setIsModalOpen(false);
  };

  const handleDeleteBatch = (batchId: string) => {
    const updated = batches.filter((b) => b.id !== batchId);
    setDailyPlan({ ...dailyPlan, batches: updated });
  };

  // Filtered barns
  const filteredBarns = barns.filter((b) => {
    if (selectedCategoryFilter === 'all') return true;
    return b.categoryId === selectedCategoryFilter;
  });

  // Calculate totals
  const totalHeads = filteredBarns.reduce((sum, b) => {
    const bState = getBarnDailyState(b, dailyPlan);
    return sum + (bState.headCount || 0);
  }, 0);
  const totalDailyDemandKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-700" />
            برنامج التغذية اليومي وخطة المكسرات
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            جدول التغذية التفصيلي للعنابر، تعديل النسبة %، وحساب خامات كل فئة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>التاريخ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDailyPlan({ ...dailyPlan, date: e.target.value });
              }}
              className="bg-transparent font-bold focus:outline-none text-slate-900"
            />
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('program')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'program'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 جدول التغذية اليومي
            </button>
            <button
              onClick={() => setActiveSubTab('batches')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'batches'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚜 خطة لفات المكسر
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: برنامج التغذية اليومي وحساب الاحتياجات */}
      {activeSubTab === 'program' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ListFilter className="w-5 h-5 text-emerald-700" />
              <span className="text-xs font-extrabold text-slate-800">تصفية حسب الفئة الحيوانية:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              >
                <option value="all">جميع الفئات الحيوانية ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600">إجمالي العنابر المعروضة: <strong className="text-slate-900">{filteredBarns.length}</strong></span>
              <span className="text-slate-600">إجمالي الرؤوس: <strong className="text-emerald-800">{totalHeads.toLocaleString()} رأس</strong></span>
              <span className="text-slate-600">إجمالي العلف اليومي: <strong className="text-emerald-800">{totalDailyDemandKg.toLocaleString()} كجم ({Math.round(totalDailyDemandKg/100)/10} طن)</strong></span>
            </div>
          </div>

          {/* Interactive Barns Feeding Table (Requirement 7 & 8) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  جدول التغذية اليومي وحساب احتياج العنابر
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تعديل "نسبة التغذية %" يحسب فورياً الاحتياج اليومي: عدد الرؤوس × إجمالي العليقة × نسبة التغذية
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/90 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم واسم العنبر</th>
                    <th className="py-3.5 px-4">الفئة الحيوانية</th>
                    <th className="py-3.5 px-4">العليقة المعينّة</th>
                    <th className="py-3.5 px-4 text-center">عدد الرؤوس</th>
                    <th className="py-3.5 px-4 text-center">إجمالي العليقة (كجم/رأس)</th>
                    <th className="py-3.5 px-4 text-center">نسبة التغذية %</th>
                    <th className="py-3.5 px-4 text-left">الاحتياج اليومي (كجم)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBarns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        لا توجد عنابر مسجلة في هذه الفئة.
                      </td>
                    </tr>
                  ) : (
                    filteredBarns.map((barn) => {
                      const barnState = getBarnDailyState(barn, dailyPlan);
                      const category = categories.find((c) => c.id === barn.categoryId);
                      const ration = getBarnRation(barn, categories, rations, dailyPlan);
                      const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
                      const barnDemandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);

                      return (
                        <tr key={barn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-black text-slate-900">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={barnState.displayNumber || barn.number}
                                onChange={(e) => handleBarnUpdate(barn.id, { number: e.target.value })}
                                className="w-28 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs focus:bg-white focus:outline-emerald-600"
                                placeholder="رقم العنبر"
                                title="تعديل رقم العنبر"
                              />
                              <input
                                type="text"
                                value={barnState.displayName || barn.name || ''}
                                onChange={(e) => handleBarnUpdate(barn.id, { name: e.target.value })}
                                className="w-32 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:bg-white focus:outline-emerald-600"
                                placeholder="اسم العنبر (اختياري)"
                                title="تعديل اسم العنبر"
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-md text-xs border border-slate-200">
                              {category?.name || 'غير محدد'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-emerald-900">
                            {ration?.name || 'لا توجد عليقة'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min={1}
                                value={barnState.headCount}
                                onChange={(e) => handleBarnUpdate(barn.id, { headCount: Math.max(1, Number(e.target.value)) })}
                                className="w-16 text-center font-black text-emerald-950 bg-transparent focus:outline-none text-sm"
                                title="تعديل عدد الرؤوس"
                              />
                              <span className="font-bold text-emerald-800 text-xs">رأس</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {totalRationKgPerHead} كجم/رأس
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min={10}
                                max={200}
                                step="any"
                                value={barnState.feedingRatioPercent || 100}
                                onChange={(e) => handleFeedingRatioChange(barn.id, Number(e.target.value))}
                                className="w-16 text-center font-extrabold text-amber-900 bg-transparent focus:outline-none text-sm"
                              />
                              <span className="font-extrabold text-amber-800 text-xs">%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-left font-black text-emerald-900 text-base">
                            {barnDemandKg.toLocaleString()} كجم
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-emerald-900 text-white font-bold text-sm">
                  <tr>
                    <td colSpan={3} className="py-4 px-4 text-right">الإجمالي اليومي العام:</td>
                    <td className="py-4 px-4 text-center font-extrabold text-amber-300">{totalHeads.toLocaleString()} رأس</td>
                    <td colSpan={2} className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-left font-black text-amber-300 text-lg">
                      {totalDailyDemandKg.toLocaleString()} كجم ({Math.round(totalDailyDemandKg / 100) / 10} طن)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Raw Material Breakdown per Category (Requirement 9 & 10) */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Wheat className="w-5 h-5 text-emerald-700" />
              حساب احتياج كل خامة لكل فئة وعنبر (مجموع الاحتياجات التفصيلي)
            </h3>

            {categories
              .filter((cat) => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
              .map((cat) => {
                const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                if (catBarns.length === 0) return null;

                const ration = rations.find((r) => r.id === cat.rationId);
                const totalDemandCat = calculateCategoryTotalDemand(catBarns, cat.id, categories, rations, dailyPlan);
                const totalRationKg = calculateRationTotalKgPerHead(ration);

                return (
                  <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                        <h4 className="font-black text-slate-900 text-base">فئة: {cat.name}</h4>
                        <span className="text-xs text-slate-500 font-bold">({catBarns.length} عنابر | عليقة: {ration?.name || '—'})</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        إجمالي احتياج الفئة: {totalDemandCat.toLocaleString()} كجم/يوم
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">اسم الخامة</th>
                            <th className="py-2.5 px-3 text-center">الكمية للرأس (كجم)</th>
                            <th className="py-2.5 px-3 text-center">النسبة بالعليقة %</th>
                            <th className="py-2.5 px-3 text-left font-extrabold text-slate-900">إجمالي الكمية للفئة بالكامل (كجم/يوم)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {ration?.ingredients.map((ing) => {
                            const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                            const proportionPercent = totalRationKg > 0 ? Math.round((ing.amountKgPerHead / totalRationKg) * 1000) / 10 : 0;
                            
                            // Sum across category barns: headCount * amountKgPerHead * ratio
                            const catIngredientKg = catBarns.reduce((sum, b) => {
                              const ratio = (b.feedingRatioPercent || 100) / 100;
                              return sum + b.headCount * ing.amountKgPerHead * ratio;
                            }, 0);

                            return (
                              <tr key={ing.rawMaterialId} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{rawMat?.name || 'خامة'}</td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">{ing.amountKgPerHead} كجم</td>
                                <td className="py-2.5 px-3 text-center font-bold text-emerald-800">{proportionPercent}%</td>
                                <td className="py-2.5 px-3 text-left font-black text-emerald-900 text-sm">
                                  {Math.round(catIngredientKg * 10) / 10} كجم
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: خطة المكسرات واللفات اليومية (Requirement 11 & 12) */}
      {activeSubTab === 'batches' && (
        <div className="space-y-6">
          {/* Category demand summary cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-700" />
                تخطيط أوزان وعدد لفات المكسر حسب احتياج كل فئة
              </h3>
              <button
                onClick={handleOpenAddBatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة لفة مكسر جديدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const demandKg = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                const plannedKg = catBatches.reduce((sum, b) => sum + b.targetWeightKg, 0);
                const diffKg = plannedKg - demandKg;
                const mixer = mixers.find((m) => m.id === cat.mixerId);

                return (
                  <div key={cat.id} className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">{cat.name}</span>
                      <span className="text-xs text-slate-500 font-bold">{mixer?.name || 'مكسر'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>الاحتياج اليومي للفئة:</span>
                      <span className="font-bold text-slate-900">{demandKg.toLocaleString()} كجم</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>إجمالي أوزان اللفات:</span>
                      <span className="font-bold text-emerald-800">{plannedKg.toLocaleString()} كجم ({catBatches.length} لفات)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 text-xs">
                      {Math.abs(diffKg) <= 0.01 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> الأوزان متطابقة تمامًا مع الاحتياج!
                        </span>
                      ) : diffKg < 0 ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> متبقي {Math.abs(diffKg)} كجم يحتاج لفات إضافية
                        </span>
                      ) : (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> زيادة في أوزان اللفات المخططة بـ {diffKg} كجم
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">جدول لفات المكسر المعتمدة ليوم ({selectedDate})</h3>
                <p className="text-xs text-slate-500 mt-0.5">يمكنك إضافة أو تعديل أوزان وتوقيتات وحالة كل لفة مكسر</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                إجمالي اللفات: {batches.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/80 text-slate-600 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم اللفة</th>
                    <th className="py-3.5 px-4">التوقيت</th>
                    <th className="py-3.5 px-4">الفئة الحيوانية</th>
                    <th className="py-3.5 px-4">المكسر المستخدم</th>
                    <th className="py-3.5 px-4">وزن اللفة المستهدف</th>
                    <th className="py-3.5 px-4">حالة اللفة</th>
                    <th className="py-3.5 px-4">ملاحظات</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        لا توجد لفات مكسر مضافة. انقر فوق زر "إضافة لفة مكسر جديدة" للبدء.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => {
                      const category = categories.find((c) => c.id === batch.categoryId);
                      const mixer = mixers.find((m) => m.id === batch.mixerId);

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-black text-emerald-900 text-base">{batch.batchNumber}</td>
                          <td className="py-4 px-4 font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-500" /> {batch.time}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-200/80">
                              {category?.name || 'غير محدد'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 font-semibold">{mixer?.name || 'غير محدد'}</td>
                          <td className="py-4 px-4 font-extrabold text-slate-900 text-base">
                            {batch.targetWeightKg.toLocaleString()} كجم
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                batch.status === 'تم التوزيع'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : batch.status === 'تم التحضير'
                                  ? 'bg-blue-100 text-blue-800'
                                  : batch.status === 'قيد التحضير'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {batch.notes || '—'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditBatch(batch)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBatch ? 'تعديل بيانات لفة المكسر' : 'إضافة لفة مكسر جديدة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم/اسم اللفة *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="مثال: لفة 1، لفة الظهر..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفئة الحيوانية *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المكسر المخصص *</label>
                  <select
                    value={mixerId}
                    onChange={(e) => setMixerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {mixers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.maxCapacityKg}كجم)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">توقيت اللفة *</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="06:00 ص"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وزن اللفة المستهدف (كجم) *</label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة اللفة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MixBatch['status'])}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  <option value="مخططة">مخططة</option>
                  <option value="قيد التحضير">قيد التحضير</option>
                  <option value="تم التحضير">تم التحضير</option>
                  <option value="تم التوزيع">تم التوزيع</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التشغيل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي توجيهات خاصة للسائق أو عامل المكسر..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  حفظ اللفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

