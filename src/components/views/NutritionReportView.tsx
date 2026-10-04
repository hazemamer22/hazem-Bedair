import React, { useState } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getRationDisplayName,
} from '../../context/LanguageContext';
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
  getBarnRation,
  validateBarnDemand,
  calculateRationDmStats,
  calculateBarnDmDemandKg,
  calculateBarnActualDmiKg,
  calculateBarnDmiPerHeadKg,
  calculateFarmDmSummary,
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
  Eye,
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
  onOpenPrintPreview?: () => void;
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
  onOpenPrintPreview,
}) => {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const { showToast, showConfirm } = useFeedback();
  const currency = settings.currency || (isEn ? 'USD' : 'ج.م');
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

  // Milking herd specific refusal metrics
  const milkingBarns = activeBarns.filter((barn) => {
    const cat = categories.find((c) => c.id === barn.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (barn.name || '').toLowerCase();
    return (
      catName.includes('حلاب') ||
      catName.includes('حليب') ||
      catName.includes('milk') ||
      catName.includes('dairy') ||
      barnName.includes('حلاب') ||
      barnName.includes('حليب') ||
      barnName.includes('dairy') ||
      barnName.includes('milk')
    );
  });
  const milkingDemandKg = milkingBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );
  const milkingRefusalKg = milkingBarns.reduce(
    (sum, b) => sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan),
    0
  );
  const milkingRefusalPercent =
    milkingDemandKg > 0
      ? Math.round((milkingRefusalKg / milkingDemandKg) * 100 * 10) / 10
      : 0;
  const totalFarmRefusalPercent =
    totalFarmDailyDemandKg > 0
      ? Math.round((totalFarmRefusalKg / totalFarmDailyDemandKg) * 100 * 10) / 10
      : 0;

  const totalFarmIntakeKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan),
    0
  );

  const batches = dailyPlan.batches || [];
  const totalAllocatedToBarnsKg = activeBarns.reduce(
    (sum, b) => sum + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan),
    0
  );

  // Dry matter summary across all active barns
  const farmDmSummary = calculateFarmDmSummary(
    activeBarns,
    categories,
    rations,
    dailyPlan,
    rawMaterials
  );

  // Calculate Financials for Dairy and Fattening
  const milkData = dailyPlan.milkProduction;
  const effectiveMilkPrice =
    milkData?.milkPricePerKg && milkData.milkPricePerKg > 0
      ? milkData.milkPricePerKg
      : settings.defaultMilkPricePerKg || (isEn ? 0.65 : 20);

  const dairyFinancials = calculateDairyFinancials(
    milkData,
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    effectiveMilkPrice
  );

  const effectiveAdg =
    dailyPlan.fatteningAdgKg && dailyPlan.fatteningAdgKg > 0
      ? dailyPlan.fatteningAdgKg
      : settings.defaultAdgKg || 1.5;

  const fatteningFinancials = calculateFatteningFinancials(
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    effectiveAdg
  );

  // Total feed cost across all active barns today (Gross Demand Cost)
  const totalFeedCostToday = activeBarns.reduce((sum, b) => {
    const ration = getBarnRation(b, categories, rations, dailyPlan);
    const costPerKg = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    return sum + demand * costPerKg;
  }, 0);

  // Total feed cost of actual eaten intake
  const totalIntakeFeedCostToday = activeBarns.reduce((sum, b) => {
    const ration = getBarnRation(b, categories, rations, dailyPlan);
    const costPerKg = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
    const intake = calculateBarnActualIntakeKg(b, categories, rations, dailyPlan);
    return sum + intake * costPerKg;
  }, 0);

  // Average cost per head today
  const averageFeedCostPerHead = totalFarmHeads > 0 ? totalFeedCostToday / totalFarmHeads : 0;

  // Average cost per kg feed as-fed
  const averageFeedCostPerKgAsFed =
    totalFarmDailyDemandKg > 0 ? totalFeedCostToday / totalFarmDailyDemandKg : 0;

  const handleSaveNotes = () => {
    setDailyPlan({ ...dailyPlan, notes: engineerNotes });
    showToast(
      isEn
        ? 'Daily report notes saved successfully!'
        : 'تم حفظ ملاحظات التقرير اليومي بنجاح!',
      'success'
    );
  };

  const handleToggleDayClosed = () => {
    const isNowClosed = !dailyPlan.isClosed;
    const confirmMessage = isNowClosed
      ? isEn
        ? 'Are you sure you want to close and archive today’s plan? This locks the day as complete.'
        : 'هل أنت متأكد من إغلاق وأرشفة خطة هذا اليوم؟ سيعتمد ذلك البيانات كخطة مكتملة.'
      : isEn
      ? 'Do you want to reopen today’s plan to allow further modifications?'
      : 'هل تريد فتح خطة اليوم للسماح بالتعديلات الإضافية؟';

    showConfirm({
      title: isNowClosed
        ? isEn
          ? 'Close & Archive Day'
          : 'إغلاق وأرشفة اليوم'
        : isEn
        ? 'Reopen Day Plan'
        : 'إعادة فتح خطة اليوم',
      message: confirmMessage,
      confirmText: isNowClosed
        ? isEn
          ? 'Close & Archive'
          : 'إغلاق وأرشفة'
        : isEn
        ? 'Reopen Plan'
        : 'فتح الخطة',
      onConfirm: () => {
        setDailyPlan({
          ...dailyPlan,
          isClosed: isNowClosed,
          closedAt: isNowClosed ? new Date().toISOString() : undefined,
        });
        showToast(
          isNowClosed
            ? isEn
              ? 'Day plan closed and archived successfully.'
              : 'تم إغلاق وأرشفة خطة اليوم بنجاح.'
            : isEn
            ? 'Plan reopened for modifications.'
            : 'تمت إعادة فتح الخطة للتعديل.',
          'info'
        );
      },
    });
  };

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Printable Header */}
      <PrintHeader
        documentTitle={
          isEn
            ? 'Farm Nutrition, Operations & Economic Analysis Report'
            : 'تقرير التغذية والتشغيل والتحليل المالي الشامل للمزرعة'
        }
        documentSubtitle={
          isEn
            ? 'Daily herd performance, feed allocations, bunk refusals, mixer accuracy & IOFC return'
            : 'متابعة الأداء اليومي للقطعان، أوزان العلف، راجع الطوايل، كفاءة المكسرات وعائد التغذية IOFC'
        }
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings?.engineerName}
      />

      {/* Screen Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              <span>
                {isEn
                  ? 'Nutrition Engineer & Financial Operations Report'
                  : 'تقرير المهندس الاستشاري والتحليل المالي لعمليات التغذية'}
              </span>
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
                  <span>{isEn ? 'Day Closed & Archived' : 'اليوم مغلق ومؤرشف'}</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isEn ? 'Day Open & Active' : 'اليوم مفتوح وقيد التشغيل'}</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isEn
              ? 'Complete overview of all farm categories, head counts, bunk refusals, net intake, feed costs and economic margins.'
              : 'ملخص شامل لكل فئات المزرعة، أعداد الرؤوس، راجع الطوايل، المأكول الصافي، وتكاليف العلف والعائد الاقتصادي'}
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
            <span>
              {dailyPlan.isClosed
                ? isEn
                  ? 'Reopen Day'
                  : 'إلغاء إغلاق اليوم'
                : isEn
                ? 'Close & Archive Day'
                : 'إغلاق وأرشفة اليوم'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleSaveNotes}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>{isEn ? 'Save Remarks' : 'حفظ الملاحظات'}</span>
          </button>
          {onOpenPrintPreview && (
            <button
              type="button"
              onClick={onOpenPrintPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95 border border-emerald-700/60"
              title={isEn ? 'Preview comprehensive report on A4 paper before printing' : 'معاينة التقرير الشامل على الورق A4 قبل الطباعة'}
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>{isEn ? 'Print Preview' : 'معاينة الطباعة'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onPrint?.() || window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{isEn ? 'Print Full Report' : 'طباعة التقرير الشامل'}</span>
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
            label={isEn ? 'Export to Excel' : 'تصدير التقرير للإكسيل'}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">
            {isEn ? 'Total Farm Herd' : 'إجمالي قطعان المزرعة'}
          </span>
          <div className="text-xl font-black text-slate-900">
            {totalFarmHeads.toLocaleString()} {isEn ? 'head' : 'رأس'}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {activeBarns.length} {isEn ? 'active pens' : 'عنابر نشطة'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">
            {isEn ? 'Daily Gross Demand' : 'المقرر اليومي الكلي'}
          </span>
          <div className="text-xl font-black text-emerald-800">
            {totalFarmDailyDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {(totalFarmDailyDemandKg / 1000).toFixed(2)} {isEn ? 'ton' : 'طن'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-amber-800">
            {isEn ? 'Total Bunk Refusals' : 'إجمالي راجع الطوايل (المزرعة ككل)'}
          </span>
          <div className="text-xl font-black text-amber-950">
            {totalFarmRefusalKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
          </div>
          <div className="text-[11px] text-amber-800 font-medium flex flex-col gap-0.5">
            <span>
              {isEn ? 'Farm refusal rate:' : 'نسبة راجع المزرعة العام:'} {totalFarmRefusalPercent}%
            </span>
            <span className="text-[10px] text-amber-900 font-bold">
              ({isEn ? 'Dairy refusal:' : 'منها راجع الحلاب:'} {milkingRefusalPercent}% -{' '}
              {Math.round(milkingRefusalKg).toLocaleString()} {isEn ? 'kg' : 'كجم'})
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-blue-800">
            {isEn ? 'Net Actual Intake' : 'المأكول الصافي الفعلي'}
          </span>
          <div className="text-xl font-black text-blue-950">
            {totalFarmIntakeKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
          </div>
          <span className="text-[11px] text-blue-700 font-medium">
            {(totalFarmIntakeKg / 1000).toFixed(2)} {isEn ? 'ton intake' : 'طن مأكول'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/60 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
            <Wheat className="w-3.5 h-3.5 text-blue-700" />
            <span>{isEn ? 'Dry Matter (DMI)' : 'المادة الجافة (DMI)'}</span>
          </span>
          <div className="text-xl font-black text-blue-950">
            {farmDmSummary.totalActualDmiKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
          </div>
          <span className="text-[11px] text-blue-700 font-bold block">
            {isEn ? 'Avg' : 'متوسط'} {farmDmSummary.averageDmiPerHeadKg} {isEn ? 'kg/head' : 'كجم/رأس'} ({farmDmSummary.averageDmPercent}% DM)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500">
            {isEn ? 'Total Distributed' : 'إجمالي الموزع بالمكسرات'}
          </span>
          <div className="text-xl font-black text-slate-900">
            {totalAllocatedToBarnsKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {isEn ? 'Fulfillment' : 'استيفاء'}{' '}
            {totalFarmDailyDemandKg > 0 ? Math.round((totalAllocatedToBarnsKg / totalFarmDailyDemandKg) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-emerald-800">
            {isEn ? 'Total Daily Feed Cost' : 'إجمالي تكلفة العلف اليوم'}
          </span>
          <div className="text-xl font-black text-emerald-950">
            {Math.round(totalFeedCostToday).toLocaleString()} {currency}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            <span>
              {isEn ? 'Avg' : 'متوسط'} {averageFeedCostPerHead.toFixed(1)} {currency}/{isEn ? 'head' : 'رأس'}
            </span>
            <span className="text-[10px] text-emerald-800 font-bold ml-1 mr-1">
              ({averageFeedCostPerKgAsFed.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'})
            </span>
          </div>
        </div>
      </div>

      {/* Financial & Production Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
        {/* Dairy Financials Card */}
        <div className="bg-gradient-to-bl from-blue-50 via-indigo-50/60 to-white p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-700" />
              <span>
                {isEn
                  ? 'Dairy Feasibility & Income Over Feed Cost (IOFC)'
                  : 'مؤشرات الجدوى الاقتصادية وعائد الحلاب (IOFC)'}
              </span>
            </h4>
            <span className="text-[11px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
              {dairyFinancials.milkingHeadCount} {isEn ? 'milking cows' : 'بقرة حلابة'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'IOFC Per Cow / Day' : 'عائد اللبن فوق العلف (IOFC)'}
              </span>
              <strong className="text-lg font-black text-emerald-800">
                {dairyFinancials.iofcPerCowPerDay.toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Per cow / day' : 'لكل بقرة / يوم'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Feed Cost Per Kg Milk' : 'تكلفة علف كيلو اللبن'}
              </span>
              <strong className="text-lg font-black text-blue-950">
                {dairyFinancials.costPerKgMilkFeedCost.toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Per 1 kg milk' : 'لكل 1 كجم حليب'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Daily Dairy Feed Cost' : 'تكلفة علف الحلاب اليومي'}
              </span>
              <strong className="text-lg font-black text-slate-900">
                {Math.round(dairyFinancials.totalMilkingFeedCost).toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {dairyFinancials.milkingHeadCount > 0
                  ? (dairyFinancials.totalMilkingFeedCost / dairyFinancials.milkingHeadCount).toFixed(1)
                  : 0}{' '}
                {currency}/{isEn ? 'cow' : 'بقرة'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Total Net Daily IOFC' : 'صافي العائد اليومي للقطيع'}
              </span>
              <strong className="text-lg font-black text-emerald-900">
                {Math.round(dairyFinancials.totalIofcPerDay).toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Total margin over feed' : 'إجمالي أرباح فوق العلف'}
              </span>
            </div>
          </div>
        </div>

        {/* Fattening Financials Card */}
        <div className="bg-gradient-to-bl from-amber-50 via-orange-50/50 to-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-700" />
              <span>
                {isEn
                  ? 'Beef Feedlot & Conversion Rate Metrics'
                  : 'مؤشرات قطيع التسمين والتحويل اللحمي'}
              </span>
            </h4>
            <span className="text-[11px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
              {fatteningFinancials.totalFatteningHeads} {isEn ? 'feedlot cattle' : 'رأس تسمين'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Cost Per Kg Weight Gain' : 'تكلفة كيلو النمو واللحم'}
              </span>
              <strong className="text-lg font-black text-amber-950">
                {fatteningFinancials.feedCostPerKgGain.toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Per 1 kg gain' : 'لكل 1 كجم زيادة وزنية'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Daily Cost Per Head' : 'تكلفة علف الرأس اليومي'}
              </span>
              <strong className="text-lg font-black text-slate-900">
                {fatteningFinancials.feedCostPerHeadPerDay.toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Per head / day' : 'لكل عجل / يوم'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Daily Beef Feed Cost' : 'تكلفة علف التسمين اليومي'}
              </span>
              <strong className="text-lg font-black text-slate-900">
                {Math.round(fatteningFinancials.totalDailyFeedCost).toLocaleString()} {currency}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {Math.round(fatteningFinancials.totalDailyDemandKg).toLocaleString()} {isEn ? 'kg feed' : 'كجم علف'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 block">
                {isEn ? 'Assumed ADG Rate' : 'معدل النمو المفترض'}
              </span>
              <strong className="text-lg font-black text-emerald-800">
                {fatteningFinancials.assumedAdgKg} {isEn ? 'kg/day' : 'كجم/يوم'}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                {isEn ? 'Conversion Rate ADG' : 'معدل التحويل ADG'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Category Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          {isEn
            ? '1. Detailed Breakdown by Animal Categories, Rations & Costs'
            : 'أولاً: البيان التفصيلي حسب الفئات الحيوانية والعلائق وتكاليفها'}
        </h4>

        <div className="overflow-x-auto">
          <table className={`w-full ${isEn ? 'text-left' : 'text-right'} text-sm border border-slate-200 rounded-xl overflow-hidden`}>
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Animal Category' : 'الفئة الحيوانية'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Ration Name' : 'اسم العليقة'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                  {isEn ? `Ration Price (${currency}/kg)` : `سعر العليقة (${currency}/كجم)`}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                  {isEn ? 'Heads' : 'عدد الرؤوس'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Daily Demand (kg)' : 'الاحتياج اليومي (كجم)'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-blue-900 bg-blue-50/70 text-center`}>
                  {isEn ? 'Dry Matter % (DM)' : 'المادة الجافة % (DM)'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-blue-900 bg-blue-50/70`}>
                  {isEn ? 'Demand (kg DM)' : 'المقرر (كجم DM)'}
                </th>
                <th className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-emerald-900 bg-emerald-50/40`}>
                  {isEn ? 'Total Daily Cost' : 'إجمالي التكلفة اليومية'}
                </th>
                <th className="py-3 px-3">
                  {isEn ? 'Mixer Allocated (kg)' : 'الموزع بالمكسرات (كجم)'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {categories.map((cat) => {
                const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                const catHeads = catBarns.reduce((sum, b) => {
                  const s = getBarnDailyState(b, dailyPlan);
                  return sum + s.headCount;
                }, 0);
                const catDemand = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
                const defaultRation = rations.find((r) => r.id === cat.rationId);
                const defaultRationCost = defaultRation ? calculateRationCostPerKg(defaultRation, rawMaterials) : 0;

                let catTotalCost = 0;
                let catDmKg = 0;
                catBarns.forEach((b) => {
                  const bRation = getBarnRation(b, categories, rations, dailyPlan);
                  const bCost = bRation ? calculateRationCostPerKg(bRation, rawMaterials) : 0;
                  const bDemand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
                  const bDm = calculateBarnDmDemandKg(b, categories, rations, dailyPlan, rawMaterials);
                  catTotalCost += bDemand * bCost;
                  catDmKg += bDm;
                });
                catDmKg = Math.round(catDmKg * 10) / 10;
                const effectiveRationCostPerKg = catDemand > 0 ? catTotalCost / catDemand : defaultRationCost;
                const catDmStats = defaultRation ? calculateRationDmStats(defaultRation, rawMaterials) : { dmPercent: 0 };
                const catDmPercent = catDemand > 0 ? Math.round((catDmKg / catDemand) * 1000) / 10 : catDmStats.dmPercent;
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                const catAllocated = catBatches.reduce((sum, b) => sum + calculateBatchAllocatedKg(b), 0);

                return (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`py-3 px-3 font-black text-slate-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {getCategoryDisplayName(cat.name, isEn)}
                    </td>
                    <td className={`py-3 px-3 text-xs font-bold text-slate-700 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {defaultRation ? getRationDisplayName(defaultRation.name, isEn) : '—'}
                    </td>
                    <td className={`py-3 px-3 text-xs font-black text-slate-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                      {effectiveRationCostPerKg.toFixed(2)} {currency}
                    </td>
                    <td className={`py-3 px-3 font-bold text-slate-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                      {catHeads} {isEn ? 'head' : 'رأس'}
                    </td>
                    <td className={`py-3 px-3 font-black text-emerald-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {catDemand.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className={`py-3 px-3 text-xs font-black text-blue-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center bg-blue-50/30`}>
                      {catDmPercent}%
                    </td>
                    <td className={`py-3 px-3 font-black text-blue-950 ${isEn ? 'border-r' : 'border-l'} border-slate-200 bg-blue-50/30`}>
                      {catDmKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                    </td>
                    <td className={`py-3 px-3 font-black text-emerald-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 bg-emerald-50/20`}>
                      {Math.round(catTotalCost).toLocaleString()} {currency}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {catHeads > 0 ? `${(catTotalCost / catHeads).toFixed(1)} ${currency}/${isEn ? 'head' : 'رأس'}` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900">
                      {catAllocated.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 font-extrabold`} colSpan={2}>
                  {isEn ? 'Grand Total for All Categories' : 'الإجمالي العام لجميع الفئات'}
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center text-xs font-black text-emerald-900`}>
                  {averageFeedCostPerKgAsFed.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center font-black`}>
                  {totalFarmHeads.toLocaleString()} {isEn ? 'head' : 'رأس'}
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-emerald-950 font-black`}>
                  {Math.round(totalFarmDailyDemandKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center bg-blue-100/50 text-blue-950 font-black`}>
                  {farmDmSummary.averageDmPercent}% DM
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 bg-blue-100/50 text-blue-950 font-black`}>
                  {Math.round(farmDmSummary.totalDmDemandKg).toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                </td>
                <td className={`py-3 px-3 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-emerald-950 font-black text-sm bg-emerald-100/50`}>
                  {Math.round(totalFeedCostToday).toLocaleString()} {currency}
                </td>
                <td className="py-3 px-3 text-slate-900 font-black">
                  {Math.round(totalAllocatedToBarnsKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Barn Level Feeding & Refusal Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          {isEn
            ? '2. Detailed Barn Feeding Fulfillment, Bunk Refusals & Costs'
            : 'ثانياً: تقرير استيفاء ونسب تغذية العنابر وراجع الطوايل وتكاليفها تفصيليًا'}
        </h4>

        <div className="overflow-x-auto">
          <table className={`w-full ${isEn ? 'text-left' : 'text-right'} text-sm border border-slate-200 rounded-xl overflow-hidden`}>
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Barn / Pen' : 'العنبر'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Category' : 'الفئة'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Ration' : 'العليقة'}
                </th>
                <th className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                  {isEn ? 'Heads' : 'الرؤوس'}
                </th>
                <th className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                  {isEn ? 'Feed %' : 'النسبة %'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Demand (kg)' : 'المقرر (كجم)'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-blue-900 bg-blue-50/70 text-center`}>
                  {isEn ? 'DM Demand' : 'مقرر DM'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-amber-900 bg-amber-50/60`}>
                  {isEn ? 'Bunk Refusal' : 'راجع الطوالة'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-blue-950 bg-blue-50/60`}>
                  {isEn ? 'Net Intake' : 'المأكول الفعلي'}
                </th>
                <th className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-blue-900 bg-blue-50/70 text-center`}>
                  {isEn ? 'DMI/Head' : 'DMI للرأس'}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-emerald-900 bg-emerald-50/50`}>
                  {isEn ? `Feed Cost (${currency})` : `تكلفة العلف (${currency})`}
                </th>
                <th className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                  {isEn ? 'Mixer Allocated' : 'الموزع بالمكسر'}
                </th>
                <th className="py-3 px-2">
                  {isEn ? 'Status' : 'حالة الاستيفاء'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {activeBarns.map((barn) => {
                const barnState = getBarnDailyState(barn, dailyPlan);
                const category = categories.find((c) => c.id === barn.categoryId);
                const barnRation = getBarnRation(barn, categories, rations, dailyPlan);
                const costPerKg = barnRation ? calculateRationCostPerKg(barnRation, rawMaterials) : 0;
                const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                const barnDm = calculateBarnDmDemandKg(barn, categories, rations, dailyPlan, rawMaterials);
                const barnDmi = calculateBarnDmiPerHeadKg(barn, categories, rations, dailyPlan, rawMaterials);
                const refusal = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
                const intake = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
                const allocated = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan);
                const val = validateBarnDemand(barn, allocated, categories, rations, dailyPlan);
                const barnTotalCost = Math.round(demand * costPerKg);
                const barnCostPerHead = barnState.headCount > 0 ? (barnTotalCost / barnState.headCount).toFixed(1) : 0;

                return (
                  <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`py-3 px-2.5 font-black text-slate-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {getBarnNumberDisplayName(barnState.displayNumber || barn.number, isEn)} {(barnState.displayName || barn.name) ? `(${getBarnNameDisplayName(barnState.displayName || barn.name, isEn)})` : ''}
                    </td>
                    <td className={`py-3 px-2.5 text-xs font-bold text-emerald-800 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {category ? getCategoryDisplayName(category.name, isEn) : (isEn ? 'General' : 'عام')}
                    </td>
                    <td className={`py-3 px-2.5 text-xs font-semibold text-slate-700 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {barnRation ? getRationDisplayName(barnRation.name, isEn) : '—'}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {costPerKg.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}
                      </span>
                    </td>
                    <td className={`py-3 px-2 font-bold text-slate-800 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                      {barnState.headCount}
                    </td>
                    <td className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center`}>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-xs">{barnState.feedingRatioPercent}%</span>
                    </td>
                    <td className={`py-3 px-2.5 font-black text-slate-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {demand.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className={`py-3 px-2.5 font-black text-blue-950 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center bg-blue-50/30`}>
                      {barnDm.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className={`py-3 px-2.5 font-bold text-amber-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 bg-amber-50/30`}>
                      {refusal} {isEn ? 'kg' : 'كجم'} ({barnState.refusalType === 'kg' ? (isEn ? 'weight' : 'وزن') : `${barnState.refusalValue || 0}%`})
                    </td>
                    <td className={`py-3 px-2.5 font-black text-blue-950 ${isEn ? 'border-r' : 'border-l'} border-slate-200 bg-blue-50/30`}>
                      {intake.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className={`py-3 px-2 font-black text-blue-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200 text-center bg-blue-50/40`}>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100/80 font-black text-xs">{barnDmi} {isEn ? 'kg' : 'كجم'}</span>
                    </td>
                    <td className={`py-3 px-2.5 font-black text-emerald-950 ${isEn ? 'border-r' : 'border-l'} border-slate-200 bg-emerald-50/30`}>
                      {barnTotalCost.toLocaleString()} {currency}
                      <span className="block text-[10px] text-slate-500 font-medium">
                        {barnCostPerHead} {currency}/{isEn ? 'head' : 'رأس'}
                      </span>
                    </td>
                    <td className={`py-3 px-2.5 font-black text-emerald-900 ${isEn ? 'border-r' : 'border-l'} border-slate-200`}>
                      {allocated.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3 px-2 font-bold text-xs">
                      {val.status === 'exact' ? (
                        <span className="text-emerald-700">✓ 100%</span>
                      ) : val.status === 'under' ? (
                        <span className="text-amber-700">{isEn ? `Short ${Math.abs(val.differenceKg)}` : `متبقي ${Math.abs(val.differenceKg)}`}</span>
                      ) : (
                        <span className="text-rose-700">{isEn ? `Over ${val.differenceKg}` : `زيادة ${val.differenceKg}`}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 font-extrabold`} colSpan={3}>
                  {isEn
                    ? `Total for All Active Pens (${activeBarns.length} pens)`
                    : `الإجمالي لكافة العنابر النشطة (${activeBarns.length} عنبر)`}
                </td>
                <td className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center font-black`}>
                  {totalFarmHeads.toLocaleString()}
                </td>
                <td className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center text-xs`}>
                  —
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-emerald-950 font-black`}>
                  {Math.round(totalFarmDailyDemandKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center bg-blue-100/50 text-blue-950 font-black`}>
                  {Math.round(farmDmSummary.totalDmDemandKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-amber-950 bg-amber-100/50 font-black`}>
                  {Math.round(totalFarmRefusalKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-blue-950 bg-blue-100/50 font-black`}>
                  {Math.round(totalFarmIntakeKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-2 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-center bg-blue-100/50 text-blue-950 font-black`}>
                  {farmDmSummary.averageDmiPerHeadKg} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 text-emerald-950 bg-emerald-100/50 font-black text-sm`}>
                  {Math.round(totalFeedCostToday).toLocaleString()} {currency}
                </td>
                <td className={`py-3 px-2.5 ${isEn ? 'border-r' : 'border-l'} border-slate-300 font-black`}>
                  {Math.round(totalAllocatedToBarnsKg).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className="py-3 px-2 text-xs font-black">
                  {totalFarmDailyDemandKg > 0 ? `${Math.round((totalAllocatedToBarnsKg / totalFarmDailyDemandKg) * 100)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Engineer Remarks Input & Signatures */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <h4 className="font-extrabold text-slate-900 text-sm">
          {isEn
            ? '3. Nutrition Engineer Directives & Instructions for Next Shift'
            : 'ثالثًا: ملاحظات وتوجيهات مهندس التغذية للوردية القادمة'}
        </h4>
        <textarea
          rows={3}
          value={engineerNotes}
          onChange={(e) => setEngineerNotes(e.target.value)}
          placeholder={
            isEn
              ? 'Enter technical remarks regarding feed consumption, rumen health, silage moisture or preparation guidelines...'
              : 'أدخل أي ملاحظات فنية بخصوص استهلاك العلف، صحة الكرش، جودة السيلاج أو توجيهات التحضير...'
          }
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600 print:hidden"
        />
        <div className="hidden print:block p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 whitespace-pre-wrap min-h-[40px]">
          {engineerNotes ||
            (isEn
              ? 'Nutrition schedule, feed intake and bunk refusals reviewed. All metrics comply with approved farm benchmarks.'
              : 'تمت مراجعة خطة التغذية واستهلاك العلف وراجع الطوايل، وكافة المؤشرات متوافقة مع الخطة المعتمدة.')}
        </div>

        <PrintSignatures settings={settings} />
      </div>
    </div>
  );
};
