import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  RawMaterial,
  ActiveTab,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateCategoryTotalDemand,
  calculateBatchAllocatedKg,
  calculateBarnTotalAllocatedKgToday,
  validateBatch,
  validateBarnDemand,
  getBarnDailyState,
} from '../../utils/calculations';
import {
  Beef,
  Scale,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Layers,
  Truck,
  ClipboardList,
  ExternalLink,
  ChevronLeft,
  Milk,
} from 'lucide-react';
import { HerdsBreakdownModal } from '../modals/HerdsBreakdownModal';
import { DailyRawMaterialsModal } from '../modals/DailyRawMaterialsModal';
import { MilkProductionSection } from '../MilkProductionSection';

interface DashboardViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan?: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials?: RawMaterial[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectBatchForOrder?: (batchId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  mixers,
  rations,
  rawMaterials = [],
  setActiveTab,
  onSelectBatchForOrder,
}) => {
  // Modal states
  const [isHerdsModalOpen, setIsHerdsModalOpen] = useState(false);
  const [isRawMaterialsModalOpen, setIsRawMaterialsModalOpen] = useState(false);

  // 1. Overall Metrics
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const totalFarmHeads = activeBarns.reduce((sum, b) => {
    const bState = getBarnDailyState(b, dailyPlan);
    return sum + (bState.headCount || 0);
  }, 0);

  const totalFarmDailyDemandKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );

  const batches = dailyPlan.batches || [];
  const totalBatchesPlanned = batches.length;
  const totalPlannedBatchesKg = batches.reduce((sum, b) => sum + (b.targetWeightKg || 0), 0);

  // Total allocated to barns across batches
  const totalAllocatedKgToday = activeBarns.reduce(
    (sum, b) => sum + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan, barns, categories, rations),
    0
  );

  // Fulfillment %
  const overallFulfillmentPercent = totalFarmDailyDemandKg > 0
    ? Math.min(100, Math.round((totalAllocatedKgToday / totalFarmDailyDemandKg) * 100))
    : 0;

  // Validation Checks
  const batchValidationAlerts: { batchNumber: string; message: string; type: 'warning' | 'error' }[] = [];
  batches.forEach((batch) => {
    const mixer = mixers.find((m) => m.id === batch.mixerId);
    const res = validateBatch(batch, mixer?.maxCapacityKg);
    if (res.status !== 'exact') {
      batchValidationAlerts.push({
        batchNumber: batch.batchNumber,
        message: res.message,
        type: res.status === 'over' ? 'error' : 'warning',
      });
    }
    if (res.exceedsMixerCapacity) {
      batchValidationAlerts.push({
        batchNumber: batch.batchNumber,
        message: `يتجاوز السعة القصوى للمكسر (${mixer?.maxCapacityKg} كجم) بـ ${res.mixerCapacityOverKg} كجم`,
        type: 'error',
      });
    }
  });

  const barnValidationAlerts: { barnName: string; message: string; type: 'warning' | 'error' }[] = [];
  activeBarns.forEach((barn) => {
    const allocated = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan, barns, categories, rations);
    const res = validateBarnDemand(barn, allocated, categories, rations, dailyPlan);
    if (res.status !== 'exact') {
      const bState = getBarnDailyState(barn, dailyPlan);
      barnValidationAlerts.push({
        barnName: `${bState.displayNumber || barn.number} (${bState.displayName || barn.name || ''})`,
        message: res.message,
        type: res.status === 'over' ? 'error' : 'warning',
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'تم التوزيع':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> تم التوزيع</span>;
      case 'تم التحضير':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><CheckCircle2 className="w-3.5 h-3.5" /> جاهز للتوزيع</span>;
      case 'قيد التحضير':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><TrendingUp className="w-3.5 h-3.5" /> جاري التحضير</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">مخططة</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Heads (Clickable -> Opens Breakdown Modal) */}
        <button
          type="button"
          onClick={() => setIsHerdsModalOpen(true)}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all text-right group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                  إجمالي قطعان المزرعة
                </p>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totalFarmHeads.toLocaleString('ar-EG')}{' '}
                <span className="text-sm font-bold text-slate-500">رأس</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center justify-center shadow-2xs">
              <Beef className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full text-xs">
            <span className="text-emerald-700 font-black">
              {activeBarns.length} عنابر نشطة
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg group-hover:bg-emerald-100 transition-colors">
              عرض تفصيل القطعان ↗
            </span>
          </div>
        </button>

        {/* Total Daily Feed Required (Clickable -> Opens Raw Materials Breakdown Modal) */}
        <button
          type="button"
          onClick={() => setIsRawMaterialsModalOpen(true)}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-500 hover:shadow-md transition-all text-right group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-500 group-hover:text-amber-700 transition-colors">
                  الاحتياج اليومي الإجمالي
                </p>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-amber-700 mt-1">
                {totalFarmDailyDemandKg.toLocaleString('ar-EG')}{' '}
                <span className="text-sm font-bold text-amber-900">كجم</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all flex items-center justify-center shadow-2xs">
              <Scale className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full text-xs">
            <span className="text-slate-600 font-bold">
              {(totalFarmDailyDemandKg / 1000).toFixed(2)} طن علف طازج
            </span>
            <span className="text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded-lg group-hover:bg-amber-100 transition-colors">
              عرض تفصيل الخامات ↗
            </span>
          </div>
        </button>

        {/* Batches Planned */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">لفات المكسر المخططة اليوم</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totalBatchesPlanned} <span className="text-sm font-bold text-slate-500">لفات</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>إجمالي وزن اللفات:</span>
            <strong className="text-slate-900 font-bold">
              {totalPlannedBatchesKg.toLocaleString('ar-EG')} كجم
            </strong>
          </div>
        </div>

        {/* Total Allocated & Fulfillment Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">نسبة تغذية المزرعة اليوم</p>
              <h3 className="text-2xl font-black text-emerald-800 mt-1">
                {overallFulfillmentPercent}%
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>الموزع في اللفات:</span>
            <strong className="text-emerald-800 font-bold">
              {totalAllocatedKgToday.toLocaleString('ar-EG')} كجم
            </strong>
          </div>
        </div>
      </div>

      {/* Validation & Operational Alerts Box */}
      {(batchValidationAlerts.length > 0 || barnValidationAlerts.length > 0) && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>تنبيهات التدقيق الرياضي للخطة والتوزيع اليومي:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium text-amber-950">
            {batchValidationAlerts.map((alt, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-amber-100/80 px-3 py-1.5 rounded-lg">
                <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
                <span><strong className="text-amber-950 font-bold">{alt.batchNumber}:</strong> {alt.message}</span>
              </div>
            ))}
            {barnValidationAlerts.map((alt, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-amber-100/80 px-3 py-1.5 rounded-lg">
                <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
                <span><strong className="text-amber-950 font-bold">{alt.barnName}:</strong> {alt.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Milk Production & Feed Efficiency Section */}
      <MilkProductionSection
        dailyPlan={dailyPlan}
        setDailyPlan={setDailyPlan}
        categories={categories}
        barns={barns}
        rations={rations}
      />

      {/* Today's Operational Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-700" />
              خطة تشغيل المكسر اليومية ({dailyPlan.date})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض جميع لفات المكسر المجهزة للتوزيع على العنابر
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('daily_plan')}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              + إضافة / تعديل لفات المكسر
            </button>
            <button
              onClick={() => setActiveTab('distributions')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              توزيع اللفات على العنابر
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100/80 text-slate-600 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم اللفة</th>
                <th className="py-3 px-4">التوقيت</th>
                <th className="py-3 px-4">الفئة الحيوانية</th>
                <th className="py-3 px-4">المكسر المخصص</th>
                <th className="py-3 px-4">وزن اللفة (كجم)</th>
                <th className="py-3 px-4">التوزيع على العنابر</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات Quick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد لفات مكسر مضافة لهذا اليوم. اضغط "إضافة لفات المكسر" لإنشاء جدول اليوم.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const category = categories.find((c) => c.id === batch.categoryId);
                  const mixer = mixers.find((m) => m.id === batch.mixerId);
                  const allocatedKg = calculateBatchAllocatedKg(batch, barns, categories, rations, dailyPlan);
                  const val = validateBatch(batch, mixer?.maxCapacityKg);

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-emerald-900">{batch.batchNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{batch.time}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                          {category?.name || 'عام'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">{mixer?.name || 'مكسر'}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {batch.targetWeightKg.toLocaleString('ar-EG')} كجم
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-xs font-bold text-slate-800">
                            موزع: {allocatedKg.toLocaleString('ar-EG')} / {batch.targetWeightKg.toLocaleString('ar-EG')} كجم
                          </div>
                          {val.status === 'exact' ? (
                            <span className="text-[11px] text-emerald-600 font-bold">✓ تم التوزيع بالكامل</span>
                          ) : val.status === 'under' ? (
                            <span className="text-[11px] text-amber-600 font-bold">⚠️ متبقي {Math.abs(val.differenceKg)} كجم</span>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-bold">🛑 زيادة {val.differenceKg} كجم</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(batch.status)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              onSelectBatchForOrder?.(batch.id);
                              setActiveTab('prep_orders');
                            }}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="أمر تحضير المكسر"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>التحضير</span>
                          </button>
                          <button
                            onClick={() => setActiveTab('driver_sheet')}
                            className="p-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="كشف السائق"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>السائق</span>
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

      {/* Animal Categories & Barn Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-lg">حالة تغذية الفئات والعنابر بالمزرعة</h3>
          <button
            onClick={() => setIsHerdsModalOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors"
          >
            <span>عرض تفاصيل جميع القطعان</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const catBarns = barns.filter((b) => b.categoryId === category.id && b.status === 'نشط');
            const catTotalHeads = catBarns.reduce((sum, b) => {
              const bState = getBarnDailyState(b, dailyPlan);
              return sum + (bState.headCount || 0);
            }, 0);
            const catDemandKg = calculateCategoryTotalDemand(barns, category.id, categories, rations, dailyPlan);
            const ration = rations.find((r) => r.id === category.rationId);
            const mixer = mixers.find((m) => m.id === category.mixerId);

            // Batches for this category
            const catBatches = batches.filter((b) => b.categoryId === category.id);
            const catPlannedKg = catBatches.reduce((sum, b) => sum + b.targetWeightKg, 0);

            return (
              <div key={category.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      فئة حيوانية
                    </span>
                    <h4 className="font-black text-lg text-slate-900 mt-1">{category.name}</h4>
                  </div>
                  <div className="text-left text-xs font-bold text-slate-600">
                    <div>{catTotalHeads} رأس</div>
                    <div className="text-emerald-700">{catBarns.length} عنابر</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">العليقة المرتبطة:</span>
                    <span className="font-bold text-slate-800">{ration?.name || 'غير محددة'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">المكسر المخصص:</span>
                    <span className="font-bold text-slate-800">{mixer?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-200 pt-1.5">
                    <span>الاحتياج اليومي:</span>
                    <span className="text-emerald-800 font-extrabold">{catDemandKg.toLocaleString('ar-EG')} كجم</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>المخطط في المكسر:</span>
                    <span className={catPlannedKg >= catDemandKg ? 'text-emerald-700 font-extrabold' : 'text-amber-600 font-extrabold'}>
                      {catPlannedKg.toLocaleString('ar-EG')} كجم ({catBatches.length} لفات)
                    </span>
                  </div>
                </div>

                {/* Barn list mini pills */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 mb-1.5">العنابر التابعة للفئة:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {catBarns.length === 0 ? (
                      <span className="text-xs text-slate-400">لا توجد عنابر نشطة</span>
                    ) : (
                      catBarns.map((barn) => {
                        const bState = getBarnDailyState(barn, dailyPlan);
                        const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                        const allocated = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan, barns, categories, rations);
                        const isOk = Math.abs(allocated - demand) <= 0.5;
                        return (
                          <div
                            key={barn.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                              isOk
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : allocated > demand
                                ? 'bg-rose-50 text-rose-900 border-rose-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            <span>{bState.displayNumber || barn.number}</span>
                            <span className="text-[10px] opacity-75">({allocated}/{demand}كجم)</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <HerdsBreakdownModal
        isOpen={isHerdsModalOpen}
        onClose={() => setIsHerdsModalOpen(false)}
        categories={categories}
        barns={barns}
        rations={rations}
        mixers={mixers}
        dailyPlan={dailyPlan}
      />

      <DailyRawMaterialsModal
        isOpen={isRawMaterialsModalOpen}
        onClose={() => setIsRawMaterialsModalOpen(false)}
        dailyPlan={dailyPlan}
        categories={categories}
        barns={barns}
        rations={rations}
        rawMaterials={rawMaterials}
        onNavigateToWarehouse={() => setActiveTab('warehouse')}
      />
    </div>
  );
};

