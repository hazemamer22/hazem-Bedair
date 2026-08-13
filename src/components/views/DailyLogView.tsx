import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
} from '../../types';
import {
  loadDailyPlan,
  saveDailyPlan,
  getAllPlanDates,
} from '../../services/storage';
import {
  calculateBarnDailyDemand,
  calculateBatchAllocatedKg,
} from '../../utils/calculations';
import { History, Calendar, Copy, ChevronRight, CheckCircle2, Layers } from 'lucide-react';

interface DailyLogViewProps {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  currentDate,
  setCurrentDate,
  categories,
  barns,
  mixers,
  rations,
}) => {
  const planDates = getAllPlanDates();
  const [inspectDate, setInspectDate] = useState<string>(currentDate);

  const inspectedPlan = loadDailyPlan(inspectDate);
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const totalFarmHeads = activeBarns.reduce((sum, b) => sum + b.headCount, 0);
  const totalFarmDailyDemandKg = activeBarns.reduce((sum, b) => sum + calculateBarnDailyDemand(b), 0);

  const batches = inspectedPlan.batches || [];
  const totalInspectedBatchWeightKg = batches.reduce((s, b) => s + b.targetWeightKg, 0);
  const totalInspectedAllocatedKg = batches.reduce((s, b) => s + calculateBatchAllocatedKg(b), 0);

  const handleCopyPlanToToday = () => {
    if (inspectDate === currentDate) {
      alert('أنت بالفعل تعرض خطة اليوم الحالي.');
      return;
    }

    const clonedBatches = (inspectedPlan.batches || []).map((b) => ({
      ...b,
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'مخططة' as const,
    }));

    const newTodayPlan: DailyOperationPlan = {
      date: currentDate,
      batches: clonedBatches,
      notes: `تم نسخ الخطة من تاريخ ${inspectDate}`,
    };

    saveDailyPlan(newTodayPlan);
    alert('تم نسخ الخطة اليومية بنجاح إلى اليوم الحالي!');
    setCurrentDate(currentDate);
  };

  return (
    <div className="space-y-6">
      {/* Date Archives & Navigation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              أرشيف السجل اليومي لمراجعة ومطابقة الأيام السابقة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              استعرض أي يوم سابق لمراجعة أوزان اللفات، تفريغ العنابر، ونسخ الخطط السابقة للسرعة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPlanToToday}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Copy className="w-4 h-4 text-slate-950" />
              <span>نسخ خطة ({inspectDate}) إلى اليوم ({currentDate})</span>
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">اختر التاريخ لمعاينة السجل اليومي:</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={inspectDate}
              onChange={(e) => e.target.value && setInspectDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 cursor-pointer"
            />

            <span className="text-xs text-slate-400 font-bold px-2">أو اختر من السجلات السابقة:</span>

            {planDates.map((dateStr) => {
              const isSelected = dateStr === inspectDate;
              return (
                <button
                  key={dateStr}
                  onClick={() => setInspectDate(dateStr)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {dateStr} {dateStr === currentDate && '(اليوم)'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inspected Date Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">التاريخ المعروض</span>
          <div className="text-xl font-black text-slate-900 mt-1">{inspectDate}</div>
          <span className="text-[11px] text-emerald-700 font-medium">سجل نشط ومحفوظ</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">عدد اللفات المحضرة</span>
          <div className="text-xl font-black text-slate-900 mt-1">{batches.length} لفات مكسر</div>
          <span className="text-[11px] text-slate-500 font-medium">
            إجمالي الوزن = {totalInspectedBatchWeightKg.toLocaleString('ar-EG')} كجم
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">العلف الموزع على العنابر</span>
          <div className="text-xl font-black text-emerald-800 mt-1">
            {totalInspectedAllocatedKg.toLocaleString('ar-EG')} كجم
          </div>
          <span className="text-[11px] text-slate-500 font-medium">مفرغ بالعنابر</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">قطعان المزرعة المسجلة</span>
          <div className="text-xl font-black text-slate-900 mt-1">{totalFarmHeads} رأس</div>
          <span className="text-[11px] text-slate-500 font-medium">{activeBarns.length} عنابر</span>
        </div>
      </div>

      {/* Inspected Day Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="font-extrabold text-slate-800 text-base">
            لفات وسجلات يوم ({inspectDate})
          </h4>
          <span className="text-xs font-bold text-slate-500">عدد اللفات: {batches.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم اللفة</th>
                <th className="py-3 px-4">التوقيت</th>
                <th className="py-3 px-4">الفئة الحيوانية</th>
                <th className="py-3 px-4">المكسر</th>
                <th className="py-3 px-4">الوزن المستهدف</th>
                <th className="py-3 px-4">الموزع فعليًا</th>
                <th className="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد لفات مجهزة لهذا التاريخ.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const cat = categories.find((c) => c.id === b.categoryId);
                  const mixer = mixers.find((m) => m.id === b.mixerId);
                  const allocatedKg = calculateBatchAllocatedKg(b);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-emerald-900">{b.batchNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{b.time}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{cat?.name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{mixer?.name}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{b.targetWeightKg.toLocaleString('ar-EG')} كجم</td>
                      <td className="py-3.5 px-4 font-black text-emerald-900">{allocatedKg.toLocaleString('ar-EG')} كجم</td>
                      <td className="py-3.5 px-4 font-bold text-xs">{b.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
