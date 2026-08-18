import React, { useState, useEffect } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Ration,
  MilkSession,
  MilkProductionData,
} from '../types';
import { calculateMilkMetrics, getBarnDailyState } from '../utils/calculations';
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
} from 'lucide-react';

interface MilkProductionSectionProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan?: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  rations: Ration[];
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
  readOnly = false,
}) => {
  // Ensure exactly 3 fixed main sessions
  const [sessions, setSessions] = useState<MilkSession[]>(() => {
    const existing = dailyPlan.milkProduction?.sessions;
    if (existing && existing.length >= 3) {
      return existing.slice(0, 3);
    }
    if (existing && existing.length > 0) {
      // Complete up to 3
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

  const [customMilkingHeads, setCustomMilkingHeads] = useState<string>(() => {
    return dailyPlan.milkProduction?.milkingHeadCount ? String(dailyPlan.milkProduction.milkingHeadCount) : '';
  });

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Sync state if dailyPlan changes externally
  useEffect(() => {
    if (dailyPlan.milkProduction?.sessions && dailyPlan.milkProduction.sessions.length > 0) {
      setSessions(dailyPlan.milkProduction.sessions.slice(0, 3));
    }
    if (dailyPlan.milkProduction?.refusalPercent !== undefined) {
      setRefusalPercent(dailyPlan.milkProduction.refusalPercent);
    }
    if (dailyPlan.milkProduction?.milkingHeadCount) {
      setCustomMilkingHeads(String(dailyPlan.milkProduction.milkingHeadCount));
    }
  }, [dailyPlan.date, dailyPlan.milkProduction]);

  // Construct current data for calculations
  const currentMilkData: MilkProductionData = {
    sessions,
    refusalPercent,
    milkingHeadCount: customMilkingHeads ? Number(customMilkingHeads) : undefined,
  };

  const metrics = calculateMilkMetrics(currentMilkData, barns, categories, rations, dailyPlan);

  // Helper to persist updates to dailyPlan
  const persistChanges = (
    newSessions: MilkSession[],
    newRefusal: number,
    newCustomHeads?: string
  ) => {
    if (!setDailyPlan) return;
    const headsNum = newCustomHeads && Number(newCustomHeads) > 0 ? Number(newCustomHeads) : undefined;
    const updatedMilkProd: MilkProductionData = {
      sessions: newSessions,
      refusalPercent: newRefusal,
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
    persistChanges(updated, refusalPercent, customMilkingHeads);
  };

  const handleSessionTimeChange = (id: string, newTime: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, time: newTime } : s));
    setSessions(updated);
    persistChanges(updated, refusalPercent, customMilkingHeads);
  };

  const handleSessionNameChange = (id: string, newName: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, name: newName } : s));
    setSessions(updated);
    persistChanges(updated, refusalPercent, customMilkingHeads);
  };

  const handleRefusalChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(50, val));
    setRefusalPercent(safeVal);
    persistChanges(sessions, safeVal, customMilkingHeads);
  };

  const handleCustomHeadsChange = (val: string) => {
    setCustomMilkingHeads(val);
    persistChanges(sessions, refusalPercent, val);
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
              <h3 className="text-lg sm:text-xl font-black">إنتاج الحليب ومؤشرات الكفاءة العلفية</h3>
              {isSavedRecently && (
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" /> تم الحفظ
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              تسجيل كميات الحلبات اليومية، نسبة الراجع، وحساب متوسط إنتاج الرأس ومعامل التحويل تلقائياً
            </p>
          </div>
        </div>

        {metrics.feedEfficiency > 0 && (
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/15">
            <span className="text-xs text-blue-200">كفاءة القطيع:</span>
            <span
              className={`px-2.5 py-0.5 rounded-xl text-xs font-black border ${getStatusColor(
                metrics.efficiencyStatus
              )}`}
            >
              {metrics.efficiencyStatus} ({metrics.feedEfficiency} كجم/كجم)
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

          {/* Refusal % & Milking Cows Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feed Refusal % Input */}
            <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <span>نسبة الراجع من الحلاب (%):</span>
                </label>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {metrics.refusalKg.toLocaleString('ar-EG')} كجم راجع
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  disabled={readOnly}
                  value={refusalPercent}
                  onChange={(e) => handleRefusalChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-center text-base font-black text-amber-950 bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
                <span className="text-sm font-bold text-slate-500 shrink-0">%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                الموصى به علمياً: 3% - 5% لضمان الشبع الكامل دون هدر.
              </p>
            </div>

            {/* Milking Cows Count */}
            <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Beef className="w-4 h-4 text-emerald-600" />
                  <span>عدد الأبقار الحلابة:</span>
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {customMilkingHeads ? 'تحديد يدوي' : 'محسوب تلقائياً'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  disabled={readOnly}
                  value={customMilkingHeads || metrics.milkingHeadCount}
                  onChange={(e) => handleCustomHeadsChange(e.target.value)}
                  placeholder={String(metrics.milkingHeadCount)}
                  className="w-full px-3 py-2 text-center text-base font-black text-emerald-950 bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
                <span className="text-sm font-bold text-slate-500 shrink-0">رأس</span>
              </div>
              <p className="text-[11px] text-slate-500">
                محسوب من عنابر الحلاب النشطة ({metrics.milkingHeadCount} رأس).
              </p>
            </div>
          </div>
        </div>

        {/* Right / Calculated Metrics Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Average Milk per Head Card */}
          <div className="bg-gradient-to-bl from-blue-50 to-indigo-50/70 p-4.5 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
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

          {/* Feed Efficiency (معامل التحويل) */}
          <div className="bg-gradient-to-bl from-emerald-50 to-teal-50/70 p-4.5 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">
                معامل التحويل / الكفاءة العلفية (Feed Efficiency)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-950">
                {metrics.feedEfficiency > 0 ? metrics.feedEfficiency : '—'}
              </span>
              <span className="text-xs font-bold text-emerald-800">كجم لبن / كجم علف مأكول</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 border-t border-emerald-200/60">
              <span>العلف المأكول الفعلي:</span>
              <strong className="text-emerald-950 font-black">
                {metrics.actualFeedIntakeKg.toLocaleString('ar-EG')} كجم
              </strong>
            </div>
          </div>

          {/* Feed per Milk Ratio Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">معدل استهلاك العلف لكل 1 كجم حليب</span>
              <span className="text-xs font-black text-slate-800">
                {metrics.feedConversionRatio > 0 ? `${metrics.feedConversionRatio} كجم علف` : '—'}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${Math.min(100, (metrics.feedEfficiency / 2) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
