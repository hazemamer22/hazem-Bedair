import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  FarmSettings,
  Barn,
  ConcentratePremixOrder,
  ActiveTab,
} from '../../types';
import {
  getConcentrateAndRoughageBreakdown,
  calculateConcentrateBatchFormula,
  calculateCategoryDailyConcentrateDemand,
  calculateConcentrateStock,
  isIngredientInConcentratePremix,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import {
  exportConcentratePremixToExcel,
  exportSingleConcentrateOrderToExcel,
  exportConcentrateFormulaToExcel,
} from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Package,
  Layers,
  Scale,
  Plus,
  Printer,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
  Clock,
  RefreshCw,
  Info,
  Wheat,
  FileText,
  Sliders,
  Check,
  ChevronRight,
  Boxes,
  Truck,
  Eye,
} from 'lucide-react';

interface ConcentratePremixViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  rations: Ration[];
  setRations?: (rations: Ration[]) => void;
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  barns?: Barn[];
  setActiveTab?: (tab: ActiveTab) => void;
  onPrint?: () => void;
  onOpenPrintPreview?: (categoryId?: string, weightKg?: number) => void;
}

export const ConcentratePremixView: React.FC<ConcentratePremixViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  rations,
  setRations,
  rawMaterials,
  settings,
  barns = [],
  setActiveTab,
  onPrint,
  onOpenPrintPreview,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';
  const currency = settings?.currency || (isEn ? 'USD' : 'ج.م');

  // Available categories that have concentrate in their ration
  const eligibleCategories = useMemo(() => {
    return categories.filter((c) => {
      const ration = rations.find((r) => r.id === c.rationId);
      if (!ration) return false;
      const breakdown = getConcentrateAndRoughageBreakdown(ration, rawMaterials);
      return breakdown.concentrateIngredients.length > 0;
    });
  }, [categories, rations, rawMaterials]);

  // Selected category for creating a new concentrate batch
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    eligibleCategories[0]?.id || 'cat-1'
  );

  // Batch weight preset: 500 (0.5 ton), 1000 (1 ton), 1500 (1.5 ton), 2000 (2 tons), 3000 (3 tons)
  const [batchWeightKg, setBatchWeightKg] = useState<number>(1000);
  const [bagWeightKg, setBagWeightKg] = useState<number>(
    dailyPlan.premixBagWeightKg || settings.defaultBagWeightKg || 50
  );
  const [mixerName, setMixerName] = useState<string>(
    isEn ? 'Main Dry Premix Mixer (2 Ton)' : 'خلاطة المركز الجاف الرئيسية (2 طن)'
  );
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize bag weight changes across daily plan and calculations
  const handleUpdateBagWeight = (newWeight: number) => {
    const valid = Math.max(1, newWeight);
    setBagWeightKg(valid);
    if (dailyPlan.premixBagWeightKg !== valid) {
      setDailyPlan({
        ...dailyPlan,
        premixBagWeightKg: valid,
      });
    }
  };

  // Active category & ration
  const activeCategory =
    eligibleCategories.find((c) => c.id === selectedCategoryId) || eligibleCategories[0];
  const activeRation = rations.find((r) => r.id === activeCategory?.rationId);

  // Live calculation of formula for this batch
  const batchFormula = useMemo(() => {
    return calculateConcentrateBatchFormula(
      activeRation,
      rawMaterials,
      batchWeightKg,
      bagWeightKg
    );
  }, [activeRation, rawMaterials, batchWeightKg, bagWeightKg]);

  // Daily demand of this category
  const activeCategoryDemand = useMemo(() => {
    if (!activeCategory) {
      return {
        totalGrossFeedKg: 0,
        concentrateKg: 0,
        roughageKg: 0,
        concentrateRatioPercent: 0,
        totalBagsNeeded: 0,
        looseKgNeeded: 0,
      };
    }
    return calculateCategoryDailyConcentrateDemand(
      activeCategory,
      barns,
      categories,
      rations,
      rawMaterials,
      dailyPlan,
      bagWeightKg
    );
  }, [activeCategory, barns, categories, rations, rawMaterials, dailyPlan, bagWeightKg]);

  // Stocks overview across all categories
  const categoryStocks = useMemo(() => {
    return eligibleCategories.map((cat) => {
      const stock = calculateConcentrateStock(
        cat.id,
        categories,
        dailyPlan,
        barns,
        rations,
        rawMaterials,
        bagWeightKg
      );
      const demand = calculateCategoryDailyConcentrateDemand(
        cat,
        barns,
        categories,
        rations,
        rawMaterials,
        dailyPlan,
        bagWeightKg
      );
      return {
        category: cat,
        stock,
        demand,
      };
    });
  }, [eligibleCategories, categories, dailyPlan, barns, rations, rawMaterials, bagWeightKg]);

  // Existing concentrate orders today
  const existingOrders = dailyPlan.concentrateOrders || [];

  // Handle creating & executing a new concentrate batch
  const handleExecuteBatch = () => {
    if (!activeCategory || !activeRation || batchWeightKg <= 0) return;

    const newOrderNumber = isEn
      ? `Premix Batch #${existingOrders.length + 1} (${activeCategory.name})`
      : `أمر خلط مركز #${existingOrders.length + 1} (${activeCategory.name})`;
    const nowTimeStr = new Date().toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newOrder: ConcentratePremixOrder = {
      id: generateId('conc-ord'),
      orderNumber: newOrderNumber,
      date: dailyPlan.date,
      categoryId: activeCategory.id,
      rationId: activeRation.id,
      batchWeightKg: batchFormula.targetBatchKg,
      bagWeightKg: batchFormula.bagWeightKg,
      totalBags: batchFormula.totalBags,
      remainingLooseKg: batchFormula.remainingLooseKg,
      ingredients: batchFormula.items,
      status: isEn ? 'Completed & Bagged' : 'مكتمل ومعبأ',
      mixerName,
      totalCost: batchFormula.totalCost,
      costPerBag: batchFormula.costPerBag,
      createdAt: nowTimeStr,
      notes:
        orderNotes ||
        (isEn
          ? `Mixing ${(batchFormula.targetBatchKg / 1000).toFixed(1)} tons of concentrate for ${activeCategory.name}, packed into ${batchFormula.totalBags} bags`
          : `خلط ${batchFormula.targetBatchKg / 1000} طن مركز ${activeCategory.name} وتعبئتها في ${batchFormula.totalBags} شكارة`),
    };

    // Update daily plan
    const updatedPlan: DailyOperationPlan = {
      ...dailyPlan,
      concentrateOrders: [newOrder, ...existingOrders],
    };

    setDailyPlan(updatedPlan);
    showToast(
      isEn
        ? `Successfully produced ${batchFormula.totalBags} concentrate bags!`
        : `تم إنتاج ${batchFormula.totalBags} شكارة مركز بنجاح!`,
      'success'
    );
    setSuccessMessage(
      isEn
        ? `Premix batch executed successfully! Produced ${batchFormula.totalBags} bags (${batchFormula.targetBatchKg.toLocaleString()} kg) added to premix inventory.`
        : `تم اعتماد أمر تشغيل الخلاطة بنجاح! تم إنتاج ${batchFormula.totalBags} شكارة (${batchFormula.targetBatchKg.toLocaleString()} كجم) وأضيفت لرصيد المركز الجاهز.`
    );
    setOrderNotes('');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  // Handle deleting an order
  const handleDeleteOrder = (orderId: string, orderNumber?: string) => {
    showConfirm({
      title: isEn ? 'Delete Concentrate Order' : 'حذف أمر خلط مركز',
      message: isEn
        ? `Are you sure you want to delete ${orderNumber ? `(${orderNumber})` : 'this order'}? Stock will be reversed.`
        : `هل أنت متأكد من حذف ${orderNumber ? `(${orderNumber})` : 'أمر خلط المركز هذا'}؟ سيتم استرجاع الرصيد.`,
      isDanger: true,
      confirmText: isEn ? 'Delete' : 'حذف',
      cancelText: isEn ? 'Cancel' : 'إلغاء',
      onConfirm: () => {
        const updatedOrders = existingOrders.filter((o) => o.id !== orderId);
        setDailyPlan({
          ...dailyPlan,
          concentrateOrders: updatedOrders,
        });
        showToast(
          isEn ? 'Concentrate order deleted successfully.' : 'تم حذف أمر خلط المركز بنجاح.',
          'info'
        );
      },
    });
  };

  // Quick preset weight buttons
  const weightPresets = [
    { label: isEn ? '0.5 Ton (500 kg)' : 'نصف طن (500 كجم)', value: 500 },
    { label: isEn ? '1 Ton (1,000 kg)' : '1 طن (1,000 كجم)', value: 1000 },
    { label: isEn ? '1.5 Ton (1,500 kg)' : '1.5 طن (1,500 كجم)', value: 1500 },
    { label: isEn ? '2 Tons (2,000 kg)' : '2 طن (2,000 كجم)', value: 2000 },
    { label: isEn ? '3 Tons (3,000 kg)' : '3 طن (3,000 كجم)', value: 3000 },
  ];

  // Handler to toggle an ingredient between premix mixer (bags) and direct TMR mixer
  const handleToggleIngredientInPremix = (rawMaterialId: string) => {
    if (!activeRation || !setRations) return;
    const targetMat = rawMaterials.find((rm) => rm.id === rawMaterialId);
    const updatedIngredients = activeRation.ingredients.map((ing) => {
      if (ing.rawMaterialId === rawMaterialId) {
        const currentInPremix = isIngredientInConcentratePremix(ing, targetMat);
        return {
          ...ing,
          inConcentratePremix: !currentInPremix,
        };
      }
      return ing;
    });

    const updatedRations = rations.map((r) =>
      r.id === activeRation.id ? { ...r, ingredients: updatedIngredients } : r
    );
    setRations(updatedRations);
  };

  return (
    <div className="space-y-6 print:space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Print Header */}
      <PrintHeader
        documentTitle={isEn ? 'Concentrate Premix Mixer & Bagging Order' : 'أمر تشغيل خلاطة العلف المركز وتعبئة الشكاير'}
        documentSubtitle={
          isEn
            ? `Premix Dispense & Bagging Batch Order - ${settings.farmName}`
            : `إذن صرف خامات العلف المركز وتعبئة الشكاير بالخلاطة - ${settings.farmName}`
        }
        selectedDate={dailyPlan.date}
        settings={settings}
        batchInfo={{
          batchNumber: isEn
            ? `Premix Batch (${activeCategory?.name || 'General'}) - ${(batchFormula.targetBatchKg / 1000).toFixed(1)} T`
            : `دفعة مركز (${activeCategory?.name || 'عام'}) - ${(batchFormula.targetBatchKg / 1000).toFixed(1)} طن`,
          categoryName: activeCategory?.name,
          rationName: activeRation?.name,
          mixerName: mixerName || (isEn ? 'Dry Premix Mixer' : 'خلاطة المركز الجاف'),
          time: new Date().toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' }),
          targetWeightKg: batchFormula.targetBatchKg,
        }}
      />

      {/* Printable Specifications Banner (Visible only when printing) */}
      <div className="hidden print:grid grid-cols-4 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800 mb-3 print-avoid-break">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Target Category & Ration:' : 'الفئة والعليقة المستهدفة:'}</span>
          <span className="text-slate-900 font-black text-xs">{activeCategory?.name} ({activeRation?.name})</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Target Batch Weight:' : 'وزن الدفعة المقرر بالخلاطة:'}</span>
          <span className="text-emerald-900 font-black text-xs">{(batchFormula.targetBatchKg / 1000).toFixed(2)} {isEn ? 'T' : 'طن'} ({batchFormula.targetBatchKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Resulting Bags Output:' : 'الشكاير الناتجة المقرر تعبئتها:'}</span>
          <span className="text-amber-900 font-black text-xs">{batchFormula.totalBags} {isEn ? 'bags' : 'شكارة'} ({isEn ? `wt ${bagWeightKg} kg` : `وزن ${bagWeightKg} كجم`}){batchFormula.remainingLooseKg > 0 ? ` + ${batchFormula.remainingLooseKg} ${isEn ? 'kg' : 'كجم'}` : ''}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Cost / Ton & Bag:' : 'تكلفة الطن / الشكارة:'}</span>
          <span className="text-blue-900 font-black text-xs">{(batchFormula.costPerKg * 1000).toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}/{isEn ? 'T' : 'طن'} ({batchFormula.costPerBag.toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}/{isEn ? 'bag' : 'شكارة'})</span>
        </div>
      </div>

      {/* Main Title Banner & Actions */}
      <div className="bg-gradient-to-l from-emerald-950 via-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 text-emerald-950 rounded-xl shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight">
              {isEn ? 'Concentrate Premix Mixer & Bagging' : 'خلاطة العلف المركز وتعبئة الشكاير'}
            </h2>
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black px-2.5 py-0.5 rounded-full">
              {isEn ? 'Pre-Mix Batches' : 'خلطات مسبقة (Pre-Mix)'}
            </span>
          </div>
          <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">
            {isEn
              ? 'Mix dry concentrate feed ingredients (corn, soy meal, gluten, minerals, bicarbonate) in advance by ton or half-ton and pack them into bags for easy addition to TMR mixer loads.'
              : 'خلط خامات العلف المركز الجاف (ذرة، كسب صويا، جلوتوفيد، أملاح، بيكربونات) مسبقاً بالطن أو نصف طن وتعبئتها في شكاير، لسحبها بسهولة لكل لفة مكسر TMR دون الحاجة لوزن 10 خامات في كل لفة.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('prep_orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-700 shadow-2xs transition-all cursor-pointer"
              title={isEn ? 'Switch to TMR Preparation Orders' : 'الانتقال لأوامر تحضير المكسر وسحب الشكاير'}
            >
              <Boxes className="w-4 h-4 text-amber-300" />
              <span>{isEn ? 'Mixer Prep Orders' : 'أوامر تحضير المكسر'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenPrintPreview && (
            <button
              type="button"
              onClick={() => onOpenPrintPreview(selectedCategoryId, batchWeightKg)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer border border-emerald-700/60"
              title={isEn ? 'Preview A4 Sheet before printing' : 'معاينة أمر تشغيل الخلاطة A4 قبل الطباعة'}
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>{isEn ? 'Print Preview' : 'معاينة الطباعة'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>{isEn ? 'Print Mixer Order' : 'طباعة أمر الخلاطة'}</span>
          </button>
          <ExportExcelButton
            onExport={() => exportConcentratePremixToExcel(dailyPlan, rations, rawMaterials, categories)}
            label={isEn ? 'Export Bags to Excel' : 'تصدير الشكاير للإكسيل'}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-100/90 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-3 shadow-2xs animate-fade-in print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Overview Cards: Ready Bags Stock vs Daily Demand */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {categoryStocks.map(({ category, stock, demand }) => {
          const isCovered = stock.totalBagsInStock >= demand.totalBagsNeeded;
          return (
            <div
              key={category.id}
              className={`p-4 rounded-2xl border transition-all ${
                selectedCategoryId === category.id
                  ? 'bg-white border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                  : 'bg-white/90 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                    📦
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {isEn ? `Premix ${category.name}` : `مركز ${category.name}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isEn ? `${bagWeightKg} kg Bags` : `شكاير ${bagWeightKg} كجم`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedCategoryId === category.id
                      ? 'bg-amber-500 text-emerald-950 font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {selectedCategoryId === category.id
                    ? isEn
                      ? 'Selected ✓'
                      : 'المحدد للخلط ✓'
                    : isEn
                    ? 'Select Batch'
                    : 'تجهيز خلطة'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    {isEn ? 'Available Stock' : 'الرصيد الجاهز المتاح'}
                  </span>
                  <span className="text-base font-black text-emerald-800">
                    {stock.totalBagsInStock} {isEn ? 'bags' : 'شكارة'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    ({stock.totalKgInStock.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    {isEn ? 'Today Mixer Demand' : 'احتياج مكسرات اليوم'}
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {demand.totalBagsNeeded} {isEn ? 'bags' : 'شكارة'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    ({demand.concentrateKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600">{isEn ? 'Coverage Status:' : 'حالة التغطية:'}</span>
                {isCovered ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{isEn ? 'Sufficient for today' : 'رصيد كافٍ لتشغيل اليوم'}</span>
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      {isEn
                        ? `Needs ${Math.max(0, demand.totalBagsNeeded - stock.totalBagsInStock)} bags`
                        : `بحاجة لتشغيل ${Math.max(0, demand.totalBagsNeeded - stock.totalBagsInStock)} شكارة`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Section: Batch Creation & Formula Calculator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEn ? 'Setup & Run Premix Batch for Feed Mixer' : 'إعداد وتشغيل دفعة مركز لخلاطة العلف'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {isEn
                  ? 'Select target batch weight (ton or kg) and the system accurately computes ingredient weights and bag counts'
                  : 'اختر وزن الدفعة (بالطن أو الكيلو) وسيقوم السيستم بحساب أوزان الخامات بدقة وتفقيط الشكاير'}
              </p>
            </div>
          </div>

          {/* Flexible Bag Weight Controller */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto bg-white border border-slate-300 rounded-xl p-1.5 shadow-2xs print:hidden">
            <div className="flex items-center gap-1 text-slate-700 font-extrabold text-xs px-1">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Bag Weight:' : 'وزن الشكارة:'}</span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1">
              {[25, 40, 50].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleUpdateBagWeight(w)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    bagWeightKg === w
                      ? 'bg-amber-500 text-emerald-950 shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {w} {isEn ? 'kg' : 'كجم'}
                </button>
              ))}
            </div>

            {/* Flexible custom numeric input */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-0.5">
              <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">{isEn ? 'Custom:' : 'حر:'}</span>
              <input
                type="number"
                min="1"
                max="200"
                value={bagWeightKg}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  handleUpdateBagWeight(val);
                }}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-emerald-950 text-center focus:ring-2 focus:ring-amber-400 focus:outline-none"
                title={isEn ? 'Enter custom bag weight (e.g. 30, 45, 60 kg)' : 'اكتب أي وزن شكارة مخصص (مثلاً 30، 35، 45، 60 كجم)'}
              />
              <span className="text-[11px] font-bold text-slate-600">{isEn ? 'kg' : 'كجم'}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Controls: Category Selector & Tonnage Presets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
            {/* 1. Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                {isEn ? '1. Target Category & Ration:' : '1. الفئة المستهدفة والعليقة:'}
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                {eligibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isEn
                      ? `Premix ${c.name} (${rations.find((r) => r.id === c.rationId)?.name || 'Ration'})`
                      : `مركز فئة ${c.name} (${rations.find((r) => r.id === c.rationId)?.name || 'عليقة'})`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEn ? (
                  <>
                    Herd daily demand: <strong>{activeCategoryDemand.concentrateKg.toLocaleString()} kg</strong> premix ({activeCategoryDemand.totalBagsNeeded} bags).
                  </>
                ) : (
                  <>
                    استهلاك القطيع اليوم: <strong>{activeCategoryDemand.concentrateKg.toLocaleString()} كجم</strong> مركز ({activeCategoryDemand.totalBagsNeeded} شكارة).
                  </>
                )}
              </p>
            </div>

            {/* 2. Weight Presets */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                {isEn ? '2. Mixer Batch Target Amount:' : '2. كمية الدفعة المراد خلطها بالخلاطة:'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {weightPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBatchWeightKg(preset.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      batchWeightKg === preset.value
                        ? 'bg-emerald-800 text-amber-300 border-2 border-amber-400 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* Custom input */}
                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-400">
                  <span className="text-[11px] font-bold text-slate-500">{isEn ? 'Custom:' : 'وزن مخصص:'}</span>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={batchWeightKg}
                    onChange={(e) => setBatchWeightKg(Math.max(0, Number(e.target.value)))}
                    className="w-20 text-center font-black text-slate-900 bg-transparent text-sm focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600">{isEn ? 'kg' : 'كجم'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Summary Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-slate-50 p-4 rounded-xl border border-amber-300/80">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">{isEn ? 'Total Batch Weight:' : 'إجمالي وزن الدفعة:'}</span>
              <span className="text-lg font-black text-slate-900">
                {(batchFormula.targetBatchKg / 1000).toFixed(2)} {isEn ? 'Tons' : 'طن'}
              </span>
              <span className="text-[11px] text-slate-600 block font-medium">
                ({batchFormula.targetBatchKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">{isEn ? 'Bags Packed:' : 'الشكاير المعبأة:'}</span>
              <span className="text-lg font-black text-amber-900">
                {batchFormula.totalBags} {isEn ? 'bags' : 'شكارة'}
              </span>
              {batchFormula.remainingLooseKg > 0 && (
                <span className="text-[11px] text-amber-700 block font-medium">
                  + {batchFormula.remainingLooseKg} {isEn ? 'kg loose' : 'كجم كسر'}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">{isEn ? 'Est. Cost per Ton:' : 'تكلفة الطن التقديرية:'}</span>
              <span className="text-lg font-black text-emerald-900">
                {(batchFormula.costPerKg * 1000).toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block font-medium">
                ({batchFormula.costPerKg.toFixed(2)} {currency} / {isEn ? 'kg' : 'كجم'})
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">
                {isEn ? `Cost per Bag (${bagWeightKg} kg):` : `تكلفة الشكارة (${bagWeightKg} كجم):`}
              </span>
              <span className="text-lg font-black text-emerald-900">
                {batchFormula.costPerBag.toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block font-medium">
                {isEn ? 'Total Batch Cost:' : 'إجمالي الدفعة:'} {batchFormula.totalCost.toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}
              </span>
            </div>
          </div>

          {/* Ingredient Selection & Mixing Flexibility Panel */}
          {activeRation && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h4 className="text-xs font-black text-slate-900">
                    {isEn
                      ? `Ingredient Routing for (${activeRation.name}):`
                      : `مرونة تحديد خامات الخلاطة لعليقة (${activeRation.name}):`}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium hidden sm:inline">
                    {isEn
                      ? 'Click to toggle between Premix Mixer (Bags) and Direct TMR Wagon:'
                      : 'انقر لتحديد ما يدخل في الخلاطة (شكاير) وما يُحمّل بالمكسر مباشرة:'}
                  </span>
                  {setActiveTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('rations')}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                    >
                      {isEn ? 'Rations Formulation Page ↗' : 'صفحة تركيب العلائق ↗'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeRation.ingredients.map((ing) => {
                  const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                  const inPremix = isIngredientInConcentratePremix(ing, rawMat);
                  return (
                    <div
                      key={ing.rawMaterialId}
                      onClick={() => handleToggleIngredientInPremix(ing.rawMaterialId)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                        inPremix
                          ? 'bg-amber-50/90 border-amber-300 hover:bg-amber-100/90 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                      title={
                        isEn
                          ? 'Click to switch route (premix mixer or direct wagon)'
                          : 'انقر لتغيير مسار هذه الخامة (خلاطة المركز المسبق أو مكسر مباشر)'
                      }
                    >
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-black block truncate ${
                            inPremix ? 'text-amber-950' : 'text-slate-800'
                          }`}
                        >
                          {rawMat?.name || (isEn ? 'Material' : 'خامة')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {ing.amountKgPerHead}{' '}
                          {activeRation.calculationType === 'fixed_tonnage'
                            ? isEn ? 'kg/ton' : 'كجم/طن'
                            : isEn ? 'kg/head' : 'كجم/رأس'}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {inPremix ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-amber-200/90 text-amber-950 border border-amber-400">
                            <Package className="w-3 h-3 text-amber-800" />
                            <span>{isEn ? 'Premix (Bags) 📦' : 'بالخلاطة (شكاير) 📦'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <Truck className="w-3 h-3 text-slate-500" />
                            <span>{isEn ? 'Direct TMR 🚜' : 'مكسر مباشر 🚜'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formula Breakdown Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wheat className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-extrabold text-slate-900">
                  {isEn
                    ? `Premix Formula Breakdown (Batch ${batchFormula.targetBatchKg.toLocaleString()} kg)`
                    : `جدول أوزان الخامات المركزة لخلاطة المركز (لإنتاج ${batchFormula.targetBatchKg.toLocaleString()} كجم)`}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {isEn ? `(${batchFormula.items.length} materials)` : `(${batchFormula.items.length} خامات)`}
                </span>
                <ExportExcelButton
                  onExport={() =>
                    exportConcentrateFormulaToExcel(
                      batchFormula,
                      activeCategory?.name || (isEn ? 'Unspecified' : 'فئة غير محددة'),
                      activeRation?.name || (isEn ? 'Ration' : 'عليقة'),
                      mixerName,
                      settings,
                      dailyPlan.date,
                      orderNotes
                    )
                  }
                  label={isEn ? 'Export Formula to Excel' : 'تصدير معادلة الخلطة إكسيل'}
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm border border-slate-200 print:border-slate-400 rounded-xl overflow-hidden print:text-xs`}>
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200 print:border-slate-400">
                  <tr>
                    <th className="py-3 px-3 text-center border-l border-slate-200 print:border-slate-300 w-12">#</th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300">{isEn ? 'Code' : 'كود الخامة'}</th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300">{isEn ? 'Ingredient Name' : 'اسم الخامة المركزة'}</th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300 text-center">{isEn ? 'Ratio in Premix %' : 'النسبة من خلطة المركز %'}</th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300 text-center">{isEn ? 'Ration (kg/hd)' : 'المقرر بالعليقة (كجم/رأس)'}</th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300 bg-amber-50 text-amber-950 font-black text-center">
                      {isEn ? 'Batch Weight (kg)' : 'الوزن المطلوب للخلاطة (كجم)'}
                    </th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300 bg-amber-50/70 text-amber-950 font-black text-center">
                      {isEn ? `Weight per Bag (${bagWeightKg} kg)` : `الوزن بالشكارة (${bagWeightKg} كجم)`}
                    </th>
                    <th className="py-3 px-3 border-l border-slate-200 print:border-slate-300 text-center">{isEn ? 'Price/kg' : 'سعر الكيلو'}</th>
                    <th className="py-3 px-3 text-center">{isEn ? 'Total Cost' : 'إجمالي القيمة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-slate-300 font-medium text-slate-800">
                  {batchFormula.items.map((item, index) => {
                    const rowCost = item.requiredKg * (item.costPerKg || 0);
                    const kgPerBag = (item.percentageInConcentrate / 100) * bagWeightKg;
                    const bagWeightDisplay =
                      kgPerBag >= 1
                        ? `${kgPerBag.toFixed(2)} ${isEn ? 'kg' : 'كجم'}`
                        : `${Math.round(kgPerBag * 1000)} ${isEn ? 'g' : 'جرام'}`;

                    return (
                      <tr key={item.rawMaterialId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 border-l border-slate-200 print:border-slate-300">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-600 border-l border-slate-200 print:border-slate-300">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900 border-l border-slate-200 print:border-slate-300">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-l border-slate-200 print:border-slate-300">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.percentageInConcentrate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-600 border-l border-slate-200 print:border-slate-300">
                          {item.amountKgPerHead} {isEn ? 'kg' : 'كجم'}
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-950 bg-amber-50/60 border-l border-slate-200 print:border-slate-300 text-center text-base print:text-sm">
                          {item.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-900 bg-amber-50/40 border-l border-slate-200 print:border-slate-300 text-center text-sm print:text-xs">
                          {bagWeightDisplay}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-600 border-l border-slate-200 print:border-slate-300">
                          {item.costPerKg} {currency}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-black text-slate-900">
                          {Math.round(rowCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300 print:border-slate-400">
                  <tr>
                    <td colSpan={5} className={`py-3 px-3 ${isRtl ? 'text-left' : 'text-right'} border-l border-slate-200 print:border-slate-300`}>
                      {isEn ? 'Total Premix Batch & Bagging:' : 'إجمالي خلطة المركز وتعبئة الشكاير:'}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-950 font-black text-base print:text-sm bg-amber-100 border-l border-slate-200 print:border-slate-300">
                      {batchFormula.targetBatchKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({batchFormula.totalBags} {isEn ? 'bags' : 'شكارة'})
                    </td>
                    <td className="py-3 px-3 text-center text-amber-950 font-black text-sm bg-amber-100/70 border-l border-slate-200 print:border-slate-300">
                      {bagWeightKg} {isEn ? 'kg/bag' : 'كجم/شكارة'}
                    </td>
                    <td className="py-3 px-3 border-l border-slate-200 print:border-slate-300 text-center">—</td>
                    <td className="py-3 px-3 text-center text-emerald-900 font-black text-sm">
                      {Math.round(batchFormula.totalCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Printable Technical Mixing Instructions */}
            <div className="hidden print:block bg-slate-50 border border-slate-300 rounded-lg p-3 text-[11px] space-y-1.5 print-avoid-break">
              <h5 className="font-black text-slate-900 text-xs">
                {isEn ? 'Concentrate Premix Mixer & Bagging Instructions:' : 'تعليمات تشغيل خلاطة المركز وتعبئة الشكاير:'}
              </h5>
              <div className="grid grid-cols-3 gap-2 text-slate-700">
                <div>
                  <strong className="block text-slate-900 font-bold">{isEn ? '1. Loading Sequence:' : '1. ترتيب التحميل:'}</strong>
                  {isEn
                    ? 'Load bulk grains first (corn, soybean meal, gluten feed), then add micro-minerals, premixes and buffers midway.'
                    : 'تحميل الخامات الكبرى أولاً (الذرة، كسب الصويا، الجلوتوفيد)، ثم إضافة البريمكس والأملاح والبيكربونات في منتصف وقت الخلط.'}
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold">{isEn ? '2. Mixing Duration:' : '2. زمن الخلط:'}</strong>
                  {isEn
                    ? 'Run for at least 5-8 minutes after all ingredients enter to ensure thorough uniformity and prevent mineral settling.'
                    : 'التشغيل لمدة 5 - 8 دقائق على الأقل بعد اكتمال دخول كافة الخامات لضمان التجانس التام وعدم ترسب الأملاح.'}
                </div>
                <div>
                  <strong className="block text-slate-900 font-bold">{isEn ? '3. Bagging Calibration:' : '3. ضبط التعبئة:'}</strong>
                  {isEn
                    ? `Calibrate the scale accurately at ${bagWeightKg} kg, sew the bags, and label batch date and premix category clearly.`
                    : `معايرة ميزان التعبئة عند ${bagWeightKg} كجم بدقة، وخياطة الشكاير مع كتابة تاريخ الخلط ونوع المركز بوضوح.`}
                </div>
              </div>
            </div>
          </div>

          {/* Operational Details & Execution Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 print:hidden">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                {isEn ? 'Mixer Name & Operational Notes:' : 'ملاحظات واسم الخلاطة:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={mixerName}
                  onChange={(e) => setMixerName(e.target.value)}
                  placeholder={isEn ? 'Premix mixer name...' : 'اسم خلاطة المركز...'}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={isEn ? 'Shift notes & instructions...' : 'ملاحظات التشغيل والعمال...'}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex items-end justify-end gap-3">
              <button
                type="button"
                onClick={handleExecuteBatch}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isEn
                    ? `Execute & Bag Batch Now (${batchFormula.totalBags} bags)`
                    : `خلط وتعبئة الدفعة الآن (${batchFormula.totalBags} شكارة)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Executed Concentrate Orders & Batches */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-200 text-slate-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEn
                  ? `Executed Concentrate Orders Log (${dailyPlan.date})`
                  : `سجل أوامر خلط المركز وتعبئة الشكاير المنفذة اليوم (${dailyPlan.date})`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEn
                  ? 'Recorded premix batches ready and available for TMR feed mixer wagon dispatch'
                  : 'دفعات المركز الجاهزة المسجلة التي تم خلطها وتعبئتها ومتاحة لسحب مكسرات الـ TMR'}
              </p>
            </div>
          </div>
          <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
            {isEn ? `${existingOrders.length} Orders` : `${existingOrders.length} أوامر خلط`}
          </span>
        </div>

        {existingOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p>{isEn ? 'No concentrate batches recorded today yet.' : 'لم يتم تسجيل أي أوامر خلط مركز اليوم حتى الآن.'}</p>
            <p className="text-slate-400">
              {isEn
                ? 'Use the setup form above to mix and pack your first batch (0.5 ton, 1 ton, 2 tons).'
                : 'استخدم نموذج الإعداد أعلاه لخلط وتعبئة أول دفعة مركز (0.5 طن، 1 طن، 2 طن).'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm border-collapse`}>
              <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{isEn ? 'Order #' : 'رقم الأمر'}</th>
                  <th className="py-3 px-4">{isEn ? 'Category' : 'الفئة'}</th>
                  <th className="py-3 px-4">{isEn ? 'Batch Weight' : 'وزن الدفعة (طن/كجم)'}</th>
                  <th className="py-3 px-4">{isEn ? 'Bags Packed' : 'عدد الشكاير المعبأة'}</th>
                  <th className="py-3 px-4">{isEn ? 'Time' : 'وقت الخلط'}</th>
                  <th className="py-3 px-4">{isEn ? 'Mixer' : 'الخلاطة'}</th>
                  <th className="py-3 px-4">{isEn ? 'Status' : 'الحالة'}</th>
                  <th className="py-3 px-4 text-center print:hidden">{isEn ? 'Actions' : 'إجراءات'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800 text-xs">
                {existingOrders.map((order) => {
                  const cat = categories.find((c) => c.id === order.categoryId);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900">{order.orderNumber}</td>
                      <td className="py-3 px-4 font-bold text-emerald-900">
                        {cat?.name || (isEn ? 'Undefined Category' : 'فئة غير معرّفة')}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {(order.batchWeightKg / 1000).toFixed(2)} {isEn ? 'Tons' : 'طن'} ({order.batchWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
                      </td>
                      <td className="py-3 px-4 font-black text-amber-900">
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          {order.totalBags} {isEn ? 'bags' : 'شكارة'} ({order.bagWeightKg} {isEn ? 'kg' : 'كجم'})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600">{order.createdAt}</td>
                      <td className="py-3 px-4 text-slate-600">{order.mixerName || (isEn ? 'Premix Mixer' : 'خلاطة المركز')}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>{order.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(order.categoryId);
                              setBatchWeightKg(order.batchWeightKg);
                              setBagWeightKg(order.bagWeightKg);
                              if (order.mixerName) setMixerName(order.mixerName);
                              if (onOpenPrintPreview) {
                                onOpenPrintPreview(order.categoryId, order.batchWeightKg);
                              } else {
                                window.print();
                              }
                            }}
                            className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title={isEn ? 'Preview and print this order' : 'معاينة وطباعة أمر تشغيل هذه الدفعة'}
                          >
                            <Printer className="w-4 h-4 text-emerald-700" />
                          </button>
                          <ExportExcelButton
                            onExport={() =>
                              exportSingleConcentrateOrderToExcel(
                                order,
                                categories,
                                rations,
                                rawMaterials,
                                settings,
                                dailyPlan.date
                              )
                            }
                            label={isEn ? 'Excel' : 'إكسيل'}
                            variant="secondary"
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isEn ? 'Delete this order' : 'حذف هذا الأمر'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guide Banner: How it works with Mixer Wagons */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 text-emerald-950 flex items-start gap-4 shadow-2xs print:hidden">
        <div className="p-3 bg-emerald-700 text-white rounded-xl shrink-0 shadow-xs">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-extrabold text-sm text-emerald-900">
            {isEn
              ? 'How does concentrate premix work with TMR Feeding Wagons?'
              : 'كيف يعمل المركز المسبق مع مكسرات التغذية (TMR Feeding Wagons)؟'}
          </h4>
          <p className="text-emerald-800 leading-relaxed font-medium">
            {isEn ? (
              <>
                1. Concentrate batches are pre-mixed and packed into bags in advance (e.g. 20 or 40 bags of lactating premix).
                <br />
                2. On the <strong>"Mixer Prep Orders"</strong> screen, activate the <strong>"Bags & Premix Mode"</strong> switch.
                <br />
                3. The preparation sheet will display a single clear instruction: <strong>"Add 13 bags of lactating premix"</strong> instead of weighing 8 separate micro-ingredients for each wagon load. Forages (silage, hay, straw) are loaded directly with the loader.
              </>
            ) : (
              <>
                1. يتم تحضير خلطة المركز وتعبئتها في شكاير مسبقاً (مثلاً: 20 أو 40 شكارة مركز حلاب).
                <br />
                2. في شاشة <strong>"أوامر تحضير المكسر"</strong>، فعّل خيار <strong>"نمط الشكاير والمركز المسبق"</strong>.
                <br />
                3. أمر التحضير سيظهر لسائق المكسر والفني سطرًا واحدًا واضحًا للمركز: <strong>"ضع 13 شكارة مركز حلاب"</strong> بدلاً من وزن 8 خامات دقيقة منفصلة في كل لفة، وتضاف عليها المواد الخشنة (السيلاج والدريس والتبن) فقط باللودر.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Print Signatures */}
      <PrintSignatures
        settings={settings}
        signatures={[
          {
            title: isEn ? 'Nutrition & Quality Engineer' : 'مهندس التغذية والجودة',
            name: settings?.engineerName || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية'),
          },
          {
            title: isEn ? 'Premix Mixer Operator' : 'مسؤول تشغيل خلاطة المركز',
            name: mixerName ? (isEn ? `Supervisor of ${mixerName}` : `مشرف ${mixerName}`) : (isEn ? 'Premix Technician' : 'فني خلاطة المركز'),
          },
          {
            title: isEn ? 'Feed & Warehouse Manager' : 'أمين مخزن الأعلاف والشكاير',
            name: settings?.warehouseManagerName || (isEn ? 'Warehouse Manager' : 'أمين المستودع'),
          },
        ]}
      />
    </div>
  );
};
