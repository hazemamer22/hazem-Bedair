import React, { useState, useEffect, useMemo } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getMixerDisplayName,
  getRationDisplayName,
} from '../../context/LanguageContext';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  RawMaterial,
  ActiveTab,
  FarmSettings,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateCategoryTotalDemand,
  calculateBatchAllocatedKg,
  calculateBarnTotalAllocatedKgToday,
  validateBatch,
  validateBarnDemand,
  getBarnDailyState,
  getBatchDerivedTargetWeightKg,
  doesBatchBelongToCategory,
} from '../../utils/calculations';
import { sanitizeBatches, saveDailyPlan } from '../../services/storage';
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
  RotateCcw,
  Sparkles,
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
  settings?: FarmSettings;
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
  settings,
  setActiveTab,
  onSelectBatchForOrder,
}) => {
  const { language, isRtl, t } = useLanguage();
  const isEn = language === 'en';

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

  // batches from dailyPlan
  const batches = dailyPlan.batches || [];

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSyncBatches = () => {
    const { batches: cleaned } = sanitizeBatches(dailyPlan.batches || [], barns, categories, rations, dailyPlan);
    if (setDailyPlan) {
      const updated = { ...dailyPlan, batches: cleaned };
      setDailyPlan(updated);
      saveDailyPlan(updated);
    }
    const batchCountLabel = isEn
      ? `${cleaned.length} ${cleaned.length === 1 ? 'batch' : 'batches'}`
      : `${cleaned.length} ${cleaned.length === 1 ? 'لفة' : cleaned.length <= 10 ? 'لفات' : 'لفة'}`;
    setSyncFeedback(
      isEn
        ? `Batches schedule cleaned & synchronized: ${batchCountLabel} verified against actual pen demands!`
        : `تم ضبط وتطهير جدول اللفات بنجاح: تم اعتماد ${batchCountLabel} ومزامنتها مع احتياج العنابر الفعلي وحذف أي تكرار!`
    );
    setTimeout(() => setSyncFeedback(null), 6000);
  };

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
        message: isEn
          ? `Exceeds max mixer capacity (${mixer?.maxCapacityKg} kg) by ${res.mixerCapacityOverKg} kg`
          : `يتجاوز السعة القصوى للمكسر (${mixer?.maxCapacityKg} كجم) بـ ${res.mixerCapacityOverKg} كجم`,
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> {isEn ? 'Distributed' : 'تم التوزيع'}</span>;
      case 'تم التحضير':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><CheckCircle2 className="w-3.5 h-3.5" /> {isEn ? 'Ready for Drop' : 'جاهز للتوزيع'}</span>;
      case 'قيد التحضير':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><TrendingUp className="w-3.5 h-3.5" /> {isEn ? 'In Prep' : 'جاري التحضير'}</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{isEn ? 'Planned' : 'مخططة'}</span>;
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
          className={`bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between ${
            isEn ? 'text-left' : 'text-right'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                  {isEn ? 'Total Farm Herds' : 'إجمالي قطعان المزرعة'}
                </p>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totalFarmHeads.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-sm font-bold text-slate-500">{isEn ? 'heads' : 'رأس'}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center justify-center shadow-2xs">
              <Beef className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full text-xs">
            <span className="text-emerald-700 font-black">
              {activeBarns.length} {isEn ? 'active pens' : 'عنابر نشطة'}
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg group-hover:bg-emerald-100 transition-colors">
              {isEn ? 'View Herds ↗' : 'عرض تفصيل القطعان ↗'}
            </span>
          </div>
        </button>

        {/* Total Daily Feed Required (Clickable -> Opens Raw Materials Breakdown Modal) */}
        <button
          type="button"
          onClick={() => setIsRawMaterialsModalOpen(true)}
          className={`bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-500 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between ${
            isEn ? 'text-left' : 'text-right'
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-500 group-hover:text-amber-700 transition-colors">
                  {isEn ? 'Total Daily Feed Demand' : 'الاحتياج اليومي الإجمالي'}
                </p>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-amber-700 mt-1">
                {totalFarmDailyDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-sm font-bold text-amber-900">{isEn ? 'kg' : 'كجم'}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all flex items-center justify-center shadow-2xs">
              <Scale className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full text-xs">
            <span className="text-slate-600 font-bold">
              {(totalFarmDailyDemandKg / 1000).toFixed(2)} {isEn ? 'tons as-fed' : 'طن علف طازج'}
            </span>
            <span className="text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded-lg group-hover:bg-amber-100 transition-colors">
              {isEn ? 'View Ingredients ↗' : 'عرض تفصيل الخامات ↗'}
            </span>
          </div>
        </button>

        {/* Batches Planned */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEn ? 'Planned Batches Today' : 'لفات المكسر المخططة اليوم'}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {totalBatchesPlanned} <span className="text-sm font-bold text-slate-500">{isEn ? 'batches' : 'لفات'}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{isEn ? 'Total Batch Weight:' : 'إجمالي وزن اللفات:'}</span>
            <strong className="text-slate-900 font-bold">
              {totalPlannedBatchesKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </strong>
          </div>
        </div>

        {/* Total Allocated & Fulfillment Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">{isEn ? 'Herd Feeding Fulfillment' : 'نسبة تغذية المزرعة اليوم'}</p>
              <h3 className="text-2xl font-black text-emerald-800 mt-1">
                {overallFulfillmentPercent}%
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{isEn ? 'Allocated in Batches:' : 'الموزع في اللفات:'}</span>
            <strong className="text-emerald-800 font-bold">
              {totalAllocatedKgToday.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </strong>
          </div>
        </div>
      </div>

      {/* Validation & Operational Alerts Box */}
      {(batchValidationAlerts.length > 0 || barnValidationAlerts.length > 0) && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>{isEn ? 'Cross-Check & Mathematical Validation Alerts:' : 'تنبيهات التدقيق الرياضي للخطة والتوزيع اليومي:'}</span>
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
        rawMaterials={rawMaterials}
        settings={settings}
      />

      {/* Today's Operational Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-700" />
              {isEn ? `Daily Mixer Operations Plan (${dailyPlan.date})` : `خطة تشغيل المكسر اليومية (${dailyPlan.date})`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn ? 'View all scheduled TMR mixer batches and pen delivery status' : 'عرض جميع لفات المكسر المجهزة للتوزيع على العنابر'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSyncBatches}
              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isEn ? 'Clean duplicates and sync batch weights with actual pen requirements' : 'إزالة أي تكرار وضبط ومزامنة أوزان اللفات مع الاحتياج الفعلي للعنابر فورياً'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {isEn ? 'Sync & Clean Batches' : 'مزامنة وتطهير اللفات'}
                {batches.length > 0 ? ` (${batches.length} ${isEn ? 'batches' : batches.length === 1 ? 'لفة' : batches.length <= 10 ? 'لفات' : 'لفة'})` : ''}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('daily_plan')}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              {isEn ? '+ Add / Edit Mixer Batches' : '+ إضافة / تعديل لفات المكسر'}
            </button>
            <button
              onClick={() => setActiveTab('distributions')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              {isEn ? 'Pen Batch Allocations' : 'توزيع اللفات على العنابر'}
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mx-5 my-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isEn ? 'text-left' : 'text-right'}`}>
            <thead className="bg-slate-100/80 text-slate-600 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{isEn ? 'Batch #' : 'رقم اللفة'}</th>
                <th className="py-3 px-4">{isEn ? 'Time' : 'التوقيت'}</th>
                <th className="py-3 px-4">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
                <th className="py-3 px-4">{isEn ? 'Assigned Mixer' : 'المكسر المخصص'}</th>
                <th className="py-3 px-4">{isEn ? 'Batch Wt (kg)' : 'وزن اللفة (كجم)'}</th>
                <th className="py-3 px-4">{isEn ? 'Pen Allocations' : 'التوزيع على العنابر'}</th>
                <th className="py-3 px-4">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="py-3 px-4 text-center">{isEn ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isEn
                      ? 'No mixer batches added for today. Click "+ Add / Edit Mixer Batches" to configure schedule.'
                      : 'لا توجد لفات مكسر مضافة لهذا اليوم. اضغط "إضافة لفات المكسر" لإنشاء جدول اليوم.'}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const category = categories.find((c) => c.id === batch.categoryId) || categories.find((c) => doesBatchBelongToCategory(batch, c, barns));
                  const mixer = mixers.find((m) => m.id === batch.mixerId);
                  const allocatedKg = calculateBatchAllocatedKg(batch, barns, categories, rations, dailyPlan);
                  const effWeight = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
                  const targetWeightKg = effWeight > 0 ? effWeight : (batch.targetWeightKg || 0);
                  const val = validateBatch(batch, mixer?.maxCapacityKg, barns, categories, rations, dailyPlan);

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-emerald-900">{batch.batchNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{batch.time}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                          {category?.name || (isEn ? 'General' : 'عام')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">{mixer?.name || (isEn ? 'Mixer' : 'مكسر')}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {targetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-xs font-bold text-slate-800">
                            {isEn ? 'Allocated: ' : 'موزع: '}
                            {allocatedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} / {targetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                          </div>
                          {val.status === 'exact' ? (
                            <span className="text-[11px] text-emerald-600 font-bold">{isEn ? '✓ Fully Allocated' : '✓ تم التوزيع بالكامل'}</span>
                          ) : val.status === 'under' ? (
                            <span className="text-[11px] text-amber-600 font-bold">{isEn ? `⚠️ Remaining ${Math.abs(val.differenceKg)} kg` : `⚠️ متبقي ${Math.abs(val.differenceKg)} كجم`}</span>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-bold">{isEn ? `🛑 Over by ${val.differenceKg} kg` : `🛑 زيادة ${val.differenceKg} كجم`}</span>
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
                            title={isEn ? 'Mixer Preparation Order' : 'أمر تحضير المكسر'}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Prep' : 'التحضير'}</span>
                          </button>
                          <button
                            onClick={() => setActiveTab('driver_sheet')}
                            className="p-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title={isEn ? 'Driver Sheet' : 'كشف السائق'}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Driver' : 'السائق'}</span>
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
          <h3 className="font-bold text-slate-800 text-lg">
            {isEn ? 'Herd & Barn Feeding Overview' : 'حالة تغذية الفئات والعنابر بالمزرعة'}
          </h3>
          <button
            onClick={() => setIsHerdsModalOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors"
          >
            <span>{isEn ? 'View All Herds Breakdown' : 'عرض تفاصيل جميع القطعان'}</span>
            <ChevronLeft className={`w-4 h-4 ${isEn ? 'rotate-180' : ''}`} />
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
                      {isEn ? 'Animal Category' : 'فئة حيوانية'}
                    </span>
                    <h4 className="font-black text-lg text-slate-900 mt-1">{getCategoryDisplayName(category.name, isEn)}</h4>
                  </div>
                  <div className={`text-xs font-bold text-slate-600 ${isEn ? 'text-right' : 'text-left'}`}>
                    <div>{catTotalHeads} {isEn ? 'heads' : 'رأس'}</div>
                    <div className="text-emerald-700">{catBarns.length} {isEn ? 'pens' : 'عنابر'}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Linked Ration:' : 'العليقة المرتبطة:'}</span>
                    <span className="font-bold text-slate-800">
                      {ration ? getRationDisplayName(ration.name, isEn) : (isEn ? 'Not specified' : 'غير محددة')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Assigned Mixer:' : 'المكسر المخصص:'}</span>
                    <span className="font-bold text-slate-800">
                      {mixer ? getMixerDisplayName(mixer.name, isEn) : (isEn ? 'Not specified' : 'غير محدد')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-200 pt-1.5">
                    <span>{isEn ? 'Daily Demand:' : 'الاحتياج اليومي:'}</span>
                    <span className="text-emerald-800 font-extrabold">{catDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>{isEn ? 'Planned in Mixer:' : 'المخطط في المكسر:'}</span>
                    <span className={catPlannedKg >= catDemandKg ? 'text-emerald-700 font-extrabold' : 'text-amber-600 font-extrabold'}>
                      {catPlannedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({catBatches.length} {isEn ? 'batches' : 'لفات'})
                    </span>
                  </div>
                </div>

                {/* Barn list mini pills */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 mb-1.5">{isEn ? 'Associated Pens:' : 'العنابر التابعة للفئة:'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {catBarns.length === 0 ? (
                      <span className="text-xs text-slate-400">{isEn ? 'No active pens' : 'لا توجد عنابر نشطة'}</span>
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
                            <span>{getBarnNumberDisplayName(bState.displayNumber || barn.number, isEn)}</span>
                            <span className="text-[10px] opacity-75">({allocated}/{demand}{isEn ? 'kg' : 'كجم'})</span>
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

