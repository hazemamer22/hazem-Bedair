import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  FarmSettings,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateCategoryTotalDemand,
  calculateBarnTotalAllocatedKgToday,
  calculateBatchAllocatedKg,
  validateBarnDemand,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { FileSpreadsheet, Printer, Save, CheckCircle2, AlertTriangle, Layers, Home } from 'lucide-react';

interface NutritionReportViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  settings: FarmSettings;
  onPrint?: () => void;
}

export const NutritionReportView: React.FC<NutritionReportViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  mixers,
  rations,
  settings,
  onPrint,
}) => {
  const [engineerNotes, setEngineerNotes] = useState(dailyPlan.notes || '');

  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const totalFarmHeads = activeBarns.reduce((sum, b) => sum + b.headCount, 0);
  const totalFarmDailyDemandKg = activeBarns.reduce((sum, b) => sum + calculateBarnDailyDemand(b), 0);

  const batches = dailyPlan.batches || [];
  const totalBatchesPlannedWeightKg = batches.reduce((sum, b) => sum + b.targetWeightKg, 0);

  const totalAllocatedToBarnsKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan),
    0
  );

  const totalRemainingKg = totalFarmDailyDemandKg - totalAllocatedToBarnsKg;

  const handleSaveNotes = () => {
    setDailyPlan({ ...dailyPlan, notes: engineerNotes });
    alert('تم حفظ ملاحظات التقرير اليومي بنجاح!');
  };

  return (
    <div className="space-y-6">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="تقرير التغذية والتشغيل اليومي الشامل للمزرعة"
        documentSubtitle="متابعة الأداء اليومي للقطعان، أوزان العلف، كفاءة المكسرات واستيفاء العنابر"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            تقرير المهندس الاستشاري لعمليات التغذية اليومية
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ملخص وشامل لكل فئات المزرعة، أعداد الرؤوس، أوزان التوزيع، ومؤشرات أداء التغذية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveNotes}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>حفظ الملاحظات</span>
          </button>
          <button
            onClick={() => onPrint?.() || window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير الشامل</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">إجمالي قطعان المزرعة</span>
          <div className="text-2xl font-black text-slate-900">{totalFarmHeads.toLocaleString('ar-EG')} رأس</div>
          <span className="text-[11px] text-slate-500 font-medium">{activeBarns.length} عنابر نشطة</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">الاحتياج اليومي الكلي</span>
          <div className="text-2xl font-black text-emerald-800">{totalFarmDailyDemandKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-slate-500 font-medium">{(totalFarmDailyDemandKg / 1000).toFixed(2)} طن</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">إجمالي ما تم توزيعه فعليًا</span>
          <div className="text-2xl font-black text-blue-900">{totalAllocatedToBarnsKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-slate-500 font-medium">
            نسبة الإنجاز {totalFarmDailyDemandKg > 0 ? Math.round((totalAllocatedToBarnsKg / totalFarmDailyDemandKg) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">فارق الاحتياج المتبقي/الزيادة</span>
          <div className={`text-2xl font-black ${Math.abs(totalRemainingKg) <= 0.01 ? 'text-emerald-700' : totalRemainingKg > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
            {Math.abs(totalRemainingKg) <= 0.01 ? 'مطابق 100%' : `${totalRemainingKg} كجم`}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {totalRemainingKg > 0 ? 'متبقي للتوزيع' : totalRemainingKg < 0 ? 'زيادة موزعة' : 'استيفاء تام'}
          </span>
        </div>
      </div>

      {/* 1. Category Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          أولاً: البيان التفصيلي حسب الفئات الحيوانية والعلائق
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 border-l border-slate-200">الفئة الحيوانية</th>
                <th className="py-3 px-3 border-l border-slate-200">اسم العليقة</th>
                <th className="py-3 px-3 border-l border-slate-200">عدد العنابر</th>
                <th className="py-3 px-3 border-l border-slate-200">إجمالي عدد الرؤوس</th>
                <th className="py-3 px-3 border-l border-slate-200">الاحتياج اليومي الكلي (كجم)</th>
                <th className="py-3 px-3 border-l border-slate-200">عدد لفات المكسر</th>
                <th className="py-3 px-3">الموزع بالمكسر (كجم)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {categories.map((cat) => {
                const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                const catHeads = catBarns.reduce((sum, b) => sum + b.headCount, 0);
                const catDemand = calculateCategoryTotalDemand(barns, cat.id);
                const ration = rations.find((r) => r.id === cat.rationId);
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                const catAllocated = catBatches.reduce((sum, b) => sum + calculateBatchAllocatedKg(b), 0);

                return (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">{cat.name}</td>
                    <td className="py-3 px-3 text-xs font-bold text-slate-700 border-l border-slate-200">{ration?.name || '—'}</td>
                    <td className="py-3 px-3 font-bold text-slate-700 border-l border-slate-200">{catBarns.length} عنابر</td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-200">{catHeads} رأس</td>
                    <td className="py-3 px-3 font-black text-emerald-900 border-l border-slate-200">{catDemand.toLocaleString('ar-EG')} كجم</td>
                    <td className="py-3 px-3 font-bold text-slate-700 border-l border-slate-200">{catBatches.length} لفات</td>
                    <td className="py-3 px-3 font-black text-slate-900">{catAllocated.toLocaleString('ar-EG')} كجم</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Barn Level Feeding Efficiency Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          ثانياً: تقرير استيفاء ونسب تغذية العنابر تفصيليًا
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 border-l border-slate-200">العنبر</th>
                <th className="py-3 px-3 border-l border-slate-200">الفئة</th>
                <th className="py-3 px-3 border-l border-slate-200">عدد الرؤوس</th>
                <th className="py-3 px-3 border-l border-slate-200">الكمية الأساسية (كجم/رأس)</th>
                <th className="py-3 px-3 border-l border-slate-200">نسبة التغذية %</th>
                <th className="py-3 px-3 border-l border-slate-200">الاحتياج المستهدف (كجم)</th>
                <th className="py-3 px-3 border-l border-slate-200">الموزع اليوم فعليًا (كجم)</th>
                <th className="py-3 px-3">حالة الاستيفاء / الفارق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {activeBarns.map((barn) => {
                const category = categories.find((c) => c.id === barn.categoryId);
                const demand = calculateBarnDailyDemand(barn);
                const allocated = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan);
                const val = validateBarnDemand(barn, allocated);

                return (
                  <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">
                      {barn.number} {barn.name && `(${barn.name})`}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-emerald-800 border-l border-slate-200">{category?.name}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 border-l border-slate-200">{barn.headCount} رأس</td>
                    <td className="py-3 px-3 font-bold text-slate-700 border-l border-slate-200">{barn.baseFeedKgPerHead} كجم</td>
                    <td className="py-3 px-3 border-l border-slate-200">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-xs">{barn.feedingRatioPercent}%</span>
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">{demand.toLocaleString('ar-EG')} كجم</td>
                    <td className="py-3 px-3 font-black text-emerald-900 border-l border-slate-200">{allocated.toLocaleString('ar-EG')} كجم</td>
                    <td className="py-3 px-3 font-bold text-xs">
                      {val.status === 'exact' ? (
                        <span className="text-emerald-700">✓ استيفاء كامل (100%)</span>
                      ) : val.status === 'under' ? (
                        <span className="text-amber-700">متبقي {Math.abs(val.differenceKg)} كجم</span>
                      ) : (
                        <span className="text-rose-700">زيادة {val.differenceKg} كجم</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineer Remarks Input & Signatures */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <h4 className="font-extrabold text-slate-900 text-sm">ثالثًا: ملاحظات وتوجيهات مهندس التغذية للوردية القادمة</h4>
        <textarea
          rows={3}
          value={engineerNotes}
          onChange={(e) => setEngineerNotes(e.target.value)}
          placeholder="أدخل أي ملاحظات فنية بخصوص استهلاك العلف، صحة الكرش، جودة السيلاج أو توجيهات التحضير..."
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600 print:bg-transparent print:border-none"
        />

        <PrintSignatures settings={settings} />
      </div>
    </div>
  );
};
