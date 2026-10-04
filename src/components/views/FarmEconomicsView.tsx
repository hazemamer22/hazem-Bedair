import React, { useState, useMemo, useEffect } from 'react';
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
  Ration,
  RawMaterial,
  FarmSettings,
  ActiveTab,
  MilkSession,
} from '../../types';
import {
  calculateWholeFarmEconomics,
  CategoryEconomicsItem,
  getBarnDailyState,
  calculateBarnDailyDemand,
  getBarnRation,
  calculateRationCostPerKg,
} from '../../utils/calculations';
import { exportFarmEconomicsToExcel } from '../../utils/excelExport';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Milk,
  Beef,
  Scale,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  Info,
  Building,
  Activity,
  Eye,
} from 'lucide-react';

interface FarmEconomicsViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan?: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onPrint?: () => void;
  onOpenPrintPreview?: () => void;
}

export const FarmEconomicsView: React.FC<FarmEconomicsViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  rations,
  rawMaterials,
  settings,
  setActiveTab,
  onPrint,
  onOpenPrintPreview,
}) => {
  const { language, isRtl, t } = useLanguage();
  const isEn = language === 'en';

  // Simulation Inputs
  const [milkPrice, setMilkPrice] = useState<number>(() => {
    return (
      dailyPlan.milkProduction?.milkPricePerKg ??
      settings.defaultMilkPricePerKg ??
      20.0
    );
  });

  const [meatPrice, setMeatPrice] = useState<number>(() => {
    return (
      dailyPlan.fatteningMeatPricePerKg ??
      settings.defaultMeatPricePerKg ??
      175.0
    );
  });

  const [fatteningAdg, setFatteningAdg] = useState<number>(() => {
    return dailyPlan.fatteningAdgKg ?? 1.5;
  });

  // Sync state when dailyPlan or settings changes externally (e.g., from Dashboard / MilkProductionSection / Settings)
  useEffect(() => {
    if (dailyPlan.milkProduction?.milkPricePerKg !== undefined) {
      setMilkPrice(dailyPlan.milkProduction.milkPricePerKg);
    } else if (settings.defaultMilkPricePerKg !== undefined) {
      setMilkPrice(settings.defaultMilkPricePerKg);
    }
  }, [dailyPlan.milkProduction?.milkPricePerKg, settings.defaultMilkPricePerKg]);

  useEffect(() => {
    if (dailyPlan.fatteningMeatPricePerKg !== undefined) {
      setMeatPrice(dailyPlan.fatteningMeatPricePerKg);
    } else if (settings.defaultMeatPricePerKg !== undefined) {
      setMeatPrice(settings.defaultMeatPricePerKg);
    }
  }, [dailyPlan.fatteningMeatPricePerKg, settings.defaultMeatPricePerKg]);

  useEffect(() => {
    if (dailyPlan.fatteningAdgKg !== undefined) {
      setFatteningAdg(dailyPlan.fatteningAdgKg);
    }
  }, [dailyPlan.fatteningAdgKg]);

  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'milking' | 'fattening' | 'non_producing'>('all');

  const defaultMilkSessions: MilkSession[] = [
    { id: 'session-1', name: isEn ? 'Morning Milking' : 'حلبة الصباح', time: '06:00', amountKg: 3000 },
    { id: 'session-2', name: isEn ? 'Midday Milking' : 'حلبة الظهيرة', time: '14:00', amountKg: 2800 },
    { id: 'session-3', name: isEn ? 'Evening Milking' : 'حلبة المساء', time: '22:00', amountKg: 2700 },
  ];

  // Live Change Handlers (Instant 2-way sync with dailyPlan & Dashboard)
  const handleMilkPriceChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setMilkPrice(safeVal);
    if (setDailyPlan) {
      const existingSessions =
        dailyPlan.milkProduction?.sessions && dailyPlan.milkProduction.sessions.length > 0
          ? dailyPlan.milkProduction.sessions
          : defaultMilkSessions;

      const updatedPlan: DailyOperationPlan = {
        ...dailyPlan,
        milkProduction: {
          sessions: existingSessions,
          refusalPercent: dailyPlan.milkProduction?.refusalPercent ?? 5,
          milkPricePerKg: safeVal,
          milkingHeadCount: dailyPlan.milkProduction?.milkingHeadCount,
          notes: dailyPlan.milkProduction?.notes,
        },
      };
      setDailyPlan(updatedPlan);
    }
  };

  const handleMeatPriceChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setMeatPrice(safeVal);
    if (setDailyPlan) {
      setDailyPlan({
        ...dailyPlan,
        fatteningMeatPricePerKg: safeVal,
      });
    }
  };

  const handleAdgChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setFatteningAdg(safeVal);
    if (setDailyPlan) {
      setDailyPlan({
        ...dailyPlan,
        fatteningAdgKg: safeVal,
      });
    }
  };

  // Compute Full Economics Summary
  const summary = useMemo(() => {
    return calculateWholeFarmEconomics(
      categories,
      barns,
      rations,
      rawMaterials,
      dailyPlan,
      {
        milkPricePerKg: milkPrice,
        liveMeatPricePerKg: meatPrice,
        fatteningAdgKg: fatteningAdg,
      }
    );
  }, [
    categories,
    barns,
    rations,
    rawMaterials,
    dailyPlan,
    milkPrice,
    meatPrice,
    fatteningAdg,
  ]);

  // Handle saving simulation parameters explicitly to dailyPlan
  const handleSaveToDailyPlan = () => {
    if (!setDailyPlan) return;
    const existingSessions =
      dailyPlan.milkProduction?.sessions && dailyPlan.milkProduction.sessions.length > 0
        ? dailyPlan.milkProduction.sessions
        : defaultMilkSessions;

    const updatedPlan: DailyOperationPlan = {
      ...dailyPlan,
      fatteningAdgKg: fatteningAdg,
      fatteningMeatPricePerKg: meatPrice,
      milkProduction: {
        sessions: existingSessions,
        refusalPercent: dailyPlan.milkProduction?.refusalPercent ?? 5,
        milkPricePerKg: milkPrice,
        milkingHeadCount: dailyPlan.milkProduction?.milkingHeadCount,
        notes: dailyPlan.milkProduction?.notes,
      },
    };
    setDailyPlan(updatedPlan);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 4000);
  };

  const handleResetDefaults = () => {
    const defMilk = settings.defaultMilkPricePerKg ?? 20.0;
    const defMeat = settings.defaultMeatPricePerKg ?? 175.0;
    const defAdg = 1.5;
    setMilkPrice(defMilk);
    setMeatPrice(defMeat);
    setFatteningAdg(defAdg);
    if (setDailyPlan) {
      setDailyPlan({
        ...dailyPlan,
        fatteningAdgKg: defAdg,
        fatteningMeatPricePerKg: defMeat,
        milkProduction: {
          sessions: dailyPlan.milkProduction?.sessions || [],
          refusalPercent: dailyPlan.milkProduction?.refusalPercent ?? 5,
          milkPricePerKg: defMilk,
          milkingHeadCount: dailyPlan.milkProduction?.milkingHeadCount,
          notes: dailyPlan.milkProduction?.notes,
        },
      });
    }
  };

  const handleExportExcel = () => {
    exportFarmEconomicsToExcel(summary, settings.farmName, dailyPlan.date, currency);
  };

  const currency = settings.currency || (isEn ? 'USD' : 'ج.م');

  // Filtered breakdown
  const filteredCategories = summary.categoriesBreakdown.filter((cat) => {
    if (filterType === 'milking') return cat.categoryType === 'milking';
    if (filterType === 'fattening') return cat.categoryType === 'fattening';
    if (filterType === 'non_producing')
      return cat.categoryType !== 'milking' && cat.categoryType !== 'fattening';
    return true;
  });

  // Palette for visual bar
  const categoryColors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Print Header (Visible only when printing) */}
      <PrintHeader
        documentTitle={isEn ? 'Farm Financial Analysis, Economics & IOFC Report' : 'تقرير التحليل المالي واقتصاديات المزرعة و IOFC'}
        documentSubtitle={isEn ? `Cost analysis per animal category and net herd margin - Operating Date: ${dailyPlan.date}` : `تحليل تكلفة كل فئة وعائد المزرعة بعد تغذية الكل - تاريخ التشغيل: ${dailyPlan.date}`}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* Simulation / What-If Parameters Banner (Visible when printing) */}
      <div className="hidden print:grid grid-cols-3 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800 mb-4">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Approved Milk Price:' : 'سعر كيلو اللبن المعتمد:'}</span>
          <span className="text-blue-900 font-black text-sm">{milkPrice.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Approved Live Meat Price (Beef):' : 'سعر كيلو اللحم قائم (عجول):'}</span>
          <span className="text-amber-900 font-black text-sm">{meatPrice.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Daily Gain Conversion Rate (ADG):' : 'معدل التحويل اليومي للتسمين:'}</span>
          <span className="text-emerald-900 font-black text-sm">{fatteningAdg.toFixed(2)} {isEn ? 'kg gain/day' : 'كجم نمو/يوم'}</span>
        </div>
      </div>

      {/* Main Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold">
              <Coins className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">
              {isEn ? 'Farm Economics & Category Costs (IOFC & Feed Margins)' : 'اقتصاديات المزرعة وتكاليف الفئات (IOFC & Feed Margins)'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isEn
              ? 'Accurate monitoring: daily feed costs per category, revenues, and whole-farm net margins across all herds'
              : 'متابعة دقيقة: تكلفة علف كل فئة باليوم، والعائد الإجمالي بعد تغذية كل قطعان المزرعة بلا استثناء'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>{isEn ? 'Export Financial Excel' : 'تصدير Excel المالي'}</span>
          </button>

          {onOpenPrintPreview && (
            <button
              type="button"
              onClick={onOpenPrintPreview}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border border-emerald-700/60"
              title={isEn ? 'Print Preview A4' : 'معاينة تقرير اقتصاديات المزرعة A4 قبل الطباعة'}
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>{isEn ? 'Print Preview' : 'معاينة الطباعة'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isEn ? 'Print Report' : 'طباعة التقرير'}</span>
          </button>
        </div>
      </div>

      {/* Simulation / What-If Control Toolbar */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-emerald-50 p-5 rounded-2xl shadow-md border border-emerald-800/80 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-100">
                {isEn ? 'Simulation & Instant Price Sensitivity (What-If Analysis)' : 'لوحة محاكاة وتعديل الأسعار والمؤشرات اللحظية (What-If Analysis)'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isEn ? 'Change milk or meat prices or ADG to inspect the immediate impact on farm daily net margins' : 'غيّر سعر اللبن أو اللحم أو معدل النمو لمعرفة تأثيرها الفوري على صافي عائد المزرعة اليومي'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Milk Price */}
            <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Milk className="w-4 h-4 text-amber-400" />
              <label htmlFor="milkPriceInput" className="text-xs text-emerald-200 font-medium">
                {isEn ? 'Milk Price / kg:' : 'سعر كجم اللبن:'}
              </label>
              <input
                id="milkPriceInput"
                type="number"
                step="0.5"
                min="0"
                value={milkPrice}
                onChange={(e) => handleMilkPriceChange(parseFloat(e.target.value))}
                className="w-20 bg-emerald-950/90 text-white font-black text-center text-xs px-2 py-1 rounded-lg border border-emerald-600 focus:outline-hidden focus:border-amber-400"
              />
              <span className="text-[11px] text-emerald-300">{currency}</span>
            </div>

            {/* Meat Price */}
            <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Beef className="w-4 h-4 text-amber-400" />
              <label htmlFor="meatPriceInput" className="text-xs text-emerald-200 font-medium">
                {isEn ? 'Live Meat Price / kg:' : 'سعر كجم اللحم قائم:'}
              </label>
              <input
                id="meatPriceInput"
                type="number"
                step="1"
                min="0"
                value={meatPrice}
                onChange={(e) => handleMeatPriceChange(parseFloat(e.target.value))}
                className="w-20 bg-emerald-950/90 text-white font-black text-center text-xs px-2 py-1 rounded-lg border border-emerald-600 focus:outline-hidden focus:border-amber-400"
              />
              <span className="text-[11px] text-emerald-300">{currency}</span>
            </div>

            {/* ADG */}
            <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <label htmlFor="adgInput" className="text-xs text-emerald-200 font-medium">
                {isEn ? 'Beef ADG (kg/day):' : 'معدل تحويل التسمين:'}
              </label>
              <input
                id="adgInput"
                type="number"
                step="0.1"
                min="0"
                value={fatteningAdg}
                onChange={(e) => handleAdgChange(parseFloat(e.target.value))}
                className="w-16 bg-emerald-950/90 text-white font-black text-center text-xs px-2 py-1 rounded-lg border border-emerald-600 focus:outline-hidden focus:border-amber-400"
              />
              <span className="text-[11px] text-emerald-300">{isEn ? 'kg/day' : 'كجم/يوم'}</span>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={handleSaveToDailyPlan}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-black rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
              title={isEn ? 'Lock these parameters in today\'s log' : 'تثبيت هذه الأسعار في سجل اليوم'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? 'Lock in Today' : 'تثبيت في اليوم'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-xl transition-colors cursor-pointer"
              title={isEn ? 'Reset to Defaults' : 'إعادة ضبط للافتراضي'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isSavedFeedback && (
          <div className="mt-3 py-1.5 px-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isEn ? 'New pricing parameters saved successfully in daily plan!' : 'تم حفظ الأسعار والمؤشرات الجديدة بنجاح في خطة اليوم!'}</span>
          </div>
        )}
      </div>

      {/* KPI Cards: The Whole-Farm Net Equation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* Total Farm Feed Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">{isEn ? 'Total Daily Farm Feed Cost' : 'إجمالي تكلفة علف المزرعة اليومية'}</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">
                {summary.totalFarmDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-xs font-bold text-slate-500">{currency}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <Scale className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{isEn ? `All herds (${summary.totalFarmHeads} heads)` : `لكل قطعان المزرعة (${summary.totalFarmHeads} رأس)`}</span>
            <strong className="text-rose-900 font-extrabold">
              {summary.averageFeedCostPerHead.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}/{isEn ? 'head' : 'رأس'}
            </strong>
          </div>
        </div>

        {/* Total Farm Daily Revenues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">{isEn ? 'Total Estimated Daily Revenue' : 'إجمالي الإيرادات اليومية المقدرة'}</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">
                {summary.totalFarmDailyRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-xs font-bold text-slate-500">{currency}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{isEn ? 'Milk: ' : 'حليب: '}{summary.totalMilkRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')}</span>
            <span className="text-blue-800 font-bold">
              {isEn ? 'Beef: ' : 'لحم: '}{summary.totalMeatGainRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
            </span>
          </div>
        </div>

        {/* Net Farm Margin Over Feed (العائد بعد تغذية الكل) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
          summary.wholeFarmNetMarginOverFeed >= 0
            ? 'bg-emerald-950 text-white border-emerald-800'
            : 'bg-rose-950 text-white border-rose-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-300">
                  {isEn ? 'Whole Farm Net Margin Over Feed' : 'العائد بعد تغذية الكل (Whole Farm Net)'}
                </span>
                <span className="text-[10px] bg-amber-400 text-emerald-950 px-1.5 py-0.5 rounded-sm font-black">
                  {isEn ? 'Net IOFC' : 'الصافي الكلي'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-1">
                {summary.wholeFarmNetMarginOverFeed.toLocaleString(isEn ? 'en-US' : 'ar-EG')}{' '}
                <span className="text-xs font-bold text-emerald-300">{currency}/{isEn ? 'day' : 'يوم'}</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 text-amber-300 flex items-center justify-center font-bold">
              {summary.wholeFarmNetMarginOverFeed >= 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-800/80 flex items-center justify-between text-xs font-medium">
            <span className="text-emerald-200">{isEn ? 'Net Margin per Head:' : 'صافي ربح الرأس الواحدة:'}</span>
            <strong className="text-amber-300 font-black text-sm">
              {summary.wholeFarmNetMarginPerHead.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}/{isEn ? 'head/day' : 'رأس/يوم'}
            </strong>
          </div>
        </div>

        {/* Feed Cost % of Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">{isEn ? 'Feed Cost % of Total Revenue' : 'نسبة تكلفة العلف من إجمالي الدخل'}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {summary.wholeFarmFeedCostPercentOfRevenue}%
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Coins className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>{isEn ? 'Financial Safety Index:' : 'مؤشر الأمان المالي:'}</span>
            <span className={`font-black px-2 py-0.5 rounded-md ${
              summary.wholeFarmFeedCostPercentOfRevenue <= 60
                ? 'bg-emerald-100 text-emerald-800'
                : summary.wholeFarmFeedCostPercentOfRevenue <= 75
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {summary.wholeFarmFeedCostPercentOfRevenue <= 60
                ? (isEn ? 'Excellent (< 60%)' : 'ممتاز (أقل من 60%)')
                : summary.wholeFarmFeedCostPercentOfRevenue <= 75
                ? (isEn ? 'Average (60% - 75%)' : 'متوسط (60% - 75%)')
                : (isEn ? 'High (> 75%)' : 'مرتفع (فوق 75%)')}
            </span>
          </div>
        </div>
      </div>

      {/* Sector Comparison: Dairy vs Fattening vs Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        {/* Dairy Sector Card */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Milk className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">{isEn ? 'Dairy Herd Sector (IOFC)' : 'قطاع أبقار الحليب (Dairy IOFC)'}</h4>
                <p className="text-xs text-slate-500 font-bold">{summary.dairyTotalHeads} {isEn ? 'milking cows' : 'بقرة حلابة'}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {isEn ? 'Daily Output' : 'إنتاج يومي'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-1">
            <div className="flex justify-between">
              <span>{isEn ? 'Milk Sales Revenue:' : 'إيراد بيع الحليب:'}</span>
              <strong className="text-slate-900 font-bold">
                {summary.dairyOnlyRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{isEn ? 'Dairy Feed Cost:' : 'تكلفة علف قطيع الحلاب:'}</span>
              <strong className="text-rose-700 font-bold">
                {summary.dairyOnlyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </strong>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-900 font-black">
              <span>{isEn ? 'Net Dairy IOFC Margin:' : 'صافي IOFC فوق العلف للحلاب:'}</span>
              <span className="text-emerald-700 font-black text-sm">
                {summary.dairyOnlyIofc.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-800 font-bold">
              <span>{isEn ? 'Margin per Cow / Day:' : 'عائد البقرة الواحدة / يوم:'}</span>
              <span>{summary.dairyAverageIofcPerHead.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}/{isEn ? 'cow' : 'رأس'}</span>
            </div>
          </div>
        </div>

        {/* Fattening Sector Card */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Beef className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">{isEn ? 'Beef Feedlot Sector (MOFC)' : 'قطاع عجول التسمين (Beef MOFC)'}</h4>
                <p className="text-xs text-slate-500 font-bold">{summary.fatteningTotalHeads} {isEn ? 'fattening steers' : 'عجل تسمين'}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              {isEn ? 'Liveweight Gain' : 'تحويل لحم'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-1">
            <div className="flex justify-between">
              <span>{isEn ? 'Estimated Weight Gain Revenue:' : 'إيراد التحويل الوزني المقدر:'}</span>
              <strong className="text-slate-900 font-bold">
                {summary.fatteningOnlyRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{isEn ? 'Beef Feed Cost:' : 'تكلفة علف التسمين:'}</span>
              <strong className="text-rose-700 font-bold">
                {summary.fatteningOnlyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </strong>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-900 font-black">
              <span>{isEn ? 'Net Beef MOFC Margin:' : 'صافي MOFC فوق العلف للتسمين:'}</span>
              <span className="text-emerald-700 font-black text-sm">
                {summary.fatteningOnlyMofc.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-800 font-bold">
              <span>{isEn ? 'Margin per Steer / Day:' : 'عائد العجل الواحد / يوم:'}</span>
              <span>{summary.fatteningAverageMofcPerHead.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}/{isEn ? 'head' : 'رأس'}</span>
            </div>
          </div>
        </div>

        {/* Non-producing / Maintenance & Investment Herd Card */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-purple-600" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">{isEn ? 'Development & Growing Herds' : 'قطيع الاستثمار والرعاية (غير المدر)'}</h4>
                <p className="text-xs text-slate-500 font-bold">{summary.nonProducingHeads} {isEn ? 'heads (dry, heifer, calves)' : 'رأس (جاف، عشار، نامي، رضع)'}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
              {isEn ? 'Growth & Replacement' : 'تربية وتنمية'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-1">
            <div className="flex justify-between">
              <span>{isEn ? 'Total Daily Feed Cost:' : 'إجمالي تكلفة علفهم اليومية:'}</span>
              <strong className="text-rose-700 font-bold">
                {summary.nonProducingFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>{isEn ? 'Share of Farm Feed Budget:' : 'الحصة من ميزانية علف المزرعة:'}</span>
              <strong className="text-purple-800 font-bold">
                {summary.nonProducingFeedSharePercent}%
              </strong>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-900 font-black">
              <span>{isEn ? 'Cost Nature:' : 'طبيعة هذه التكلفة:'}</span>
              <span className="text-purple-900 font-bold text-xs bg-purple-50 px-2 py-0.5 rounded-md">
                {isEn ? 'Future Herd Asset Investment' : 'استثمار قطيع الاستبدال المستقبلي'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{isEn ? 'Daily Cost per Head:' : 'متوسط تكلفة الرأس باليوم:'}</span>
              <span>
                {summary.nonProducingHeads > 0
                  ? Math.round(summary.nonProducingFeedCost / summary.nonProducingHeads)
                  : 0}{' '}
                {currency}/{isEn ? 'head' : 'رأس'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Feed Budget Allocation Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <h4 className="font-black text-slate-800 text-sm">
              {isEn ? 'Daily Feed Budget Allocation Across Categories (% of Total)' : 'توزيع ميزانية العلف اليومية بين الفئات الحيوانية (% من الإجمالي)'}
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {isEn ? 'Total: ' : 'الإجمالي: '}{summary.totalFarmDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
          </span>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-4 rounded-full bg-slate-100 flex overflow-hidden shadow-inner">
          {summary.categoriesBreakdown.map((cat, idx) => {
            if (cat.feedCostSharePercent <= 0) return null;
            const colorClass = categoryColors[idx % categoryColors.length];
            return (
              <div
                key={cat.categoryId}
                style={{ width: `${cat.feedCostSharePercent}%` }}
                className={`${colorClass} h-full transition-all duration-300 relative group`}
                title={`${cat.categoryName}: ${cat.feedCostSharePercent}% (${cat.totalDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} ${currency})`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {summary.categoriesBreakdown.map((cat, idx) => {
            const colorClass = categoryColors[idx % categoryColors.length];
            return (
              <div key={cat.categoryId} className="flex items-center gap-1.5 text-xs text-slate-700">
                <span className={`w-3 h-3 rounded-full ${colorClass}`} />
                <span className="font-bold">{cat.categoryName}:</span>
                <span className="text-slate-500 font-semibold">{cat.feedCostSharePercent}%</span>
                <span className="text-[11px] text-slate-400">({cat.totalDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Category-by-Category Financial Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header & Category Filter */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-700" />
              {isEn ? 'Detailed Category Feed Cost & Economic Feasibility' : 'تفصيل تكاليف وعوائد كل فئة حيوانية على حدة'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn ? 'Ration cost/kg, daily total feed cost, daily output revenue, and net margin per head' : 'مقارنة سعر كجم العليقة، إجمالي تكلفة العلف، الإيراد اليومي، وصافي العائد لكل رأس'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto text-xs font-bold print:hidden">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-emerald-950 font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? `All (${summary.categoriesBreakdown.length})` : `الكل (${summary.categoriesBreakdown.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('milking')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'milking'
                  ? 'bg-white text-blue-900 font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Dairy' : 'الحلاب'}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('fattening')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'fattening'
                  ? 'bg-white text-amber-900 font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Beef' : 'التسمين'}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('non_producing')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'non_producing'
                  ? 'bg-white text-purple-900 font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Growing & Replacements' : 'الرعاية والاستثمار'}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${isEn ? 'text-left' : 'text-right'}`}>
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 text-xs font-bold border-b border-slate-200">
                <th className="py-3 px-4">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
                <th className="py-3 px-3 text-center">{isEn ? 'Heads & Pens' : 'الرؤوس والعنابر'}</th>
                <th className="py-3 px-3">{isEn ? 'Daily Feed' : 'العلف اليومي'}</th>
                <th className="py-3 px-3">{isEn ? 'Ration & Cost/kg' : 'العليقة وسعر الكيلو'}</th>
                <th className="py-3 px-3 text-rose-700">{isEn ? 'Daily Feed Cost' : 'تكلفة العلف اليومية'}</th>
                <th className="py-3 px-3 text-rose-800">{isEn ? 'Cost / Head' : 'تكلفة الرأس/يوم'}</th>
                <th className="py-3 px-3 text-center">{isEn ? 'Share %' : 'الحصة %'}</th>
                <th className="py-3 px-3 text-blue-700">{isEn ? 'Daily Revenue' : 'الإيراد اليومي'}</th>
                <th className="py-3 px-3 text-emerald-800 font-black">{isEn ? 'Net Margin (IOFC/MOFC)' : 'صافي العائد (IOFC/MOFC)'}</th>
                <th className="py-3 px-3 text-emerald-800 font-black">{isEn ? 'Net / Head' : 'الصافي / الرأس'}</th>
                <th className="py-3 px-3 text-center print:hidden">{isEn ? 'Details' : 'تفاصيل'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCategories.length === 0 && (
                <tr className="print:hidden">
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    {isEn ? 'No animal categories match this filter' : 'لا توجد فئات مطابقة لهذا الفلتر'}
                  </td>
                </tr>
              )}
              {summary.categoriesBreakdown.map((cat, idx) => {
                const isVisibleOnScreen = filteredCategories.some((c) => c.categoryId === cat.categoryId);
                const isExpanded = expandedCategoryId === cat.categoryId;
                const isNetPositive = cat.netMarginOverFeed >= 0;

                return (
                  <React.Fragment key={cat.categoryId}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpanded ? 'bg-emerald-50/30' : ''
                      } ${!isVisibleOnScreen ? 'hidden print:table-row' : ''}`}
                    >
                        {/* Category Name & Badge */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{cat.categoryName}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              cat.categoryType === 'milking'
                                ? 'bg-blue-100 text-blue-800'
                                : cat.categoryType === 'fattening'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-purple-100 text-purple-900'
                            }`}>
                              {cat.categoryType === 'milking'
                                ? (isEn ? 'Dairy' : 'حلاب')
                                : cat.categoryType === 'fattening'
                                ? (isEn ? 'Beef' : 'تسمين')
                                : cat.categoryType === 'dry'
                                ? (isEn ? 'Dry' : 'جاف')
                                : cat.categoryType === 'heifer'
                                ? (isEn ? 'Heifer' : 'عشار/نامي')
                                : cat.categoryType === 'calf'
                                ? (isEn ? 'Calf' : 'رضيع/فطام')
                                : (isEn ? 'Other' : 'أخرى')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {cat.barnNames.length > 0 ? `${isEn ? 'Pens: ' : 'عنابر: '}${cat.barnNames.join(isEn ? ', ' : '، ')}` : (isEn ? 'No pens' : 'لا توجد عنابر')}
                          </p>
                        </td>

                        {/* Heads & Barns */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="font-black text-slate-900">{cat.totalHeads} {isEn ? 'heads' : 'رأس'}</div>
                          <span className="text-[11px] text-slate-500 font-semibold">{cat.barnCount} {isEn ? 'pens' : 'عنبر'}</span>
                        </td>

                        {/* Daily Feed */}
                        <td className="py-3.5 px-3">
                          <div className="font-black text-slate-800">{cat.dailyDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</div>
                          <span className="text-[11px] text-slate-500 font-semibold">({cat.dailyDemandTons} {isEn ? 'tons' : 'طن'})</span>
                        </td>

                        {/* Ration & Cost per kg */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800 truncate max-w-[120px]">{cat.rationName}</div>
                          <span className="text-[11px] font-extrabold text-amber-700">
                            {cat.rationCostPerKg.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}
                          </span>
                        </td>

                        {/* Total Daily Feed Cost */}
                        <td className="py-3.5 px-3">
                          <div className="font-black text-rose-700 text-sm">
                            {cat.totalDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                          </div>
                        </td>

                        {/* Feed Cost per Head */}
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-700">
                            {cat.feedCostPerHeadPerDay.toFixed(2)} {currency}
                          </div>
                        </td>

                        {/* Feed Share % */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {cat.feedCostSharePercent}%
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="py-3.5 px-3">
                          {cat.isRevenueGenerating ? (
                            <div>
                              <div className="font-black text-blue-700 text-sm">
                                {cat.dailyRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({cat.revenuePerHeadPerDay.toFixed(1)} {currency}/{isEn ? 'head' : 'رأس'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                              {isEn ? 'Growing & Replacement' : 'رعاية وتنمية'}
                            </span>
                          )}
                        </td>

                        {/* Net Margin (IOFC / MOFC) */}
                        <td className="py-3.5 px-3">
                          <div className={`font-black text-sm ${
                            isNetPositive ? 'text-emerald-700' : 'text-slate-600'
                          }`}>
                            {cat.netMarginOverFeed >= 0 ? '+' : ''}
                            {cat.netMarginOverFeed.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                          </div>
                          {cat.isRevenueGenerating && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {isEn ? `Feed is ${cat.feedCostPercentOfRevenue}% of income` : `العلف ${cat.feedCostPercentOfRevenue}% من الدخل`}
                            </span>
                          )}
                        </td>

                        {/* Net Margin per Head */}
                        <td className="py-3.5 px-3">
                          <div className={`font-black text-xs ${
                            isNetPositive ? 'text-emerald-800' : 'text-slate-500'
                          }`}>
                            {cat.netMarginPerHeadPerDay >= 0 ? '+' : ''}
                            {cat.netMarginPerHeadPerDay.toFixed(1)} {currency}
                          </div>
                        </td>

                        {/* Toggle Expand */}
                        <td className="py-3.5 px-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedCategoryId(isExpanded ? null : cat.categoryId)}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title={isExpanded ? (isEn ? 'Collapse pens' : 'طي تفاصيل العنابر') : (isEn ? 'Expand pens' : 'عرض تفاصيل العنابر')}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Barn Breakdown Row (on-screen interactive) */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/40 print:hidden">
                          <td colSpan={11} className="p-4 border-y border-emerald-100">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                                  <Building className="w-4 h-4 text-emerald-700" />
                                  <span>{isEn ? `Pens Breakdown for: ${getCategoryDisplayName(cat.categoryName, isEn)} (${cat.barnCount} pens)` : `تفاصيل عنابر فئة: ${cat.categoryName} (${cat.barnCount} عنبر)`}</span>
                                </h5>
                                <span className="text-[11px] text-emerald-800 font-bold">
                                  {isEn ? 'Avg Ration Cost/kg: ' : 'متوسط تكلفة كجم العليقة: '}{cat.rationCostPerKg.toFixed(2)} {currency}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {barns
                                  .filter((b) => b.categoryId === cat.categoryId && b.status === 'نشط')
                                  .map((barn) => {
                                    const bState = getBarnDailyState(barn, dailyPlan);
                                    const bDemand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                                    const bRation = getBarnRation(barn, categories, rations, dailyPlan);
                                    const bRationCost = calculateRationCostPerKg(bRation, rawMaterials);
                                    const bFeedCost = Math.round(bDemand * bRationCost);
                                    const bHeads = bState.headCount || 0;
                                    const bCostPerHead = bHeads > 0 ? Math.round(bFeedCost / bHeads) : 0;

                                    return (
                                      <div
                                        key={barn.id}
                                        className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                          <strong className="text-slate-900 font-black text-xs">
                                            {getBarnNumberDisplayName(bState.displayNumber || barn.number, isEn)}
                                          </strong>
                                          <span className="text-emerald-800 font-extrabold text-[11px]">
                                            {bHeads} {isEn ? 'heads' : 'رأس'}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                                          <div className="flex justify-between">
                                            <span>{isEn ? 'Daily Demand:' : 'الاحتياج اليومي:'}</span>
                                            <strong className="text-slate-800">{bDemand.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</strong>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{isEn ? 'Daily Feed Cost:' : 'تكلفة العلف اليومية:'}</span>
                                            <strong className="text-rose-700 font-bold">{bFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</strong>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>{isEn ? 'Cost / Head:' : 'تكلفة الرأس باليوم:'}</span>
                                            <strong className="text-slate-800">{bCostPerHead} {currency}</strong>
                                          </div>
                                          <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>{isEn ? 'Ration:' : 'العليقة:'}</span>
                                            <span className="truncate max-w-[100px]">{bRation?.name || (isEn ? 'Default' : 'الافتراضية')}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                <td className="py-4 px-4 font-black text-sm">
                  {isEn ? `Whole Farm Total (${summary.categoriesBreakdown.length} categories)` : `الإجمالي العام للمزرعة (${summary.categoriesBreakdown.length} فئات)`}
                </td>
                <td className="py-4 px-3 text-center font-black">
                  {summary.totalFarmHeads} {isEn ? 'heads' : 'رأس'} ({summary.activeBarnsCount} {isEn ? 'pens' : 'عنبر'})
                </td>
                <td className="py-4 px-3 font-black">
                  {summary.totalFarmDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({summary.totalFarmDemandTons} {isEn ? 'tons' : 'طن'})
                </td>
                <td className="py-4 px-3 text-slate-500 font-bold">-</td>
                <td className="py-4 px-3 font-black text-rose-700 text-sm">
                  {summary.totalFarmDailyFeedCost.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                </td>
                <td className="py-4 px-3 font-black text-slate-800">
                  {summary.averageFeedCostPerHead.toFixed(2)} {currency}
                </td>
                <td className="py-4 px-3 text-center font-black">100%</td>
                <td className="py-4 px-3 font-black text-blue-700 text-sm">
                  {summary.totalFarmDailyRevenue.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                </td>
                <td className="py-4 px-3 font-black text-emerald-800 text-sm">
                  {summary.wholeFarmNetMarginOverFeed >= 0 ? '+' : ''}
                  {summary.wholeFarmNetMarginOverFeed.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                </td>
                <td className="py-4 px-3 font-black text-emerald-800">
                  {summary.wholeFarmNetMarginPerHead >= 0 ? '+' : ''}
                  {summary.wholeFarmNetMarginPerHead.toFixed(2)} {currency}
                </td>
                <td className="py-4 px-3 text-center print:hidden">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Printable Barns Breakdown Section (Always visible in printed report) */}
      <div className="hidden print:block space-y-3 pt-3 border-t border-slate-300 print-avoid-break">
        <h4 className="font-black text-slate-900 text-xs">
          {isEn
            ? 'Herd Pens Breakdown, Daily Weights & Feed Cost per Pen:'
            : 'تفصيل عنابر القطيع والأوزان اليومية وتكلفة العلف لكل عنبر:'}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {summary.categoriesBreakdown.map((cat) => {
            const catBarns = barns.filter((b) => b.categoryId === cat.categoryId && b.status === 'نشط');
            if (catBarns.length === 0) return null;
            return (
              <div key={cat.categoryId} className="p-2 border border-slate-300 rounded bg-slate-50 space-y-1">
                <div className="font-black text-slate-900 flex justify-between border-b border-slate-200 pb-0.5">
                  <span>{cat.categoryName} ({cat.totalHeads} {isEn ? 'heads' : 'رأس'})</span>
                  <span>{isEn ? 'Feed:' : 'علف:'} {Math.round(cat.totalDailyFeedCost).toLocaleString()} {currency}</span>
                </div>
                <div className="space-y-0.5">
                  {catBarns.map((b) => {
                    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
                    const cost = demand * cat.rationCostPerKg;
                    return (
                      <div key={b.id} className="flex justify-between text-slate-700">
                        <span>{isEn ? 'Pen' : 'عنبر'} {b.number} {b.name ? `(${b.name})` : ''} - {b.headCount} {isEn ? 'heads' : 'رأس'}:</span>
                        <span className="font-bold">{Math.round(demand).toLocaleString()} {isEn ? 'kg' : 'كجم'} ({Math.round(cost).toLocaleString()} {currency})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable Signatures */}
      <PrintSignatures settings={settings} />
    </div>
  );
};
