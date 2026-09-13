import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  FarmSettings,
  RawMaterial,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateCategoryTotalDemand,
  calculateBarnTotalAllocatedKgToday,
  calculateBatchAllocatedKg,
  calculateDairyFinancials,
  calculateFatteningFinancials,
  calculateRationCostPerKg,
  getBarnDailyState,
  validateBarnDemand,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportNutritionReportToExcel } from '../../utils/excelExport';
import { useFeedback } from '../../context/FeedbackContext';
import {
  FileSpreadsheet,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Home,
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  Coins,
  Percent,
  Wheat,
} from 'lucide-react';

interface NutritionReportViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials?: RawMaterial[];
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
  rawMaterials = [],
  settings,
  onPrint,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const [engineerNotes, setEngineerNotes] = useState(dailyPlan.notes || '');

  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const totalFarmHeads = activeBarns.reduce((sum, b) => {
    const s = getBarnDailyState(b, dailyPlan);
    return sum + s.headCount;
  }, 0);

  const totalFarmDailyDemandKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );

  const totalFarmRefusalKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan),
    0
  );

  const totalFarmIntakeKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan),
    0
  );

  const batches = dailyPlan.batches || [];
  const totalBatchesPlannedWeightKg = batches.reduce((sum, b) => sum + b.targetWeightKg, 0);

  const totalAllocatedToBarnsKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan),
    0
  );

  const totalRemainingKg = Math.round((totalFarmDailyDemandKg - totalAllocatedToBarnsKg) * 10) / 10;

  // Calculate Financials for Dairy and Fattening
  const milkData = dailyPlan.milkProduction;
  const dairyFinancials = calculateDairyFinancials(
    milkData,
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    milkData?.milkPricePerKg || 20
  );

  const fatteningFinancials = calculateFatteningFinancials(
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    1.2
  );

  // Total feed cost across all barns today
  const totalFeedCostToday = activeBarns.reduce((sum, b) => {
    const state = getBarnDailyState(b, dailyPlan);
    const ration = rations.find((r) => r.id === (state.rationId || b.rationId));
    const costPerKg = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    return sum + demand * costPerKg;
  }, 0);

  const handleSaveNotes = () => {
    setDailyPlan({ ...dailyPlan, notes: engineerNotes });
    showToast('تم حفظ ملاحظات التقرير اليومي بنجاح!', 'success');
  };

  const handleToggleDayClosed = () => {
    const isNowClosed = !dailyPlan.isClosed;
    const confirmMessage = isNowClosed
      ? 'هل أنت متأكد من إغلاق وأرشفة خطة هذا اليوم؟ سيعتمد ذلك البيانات كخطة مكتملة.'
      : 'هل تريد فتح خطة اليوم للسماح بالتعديلات الإضافية؟';

    showConfirm({
      title: isNowClosed ? 'إغلاق وأرشفة اليوم' : 'إعادة فتح خطة اليوم',
      message: confirmMessage,
      confirmText: isNowClosed ? 'إغلاق وأرشفة' : 'فتح الخطة',
      onConfirm: () => {
        setDailyPlan({
          ...dailyPlan,
          isClosed: isNowClosed,
          closedAt: isNowClosed ? new Date().toISOString() : undefined,
        });
        showToast(
          isNowClosed ? 'تم إغلاق وأرشفة خطة اليوم بنجاح.' : 'تمت إعادة فتح الخطة للتعديل.',
          'info'
        );
      },
    });
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="تقرير التغذية والتشغيل والتحليل المالي الشامل للمزرعة"
        documentSubtitle="متابعة الأداء اليومي للقطعان، أوزان العلف، راجع الطوايل، كفاءة المكسرات وعائد التغذية IOFC"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              <span>تقرير المهندس الاستشاري والتحليل المالي لعمليات التغذية</span>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border ${
                dailyPlan.isClosed
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {dailyPlan.isClosed ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>اليوم مغلق ومؤرشف</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>اليوم مفتوح وقيد التشغيل</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ملخص شامل لكل فئات المزرعة، أعداد الرؤوس، راجع الطوايل، المأكول الصافي، وتكاليف العلف والعائد الاقتصادي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDayClosed}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer ${
              dailyPlan.isClosed
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
          >
            {dailyPlan.isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-400" />}
            <span>{dailyPlan.isClosed ? 'إلغاء إغلاق اليوم' : 'إغلاق وأرشفة اليوم'}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveNotes}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>حفظ الملاحظات</span>
          </button>
          <button
            type="button"
            onClick={() => onPrint?.() || window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير الشامل</span>
          </button>
          <ExportExcelButton
            onExport={() =>
              exportNutritionReportToExcel(
                dailyPlan,
                categories,
                barns,
                mixers,
                rations,
                rawMaterials,
                settings
              )
            }
            label="تصدير التقرير للإكسيل"
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">إجمالي قطعان المزرعة</span>
          <div className="text-xl font-black text-slate-900">{totalFarmHeads.toLocaleString('ar-EG')} رأس</div>
          <span className="text-[11px] text-slate-500 font-medium">{activeBarns.length} عنابر نشطة</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">المقرر اليومي الكلي</span>
          <div className="text-xl font-black text-emerald-800">{totalFarmDailyDemandKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-slate-500 font-medium">{(totalFarmDailyDemandKg / 1000).toFixed(2)} طن</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-amber-800">إجمالي راجع الطوايل</span>
          <div className="text-xl font-black text-amber-950">{totalFarmRefusalKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-amber-700 font-medium">
            نسبة الراجع: {totalFarmDailyDemandKg > 0 ? ((totalFarmRefusalKg / totalFarmDailyDemandKg) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-blue-800">المأكول الصافي الفعلي</span>
          <div className="text-xl font-black text-blue-950">{totalFarmIntakeKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-blue-700 font-medium">{(totalFarmIntakeKg / 1000).toFixed(2)} طن مأكول</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">إجمالي الموزع بالمكسرات</span>
          <div className="text-xl font-black text-slate-900">{totalAllocatedToBarnsKg.toLocaleString('ar-EG')} كجم</div>
          <span className="text-[11px] text-slate-500 font-medium">
            استيفاء {totalFarmDailyDemandKg > 0 ? Math.round((totalAllocatedToBarnsKg / totalFarmDailyDemandKg) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-emerald-800">إجمالي تكلفة العلف اليوم</span>
          <div className="text-xl font-black text-emerald-950">{Math.round(totalFeedCostToday).toLocaleString('ar-EG')} ج.م</div>
          <span className="text-[11px] text-emerald-700 font-medium">
            متوسط {totalFarmHeads > 0 ? (totalFeedCostToday / totalFarmHeads).toFixed(1) : 0} ج.م/رأس
          </span>
        </div>
      </div>

      {/* Financial & Production Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dairy Financials Card */}
        <div className="bg-gradient-to-bl from-blue-50 via-indigo-50/60 to-white p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-700" />
              <span>مؤشرات الجدوى الاقتصادية وعائد الحلاب (IOFC)</span>
            </h4>
            <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
              {dairyFinancials.milkingHeadCount} بقرة حلابة
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">عائد اللبن فوق العلف (IOFC)</span>
              <strong className="text-lg font-black text-emerald-800">
                {dairyFinancials.iofcPerCowPerDay.toLocaleString('ar-EG')} ج.م
              </strong>
              <span className="text-[10px] text-slate-400 block">لكل بقرة / يوم</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">تكلفة علف كيلو اللبن</span>
              <strong className="text-lg font-black text-blue-950">
                {dairyFinancials.costPerKgMilkFeedCost.toLocaleString('ar-EG')} ج.م
              </strong>
              <span className="text-[10px] text-slate-400 block">لكل 1 كجم حليب</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 block">صافي العائد اليومي للقطيع</span>
              <strong className="text-lg font-black text-emerald-900">
                {dairyFinancials.totalIofcPerDay.toLocaleString('ar-EG')} ج.م
              </strong>
              <span className="text-[10px] text-slate-400 block">إجمالي أرباح فوق العلف</span>
            </div>
          </div>
        </div>

        {/* Fattening Financials Card */}
        <div className="bg-gradient-to-bl from-amber-50 via-orange-50/50 to-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-700" />
              <span>مؤشرات قطيع التسمين والتحويل اللحمي</span>
            </h4>
            <span className="text-[11px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
              {fatteningFinancials.totalFatteningHeads} رأس تسمين
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">تكلفة كيلو النمو واللحم</span>
              <strong className="text-lg font-black text-amber-950">
                {fatteningFinancials.feedCostPerKgGain.toLocaleString('ar-EG')} ج.م
              </strong>
              <span className="text-[10px] text-slate-400 block">تكلفة العلف لكل 1 كجم زيادة</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">تكلفة علف الرأس اليومي</span>
              <strong className="text-lg font-black text-slate-900">
                {fatteningFinancials.feedCostPerHeadPerDay.toLocaleString('ar-EG')} ج.م
              </strong>
              <span className="text-[10px] text-slate-400 block">لكل عجل / يوم</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 block">معدل النمو اليومي المفترض</span>
              <strong className="text-lg font-black text-emerald-800">
                {fatteningFinancials.assumedAdgKg} كجم/يوم
              </strong>
              <span className="text-[10px] text-slate-400 block">معدل التحويل ADG</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Category Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          أولاً: البيان التفصيلي حسب الفئات الحيوانية والعلائق وتكاليفها
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 border-l border-slate-200">الفئة الحيوانية</th>
                <th className="py-3 px-3 border-l border-slate-200">اسم العليقة</th>
                <th className="py-3 px-3 border-l border-slate-200 text-center">سعر العليقة (ج.م/كجم)</th>
                <th className="py-3 px-3 border-l border-slate-200 text-center">عدد الرؤوس</th>
                <th className="py-3 px-3 border-l border-slate-200">الاحتياج اليومي (كجم)</th>
                <th className="py-3 px-3 border-l border-slate-200">إجمالي التكلفة اليومية</th>
                <th className="py-3 px-3">الموزع بالمكسرات (كجم)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {categories.map((cat) => {
                const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                const catHeads = catBarns.reduce((sum, b) => {
                  const s = getBarnDailyState(b, dailyPlan);
                  return sum + s.headCount;
                }, 0);
                const catDemand = calculateCategoryTotalDemand(barns, cat.id, rations, dailyPlan);
                const ration = rations.find((r) => r.id === cat.rationId);
                const rationCostPerKg = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
                const catTotalCost = catDemand * rationCostPerKg;
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                const catAllocated = catBatches.reduce((sum, b) => sum + calculateBatchAllocatedKg(b), 0);

                return (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">{cat.name}</td>
                    <td className="py-3 px-3 text-xs font-bold text-slate-700 border-l border-slate-200">{ration?.name || '—'}</td>
                    <td className="py-3 px-3 text-xs font-black text-slate-900 border-l border-slate-200 text-center">
                      {rationCostPerKg.toFixed(2)} ج.م
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-l border-slate-200 text-center">{catHeads} رأس</td>
                    <td className="py-3 px-3 font-black text-emerald-900 border-l border-slate-200">{catDemand.toLocaleString('ar-EG')} كجم</td>
                    <td className="py-3 px-3 font-bold text-emerald-900 border-l border-slate-200">{Math.round(catTotalCost).toLocaleString('ar-EG')} ج.م</td>
                    <td className="py-3 px-3 font-black text-slate-900">{catAllocated.toLocaleString('ar-EG')} كجم</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Barn Level Feeding & Refusal Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          ثانياً: تقرير استيفاء ونسب تغذية العنابر وراجع الطوايل تفصيليًا
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 border-l border-slate-200">العنبر</th>
                <th className="py-3 px-3 border-l border-slate-200">الفئة</th>
                <th className="py-3 px-3 border-l border-slate-200 text-center">عدد الرؤوس</th>
                <th className="py-3 px-3 border-l border-slate-200 text-center">نسبة التغذية %</th>
                <th className="py-3 px-3 border-l border-slate-200">المقرر (كجم)</th>
                <th className="py-3 px-3 border-l border-slate-200 text-amber-900 bg-amber-50/60">راجع الطوالة</th>
                <th className="py-3 px-3 border-l border-slate-200 text-blue-950 bg-blue-50/60">المأكول الفعلي</th>
                <th className="py-3 px-3 border-l border-slate-200">الموزع بالمكسر</th>
                <th className="py-3 px-3">حالة الاستيفاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {activeBarns.map((barn) => {
                const barnState = getBarnDailyState(barn, dailyPlan);
                const category = categories.find((c) => c.id === barn.categoryId);
                const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                const refusal = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
                const intake = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
                const allocated = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan);
                const val = validateBarnDemand(barn, allocated, categories, rations, dailyPlan);

                return (
                  <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">
                      {barnState.displayNumber || barn.number} {(barnState.displayName || barn.name) && `(${barnState.displayName || barn.name})`}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-emerald-800 border-l border-slate-200">{category?.name}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 border-l border-slate-200 text-center">{barnState.headCount} رأس</td>
                    <td className="py-3 px-3 border-l border-slate-200 text-center">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-xs">{barnState.feedingRatioPercent}%</span>
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900 border-l border-slate-200">{demand.toLocaleString('ar-EG')} كجم</td>
                    <td className="py-3 px-3 font-bold text-amber-900 border-l border-slate-200 bg-amber-50/30">
                      {refusal} كجم ({barnState.refusalType === 'kg' ? 'وزن' : `${barnState.refusalValue || 0}%`})
                    </td>
                    <td className="py-3 px-3 font-black text-blue-950 border-l border-slate-200 bg-blue-50/30">
                      {intake.toLocaleString('ar-EG')} كجم
                    </td>
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
