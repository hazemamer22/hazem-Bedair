import React from 'react';
import { AnimalCategory, Barn, Ration, Mixer, DailyOperationPlan } from '../../types';
import {
  calculateBarnDailyDemand,
  calculateCategoryTotalDemand,
  getBarnDailyState,
} from '../../utils/calculations';
import { X, Beef, Layers, Scale, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

interface HerdsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AnimalCategory[];
  barns: Barn[];
  rations: Ration[];
  mixers: Mixer[];
  dailyPlan: DailyOperationPlan;
}

export const HerdsBreakdownModal: React.FC<HerdsBreakdownModalProps> = ({
  isOpen,
  onClose,
  categories,
  barns,
  rations,
  mixers,
  dailyPlan,
}) => {
  if (!isOpen) return null;

  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const totalFarmHeads = activeBarns.reduce((sum, b) => {
    const bState = getBarnDailyState(b, dailyPlan);
    return sum + (bState.headCount || 0);
  }, 0);

  const totalFarmDemandKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan);
  }, 0);

  // Group data by category
  const categoryStats = categories.map((cat) => {
    const catBarns = activeBarns.filter((b) => b.categoryId === cat.id);
    const catHeads = catBarns.reduce((sum, b) => {
      const bState = getBarnDailyState(b, dailyPlan);
      return sum + (bState.headCount || 0);
    }, 0);
    const catDemandKg = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
    const ration = rations.find((r) => r.id === cat.rationId);
    const mixer = mixers.find((m) => m.id === cat.mixerId);
    const headsPercent = totalFarmHeads > 0 ? (catHeads / totalFarmHeads) * 100 : 0;
    const demandPercent = totalFarmDemandKg > 0 ? (catDemandKg / totalFarmDemandKg) * 100 : 0;

    return {
      category: cat,
      barns: catBarns,
      heads: catHeads,
      headsPercent: Math.round(headsPercent * 10) / 10,
      demandKg: catDemandKg,
      demandPercent: Math.round(demandPercent * 10) / 10,
      ration,
      mixer,
    };
  }).filter((item) => item.heads > 0 || item.barns.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 border border-white/20">
              <Beef className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black">تفصيل قطعان وفئات المزرعة</h2>
              <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
                توزيع أعداد الرؤوس والعنابر والاحتياج اليومي بحسب نوع الفئة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Cards */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">إجمالي الرؤوس</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
              {totalFarmHeads.toLocaleString('ar-EG')}{' '}
              <span className="text-xs font-bold text-slate-500">رأس</span>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">الفئات النشطة</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {categoryStats.length}{' '}
              <span className="text-xs font-bold text-slate-500">فئات</span>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">العنابر النشطة</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {activeBarns.length}{' '}
              <span className="text-xs font-bold text-slate-500">عنبر</span>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">إجمالي العلف اليومي</span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
              {(totalFarmDemandKg / 1000).toFixed(1)}{' '}
              <span className="text-xs font-bold text-amber-900">طن</span>
            </div>
          </div>
        </div>

        {/* Content Body: Category Cards / Table */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryStats.map((stat) => (
              <div
                key={stat.category.id}
                className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                      فئة حيوانية
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {stat.category.name}
                    </h3>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-emerald-950">
                      {stat.heads.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-xs font-bold text-slate-500 mr-1">رأس</span>
                    <div className="text-xs font-black text-emerald-700">
                      {stat.headsPercent}% من القطيع
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(4, stat.headsPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium">العنابر:</span>{' '}
                    <strong className="text-slate-800 font-black">
                      {stat.barns.length} عنابر
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">استهلاك اليوم:</span>{' '}
                    <strong className="text-emerald-800 font-black">
                      {stat.demandKg.toLocaleString('ar-EG')} كجم
                    </strong>
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-slate-400 font-medium">العليقة:</span>{' '}
                    <strong className="text-slate-800 font-bold">
                      {stat.ration?.name || 'غير محددة'}
                    </strong>
                  </div>
                </div>

                {/* Barn Badges */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                    عنابر الفئة وأعداد الرؤوس:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {stat.barns.length === 0 ? (
                      <span className="text-xs text-slate-400">لا توجد عنابر نشطة</span>
                    ) : (
                      stat.barns.map((barn) => {
                        const bState = getBarnDailyState(barn, dailyPlan);
                        return (
                          <span
                            key={barn.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                          >
                            <Building2 className="w-3 h-3 text-emerald-600" />
                            <span>{bState.displayNumber || barn.number}</span>
                            <span className="text-emerald-700 text-[11px] font-black">
                              ({bState.headCount} رأس)
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            * يتم تحديث هذه الأرقام والنسب تلقائيًا وفورياً مع أي تعديل في عنابر المزرعة أو الخطة اليومية.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
