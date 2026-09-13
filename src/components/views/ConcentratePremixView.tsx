import React, { useState, useMemo } from 'react';
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
}) => {
  const { showToast, showConfirm } = useFeedback();
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
  const [mixerName, setMixerName] = useState<string>('خلاطة المركز الجاف الرئيسية (2 طن)');
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

    const newOrderNumber = `أمر خلط مركز #${existingOrders.length + 1} (${activeCategory.name})`;
    const nowTimeStr = new Date().toLocaleTimeString('ar-EG', {
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
      status: 'مكتمل ومعبأ',
      mixerName,
      totalCost: batchFormula.totalCost,
      costPerBag: batchFormula.costPerBag,
      createdAt: nowTimeStr,
      notes: orderNotes || `خلط ${batchFormula.targetBatchKg / 1000} طن مركز ${activeCategory.name} وتعبئتها في ${batchFormula.totalBags} شكارة`,
    };

    // Update daily plan
    const updatedPlan: DailyOperationPlan = {
      ...dailyPlan,
      concentrateOrders: [newOrder, ...existingOrders],
    };

    setDailyPlan(updatedPlan);
    showToast(`تم إنتاج ${batchFormula.totalBags} شكارة مركز بنجاح!`, 'success');
    setSuccessMessage(
      `تم اعتماد أمر تشغيل الخلاطة بنجاح! تم إنتاج ${batchFormula.totalBags} شكارة (${batchFormula.targetBatchKg.toLocaleString()} كجم) وأضيفت لرصيد المركز الجاهز.`
    );
    setOrderNotes('');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  // Handle deleting an order
  const handleDeleteOrder = (orderId: string, orderNumber?: string) => {
    showConfirm({
      title: 'حذف أمر خلط مركز',
      message: `هل أنت متأكد من حذف ${orderNumber ? `(${orderNumber})` : 'أمر خلط المركز هذا'}؟ سيتم استرجاع الرصيد.`,
      isDanger: true,
      confirmText: 'حذف',
      onConfirm: () => {
        const updatedOrders = existingOrders.filter((o) => o.id !== orderId);
        setDailyPlan({
          ...dailyPlan,
          concentrateOrders: updatedOrders,
        });
        showToast('تم حذف أمر خلط المركز بنجاح.', 'info');
      },
    });
  };

  // Quick preset weight buttons
  const weightPresets = [
    { label: 'نصف طن (500 كجم)', value: 500 },
    { label: '1 طن (1,000 كجم)', value: 1000 },
    { label: '1.5 طن (1,500 كجم)', value: 1500 },
    { label: '2 طن (2,000 كجم)', value: 2000 },
    { label: '3 طن (3,000 كجم)', value: 3000 },
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
    <div className="space-y-6 print:space-y-4">
      {/* Print Header */}
      <PrintHeader
        documentTitle="أمر تشغيل خلاطة العلف المركز وتعبئة الشكاير"
        documentSubtitle={`إذن تشغيل لخلط وتعبئة أطنان المركز - ${settings.farmName}`}
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Main Title Banner & Actions */}
      <div className="bg-gradient-to-l from-emerald-950 via-emerald-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 text-emerald-950 rounded-xl shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight">خلاطة العلف المركز وتعبئة الشكاير</h2>
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black px-2.5 py-0.5 rounded-full">
              خلطات مسبقة (Pre-Mix)
            </span>
          </div>
          <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">
            خلط خامات العلف المركز الجاف (ذرة، كسب صويا، جلوتوفيد، أملاح، بيكربونات) مسبقاً بالطن أو نصف طن وتعبئتها في شكاير، لسحبها بسهولة لكل لفة مكسر TMR دون الحاجة لوزن 10 خامات في كل لفة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('prep_orders')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-700 shadow-2xs transition-all cursor-pointer"
              title="الانتقال لأوامر تحضير المكسر وسحب الشكاير"
            >
              <Boxes className="w-4 h-4 text-amber-300" />
              <span>أوامر تحضير المكسر</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>طباعة أمر الخلاطة</span>
          </button>
          <ExportExcelButton
            onExport={() => exportConcentratePremixToExcel(dailyPlan, rations, rawMaterials, categories)}
            label="تصدير الشكاير للإكسيل"
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
                    <h3 className="font-extrabold text-slate-900 text-sm">مركز {category.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">شكاير {bagWeightKg} كجم</p>
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
                  {selectedCategoryId === category.id ? 'المحدد للخلط ✓' : 'تجهيز خلطة'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">الرصيد الجاهز المتاح</span>
                  <span className="text-base font-black text-emerald-800">
                    {stock.totalBagsInStock} شكارة
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    ({stock.totalKgInStock.toLocaleString()} كجم)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">احتياج مكسرات اليوم</span>
                  <span className="text-base font-black text-slate-900">
                    {demand.totalBagsNeeded} شكارة
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    ({demand.concentrateKg.toLocaleString()} كجم)
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600">حالة التغطية:</span>
                {isCovered ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>رصيد كافٍ لتشغيل اليوم</span>
                  </span>
                ) : (
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>بحاجة لتشغيل {Math.max(0, demand.totalBagsNeeded - stock.totalBagsInStock)} شكارة</span>
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
                إعداد وتشغيل دفعة مركز لخلاطة العلف
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                اختر وزن الدفعة (بالطن أو الكيلو) وسيقوم السيستم بحساب أوزان الخامات بدقة وتفقيط الشكاير
              </p>
            </div>
          </div>

          {/* Flexible Bag Weight Controller */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto bg-white border border-slate-300 rounded-xl p-1.5 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-700 font-extrabold text-xs px-1">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>وزن الشكارة:</span>
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
                  {w} كجم
                </button>
              ))}
            </div>

            {/* Flexible custom numeric input */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-0.5">
              <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">حر:</span>
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
                title="اكتب أي وزن شكارة مخصص (مثلاً 30، 35، 45، 60 كجم)"
              />
              <span className="text-[11px] font-bold text-slate-600">كجم</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Controls: Category Selector & Tonnage Presets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Category Selection */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                1. الفئة المستهدفة والعليقة:
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                {eligibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    مركز فئة {c.name} ({rations.find((r) => r.id === c.rationId)?.name || 'عليقة'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                استهلاك القطيع اليوم: <strong>{activeCategoryDemand.concentrateKg.toLocaleString()} كجم</strong> مركز ({activeCategoryDemand.totalBagsNeeded} شكارة).
              </p>
            </div>

            {/* 2. Weight Presets */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                2. كمية الدفعة المراد خلطها بالخلاطة:
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
                  <span className="text-[11px] font-bold text-slate-500">وزن مخصص:</span>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={batchWeightKg}
                    onChange={(e) => setBatchWeightKg(Math.max(0, Number(e.target.value)))}
                    className="w-20 text-center font-black text-slate-900 bg-transparent text-sm focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600">كجم</span>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Summary Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-slate-50 p-4 rounded-xl border border-amber-300/80">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي وزن الدفعة:</span>
              <span className="text-lg font-black text-slate-900">
                {(batchFormula.targetBatchKg / 1000).toFixed(2)} طن
              </span>
              <span className="text-[11px] text-slate-600 block font-medium">
                ({batchFormula.targetBatchKg.toLocaleString()} كجم)
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">الشكاير المعبأة:</span>
              <span className="text-lg font-black text-amber-900">
                {batchFormula.totalBags} شكارة
              </span>
              {batchFormula.remainingLooseKg > 0 && (
                <span className="text-[11px] text-amber-700 block font-medium">
                  + {batchFormula.remainingLooseKg} كجم كسر
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">تكلفة الطن التقديرية:</span>
              <span className="text-lg font-black text-emerald-900">
                {(batchFormula.costPerKg * 1000).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} {settings.currency || 'ج.م'}
              </span>
              <span className="text-[11px] text-slate-500 block font-medium">
                ({batchFormula.costPerKg.toFixed(2)} ج.م / كجم)
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block">تكلفة الشكارة ({bagWeightKg} كجم):</span>
              <span className="text-lg font-black text-emerald-900">
                {batchFormula.costPerBag.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} {settings.currency || 'ج.م'}
              </span>
              <span className="text-[11px] text-slate-500 block font-medium">
                إجمالي الدفعة: {batchFormula.totalCost.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م
              </span>
            </div>
          </div>

          {/* Ingredient Selection & Mixing Flexibility Panel */}
          {activeRation && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h4 className="text-xs font-black text-slate-900">
                    مرونة تحديد خامات الخلاطة لعليقة ({activeRation.name}):
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium hidden sm:inline">
                    انقر لتحديد ما يدخل في الخلاطة (شكاير) وما يُحمّل بالمكسر مباشرة:
                  </span>
                  {setActiveTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('rations')}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                    >
                      صفحة تركيب العلائق ↗
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
                      title="انقر لتغيير مسار هذه الخامة (خلاطة المركز المسبق أو مكسر مباشر)"
                    >
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-black block truncate ${
                            inPremix ? 'text-amber-950' : 'text-slate-800'
                          }`}
                        >
                          {rawMat?.name || 'خامة'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {ing.amountKgPerHead}{' '}
                          {activeRation.calculationType === 'fixed_tonnage'
                            ? 'كجم/طن'
                            : 'كجم/رأس'}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {inPremix ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-amber-200/90 text-amber-950 border border-amber-400">
                            <Package className="w-3 h-3 text-amber-800" />
                            <span>بالخلاطة (شكاير) 📦</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <Truck className="w-3 h-3 text-slate-500" />
                            <span>مكسر مباشر 🚜</span>
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
                  جدول أوزان الخامات المركزة لخلاطة المركز (لإنتاج {batchFormula.targetBatchKg.toLocaleString()} كجم)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  ({batchFormula.items.length} خامات)
                </span>
                <ExportExcelButton
                  onExport={() =>
                    exportConcentrateFormulaToExcel(
                      batchFormula,
                      activeCategory?.name || 'فئة غير محددة',
                      activeRation?.name || 'عليقة',
                      mixerName,
                      settings,
                      dailyPlan.date,
                      orderNotes
                    )
                  }
                  label="تصدير معادلة الخلطة إكسيل"
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center border-l border-slate-200 w-12">م</th>
                    <th className="py-3 px-3 border-l border-slate-200">كود الخامة</th>
                    <th className="py-3 px-3 border-l border-slate-200">اسم الخامة المركزة</th>
                    <th className="py-3 px-3 border-l border-slate-200 text-center">النسبة من خلطة المركز %</th>
                    <th className="py-3 px-3 border-l border-slate-200 text-center">المقرر بالعليقة (كجم/رأس)</th>
                    <th className="py-3 px-3 border-l border-slate-200 bg-amber-50 text-amber-950 font-black text-center">
                      الوزن المطلوب للخلاطة (كجم)
                    </th>
                    <th className="py-3 px-3 border-l border-slate-200 text-center">سعر الكيلو</th>
                    <th className="py-3 px-3 text-center">إجمالي القيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {batchFormula.items.map((item, index) => {
                    const rowCost = item.requiredKg * (item.costPerKg || 0);
                    return (
                      <tr key={item.rawMaterialId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 border-l border-slate-200">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-600 border-l border-slate-200">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900 border-l border-slate-200">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-l border-slate-200">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.percentageInConcentrate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-600 border-l border-slate-200">
                          {item.amountKgPerHead} كجم
                        </td>
                        <td className="py-2.5 px-3 font-black text-amber-950 bg-amber-50/60 border-l border-slate-200 text-center text-base">
                          {item.requiredKg.toLocaleString()} كجم
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-600 border-l border-slate-200">
                          {item.costPerKg} ج.م
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-black text-slate-900">
                          {Math.round(rowCost).toLocaleString()} ج.م
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-left border-l border-slate-200">
                      إجمالي خلطة المركز وتعبئة الشكاير:
                    </td>
                    <td className="py-3 px-3 text-center text-amber-950 font-black text-base bg-amber-100 border-l border-slate-200">
                      {batchFormula.targetBatchKg.toLocaleString()} كجم ({batchFormula.totalBags} شكارة)
                    </td>
                    <td className="py-3 px-3 border-l border-slate-200 text-center">—</td>
                    <td className="py-3 px-3 text-center text-emerald-900 font-black text-sm">
                      {Math.round(batchFormula.totalCost).toLocaleString()} ج.م
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Operational Details & Execution Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 print:hidden">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">
                ملاحظات واسم الخلاطة:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={mixerName}
                  onChange={(e) => setMixerName(e.target.value)}
                  placeholder="اسم خلاطة المركز..."
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="ملاحظات التشغيل والعمال..."
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
                <span>خلط وتعبئة الدفعة الآن ({batchFormula.totalBags} شكارة)</span>
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
                سجل أوامر خلط المركز وتعبئة الشكاير المنفذة اليوم ({dailyPlan.date})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                دفعات المركز الجاهزة المسجلة التي تم خلطها وتعبئتها ومتاحة لسحب مكسرات الـ TMR
              </p>
            </div>
          </div>
          <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
            {existingOrders.length} أوامر خلط
          </span>
        </div>

        {existingOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p>لم يتم تسجيل أي أوامر خلط مركز اليوم حتى الآن.</p>
            <p className="text-slate-400">
              استخدم نموذج الإعداد أعلاه لخلط وتعبئة أول دفعة مركز (0.5 طن، 1 طن، 2 طن).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">رقم الأمر</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">وزن الدفعة (طن/كجم)</th>
                  <th className="py-3 px-4">عدد الشكاير المعبأة</th>
                  <th className="py-3 px-4">وقت الخلط</th>
                  <th className="py-3 px-4">الخلاطة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800 text-xs">
                {existingOrders.map((order) => {
                  const cat = categories.find((c) => c.id === order.categoryId);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900">{order.orderNumber}</td>
                      <td className="py-3 px-4 font-bold text-emerald-900">
                        {cat?.name || 'فئة غير معرّفة'}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {(order.batchWeightKg / 1000).toFixed(2)} طن ({order.batchWeightKg.toLocaleString()} كجم)
                      </td>
                      <td className="py-3 px-4 font-black text-amber-900">
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          {order.totalBags} شكارة ({order.bagWeightKg} كجم)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600">{order.createdAt}</td>
                      <td className="py-3 px-4 text-slate-600">{order.mixerName || 'خلاطة المركز'}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>{order.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
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
                            label="إكسيل"
                            variant="secondary"
                            size="sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف هذا الأمر"
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
            كيف يعمل المركز المسبق مع مكسرات التغذية (TMR Feeding Wagons)؟
          </h4>
          <p className="text-emerald-800 leading-relaxed font-medium">
            1. يتم تحضير خلطة المركز وتعبئتها في شكاير مسبقاً (مثلاً: 20 أو 40 شكارة مركز حلاب).
            <br />
            2. في شاشة <strong>"أوامر تحضير المكسر"</strong>، فعّل خيار <strong>"نمط الشكاير والمركز المسبق"</strong>.
            <br />
            3. أمر التحضير سيظهر لسائق المكسر والفني سطرًا واحدًا واضحًا للمركز: <strong>"ضع 13 شكارة مركز حلاب"</strong> بدلاً من وزن 8 خامات دقيقة منفصلة في كل لفة، وتضاف عليها المواد الخشنة (السيلاج والدريس والتبن) فقط باللودر.
          </p>
        </div>
      </div>

      {/* Print Signatures */}
      <PrintSignatures
        engineerName={settings.engineerName}
        warehouseManagerName={settings.warehouseManagerName}
        driverName="فني خلاطة المركز"
      />
    </div>
  );
};
