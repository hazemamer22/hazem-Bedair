import React, { useState, useEffect } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Ration,
  MilkSession,
  MilkProductionData,
  RawMaterial,
} from '../types';
import {
  calculateMilkMetrics,
  calculateDairyFinancials,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateBarnDailyDemand,
  getBarnDailyState,
} from '../utils/calculations';
import {
  Milk,
  TrendingUp,
  Percent,
  Calculator,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Beef,
  Flame,
  Wheat,
  Coins,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MilkProductionSectionProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan?: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  rations: Ration[];
  rawMaterials?: RawMaterial[];
  readOnly?: boolean;
}

const FIXED_THREE_SESSIONS: MilkSession[] = [
  { id: 'session-1', name: 'الحلبة الأولى ', amountKg: 0, time: '06:00 ص' },
  { id: 'session-2', name: 'الحلبة الثانية ', amountKg: 0, time: '02:00 م' },
  { id: 'session-3', name: 'الحلبة الثالثة ', amountKg: 0, time: '10:00 م' },
];

export const MilkProductionSection: React.FC<MilkProductionSectionProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  rations,
  rawMaterials = [],
  readOnly = false,
}) => {
  // Ensure exactly 3 fixed main sessions
  const [sessions, setSessions] = useState<MilkSession[]>(() => {
    const existing = dailyPlan.milkProduction?.sessions;
    if (existing && existing.length >= 3) {
      return existing.slice(0, 3);
    }
    if (existing && existing.length > 0) {
      return FIXED_THREE_SESSIONS.map((defSession, idx) => {
        const found = existing[idx];
        return found
          ? {
              ...defSession,
              amountKg: found.amountKg,
              name: found.name || defSession.name,
              time: found.time || defSession.time,
            }
          : defSession;
      });
    }
    return FIXED_THREE_SESSIONS;
  });

  const [refusalPercent, setRefusalPercent] = useState<number>(() => {
    return dailyPlan.milkProduction?.refusalPercent ?? 5;
  });

  const [milkPricePerKg, setMilkPricePerKg] = useState<number>(() => {
    return dailyPlan.milkProduction?.milkPricePerKg ?? 20;
  });

  const [customMilkingHeads, setCustomMilkingHeads] = useState<string>(() => {
    return dailyPlan.milkProduction?.milkingHeadCount ? String(dailyPlan.milkProduction.milkingHeadCount) : '';
  });

  const [showBarnsBreakdown, setShowBarnsBreakdown] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Active milking barns
  const milkingBarns = barns.filter((b) => {
    if (b.status !== 'نشط') return false;
    const cat = categories.find((c) => c.id === b.categoryId);
    const name = ((cat?.name || '') + ' ' + (b.name || '')).toLowerCase();
    return name.includes('حلاب') || name.includes('حليب') || name.includes('milk');
  });

  const milkingRefusalKgSum = milkingBarns.reduce(
    (sum, b) => sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan),
    0
  );
  const milkingDemandKgSum = milkingBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );
  const autoCalculatedMilkingRefusalPercent = milkingDemandKgSum > 0
    ? Math.round(((milkingRefusalKgSum / milkingDemandKgSum) * 100) * 10) / 10
    : 0;

  // Sync state if dailyPlan changes externally
  useEffect(() => {
    if (dailyPlan.milkProduction?.sessions && dailyPlan.milkProduction.sessions.length > 0) {
      setSessions(dailyPlan.milkProduction.sessions.slice(0, 3));
    }
    if (milkingRefusalKgSum > 0) {
      setRefusalPercent(autoCalculatedMilkingRefusalPercent);
    } else if (dailyPlan.milkProduction?.refusalPercent !== undefined) {
      setRefusalPercent(dailyPlan.milkProduction.refusalPercent);
    }
    if (dailyPlan.milkProduction?.milkPricePerKg !== undefined) {
      setMilkPricePerKg(dailyPlan.milkProduction.milkPricePerKg);
    }
    if (dailyPlan.milkProduction?.milkingHeadCount) {
      setCustomMilkingHeads(String(dailyPlan.milkProduction.milkingHeadCount));
    }
  }, [dailyPlan.date, dailyPlan.milkProduction, dailyPlan.barnOverrides, autoCalculatedMilkingRefusalPercent, milkingRefusalKgSum]);

  // Construct current data for calculations
  const currentMilkData: MilkProductionData = {
    sessions,
    refusalPercent: milkingRefusalKgSum > 0 ? autoCalculatedMilkingRefusalPercent : refusalPercent,
    milkPricePerKg,
    milkingHeadCount: customMilkingHeads ? Number(customMilkingHeads) : undefined,
  };

  const metrics = calculateMilkMetrics(currentMilkData, barns, categories, rations, dailyPlan, rawMaterials);
  const financials = calculateDairyFinancials(
    currentMilkData,
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    milkPricePerKg
  );

  // Helper to persist updates to dailyPlan
  const persistChanges = (
    newSessions: MilkSession[],
    newRefusal: number,
    newPrice: number,
    newCustomHeads?: string
  ) => {
    if (!setDailyPlan) return;
    const headsNum = newCustomHeads && Number(newCustomHeads) > 0 ? Number(newCustomHeads) : undefined;
    const updatedMilkProd: MilkProductionData = {
      sessions: newSessions,
      refusalPercent: newRefusal,
      milkPricePerKg: newPrice,
      milkingHeadCount: headsNum,
    };
    setDailyPlan({
      ...dailyPlan,
      milkProduction: updatedMilkProd,
    });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  // Session handlers
  const handleSessionChange = (id: string, amountKg: number) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, amountKg: Math.max(0, amountKg) } : s));
    setSessions(updated);
    persistChanges(updated, refusalPercent, milkPricePerKg, customMilkingHeads);
  };

  const handleSessionTimeChange = (id: string, newTime: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, time: newTime } : s));
    setSessions(updated);
    persistChanges(updated, refusalPercent, milkPricePerKg, customMilkingHeads);
  };

  const handleSessionNameChange = (id: string, newName: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, name: newName } : s));
    setSessions(updated);
    persistChanges(updated, refusalPercent, milkPricePerKg, customMilkingHeads);
  };

  const handleRefusalChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(50, isNaN(val) ? 0 : val));
    setRefusalPercent(safeVal);
    persistChanges(sessions, safeVal, milkPricePerKg, customMilkingHeads);
  };

  const handlePriceChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setMilkPricePerKg(safeVal);
    persistChanges(sessions, refusalPercent, safeVal, customMilkingHeads);
  };

  const handleCustomHeadsChange = (val: string) => {
    setCustomMilkingHeads(val);
    persistChanges(sessions, refusalPercent, milkPricePerKg, val);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ممتازة':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'جيدة':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'متوسطة':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'تحتاج مراجعة':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden text-right" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300 border border-white/15">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black">إنتاج الحليب، الكفاءة العلفية (NRC) ومؤشر العائد IOFC</h3>
              {isSavedRecently && (
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> تم الحفظ
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              حساب الكفاءة العلفية الدقيقة بناءً على المادة الجافة المتناولة (DMI)، راجع الطوايل، والعائد فوق تكلفة العلف (IOFC)
            </p>
          </div>
        </div>

        {metrics.feedEfficiency > 0 && (
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/15">
            <span className="text-xs text-blue-200">الكفاءة العلفية (DMI):</span>
            <span
              className={`px-2.5 py-0.5 rounded-xl text-xs font-black border ${getStatusColor(
                metrics.efficiencyStatus
              )}`}
            >
              {metrics.efficiencyStatus} ({metrics.feedEfficiency} كجم حليب / كجم DMI)
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Inputs vs KPIs */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Input Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Milking Sessions Input Card */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Milk className="w-4 h-4 text-blue-600" />
                <span>كميات الحليب للحلبات الـ 3 الرئيسية (كجم / لتر)</span>
              </h4>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                3 حلبات يومياً
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {sessions.map((session, idx) => (
                <div
                  key={session.id}
                  className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={session.name}
                      onChange={(e) => handleSessionNameChange(session.id, e.target.value)}
                      className="w-full text-xs font-black text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 -mx-1"
                      placeholder={`حلبة ${idx + 1}`}
                    />
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        disabled={readOnly}
                        value={session.time || ''}
                        onChange={(e) => handleSessionTimeChange(session.id, e.target.value)}
                        placeholder={idx === 0 ? '06:00 ص' : idx === 1 ? '02:00 م' : '10:00 م'}
                        className="text-[11px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-400 rounded px-1.5 py-0.5 w-full focus:outline-none transition-colors"
                        title="تعديل وقت الحلبة"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition-colors">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={readOnly}
                        value={session.amountKg === 0 ? '' : session.amountKg}
                        onChange={(e) => handleSessionChange(session.id, Number(e.target.value))}
                        placeholder="0"
                        className="w-full text-center font-black text-blue-950 bg-transparent focus:outline-none text-base"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">كجم</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Milk Summary Line */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-slate-900 font-bold text-xs sm:text-sm">
              <span className="text-slate-600">إجمالي إنتاج الحليب اليومي (3 حلبات):</span>
              <span className="text-lg font-black text-blue-900">
                {metrics.totalMilkKg.toLocaleString('ar-EG')}{' '}
                <span className="text-xs font-bold text-slate-500">كجم / لتر</span>
              </span>
            </div>
          </div>

          {/* Operational & Financial Parameters Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Feed Refusal % Input */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  <span>نسبة الراجع العام:</span>
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {metrics.refusalKg.toLocaleString('ar-EG')} كجم
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="any"
                  disabled={readOnly}
                  value={refusalPercent}
                  onChange={(e) => handleRefusalChange(parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-center text-sm font-black text-amber-950 bg-white border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">%</span>
              </div>
              <p className="text-[10px] text-slate-500">
                راجع الطوايل المتبقي
              </p>
            </div>

            {/* Milking Cows Count */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Beef className="w-3.5 h-3.5 text-emerald-600" />
                  <span>عدد الأبقار الحلابة:</span>
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  disabled={readOnly}
                  value={customMilkingHeads || metrics.milkingHeadCount}
                  onChange={(e) => handleCustomHeadsChange(e.target.value)}
                  placeholder={String(metrics.milkingHeadCount)}
                  className="w-full px-2.5 py-1.5 text-center text-sm font-black text-emerald-950 bg-white border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">رأس</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {customMilkingHeads ? 'يدوي' : `تلقائي (${metrics.milkingHeadCount} رأس)`}
              </p>
            </div>

            {/* Milk Price / Kg */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  <span>سعر كيلو اللبن:</span>
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={readOnly}
                  value={milkPricePerKg}
                  onChange={(e) => handlePriceChange(parseFloat(e.target.value))}
                  placeholder="20.0"
                  className="w-full px-2.5 py-1.5 text-center text-sm font-black text-blue-950 bg-white border border-slate-300 rounded-xl focus:outline-blue-600"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">ج.م</span>
              </div>
              <p className="text-[10px] text-slate-500">
                لحساب عائد اللبن IOFC
              </p>
            </div>
          </div>

          {/* Toggle Barn-by-Barn Breakdown */}
          {milkingBarns.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowBarnsBreakdown(!showBarnsBreakdown)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                <span>تفاصيل راجع الطوايل والمأكول لكل عنبر حلاب ({milkingBarns.length} عنابر):</span>
                <div className="flex items-center gap-1 text-slate-500">
                  <span>{showBarnsBreakdown ? 'إخفاء' : 'عرض'}</span>
                  {showBarnsBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showBarnsBreakdown && (
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">العنبر</th>
                        <th className="py-2 px-2.5">الرؤوس</th>
                        <th className="py-2 px-2.5">المقرر (كجم)</th>
                        <th className="py-2 px-2.5 text-amber-800">الراجع</th>
                        <th className="py-2 px-2.5 text-emerald-800">المأكول الفعلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {milkingBarns.map((barn) => {
                        const state = getBarnDailyState(barn, dailyPlan);
                        const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                        const refusal = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
                        const intake = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);

                        return (
                          <tr key={barn.id} className="bg-white">
                            <td className="py-2 px-2.5 font-black text-slate-900">{barn.number} {barn.name && `(${barn.name})`}</td>
                            <td className="py-2 px-2.5 font-bold text-slate-700">{state.headCount} رأس</td>
                            <td className="py-2 px-2.5 font-bold text-slate-900">{demand.toLocaleString()} كجم</td>
                            <td className="py-2 px-2.5 font-bold text-amber-900">
                              {refusal} كجم ({state.refusalType === 'kg' ? 'وزن' : `${state.refusalValue || 0}%`})
                            </td>
                            <td className="py-2 px-2.5 font-black text-emerald-900">{intake.toLocaleString()} كجم</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right / Calculated Metrics Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Average Milk per Head Card */}
          <div className="bg-gradient-to-bl from-blue-50 to-indigo-50/70 p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">متوسط إنتاج الرأس من اللبن</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Milk className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-black text-blue-950">
                {metrics.averageMilkPerHead.toLocaleString('ar-EG')}
              </span>
              <span className="text-xs font-bold text-blue-800">كجم / رأس / يوم</span>
            </div>
            <p className="text-[11px] text-slate-600">
              = إجمالي إنتاج اللبن ({metrics.totalMilkKg.toLocaleString()} كجم) ÷ {metrics.milkingHeadCount} رأس
            </p>
          </div>

          {/* Feed Efficiency (معامل التحويل القياسي على المادة الجافة DMI) */}
          <div className="bg-gradient-to-bl from-emerald-50 to-teal-50/70 p-4 rounded-2xl border border-emerald-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <Wheat className="w-4 h-4 text-emerald-700" />
                <span>الكفاءة العلفية (Feed Efficiency - DMI)</span>
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-200/70 text-emerald-950 px-2 py-0.5 rounded-md">
                معيار NRC
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-950">
                {metrics.feedEfficiency > 0 ? metrics.feedEfficiency : '—'}
              </span>
              <span className="text-xs font-bold text-emerald-800">كجم حليب / كجم DMI</span>
            </div>

            {/* Dry Matter Detailed Breakdown */}
            <div className="pt-1.5 border-t border-emerald-200/80 space-y-1 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>متوسط المادة الجافة المتناولة (DMI):</span>
                <strong className="text-emerald-950 font-black">
                  {metrics.dmiPerHeadKg.toLocaleString('ar-EG')} كجم DMI / رأس
                </strong>
              </div>
            </div>
          </div>

          {/* IOFC (Income Over Feed Cost) Card */}
          <div className="bg-gradient-to-bl from-amber-50 via-yellow-50/70 to-emerald-50/50 p-4 rounded-2xl border border-amber-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-700" />
                <span>العائد فوق تكلفة العلف (IOFC)</span>
              </span>
              <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md">
                مؤشر الربحية
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black ${financials.iofcPerCowPerDay >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                {financials.iofcPerCowPerDay.toLocaleString('ar-EG')}
              </span>
              <span className="text-xs font-bold text-slate-700">ج.م / بقرة / يوم</span>
            </div>

            <div className="pt-2 border-t border-amber-200/70 space-y-1 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>دخل اللبن للبقرة:</span>
                <span className="font-extrabold text-blue-900">{financials.milkRevenuePerCowPerDay.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <span>تكلفة علف البقرة اليومي:</span>
                <span className="font-extrabold text-slate-800">{financials.feedCostPerCowPerDay.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 text-[11px]">
                <span className="font-bold text-amber-900">إجمالي صافي عائد القطيع فوق العلف:</span>
                <strong className="font-black text-emerald-800 text-xs">{financials.totalIofcPerDay.toLocaleString('ar-EG')} ج.م/يوم</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
