import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  FileText,
  Truck,
  ClipboardList,
  Warehouse,
  Package,
  Coins,
  Calendar,
  Eye,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  Milk,
  Beef,
  Activity,
  Layers,
  Building,
  AlertTriangle,
  PackagePlus,
  ArrowDownRight,
  Sliders,
  History,
} from 'lucide-react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  RawMaterial,
  FarmSettings,
} from '../../types';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { useLanguage } from '../../context/LanguageContext';
import { loadAllDailyPlans } from '../../services/storage';
import {
  ConsolidatedBatchIngredientItem,
  calculateBatchIngredients,
  doesBatchBelongToCategory,
  calculateBarnDailyDemand,
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  calculateConsolidatedBatchIngredients,
  calculateRationDmStats,
  calculateRationTotalKgPerHead,
  calculateRationCostPerKg,
  calculateWholeFarmEconomics,
  calculateChronologicalWarehouseLedger,
  calculateConcentrateBatchFormula,
  getBatchDerivedTargetWeightKg,
  getDerivedAllocationKg,
  getConcentrateAndRoughageBreakdown,
  getBarnDailyState,
  getBarnRation,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateBarnTotalAllocatedKgToday,
  calculateFarmDmSummary,
  calculateBarnDmiPerHeadKg,
  calculateCategoryTotalDemand,
  calculateBarnDmDemandKg,
  calculateMilkMetrics,
  calculateDailyWarehouseRequirements,
  calculateBatchAllocatedKg,
  calculateDairyFinancials,
  calculateFatteningFinancials,
} from '../../utils/calculations';

export type ReportType =
  | 'prep_orders'
  | 'driver_sheet'
  | 'nutrition_report'
  | 'warehouse'
  | 'concentrate_premix'
  | 'farm_economics'
  | 'daily_plan'
  | 'daily_log';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: ReportType;
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  initialBatchId?: string;
  initialPremixCategoryId?: string;
  initialPremixWeightKg?: number;
  planOverride?: DailyOperationPlan;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  defaultReportType = 'farm_economics',
  dailyPlan,
  categories,
  barns,
  mixers,
  rations,
  rawMaterials,
  settings,
  initialBatchId,
  initialPremixCategoryId,
  initialPremixWeightKg,
  planOverride,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const effectiveDailyPlan = planOverride || dailyPlan;
  const [reportType, setReportType] = useState<ReportType>(defaultReportType);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || 'ALL');
  const [selectedPremixCategory, setSelectedPremixCategory] = useState<string>(initialPremixCategoryId || categories[0]?.id || 'ALL');
  const [selectedPremixWeight, setSelectedPremixWeight] = useState<number>(initialPremixWeightKg || 1000);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [prepOrdersDisplayMode, setPrepOrdersDisplayMode] = useState<'detailed' | 'premix_bags'>('detailed');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    if (defaultReportType) {
      setReportType(defaultReportType);
    }
    if (initialBatchId) {
      setSelectedBatchId(initialBatchId);
    }
    if (initialPremixCategoryId) {
      setSelectedPremixCategory(initialPremixCategoryId);
    } else if (categories.length > 0 && (!selectedPremixCategory || selectedPremixCategory === 'ALL')) {
      setSelectedPremixCategory(categories[0].id);
    }
    if (initialPremixWeightKg) {
      setSelectedPremixWeight(initialPremixWeightKg);
    }
  }, [defaultReportType, initialBatchId, initialPremixCategoryId, initialPremixWeightKg, isOpen, categories]);

  // Keyboard shortcut listener (Escape to close, Ctrl+P to print preview)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const batches = effectiveDailyPlan.batches || [];
  const bagWeightKg = effectiveDailyPlan.premixBagWeightKg || settings.defaultBagWeightKg || 50;
  const usePremixMode = settings.hasConcentrateMixer !== false && (effectiveDailyPlan.useConcentratePremixMode ?? true);

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add('preview-printing-mode');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('preview-printing-mode');
        setIsPrinting(false);
      }, 500);
    }, 100);
  };

  const reportOptions: { id: ReportType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'farm_economics',
      label: isEn
        ? 'Comprehensive Farm Economics, IOFC & Feasibility Report'
        : 'تقرير التحليل المالي واقتصاديات المزرعة و IOFC (شامل)',
      icon: <Coins className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'prep_orders',
      label: isEn ? 'TMR Mixer Batch Preparation & Loading Order' : 'أمر تحضير وتحميل المكسر (المركب) TMR',
      icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'driver_sheet',
      label: isEn ? 'Driver Feed Distribution & Pen Delivery Sheet' : 'كشف تفريغ وتوزيع العلف للسائق',
      icon: <Truck className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'warehouse',
      label: isEn ? 'Warehouse Material Issue & Ledger Report' : 'إذن صرف وتقرير دفتر أستاذ المخزن الشامل',
      icon: <Warehouse className="w-4 h-4 text-purple-600" />,
    },
    {
      id: 'nutrition_report',
      label: isEn ? 'Daily Farm Nutrition, Operations & Financial Report' : 'تقرير التغذية والتشغيل والتحليل المالي اليومي',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'concentrate_premix',
      label: isEn ? 'Premix Mixer & Concentrate Bagging Order' : 'أمر تشغيل خلاطة العلف وتعبئة الشكاير',
      icon: <Package className="w-4 h-4 text-amber-700" />,
    },
    {
      id: 'daily_plan',
      label: isEn ? 'Daily Operation Schedule & Mixer Batches Sheet' : 'كشف خطة التشغيل وجدول لفات المكسر اليومية',
      icon: <Calendar className="w-4 h-4 text-indigo-600" />,
    },
    {
      id: 'daily_log',
      label: isEn ? 'Daily Operations Archive & Historical Log Sheet' : 'كشف السجل اليومي وأرشيف العمليات والتشغيل',
      icon: <History className="w-4 h-4 text-emerald-500" />,
    },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="print-preview-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-hidden"
    >
      <div className={`print-preview-active-container bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
        
        {/* Top Control Bar (Screen Only) */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/30 text-emerald-400 rounded-xl border border-emerald-600/40">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{isEn ? 'Official Print Preview (Print View)' : 'معاينة الطباعة الرسمية الشاملة (Print View)'}</span>
                <span className="text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  {isEn ? 'True A4 Paper Scale' : 'ورق A4 كامل ومطابق للواقع'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Review full financial and operational reports, tables, calculations, and official signatures'
                  : 'استعراض التقرير المالي والتشغيلي بكامل بياناته، مؤشراته، جداوله، وتوقيعاته الرسمية'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Print report now (Print)' : 'طباعة هذا التقرير الآن بدقة 100%'}
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>
                {isPrinting
                  ? isEn
                    ? 'Sending to printer...'
                    : 'جاري إرسال الأمر للطابعة...'
                  : isEn
                  ? 'Print Report (Print)'
                  : 'طباعة التقرير الآن (Print)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={isEn ? 'Close Preview' : 'إغلاق المعاينة'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Toolbar */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">{isEn ? 'Report Type:' : 'نوع التقرير:'}</span>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 cursor-pointer"
              >
                {reportOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {reportType === 'prep_orders' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isEn ? 'Batch:' : 'اللفة:'}</span>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 cursor-pointer text-xs"
                  >
                    <option value="ALL">
                      {isEn
                        ? `📋 All Daily Batches (${batches.length} batches - 1 page per batch)`
                        : `📋 جميع اللفات اليومية (${batches.length} لفة - صفحة لكل لفة)`}
                    </option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} - {categories.find((c) => c.id === b.categoryId)?.name || (isEn ? 'General' : 'عام')} ({b.time})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchId('ALL')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      selectedBatchId === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'All Batches' : 'كل اللفات'}
                  </button>
                  {batches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBatchId === 'ALL') {
                          setSelectedBatchId(batches[0].id);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        selectedBatchId !== 'ALL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isEn ? 'Single Batch' : 'لفة محددة'}
                    </button>
                  )}
                </div>

                {/* Loading Raw Materials Mode: Full Detailed vs Pre-mix Bags */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrepOrdersDisplayMode('detailed')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      prepOrdersDisplayMode === 'detailed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isEn ? 'Show all individual raw materials (roughage + concentrate + minerals)' : 'عرض كافة الخامات العلفية خامة بخامة بالكامل (خامات خشنة + مركزات + أملاح)'}
                  >
                    {isEn ? '📋 All Materials' : '📋 كافة الخامات مفصلة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrepOrdersDisplayMode('premix_bags')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      prepOrdersDisplayMode === 'premix_bags'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isEn ? 'Group bagged concentrate premix + direct loader materials' : 'تجميع المركز في شكاير مسبقة التعبئة + خامات اللودر الخشنة'}
                  >
                    {isEn ? '📦 Premix Bags' : '📦 نمط شكاير المركز'}
                  </button>
                </div>
              </div>
            )}

            {reportType === 'concentrate_premix' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isEn ? 'Batch / Category:' : 'الخلطة / الفئة:'}</span>
                  <select
                    value={selectedPremixCategory}
                    onChange={(e) => setSelectedPremixCategory(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-amber-300 font-bold rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isEn ? `Premix Batch: ${c.name}` : `أمر خلط مركز: ${c.name}`}
                      </option>
                    ))}
                    <option value="ALL">
                      {isEn ? '📋 All Premix Formulas Standard Sheet' : '📋 دليل معايير جميع خلطات المركز'}
                    </option>
                  </select>
                </div>

                {selectedPremixCategory !== 'ALL' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">{isEn ? 'Weight:' : 'الكمية:'}</span>
                    <select
                      value={selectedPremixWeight}
                      onChange={(e) => setSelectedPremixWeight(Number(e.target.value))}
                      className="bg-slate-800 border border-slate-700 text-white font-bold rounded-lg px-2.5 py-1.5 focus:outline-emerald-500 cursor-pointer"
                    >
                      <option value={500}>{isEn ? '0.5 Ton (500 kg)' : 'نصف طن (500 كجم)'}</option>
                      <option value={1000}>{isEn ? '1 Ton (1,000 kg)' : '1 طن (1,000 كجم)'}</option>
                      <option value={1500}>{isEn ? '1.5 Tons (1,500 kg)' : '1.5 طن (1,500 كجم)'}</option>
                      <option value={2000}>{isEn ? '2 Tons (2,000 kg)' : '2 طن (2,000 كجم)'}</option>
                      <option value={3000}>{isEn ? '3 Tons (3,000 kg)' : '3 طن (3,000 كجم)'}</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setShowSignatures(!showSignatures)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold cursor-pointer transition-colors"
            >
              {showSignatures ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isEn ? 'Signatures Block' : 'خانات التوقيعات الرسمية'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCompactMode(!compactMode)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-semibold cursor-pointer transition-colors"
            >
              {compactMode ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isEn ? 'Compact Mode' : 'طباعة مدمجة (Compact)'}</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title={isEn ? 'Zoom Out' : 'تصغير'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300 font-mono font-bold w-10 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title={isEn ? 'Zoom In' : 'تكبير'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer mr-1"
              title="100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Paper Simulation Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/80 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-preview-document"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className={`w-full max-w-[210mm] bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 transition-transform duration-150 border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:rounded-none ${
              compactMode ? 'text-xs' : 'text-sm'
            }`}
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {reportType === 'farm_economics' && (
              <FarmEconomicsPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                barns={barns}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}

            {reportType === 'prep_orders' && (
              <PreparationOrdersPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                mixers={mixers}
                settings={settings}
                barns={barns}
                selectedBatchId={selectedBatchId}
                usePremixMode={usePremixMode}
                bagWeightKg={bagWeightKg}
                showSignatures={showSignatures}
                displayMode={prepOrdersDisplayMode}
              />
            )}

            {reportType === 'driver_sheet' && (
              <DriverSheetPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                barns={barns}
                mixers={mixers}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}

            {reportType === 'warehouse' && (
              <WarehousePrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                barns={barns}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}

            {reportType === 'nutrition_report' && (
              <NutritionReportPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                barns={barns}
                mixers={mixers}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}

            {reportType === 'concentrate_premix' && (
              <ConcentratePremixPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                showSignatures={showSignatures}
                selectedCategoryId={selectedPremixCategory}
                batchWeightKg={selectedPremixWeight}
              />
            )}

            {reportType === 'daily_plan' && (
              <DailyPlanPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                rations={rations}
                barns={barns}
                mixers={mixers}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}

            {reportType === 'daily_log' && (
              <DailyLogPrintContent
                dailyPlan={effectiveDailyPlan}
                categories={categories}
                barns={barns}
                mixers={mixers}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                showSignatures={showSignatures}
              />
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 print:hidden">
          <span>
            {isEn
              ? '💡 Note: All figures and economic indicators match live operational screens and daily plan 100%.'
              : '💡 ملاحظة: جميع البيانات والمؤشرات الاقتصادية متطابقة 100% مع شاشات التشغيل وخطة اليوم.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
            >
              {isEn ? 'Print Document' : 'طباعة المستند'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
            >
              {isEn ? 'Close' : 'إغلاق'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================
   1. FARM ECONOMICS COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const FarmEconomicsPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  barns: Barn[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, rations, rawMaterials, barns, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const formatNum = (val: number, maxDec: number = 0) =>
    val.toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: maxDec });

  const currency = settings.currency || (isEn ? 'EGP' : 'ج.م');
  const milkPrice = dailyPlan.milkProduction?.milkPricePerKg ?? settings.defaultMilkPricePerKg ?? 20.0;
  const meatPrice = dailyPlan.fatteningMeatPricePerKg ?? settings.defaultMeatPricePerKg ?? 175.0;
  const fatteningAdg = dailyPlan.fatteningAdgKg ?? 1.5;

  const summary = calculateWholeFarmEconomics(
    categories,
    barns,
    rations,
    rawMaterials,
    dailyPlan,
    {
      milkPricePerKg: milkPrice,
      liveMeatPricePerKg: meatPrice,
      fatteningAdgKg: fatteningAdg,
    },
    settings
  );

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`}>
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? "Comprehensive Farm Financial & IOFC Report" : "تقرير التحليل المالي واقتصاديات المزرعة الشامل و IOFC"}
        documentSubtitle={isEn ? `Category feed cost analysis & gross farm margin after total herd feeding - Date: ${dailyPlan.date}` : `تحليل تكلفة علف كل فئة وعائد المزرعة الكلي بعد تغذية الكل - تاريخ: ${dailyPlan.date}`}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* Pricing and Simulation Parameters Banner */}
      <div className="grid grid-cols-3 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Approved Milk Price:' : 'سعر كيلو اللبن المعتمد:'}</span>
          <span className="text-blue-900 font-black text-sm">{milkPrice.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Live Beef Price (Cattle):' : 'سعر كيلو اللحم قائم (عجول):'}</span>
          <span className="text-amber-900 font-black text-sm">{meatPrice.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Estimated Fattening ADG:' : 'معدل التحويل اليومي المقدر للتسمين:'}</span>
          <span className="text-emerald-900 font-black text-sm">{fatteningAdg.toFixed(2)} {isEn ? 'kg gain/day' : 'كجم نمو/يوم'}</span>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-4 gap-2 text-xs font-bold">
        {/* Total Feed Cost */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Daily Farm Feed Cost' : 'إجمالي تكلفة علف المزرعة اليومية'}</span>
          <div className="text-base font-black text-rose-700">
            {formatNum(Math.round(summary.totalFarmDailyFeedCost))} {currency}
          </div>
          <span className="text-[10px] text-slate-600 block">
            {isEn ? `Avg: ${formatNum(summary.averageFeedCostPerHead, 1)} ${currency}/head` : `متوسط: ${summary.averageFeedCostPerHead.toLocaleString('ar-EG')} ${currency}/رأس`}
          </span>
        </div>

        {/* Total Revenues */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Estimated Daily Revenue' : 'إجمالي الإيرادات اليومية المقدرة'}</span>
          <div className="text-base font-black text-blue-700">
            {formatNum(Math.round(summary.totalFarmDailyRevenue))} {currency}
          </div>
          <span className="text-[10px] text-slate-600 block">
            {isEn
              ? `Milk: ${formatNum(Math.round(summary.totalMilkRevenue))} | Meat: ${formatNum(Math.round(summary.totalMeatGainRevenue))}`
              : `حليب: ${Math.round(summary.totalMilkRevenue).toLocaleString('ar-EG')} | لحم: ${Math.round(summary.totalMeatGainRevenue).toLocaleString('ar-EG')}`}
          </span>
        </div>

        {/* Whole Farm Net Margin */}
        <div className={`p-3 rounded-lg border space-y-1 ${
          summary.wholeFarmNetMarginOverFeed >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
        }`}>
          <span className="text-slate-600 block text-[10px]">{isEn ? 'Net Margin Over Feed (Whole Farm)' : 'العائد بعد تغذية الكل (Net Margin)'}</span>
          <div className={`text-base font-black ${
            summary.wholeFarmNetMarginOverFeed >= 0 ? 'text-emerald-900' : 'text-rose-900'
          }`}>
            {formatNum(Math.round(summary.wholeFarmNetMarginOverFeed))} {currency}{isEn ? '/day' : '/يوم'}
          </div>
          <span className="text-[10px] text-emerald-800 font-bold block">
            {isEn
              ? `Margin/Head: ${summary.wholeFarmNetMarginPerHead.toFixed(2)} ${currency}/head`
              : `ربح الرأس: ${summary.wholeFarmNetMarginPerHead.toFixed(2)} ${currency}/رأس`}
          </span>
        </div>

        {/* Feed Cost % of Revenue */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Feed Cost % of Gross Revenue' : 'نسبة تكلفة العلف من إجمالي الدخل'}</span>
          <div className="text-base font-black text-purple-900">
            {summary.wholeFarmFeedCostPercentOfRevenue}%
          </div>
          <span className="text-[10px] font-bold text-slate-700 block">
            {summary.wholeFarmFeedCostPercentOfRevenue <= 60
              ? (isEn ? '✓ Excellent Financial Safety' : '✓ أمان مالي ممتاز')
              : (isEn ? 'Acceptable / Needs Monitoring' : 'مقبول / يحتاج ترشيد')}
          </span>
        </div>
      </div>

      {/* Sector Breakdown Comparison */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Dairy */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
          <div className="font-black text-blue-950 flex items-center justify-between">
            <span>{isEn ? 'Dairy Sector (Dairy IOFC)' : 'قطاع أبقار الحليب (Dairy IOFC)'}</span>
            <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-bold">{summary.dairyTotalHeads} {isEn ? 'cows' : 'بقرة'}</span>
          </div>
          <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
            <div className="flex justify-between"><span>{isEn ? 'Milk Revenue:' : 'دخل اللبن:'}</span> <strong>{formatNum(Math.round(summary.dairyOnlyRevenue))} {currency}</strong></div>
            <div className="flex justify-between"><span>{isEn ? 'Feed Cost:' : 'تكلفة العلف:'}</span> <strong className="text-rose-700">{formatNum(Math.round(summary.dairyOnlyFeedCost))} {currency}</strong></div>
            <div className="flex justify-between border-t border-blue-200 pt-0.5 font-bold text-blue-950">
              <span>{isEn ? 'Net IOFC:' : 'صافي IOFC:'}</span>
              <strong className="text-emerald-800">{formatNum(Math.round(summary.dairyOnlyIofc))} {currency}</strong>
            </div>
            <div className={`text-[10px] text-blue-800 font-semibold ${isEn ? 'text-right' : 'text-left'}`}>
              {isEn ? `Cow Margin: ${summary.dairyAverageIofcPerHead.toFixed(1)} ${currency}/day` : `عائد البقرة: ${summary.dairyAverageIofcPerHead.toFixed(1)} ${currency}/يوم`}
            </div>
          </div>
        </div>

        {/* Fattening */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
          <div className="font-black text-amber-950 flex items-center justify-between">
            <span>{isEn ? 'Beef Feedlot Sector (Beef MOFC)' : 'قطاع عجول التسمين (Beef MOFC)'}</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">{summary.fatteningTotalHeads} {isEn ? 'bulls' : 'عجل'}</span>
          </div>
          <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
            <div className="flex justify-between"><span>{isEn ? 'Meat Gain Revenue:' : 'إيراد تحويل اللحم:'}</span> <strong>{formatNum(Math.round(summary.fatteningOnlyRevenue))} {currency}</strong></div>
            <div className="flex justify-between"><span>{isEn ? 'Feed Cost:' : 'تكلفة العلف:'}</span> <strong className="text-rose-700">{formatNum(Math.round(summary.fatteningOnlyFeedCost))} {currency}</strong></div>
            <div className="flex justify-between border-t border-amber-200 pt-0.5 font-bold text-amber-950">
              <span>{isEn ? 'Net MOFC:' : 'صافي MOFC:'}</span>
              <strong className="text-emerald-800">{formatNum(Math.round(summary.fatteningOnlyMofc))} {currency}</strong>
            </div>
            <div className={`text-[10px] text-amber-800 font-semibold ${isEn ? 'text-right' : 'text-left'}`}>
              {isEn ? `Bull Margin: ${summary.fatteningAverageMofcPerHead.toFixed(1)} ${currency}/day` : `عائد العجل: ${summary.fatteningAverageMofcPerHead.toFixed(1)} ${currency}/يوم`}
            </div>
          </div>
        </div>

        {/* Maintenance / Non-producing */}
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg space-y-1">
          <div className="font-black text-purple-950 flex items-center justify-between">
            <span>{isEn ? 'Replacement & Dry Sector (Non-Producing)' : 'قطاع الرعاية والاستثمار (غير المدر)'}</span>
            <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">{summary.nonProducingHeads} {isEn ? 'heads' : 'رأس'}</span>
          </div>
          <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
            <div className="flex justify-between"><span>{isEn ? 'Herd Composition:' : 'طبيعة القطيع:'}</span> <span>{isEn ? 'Dry, pregnant, growing, calves' : 'جاف، عشار، نامي، رضع'}</span></div>
            <div className="flex justify-between"><span>{isEn ? 'Daily Feed Cost:' : 'تكلفة علفهم اليومي:'}</span> <strong className="text-rose-700">{formatNum(Math.round(summary.nonProducingFeedCost))} {currency}</strong></div>
            <div className="flex justify-between border-t border-purple-200 pt-0.5 font-bold text-purple-950">
              <span>{isEn ? 'Budget Share:' : 'الحصة من الميزانية:'}</span>
              <strong>{summary.nonProducingFeedSharePercent}%</strong>
            </div>
            <div className={`text-[10px] text-purple-800 font-semibold ${isEn ? 'text-right' : 'text-left'}`}>
              {isEn
                ? `Head Avg: ${summary.nonProducingHeads > 0 ? formatNum(Math.round(summary.nonProducingFeedCost / summary.nonProducingHeads)) : 0} ${currency}/day`
                : `متوسط الرأس: ${summary.nonProducingHeads > 0 ? Math.round(summary.nonProducingFeedCost / summary.nonProducingHeads) : 0} ${currency}/يوم`}
            </div>
          </div>
        </div>
      </div>

      {/* The Full Comprehensive Financial Table */}
      <div className="space-y-2">
        <h4 className="font-black text-slate-900 text-xs">
          {isEn ? 'Category Costs, Revenues & Economic Return Breakdown:' : 'جدول تفصيل تكاليف وإيرادات وعوائد كل فئة حيوانية بالمزرعة:'}
        </h4>
        <table className={`w-full border-collapse border border-slate-400 text-[11px] ${isEn ? 'text-left' : 'text-right'}`}>
          <thead className="bg-slate-100 text-slate-900 font-extrabold">
            <tr className="border-b border-slate-400 text-center">
              <th className={`py-2 px-2 border border-slate-300 ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Category & Pens' : 'الفئة والعنابر'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Type' : 'النوع'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Heads' : 'الرؤوس'}</th>
              <th className="py-2 px-2 border border-slate-300">{isEn ? 'Feed/Day' : 'العلف/يوم'}</th>
              <th className={`py-2 px-2 border border-slate-300 ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Ration' : 'العليقة'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Price/kg' : 'سعر كجم'}</th>
              <th className="py-2 px-2 border border-slate-300 text-rose-800 font-black">{isEn ? 'Feed Cost' : 'تكلفة العلف'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Cost/Head' : 'تكلفة/رأس'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Share%' : 'الحصة%'}</th>
              <th className="py-2 px-2 border border-slate-300 text-blue-900 font-black">{isEn ? 'Daily Revenue' : 'الإيراد اليومي'}</th>
              <th className="py-2 px-2 border border-slate-300 text-emerald-900 font-black">{isEn ? 'Net Margin' : 'صافي العائد'}</th>
              <th className="py-2 px-1 border border-slate-300 text-emerald-950 font-black">{isEn ? 'Margin/Head' : 'صافي/رأس'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {summary.categoriesBreakdown.map((cat, idx) => {
              const typeBadge =
                cat.categoryType === 'milking'
                  ? (isEn ? 'Dairy' : 'حلاب')
                  : cat.categoryType === 'fattening'
                  ? (isEn ? 'Beef' : 'تسمين')
                  : cat.categoryType === 'dry'
                  ? (isEn ? 'Dry' : 'جاف')
                  : cat.categoryType === 'heifer'
                  ? (isEn ? 'Heifer' : 'عشار')
                  : cat.categoryType === 'calf'
                  ? (isEn ? 'Calf' : 'رضيع')
                  : (isEn ? 'Other' : 'أخرى');

              return (
                <tr key={cat.categoryId} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                  <td className={`py-1.5 px-2 border border-slate-300 font-bold text-slate-900 ${isEn ? 'text-left' : 'text-right'}`}>
                    <div>{cat.categoryName}</div>
                    {cat.barnNames.length > 0 && (
                      <div className="text-[9px] text-slate-500 font-normal">{isEn ? `Pens: ${cat.barnNames.join(', ')}` : `عنابر: ${cat.barnNames.join('، ')}`}</div>
                    )}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-[10px]">
                    {typeBadge}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold">{cat.totalHeads}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {formatNum(cat.dailyDemandKg)} {isEn ? 'kg' : 'كجم'}
                  </td>
                  <td className={`py-1.5 px-2 border border-slate-300 truncate max-w-[100px] ${isEn ? 'text-left' : 'text-right'}`}>
                    {cat.rationName}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-amber-900">
                    {cat.rationCostPerKg.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-rose-800 bg-rose-50/50">
                    {formatNum(Math.round(cat.totalDailyFeedCost))}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-semibold">
                    {cat.feedCostPerHeadPerDay.toFixed(1)}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold">
                    {cat.feedCostSharePercent}%
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-blue-900">
                    {cat.isRevenueGenerating ? formatNum(Math.round(cat.dailyRevenue)) : '—'}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-900 bg-emerald-50/50">
                    {cat.isRevenueGenerating
                      ? `${cat.netMarginOverFeed >= 0 ? '+' : ''}${formatNum(Math.round(cat.netMarginOverFeed))}`
                      : '—'}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-black text-emerald-950">
                    {cat.isRevenueGenerating
                      ? `${cat.netMarginPerHeadPerDay >= 0 ? '+' : ''}${cat.netMarginPerHeadPerDay.toFixed(1)}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
            <tr className="text-center">
              <td colSpan={2} className={`py-2 px-2 border border-slate-300 font-black ${isEn ? 'text-left' : 'text-left'}`}>
                {isEn ? 'Total All Farm Herds:' : 'إجمالي كل قطعان المزرعة:'}
              </td>
              <td className="py-2 px-1 border border-slate-300 font-black text-sm">
                {summary.totalFarmHeads}
              </td>
              <td className="py-2 px-2 border border-slate-300 font-black text-sm">
                {formatNum(Math.round(summary.totalFarmDemandKg))} {isEn ? 'kg' : 'كجم'}
              </td>
              <td colSpan={2} className="py-2 px-1 border border-slate-300 text-center font-bold text-xs">
                {isEn
                  ? `(Avg Feed/Head: ${formatNum(summary.averageFeedCostPerHead, 1)} ${currency})`
                  : `(متوسط علف الرأس: ${summary.averageFeedCostPerHead.toLocaleString('ar-EG')} ج.م)`}
              </td>
              <td className="py-2 px-2 border border-slate-300 font-black text-sm text-rose-900">
                {formatNum(Math.round(summary.totalFarmDailyFeedCost))} {currency}
              </td>
              <td className="py-2 px-1 border border-slate-300 font-bold">—</td>
              <td className="py-2 px-1 border border-slate-300 font-black">100%</td>
              <td className="py-2 px-2 border border-slate-300 font-black text-sm text-blue-950">
                {formatNum(Math.round(summary.totalFarmDailyRevenue))} {currency}
              </td>
              <td className="py-2 px-2 border border-slate-300 font-black text-sm text-emerald-950">
                {formatNum(Math.round(summary.wholeFarmNetMarginOverFeed))} {currency}
              </td>
              <td className="py-2 px-1 border border-slate-300 font-black text-sm text-emerald-950">
                {summary.wholeFarmNetMarginPerHead.toFixed(2)} {currency}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Barns Breakdown within Categories */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <h4 className="font-bold text-slate-800 text-xs">
          {isEn ? 'Distribution of Barns, Weights & Economic Return per Pen:' : 'توزيع عنابر القطيع والأوزان والعائد الاقتصادي لكل عنبر:'}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {summary.categoriesBreakdown.map((cat) => {
            const catBarns = barns.filter((b) => b.categoryId === cat.categoryId && b.status === 'نشط');
            if (catBarns.length === 0) return null;
            return (
              <div key={cat.categoryId} className="p-2 border border-slate-300 rounded bg-slate-50 space-y-1">
                <div className="font-black text-slate-900 flex justify-between border-b border-slate-200 pb-0.5">
                  <span>{cat.categoryName} ({cat.totalHeads} {isEn ? 'heads' : 'رأس'})</span>
                  <span>{isEn ? 'Feed: ' : 'علف: '}{formatNum(Math.round(cat.totalDailyFeedCost))} {currency}</span>
                </div>
                <div className="space-y-0.5">
                  {catBarns.map((b) => {
                    const demand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
                    const cost = demand * cat.rationCostPerKg;
                    return (
                      <div key={b.id} className="flex justify-between text-slate-700">
                        <span>{isEn ? `Barn ${b.number} ${b.name ? `(${b.name})` : ''} - ${b.headCount} heads:` : `عنبر ${b.number} ${b.name ? `(${b.name})` : ''} - ${b.headCount} رأس:`}</span>
                        <span className="font-bold">{formatNum(Math.round(demand))} {isEn ? 'kg' : 'كجم'} ({formatNum(Math.round(cost))} {currency})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Nutrition & Operations Engineer' : 'مهندس التغذية والتشغيل', name: settings?.engineerName },
            { title: isEn ? 'Financial Director' : 'المدير المالي للمزرعة' },
            { title: isEn ? 'General Manager & Owner' : 'المدير العام والمالك' },
          ]}
        />
      )}
    </div>
  );
};

/* =============================================================
   2. PREPARATION ORDERS COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const PreparationOrdersPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  mixers: Mixer[];
  settings: FarmSettings;
  barns: Barn[];
  selectedBatchId: string;
  usePremixMode: boolean;
  bagWeightKg: number;
  showSignatures: boolean;
  displayMode?: 'detailed' | 'premix_bags';
}> = ({
  dailyPlan,
  categories,
  rations,
  rawMaterials,
  mixers,
  settings,
  barns,
  selectedBatchId,
  usePremixMode,
  bagWeightKg,
  showSignatures,
  displayMode = 'detailed',
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const safeBarns = Array.isArray(barns) ? barns : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeRations = Array.isArray(rations) ? rations : [];

  const allBatches = (dailyPlan.batches || []).filter((b) => {
    const effectiveWeight = getBatchDerivedTargetWeightKg(b, safeBarns, safeCategories, safeRations, dailyPlan);
    return effectiveWeight > 0 || (b.targetWeightKg || 0) > 0;
  });
  const batchesToRender =
    selectedBatchId === 'ALL'
      ? allBatches
      : allBatches.filter((b) => b.id === selectedBatchId);

  if (batchesToRender.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 font-bold">
        {isEn ? 'No TMR preparation orders scheduled for today.' : 'لا توجد أوامر تحضير مكسر مجدولة لهذا اليوم.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {batchesToRender.map((batch, bIdx) => {
        const category =
          safeCategories.find((c) => c.id === batch.categoryId) ||
          safeCategories.find((c) => doesBatchBelongToCategory(batch, c, safeBarns));
        const ration = safeRations.find(
          (r) => r.id === (batch.rationId || category?.rationId || (category as any)?.defaultRationId)
        );
        const mixer = mixers.find((m) => m.id === batch.mixerId);
        const derivedWeight = getBatchDerivedTargetWeightKg(batch, safeBarns, safeCategories, safeRations, dailyPlan);
        const effectiveWeight = derivedWeight > 0 ? derivedWeight : (batch.targetWeightKg || 0);
        const actualWeights = batch.actualIngredientWeights || {};

        // Calculate gross vs refusal
        let activeBatchGrossKg = 0;
        let activeBatchRefusalKg = 0;
        if (batch.allocations && batch.allocations.length > 0) {
          batch.allocations.forEach((a) => {
            const barn = safeBarns.find((bn) => bn.id === a.barnId);
            if (barn) {
              const gross = calculateBarnGrossDemandKg(barn, safeCategories, safeRations, dailyPlan);
              const refusal = calculateBarnRecycledRefusalKg(barn, dailyPlan);
              const pct =
                a.allocatedPercent !== undefined
                  ? Number(a.allocatedPercent)
                  : gross > 0
                  ? ((a.allocatedKg || 0) / gross) * 100
                  : 0;
              activeBatchGrossKg += (gross * pct) / 100;
              activeBatchRefusalKg += (refusal * pct) / 100;
            }
          });
        }
        activeBatchGrossKg = Math.round(activeBatchGrossKg * 10) / 10;
        activeBatchRefusalKg = Math.round(activeBatchRefusalKg * 10) / 10;

        // Calculate all individual raw materials
        const allRawIngredients =
          ration && effectiveWeight > 0
            ? calculateBatchIngredients(effectiveWeight, ration, safeMaterials, actualWeights)
            : [];

        // Enrich with raw material data and stage loading sequence
        const enrichedIngredients = allRawIngredients
          .map((item) => {
            const mat = safeMaterials.find((rm) => rm.id === item.rawMaterialId);
            const matType = mat?.materialType || 'roughage';
            const dmPct = mat?.dryMatterPercent ?? 90;
            const dmKg = Math.round(item.requiredKg * (dmPct / 100) * 10) / 10;

            let stageNumber = 1;
            let stageLabel = isEn ? 'Stage 1: Roughage & Silage' : 'المرحلة 1: المواد المالئة والرطبة';
            let typeLabel = isEn ? 'Roughage / Forage' : 'مادة مالئة وخشنة';
            let typeBadgeClass = 'bg-emerald-100 text-emerald-950 border-emerald-300';
            let sequenceNote = isEn ? 'Add first into mixer for chopping' : 'تضاف أولاً في المكسر للفرم والتقطيع الجيد';

            if (matType === 'roughage') {
              stageNumber = 1;
              stageLabel = isEn ? 'Stage 1: Roughage & Silage' : 'المرحلة 1: المواد المالئة والرطبة';
              typeLabel = isEn ? 'Roughage / Forage' : 'مادة مالئة وخشنة';
              typeBadgeClass = 'bg-emerald-100 text-emerald-950 border-emerald-300';
              sequenceNote = isEn ? 'Add first into mixer for chopping' : 'تضاف أولاً في المكسر للفرم والتقطيع الجيد';
            } else if (matType === 'concentrate') {
              stageNumber = 2;
              stageLabel = isEn ? 'Stage 2: Grains & Concentrates' : 'المرحلة 2: الحبوب والأعلاف المركزة';
              typeLabel = isEn ? 'Concentrate / Grains' : 'علف مركز وحبوب';
              typeBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
              sequenceNote = isEn ? 'Add after roughage for homogeneity' : 'تضاف بعد فرم الخشن لضمان التجانس ومنع الهدر';
            } else if (matType === 'mineral') {
              stageNumber = 3;
              stageLabel = isEn ? 'Stage 3: Minerals & Premixes' : 'المرحلة 3: الأملاح المعدنية والإضافات';
              typeLabel = isEn ? 'Minerals & Premix' : 'أملاح وإضافات';
              typeBadgeClass = 'bg-blue-100 text-blue-950 border-blue-300';
              sequenceNote = isEn ? 'Mix with concentrates for uniform distribution' : 'تخلط مع المركزات لضمان التوزيع المتساوي';
            } else if (matType === 'liquid') {
              stageNumber = 4;
              stageLabel = isEn ? 'Stage 4: Liquids & Molasses' : 'المرحلة 4: السوائل والمولاس';
              typeLabel = isEn ? 'Liquids & Molasses' : 'سوائل ومولاس';
              typeBadgeClass = 'bg-purple-100 text-purple-950 border-purple-300';
              sequenceNote = isEn ? 'Spray evenly while drum rotates' : 'ترش بالتساوي فوق الخلطة أثناء الدوران';
            }

            return {
              ...item,
              mat,
              matType,
              dmPct,
              dmKg,
              stageNumber,
              stageLabel,
              typeLabel,
              typeBadgeClass,
              sequenceNote,
            };
          })
          .sort((a, b) => a.stageNumber - b.stageNumber || a.requiredKg - b.requiredKg);

        // Subtotals by feed type
        const roughageTotalKg = Math.round(
          enrichedIngredients.filter((i) => i.matType === 'roughage').reduce((s, i) => s + i.requiredKg, 0) * 10
        ) / 10;
        const concentrateTotalKg = Math.round(
          enrichedIngredients.filter((i) => i.matType === 'concentrate').reduce((s, i) => s + i.requiredKg, 0) * 10
        ) / 10;
        const mineralTotalKg = Math.round(
          enrichedIngredients.filter((i) => i.matType === 'mineral').reduce((s, i) => s + i.requiredKg, 0) * 10
        ) / 10;
        const liquidTotalKg = Math.round(
          enrichedIngredients.filter((i) => i.matType === 'liquid').reduce((s, i) => s + i.requiredKg, 0) * 10
        ) / 10;

        const totalReq = Math.round(enrichedIngredients.reduce((s, i) => s + i.requiredKg, 0) * 10) / 10;
        const totalAct = Math.round(enrichedIngredients.reduce((s, i) => s + (i.actualKg || 0), 0) * 10) / 10;
        const totalDiff = Math.round((totalAct - totalReq) * 100) / 100;
        const rationDm = ration ? calculateRationDmStats(ration, safeMaterials) : { dmPercent: 0 };
        const batchDm = Math.round(totalReq * (rationDm.dmPercent / 100) * 10) / 10;

        // Pre-mix bags calculation for reference
        const safeBagWeight = Math.max(1, bagWeightKg || 50);
        const totalPremixConcentrateKg = Math.round((concentrateTotalKg + mineralTotalKg) * 10) / 10;
        const bagsCount = Math.floor(totalPremixConcentrateKg / safeBagWeight);
        const looseKg = Math.round((totalPremixConcentrateKg % safeBagWeight) * 10) / 10;

        const isLast = bIdx === batchesToRender.length - 1;

        return (
          <div
            key={batch.id}
            className={`space-y-4 ${
              isLast
                ? ''
                : 'print-page-break pb-8 mb-8 border-b-2 border-slate-300 print:border-none print:pb-0 print:mb-0'
            }`}
          >
            <PrintHeader
              showOnScreen={true}
              documentTitle={isEn ? 'TMR Mixer Loading & Ingredients Dispense Order' : 'أمر صرف وتحميل خامات المكسر TMR'}
              documentSubtitle={isEn ? 'Warehouse feed ingredients issue voucher and mixer loading guide by weight and dry matter' : 'نموذج صرف خامات العليقة من المستودع وتحميلها في عربة المكسر حسب الأوزان والمادة الجافة'}
              selectedDate={dailyPlan.date}
              settings={settings}
              engineerName={settings?.engineerName}
              batchInfo={{
                batchNumber: batch.batchNumber,
                categoryName: category?.name,
                rationName: ration?.name,
                mixerName: mixer?.name,
                time: batch.time,
                targetWeightKg: effectiveWeight,
              }}
            />

            {/* Batch Metadata Header */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">{isEn ? 'Category & Ration:' : 'الفئة والعليقة:'}</span>
                <span className="text-slate-900 font-black">
                  {category?.name || (isEn ? 'General' : 'فئة عامة')} - {ration?.name || (isEn ? 'Unassigned' : 'عليقة غير محددة')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isEn ? 'Mixer & Time:' : 'المكسر وتوقيت التحميل:'}</span>
                <span className="text-slate-900 font-black">
                  {mixer?.name || (isEn ? 'Main Mixer' : 'مكسر رئيسي')} ({batch.time || '—'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isEn ? 'Net Mixer Weight:' : 'صافي وزن خامات المكسر:'}</span>
                <span className="text-emerald-800 font-black text-sm">
                  {effectiveWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isEn ? 'Target Dry Matter:' : 'المادة الجافة المقررة:'}</span>
                <span className="text-blue-900 font-black text-sm">
                  {batchDm.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg DM' : 'كجم DM'} ({rationDm.dmPercent}%)
                </span>
              </div>
            </div>

            {/* Refusal recycling notice if applicable */}
            {activeBatchRefusalKg > 0.1 && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 font-semibold flex items-center justify-between">
                <span>
                  {isEn ? (
                    <>
                      💡 Milking Refusal Recycling: Total Herd Gross <strong>{activeBatchGrossKg.toLocaleString('en-US')} kg</strong>, Manger Refusal Deducted <strong>-{activeBatchRefusalKg.toLocaleString('en-US')} kg</strong> = Net Raw Materials to Dispense & Load <strong>{effectiveWeight.toLocaleString('en-US')} kg</strong>.
                    </>
                  ) : (
                    <>
                      💡 تدوير راجع الحلاب: إجمالي استهلاك القطيع <strong>{activeBatchGrossKg.toLocaleString('ar-EG')} كجم</strong>، راجع حلاب مخصوم <strong>-{activeBatchRefusalKg.toLocaleString('ar-EG')} كجم</strong> = صافي خامات المكسر المطلوب صرفها وتحميلها <strong>{effectiveWeight.toLocaleString('ar-EG')} كجم</strong>.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Target Barns Breakdown for this batch */}
            <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1">
                <span className="font-extrabold text-slate-900">
                  {isEn ? 'Target Barns & Unloading for this Batch:' : 'العنابر المستهدفة في هذه اللفة والتفريغ:'}
                </span>
                <span className="text-[11px] text-slate-600">
                  {isEn ? 'Total Heads: ' : 'إجمالي الرؤوس: '}{(batch.allocations || []).reduce((sum, a) => {
                    const b = safeBarns.find((bn) => bn.id === a.barnId);
                    return sum + (b?.headCount || 0);
                  }, 0)} {isEn ? 'heads' : 'رأس'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(batch.allocations || []).map((alloc, aIdx) => {
                  const barn = safeBarns.find((b) => b.id === alloc.barnId);
                  const allocKg = getDerivedAllocationKg(alloc, barn, safeCategories, safeRations, dailyPlan);
                  const headShareKg = barn?.headCount ? Math.round((allocKg / barn.headCount) * 10) / 10 : 0;
                  return (
                    <div
                      key={aIdx}
                      className="bg-white px-2.5 py-1 rounded border border-slate-300 font-bold text-slate-800 text-xs"
                    >
                      {isEn ? `Barn ${barn?.number || ''}` : `عنبر ${barn?.number || ''}`} {barn?.name ? `(${barn.name})` : ''}:{' '}
                      <strong className="text-emerald-900 font-black">
                        {allocKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                      </strong>{' '}
                      ({alloc.allocatedPercent}% - {barn?.headCount || 0} {isEn ? 'heads' : 'رأس'} - {headShareKg} {isEn ? 'kg/head' : 'كجم/رأس'})
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pre-mix bags withdrawal notice if applicable */}
            {(displayMode === 'premix_bags' || usePremixMode) && totalPremixConcentrateKg > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-black text-amber-950 flex items-center gap-2">
                    <span>{isEn ? '📦 Bagged Premix Withdrawal Option:' : '📦 خيار سحب شكاير المركز مسبقة التعبئة:'}</span>
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black text-[11px] border border-amber-400">
                      {isEn
                        ? `Pull ${bagsCount} bags (${safeBagWeight} kg)${looseKg > 0 ? ` + ${looseKg} kg loose` : ''}`
                        : `سحب ${bagsCount} شكارة زنة ${safeBagWeight} كجم${looseKg > 0 ? ` + ${looseKg} كجم كسر` : ''}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800">
                    {isEn ? 'Total Concentrate & Premix: ' : 'إجمالي المركز والأملاح: '}
                    {totalPremixConcentrateKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  {isEn
                    ? 'Note for warehouse & driver: When using ready premix bags, pull the bags above and load forages with loader. If mixing individual ingredients, follow the table below.'
                    : 'ملاحظة للمستودع والسائق: في حال استخدام الشكاير الجاهزة يتم سحب الشكاير أعلاه مع صرف المواد المالئة باللودر. وفي حال التحميل المباشر للخامات الفردية، يرجى الالتزام التام بجدول الخامات التفصيلي أدناه.'}
                </p>
              </div>
            )}

            {/* Comprehensive Raw Materials Table */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead className="bg-slate-100 text-slate-900 font-extrabold">
                <tr className="border-b border-slate-400 text-center">
                  <th className="py-2 px-1.5 border border-slate-300 w-7">#</th>
                  <th className="py-2 px-2 border border-slate-300 text-right w-16">{isEn ? 'Code' : 'كود'}</th>
                  <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Ingredient & Type' : 'الخامة العلفية والتصنيف'}</th>
                  <th className="py-2 px-2 border border-slate-300 w-16">{isEn ? 'kg/head' : 'كجم/رأس'}</th>
                  <th className="py-2 px-2 border border-slate-300 w-12">DM%</th>
                  <th className="py-2 px-2 border border-slate-300 w-16">{isEn ? 'kg DM' : 'كجم DM'}</th>
                  <th className="py-2 px-3 border border-slate-300 font-black bg-slate-200 text-slate-900 w-28">
                    {isEn ? 'Required (kg)' : 'الوزن المطلوب (كجم)'}
                  </th>
                  <th className="py-2 px-3 border border-slate-300 font-black w-28 bg-white">
                    {isEn ? 'Actual (kg)' : 'المحمل الفعلي (كجم)'}
                  </th>
                  <th className="py-2 px-2 border border-slate-300 w-16">{isEn ? 'Diff' : 'الفرق'}</th>
                  <th className="py-2 px-2 border border-slate-300 text-right text-[10px]">{isEn ? 'Loading Stage' : 'مرحلة وترتيب التحميل'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {enrichedIngredients.length > 0 ? (
                  enrichedIngredients.map((item, idx) => (
                    <tr
                      key={item.rawMaterialId || idx}
                      className={
                        item.matType === 'roughage'
                          ? 'bg-emerald-50/20'
                          : item.matType === 'concentrate'
                          ? 'bg-amber-50/20'
                          : item.matType === 'mineral'
                          ? 'bg-blue-50/20'
                          : ''
                      }
                    >
                      <td className="py-2 px-1.5 border border-slate-300 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 font-mono text-[10px] text-slate-500 text-right">
                        {item.code || '—'}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-right">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-xs">{item.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${item.typeBadgeClass}`}
                          >
                            {item.typeLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-bold text-slate-700">
                        {item.amountKgPerHead}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center text-slate-700 font-bold">
                        {item.dmPct}%
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-bold text-blue-950">
                        {item.dmKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-black bg-slate-100 text-slate-950 text-sm">
                        {item.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-bold bg-white">
                        {item.actualKg !== undefined && item.actualKg !== item.requiredKg ? (
                          <span className="font-black text-slate-900">{item.actualKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}</span>
                        ) : (
                          <span className="inline-block w-20 border-b border-dotted border-slate-500 py-1 font-mono text-slate-300">
                            __________
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center text-[11px] font-bold">
                        {item.actualKg !== undefined && item.actualKg !== item.requiredKg ? (
                          item.diffKg === 0 ? (
                            <span className="text-emerald-700">{isEn ? 'Match' : 'مطابق'}</span>
                          ) : (
                            <span className={(item.diffKg || 0) > 0 ? 'text-rose-700' : 'text-amber-700'}>
                              {(item.diffKg || 0) > 0 ? `+${item.diffKg}` : item.diffKg}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-right text-[10px] text-slate-600 font-medium">
                        {item.sequenceNote}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                      {isEn ? 'No ingredients recorded for this ration or batch weight is zero.' : 'لا توجد خامات مسجلة لهذه العليقة أو وزن اللفة صفر.'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
                <tr className="text-center">
                  <td colSpan={3} className="py-2 px-3 border border-slate-300 text-left font-black">
                    {isEn ? 'Total Mixer Batch Weight:' : 'إجمالي وزن خلطة المكسر بالكامل:'}
                  </td>
                  <td className="py-2 px-2 border border-slate-300 font-mono text-xs">
                    {ration ? calculateRationTotalKgPerHead(ration) : 0} {isEn ? 'kg/head' : 'كجم/رأس'}
                  </td>
                  <td className="py-2 px-2 border border-slate-300">{rationDm.dmPercent}% DM</td>
                  <td className="py-2 px-2 border border-slate-300 font-black text-blue-950">
                    {batchDm.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg DM' : 'كجم DM'}
                  </td>
                  <td className="py-2 px-3 border border-slate-300 font-black text-base text-emerald-950 bg-emerald-100">
                    {totalReq.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </td>
                  <td className="py-2 px-3 border border-slate-300 font-black text-sm bg-white">
                    {totalAct > 0 && totalAct !== totalReq ? `${totalAct.toLocaleString(isEn ? 'en-US' : 'ar-EG')} ${isEn ? 'kg' : 'كجم'}` : '—'}
                  </td>
                  <td className="py-2 px-2 border border-slate-300 text-xs">
                    {totalAct > 0 && totalAct !== totalReq
                      ? totalDiff === 0
                        ? (isEn ? '✓ Match' : '✓ مطابق')
                        : `${totalDiff > 0 ? '+' : ''}${totalDiff} ${isEn ? 'kg' : 'كجم'}`
                      : '—'}
                  </td>
                  <td className="py-2 px-2 border border-slate-300 text-right text-[10px] text-slate-700">
                    {isEn ? 'Net Dispensed Feed' : 'صافي الخامات المصروفة'}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Feed Type Subtotals Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-xs">
              <div className="bg-white p-2 rounded border border-emerald-200 text-center">
                <span className="text-slate-500 block text-[10px] font-bold">
                  {isEn ? 'Forage & Roughages (Silage/Hay):' : 'الخامات الخشنة والمالئة (السيلاج والدريس):'}
                </span>
                <span className="text-emerald-900 font-black text-xs">
                  {roughageTotalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({totalReq > 0 ? Math.round((roughageTotalKg / totalReq) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-amber-200 text-center">
                <span className="text-slate-500 block text-[10px] font-bold">
                  {isEn ? 'Concentrates & Grains (Corn/Soy):' : 'الأعلاف المركزة والحبوب (الذرة والصويا):'}
                </span>
                <span className="text-amber-900 font-black text-xs">
                  {concentrateTotalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({totalReq > 0 ? Math.round((concentrateTotalKg / totalReq) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-blue-200 text-center">
                <span className="text-slate-500 block text-[10px] font-bold">
                  {isEn ? 'Minerals & Premixes:' : 'الأملاح المعدنية والإضافات:'}
                </span>
                <span className="text-blue-900 font-black text-xs">
                  {mineralTotalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({totalReq > 0 ? Math.round((mineralTotalKg / totalReq) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-purple-200 text-center">
                <span className="text-slate-500 block text-[10px] font-bold">
                  {isEn ? 'Liquids & Molasses:' : 'السوائل والمولاس:'}
                </span>
                <span className="text-purple-900 font-black text-xs">
                  {liquidTotalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}{' '}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({totalReq > 0 ? Math.round((liquidTotalKg / totalReq) * 100) : 0}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Mixer Mixing & Loading Sequence Instructions */}
            <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] text-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="text-slate-900 font-black">
                  {isEn ? 'Loading Order into Mixer:' : 'ترتيب إضافة الخامات للمكسر:'}
                </strong>{' '}
                <span className="text-slate-700">
                  {isEn
                    ? '(1) Silage & wet forages first for chopping ➔ (2) Hay & straw ➔ (3) Concentrates, premix & minerals ➔ (4) Liquids.'
                    : '(1) السيلاج والمواد الرطبة أولاً للفرم ➔ (2) الدريس والتبن ➔ (3) شكاير المركز والأملاح المعدنية ➔ (4) السوائل إن وجدت.'}
                </span>
              </div>
              <div className="font-bold text-amber-950 bg-amber-100/70 px-2.5 py-1 rounded border border-amber-300 shrink-0 text-[10px]">
                {isEn ? '⏱️ Mixing Time: 10 - 15 min after loading completes' : '⏱️ زمن الخلط: 10 - 15 دقيقة بعد اكتمال التحميل لضمان تجانس TMR'}
              </div>
            </div>

            {showSignatures && (
              <PrintSignatures
                showOnScreen={true}
                settings={settings}
                signatures={[
                  { title: isEn ? 'Warehouse Supervisor' : 'مسؤول صرف خامات المخزن', name: settings?.warehouseManagerName },
                  { title: isEn ? 'Mixer Driver / Operator' : 'سائق ومسؤول خلط المكسر', name: settings?.driverName },
                  { title: isEn ? 'Nutrition Engineer Approval' : 'اعتماد مهندس التغذية', name: settings?.engineerName },
                ]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* =============================================================
   3. WAREHOUSE COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const WarehousePrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  barns: Barn[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, rations, rawMaterials, barns, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const currency = settings.currency || (isEn ? 'EGP' : 'ج.م');
  const allPlans = loadAllDailyPlans();

  const ledgerItems = calculateChronologicalWarehouseLedger(
    dailyPlan.date,
    rawMaterials,
    categories,
    rations,
    barns,
    allPlans,
    dailyPlan
  );

  const totalOpeningKg = ledgerItems.reduce((s, i) => s + i.openingStockKg, 0);
  const totalIncomingKg = ledgerItems.reduce((s, i) => s + i.incomingKg, 0);
  const totalIssuedKg = ledgerItems.reduce((s, i) => s + i.issuedKg, 0);
  const totalWasteKg = ledgerItems.reduce((s, i) => s + i.wasteKg, 0);
  const totalClosingKg = ledgerItems.reduce((s, i) => s + i.closingStockKg, 0);
  const totalCostToday = ledgerItems.reduce((s, i) => s + i.totalCostToday, 0);
  const todayTransactions = dailyPlan.warehouseTransactions || [];

  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'Feed Raw Materials Warehouse Ledger & Dispense Report' : 'إذن صرف وتقرير دفتر أستاذ المخزن الشامل للخامات العلفية'}
        documentSubtitle={isEn ? 'Opening Stock + New Receipts - Daily Consumption - Waste = Carried Closing Stock' : 'متابعة الرصيد السابق + الوارد الجديد - المنصرف اليومي - الهالك = الرصيد المتبقي المرحل'}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-6 gap-2 text-xs font-bold text-slate-800">
        <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
          <span className="text-[10px] text-slate-500 block">{isEn ? 'Opening Stock:' : 'الرصيد السابق:'}</span>
          <span className="font-black text-slate-900 text-sm">{(totalOpeningKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}</span>
          <span className="text-[9px] text-slate-400 block">{totalOpeningKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div className="bg-emerald-50 p-2.5 rounded border border-emerald-300">
          <span className="text-[10px] text-emerald-800 block">{isEn ? 'New Received:' : 'الوارد الجديد:'}</span>
          <span className="font-black text-emerald-900 text-sm">+{(totalIncomingKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}</span>
          <span className="text-[9px] text-emerald-700 block">+{totalIncomingKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div className="bg-blue-50 p-2.5 rounded border border-blue-300">
          <span className="text-[10px] text-blue-800 block">{isEn ? 'Issued to Mixers:' : 'المنصرف للمكسر:'}</span>
          <span className="font-black text-blue-900 text-sm">{(totalIssuedKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}</span>
          <span className="text-[9px] text-blue-700 block">{totalIssuedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div className="bg-rose-50 p-2.5 rounded border border-rose-300">
          <span className="text-[10px] text-rose-800 block">{isEn ? 'Waste / Losses:' : 'الهالك / الفاقد:'}</span>
          <span className="font-black text-rose-900 text-sm">{(totalWasteKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}</span>
          <span className="text-[9px] text-rose-700 block">{totalWasteKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div className="bg-slate-100 p-2.5 rounded border border-slate-400">
          <span className="text-[10px] text-slate-700 block">{isEn ? 'Closing Stock:' : 'الرصيد المتبقي:'}</span>
          <span className="font-black text-slate-950 text-sm">{(totalClosingKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}</span>
          <span className="text-[9px] text-slate-600 block">{totalClosingKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
        </div>
        <div className="bg-amber-50 p-2.5 rounded border border-amber-300">
          <span className="text-[10px] text-amber-800 block">{isEn ? 'Daily Feed Cost:' : 'تكلفة المنصرف:'}</span>
          <span className="font-black text-amber-950 text-sm">{Math.round(totalCostToday).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</span>
          <span className="text-[9px] text-amber-700 block">{ledgerItems.length} {isEn ? 'feed ingredients' : 'خامة علفية'}</span>
        </div>
      </div>

      {/* Comprehensive Ledger Table */}
      <table className="w-full border-collapse border border-slate-400 text-[11px]">
        <thead className="bg-slate-100 text-slate-900 font-extrabold">
          <tr className="border-b border-slate-400 text-center">
            <th className="py-2 px-1 border border-slate-300 w-7">#</th>
            <th className="py-2 px-1 border border-slate-300 text-right w-14">{isEn ? 'Code' : 'كود'}</th>
            <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Feed Ingredient' : 'الخامة العلفية'}</th>
            <th className="py-2 px-2 border border-slate-300">{isEn ? 'Opening (kg)' : 'السابق (كجم)'}</th>
            <th className="py-2 px-2 border border-slate-300 text-emerald-800">{isEn ? 'In (+)' : 'الوارد (+)'}</th>
            <th className="py-2 px-2 border border-slate-300 text-blue-900 font-black bg-slate-200">{isEn ? 'Issued (-)' : 'المنصرف (-)'}</th>
            <th className="py-2 px-1 border border-slate-300 text-rose-800">{isEn ? 'Waste' : 'الهالك'}</th>
            <th className="py-2 px-2 border border-slate-300 font-black bg-slate-100">{isEn ? 'Closing (kg)' : 'المتبقي (كجم)'}</th>
            <th className="py-2 px-2 border border-slate-300">{isEn ? 'Demand' : 'المطلوب'}</th>
            <th className="py-2 px-1 border border-slate-300">{isEn ? 'Sufficiency' : 'الكفاية'}</th>
            <th className="py-2 px-1 border border-slate-300">{isEn ? 'Price' : 'السعر'}</th>
            <th className="py-2 px-2 border border-slate-300 text-left font-black">{isEn ? 'Value' : 'القيمة'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300 font-medium">
          {ledgerItems.map((item, idx) => (
            <tr key={item.rawMaterialId} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
              <td className="py-1.5 px-1 border border-slate-300 text-center">{idx + 1}</td>
              <td className="py-1.5 px-1 border border-slate-300 font-mono text-[10px] text-slate-500">{item.code}</td>
              <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">{item.name}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{item.openingStockKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-emerald-800">
                {item.incomingKg > 0 ? `+${item.incomingKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}` : '—'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-center font-black bg-blue-50/50 text-blue-950">
                {item.issuedKg > 0 ? item.issuedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG') : '—'}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 text-center text-rose-700">
                {item.wasteKg > 0 ? item.wasteKg.toLocaleString(isEn ? 'en-US' : 'ar-EG') : '—'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-center font-black bg-slate-100 text-slate-900">
                {item.closingStockKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-600 font-semibold">
                {item.requiredDailyKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-[10px]">
                {item.stockStatus === 'CRITICAL' || item.stockStatus === 'OUT_OF_STOCK' ? (
                  <span className="text-rose-700 font-black">
                    {isEn ? `Critical (${item.daysRemaining}d)` : `حرج (${item.daysRemaining}ي)`}
                  </span>
                ) : item.stockStatus === 'LOW' ? (
                  <span className="text-amber-800 font-bold">
                    {isEn ? `Low (${item.daysRemaining}d)` : `منخفض (${item.daysRemaining}ي)`}
                  </span>
                ) : (
                  <span className="text-emerald-800">
                    {item.daysRemaining > 90
                      ? (isEn ? '>90 days' : '>90 يوم')
                      : `${item.daysRemaining} ${isEn ? 'days' : 'يوم'}`}
                  </span>
                )}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 text-center text-slate-600">{item.pricePerKg?.toFixed(1) || '—'}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-left font-black text-slate-900">
                {Math.round(item.closingStockKg * (item.pricePerKg || 0)).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
          <tr className="text-center">
            <td colSpan={3} className="py-2 px-3 border border-slate-300 text-left font-black">
              {isEn ? 'Total Daily Warehouse Balance:' : 'إجمالي المخزن اليومي:'}
            </td>
            <td className="py-2 px-2 border border-slate-300 font-black">
              {(totalOpeningKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}
            </td>
            <td className="py-2 px-2 border border-slate-300 font-black text-emerald-900">
              +{totalIncomingKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </td>
            <td className="py-2 px-2 border border-slate-300 font-black text-blue-950">
              {totalIssuedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </td>
            <td className="py-2 px-1 border border-slate-300 font-black text-rose-900">
              {totalWasteKg > 0 ? `${totalWasteKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} ${isEn ? 'kg' : 'كجم'}` : '—'}
            </td>
            <td className="py-2 px-2 border border-slate-300 font-black text-sm">
              {(totalClosingKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}
            </td>
            <td colSpan={3} className="py-2 px-2 border border-slate-300 text-center font-bold text-xs">
              {isEn ? 'Today Issued Feed Cost: ' : 'تكلفة المنصرف لليوم: '}
              {Math.round(totalCostToday).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
            </td>
            <td className="py-2 px-2 border border-slate-300 text-left font-black text-sm">
              {Math.round(ledgerItems.reduce((s, i) => s + (i.closingStockKg * (i.pricePerKg || 0)), 0)).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Today's Transactions Details if any */}
      {todayTransactions.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          <h4 className="font-bold text-slate-800 text-xs">
            {isEn ? 'New Delivery Receipts Registered Today:' : 'أذونات التوريد الجديدة المسجلة اليوم:'}
          </h4>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="py-1 px-2 border border-slate-300 text-right">{isEn ? 'Ingredient' : 'الخامة'}</th>
                <th className="py-1 px-2 border border-slate-300 text-center">{isEn ? 'Received Qty' : 'الكمية الواردة'}</th>
                <th className="py-1 px-2 border border-slate-300 text-right">{isEn ? 'Supplier' : 'المورد'}</th>
                <th className="py-1 px-2 border border-slate-300 text-center">{isEn ? 'Invoice #' : 'رقم الفاتورة'}</th>
                <th className="py-1 px-2 border border-slate-300 text-center">{isEn ? 'Truck / Vehicle #' : 'رقم السيارة'}</th>
              </tr>
            </thead>
            <tbody>
              {todayTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-1 px-2 border border-slate-300 font-bold">{tx.rawMaterialName}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center font-black text-emerald-900">
                    +{tx.quantityKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </td>
                  <td className="py-1 px-2 border border-slate-300">{tx.supplierName || '—'}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center font-mono">{tx.invoiceNumber || '—'}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{tx.vehicleNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Warehouse Supervisor' : 'أمين المستودع والمخزن', name: settings?.warehouseManagerName },
            { title: isEn ? 'Nutrition & Operations Engineer' : 'مهندس التغذية والتشغيل', name: settings?.engineerName },
            { title: isEn ? 'Audit & Financial Officer' : 'مدير المراجعة والماليات' },
          ]}
        />
      )}
    </div>
  );
};

/* =============================================================
   4. NUTRITION & CONSULTANT REPORT COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const NutritionReportPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  barns: Barn[];
  mixers: Mixer[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, rations, rawMaterials, barns, mixers, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const currency = settings.currency || (isEn ? 'EGP' : 'ج.م');
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const batches = dailyPlan.batches || [];
  const totalFarmHeads = activeBarns.reduce((sum, b) => sum + getBarnDailyState(b, dailyPlan).headCount, 0);
  const totalFarmDemandKg = activeBarns.reduce((sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan), 0);
  const totalFarmRefusalKg = activeBarns.reduce((sum, b) => sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan), 0);
  const totalFarmIntakeKg = activeBarns.reduce((sum, b) => sum + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan), 0);
  const totalAllocatedToBarnsKg = activeBarns.reduce((sum, b) => sum + calculateBarnTotalAllocatedKgToday(b.id, dailyPlan), 0);
  const totalCoveragePct = totalFarmDemandKg > 0 ? Math.round((totalAllocatedToBarnsKg / totalFarmDemandKg) * 100) : 0;

  const farmDmSummary = calculateFarmDmSummary(activeBarns, categories, rations, dailyPlan, rawMaterials);
  const farmEconomics = calculateWholeFarmEconomics(categories, barns, rations, rawMaterials, dailyPlan, undefined, settings);
  const effectiveMilkPrice = dailyPlan.milkProduction?.milkPricePerKg && dailyPlan.milkProduction.milkPricePerKg > 0
    ? dailyPlan.milkProduction.milkPricePerKg
    : settings.defaultMilkPricePerKg || 20;
  const dairyFinancials = calculateDairyFinancials(
    dailyPlan.milkProduction,
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan,
    effectiveMilkPrice
  );
  const effectiveAdg = dailyPlan.fatteningAdgKg && dailyPlan.fatteningAdgKg > 0
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

  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'Daily Comprehensive Nutrition, Operations & Financial Report' : 'تقرير التغذية والتشغيل والتحليل المالي اليومي الشامل للمزرعة'}
        documentSubtitle={isEn ? 'Daily herd performance, feed weights, manger refusals, mixer efficiency, and IOFC economics' : 'متابعة الأداء اليومي للقطعان، أوزان العلف، راجع الطوايل، كفاءة المكسرات وعائد التغذية IOFC'}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Farm Heads:' : 'إجمالي رؤوس المزرعة:'}</span>
          <span className="text-slate-900 font-black text-sm">
            {totalFarmHeads.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'heads' : 'رأس'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Daily Milk Output:' : 'إنتاج اللبن اليومي:'}</span>
          <span className="text-emerald-800 font-black text-sm">
            {(dailyPlan.milkProduction?.totalAmountKg || 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Daily Feed Cost:' : 'تكلفة العلف اليومي:'}</span>
          <span className="text-rose-900 font-black text-sm">
            {Math.round(farmEconomics.totalFarmDailyFeedCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Net Margin Over Feed:' : 'العائد بعد تغذية الكل:'}</span>
          <span className="text-emerald-950 font-black text-sm">
            {Math.round(farmEconomics.wholeFarmNetMarginOverFeed).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Net Intake & DMI:' : 'المأكول الصافي والمادة الجافة:'}</span>
          <span className="text-blue-900 font-black text-sm">
            {Math.round(totalFarmIntakeKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({farmDmSummary.averageDmiPerHeadKg} {isEn ? 'kg DMI/hd' : 'كجم DM/رأس'})
          </span>
        </div>
      </div>

      {/* Sector Financial Highlights (Dairy IOFC & Fattening Gain) */}
      {(dairyFinancials.milkingHeadCount > 0 || fatteningFinancials.totalFatteningHeads > 0) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {dairyFinancials.milkingHeadCount > 0 && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
              <div className="flex justify-between font-black text-blue-950 text-xs">
                <span>
                  {isEn ? `Dairy Herd Metrics (${dairyFinancials.milkingHeadCount} cows)` : `مؤشرات قطيع الحلاب (${dairyFinancials.milkingHeadCount} بقرة)`}
                </span>
                <span className="text-emerald-800">
                  IOFC: {dairyFinancials.iofcPerCowPerDay.toFixed(1)} {currency}/{isEn ? 'cow' : 'بقرة'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Feed Cost / kg Milk:' : 'تكلفة علف اللبن:'}</span>
                  <span className="font-bold text-slate-800">{dairyFinancials.costPerKgMilkFeedCost.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Daily Dairy Feed:' : 'علف الحلاب اليومي:'}</span>
                  <span className="font-bold text-slate-800">{Math.round(dairyFinancials.totalMilkingFeedCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Net Margin over Feed:' : 'صافي أرباح فوق العلف:'}</span>
                  <span className="font-black text-emerald-900">{Math.round(dairyFinancials.totalIofcPerDay).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</span>
                </div>
              </div>
            </div>
          )}

          {fatteningFinancials.totalFatteningHeads > 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
              <div className="flex justify-between font-black text-amber-950 text-xs">
                <span>
                  {isEn ? `Fattening Herd Metrics (${fatteningFinancials.totalFatteningHeads} steers)` : `مؤشرات قطيع التسمين (${fatteningFinancials.totalFatteningHeads} عجل)`}
                </span>
                <span className="text-amber-900">
                  {isEn ? `ADG Gain Rate: ${fatteningFinancials.assumedAdgKg} kg/day` : `معدل النمو: ${fatteningFinancials.assumedAdgKg} كجم/يوم`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Cost / kg Gain:' : 'تكلفة كجم اللحم:'}</span>
                  <span className="font-bold text-slate-800">{fatteningFinancials.feedCostPerKgGain.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Feed Cost / Head / Day:' : 'علف الرأس اليومي:'}</span>
                  <span className="font-bold text-slate-800">{fatteningFinancials.feedCostPerHeadPerDay.toFixed(1)} {currency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isEn ? 'Daily Fattening Feed:' : 'علف التسمين اليومي:'}</span>
                  <span className="font-bold text-slate-800">{Math.round(fatteningFinancials.totalDailyFeedCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Category Breakdown Table */}
      <div className="space-y-1.5">
        <h5 className="font-black text-slate-900 text-xs">
          {isEn ? '1. Breakdown by Animal Category, Approved Rations & Feed Costs:' : 'أولاً: البيان التفصيلي حسب الفئات الحيوانية والعلائق وتكاليفها:'}
        </h5>
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900 font-extrabold text-center">
            <tr className="border-b border-slate-400">
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Approved Ration' : 'العليقة المعتمدة'}</th>
              <th className="py-1.5 px-1 border border-slate-300">{isEn ? 'Cost/kg' : 'سعر/كجم'}</th>
              <th className="py-1.5 px-1 border border-slate-300">{isEn ? 'Heads' : 'الرؤوس'}</th>
              <th className="py-1.5 px-2 border border-slate-300 font-black">{isEn ? 'Target (kg)' : 'المقرر (كجم)'}</th>
              <th className="py-1.5 px-1 border border-slate-300 text-blue-900">DM%</th>
              <th className="py-1.5 px-2 border border-slate-300 text-blue-950">{isEn ? 'Target DM' : 'المقرر DM'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-rose-800 font-black">{isEn ? 'Total Cost' : 'إجمالي التكلفة'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Mixer Distributed' : 'الموزع بالمكسر'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {categories.map((cat, idx) => {
              const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
              const catHeads = catBarns.reduce((sum, b) => sum + getBarnDailyState(b, dailyPlan).headCount, 0);
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
              const effectiveRationCostPerKg = catDemand > 0 ? (catTotalCost / catDemand) : defaultRationCost;
              const catDmStats = defaultRation ? calculateRationDmStats(defaultRation, rawMaterials) : { dmPercent: 0 };
              const catDmPercent = catDemand > 0 ? Math.round((catDmKg / catDemand) * 1000) / 10 : catDmStats.dmPercent;
              const catBatches = batches.filter((b) => b.categoryId === cat.id);
              const catAllocated = catBatches.reduce((sum, b) => sum + calculateBatchAllocatedKg(b), 0);

              return (
                <tr key={cat.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                  <td className="py-1.5 px-2 border border-slate-300 font-black text-slate-900">{cat.name}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-xs">{defaultRation?.name || '—'}</td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold">{effectiveRationCostPerKg.toFixed(2)}</td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-black">{catHeads}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-950">
                    {Math.round(catDemand).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center text-blue-900 font-bold">{catDmPercent}%</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center text-blue-950 font-bold">
                    {Math.round(catDmKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-rose-800">
                    {Math.round(catTotalCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {Math.round(catAllocated).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500 text-center">
            <tr>
              <td colSpan={3} className="py-1.5 px-2 border border-slate-300 text-left font-black">
                {isEn ? 'Total All Categories:' : 'الإجمالي لكافة الفئات:'}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 font-black">{totalFarmHeads}</td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-emerald-950">
                {Math.round(totalFarmDemandKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 text-blue-900 font-black">{farmDmSummary.averageDmPercent}%</td>
              <td className="py-1.5 px-2 border border-slate-300 text-blue-950 font-black">
                {Math.round(farmDmSummary.totalDmDemandKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-rose-900">
                {Math.round(farmEconomics.totalFarmDailyFeedCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black">
                {Math.round(totalAllocatedToBarnsKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 2. Comprehensive Barns Performance Table */}
      <div className="space-y-1.5">
        <h5 className="font-black text-slate-900 text-xs">
          {isEn ? '2. Barn Feeding Coverage, Manger Refusals & Costs in Detail:' : 'ثانياً: تقرير استيفاء ونسب تغذية العنابر وراجع الطوايل وتكاليفها تفصيليًا:'}
        </h5>
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900 font-extrabold">
            <tr className="border-b border-slate-400 text-center">
              <th className="py-2 px-1 border border-slate-300 w-12">{isEn ? 'Pen' : 'العنبر'}</th>
              <th className="py-2 px-2 border border-slate-300 text-right">{isEn ? 'Category' : 'الفئة'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Heads' : 'الرؤوس'}</th>
              <th className="py-2 px-2 border border-slate-300 text-right">{isEn ? 'Ration' : 'العليقة'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'kg/head' : 'كجم/رأس'}</th>
              <th className="py-2 px-2 border border-slate-300 font-black bg-slate-200">{isEn ? 'Target (kg)' : 'المقرر (كجم)'}</th>
              <th className="py-2 px-1 border border-slate-300 text-amber-900">{isEn ? 'Refusal' : 'الراجع'}</th>
              <th className="py-2 px-2 border border-slate-300 text-blue-950 font-black">{isEn ? 'Net Intake' : 'المأكول الصافي'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'DMI kg' : 'DMI كجم'}</th>
              <th className="py-2 px-2 border border-slate-300 text-rose-800 font-black">{isEn ? 'Feed Cost' : 'تكلفة العلف'}</th>
              <th className="py-2 px-2 border border-slate-300">{isEn ? 'Mixer Alloc.' : 'الموزع باللفات'}</th>
              <th className="py-2 px-1 border border-slate-300">{isEn ? 'Coverage' : 'التغطية'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {activeBarns.map((barn, idx) => {
              const cat = categories.find((c) => c.id === barn.categoryId);
              const ration = getBarnRation(barn, categories, rations, dailyPlan);
              const state = getBarnDailyState(barn, dailyPlan);
              const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
              const refusalKg = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
              const intakeKg = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
              const barnDmi = calculateBarnDmiPerHeadKg(barn, categories, rations, dailyPlan, rawMaterials);
              const rationCost = ration ? calculateRationCostPerKg(ration, rawMaterials) : 0;
              const feedCostToday = demandKg * rationCost;
              const allocatedKg = calculateBarnTotalAllocatedKgToday(barn.id, dailyPlan);
              const coveragePct = demandKg > 0 ? Math.round((allocatedKg / demandKg) * 100) : 100;

              return (
                <tr key={barn.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-slate-900">
                    {barn.number}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 font-bold">{cat?.name || '—'}</td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-black">{state.headCount}</td>
                  <td className="py-1.5 px-2 border border-slate-300 truncate max-w-[100px]">{ration?.name || '—'}</td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center">
                    {state.headCount > 0 ? (demandKg / state.headCount).toFixed(1) : '—'}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black bg-slate-100 text-slate-900">
                    {Math.round(demandKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center text-amber-900 font-bold">
                    {refusalKg > 0 ? Math.round(refusalKg).toLocaleString(isEn ? 'en-US' : 'ar-EG') : '—'}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-blue-950">
                    {Math.round(intakeKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-blue-900">
                    {barnDmi}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-rose-800">
                    {Math.round(feedCostToday).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                    {Math.round(allocatedKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-bold text-[10px]">
                    {coveragePct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
            <tr className="text-center">
              <td colSpan={2} className="py-2 px-2 border border-slate-300 text-left font-black">{isEn ? 'Grand Total:' : 'الإجمالي الكلي:'}</td>
              <td className="py-2 px-1 border border-slate-300 font-black">{totalFarmHeads} {isEn ? 'heads' : 'رأس'}</td>
              <td colSpan={2} className="py-2 px-2 border border-slate-300 font-bold text-xs">—</td>
              <td className="py-2 px-2 border border-slate-300 font-black text-sm">{Math.round(totalFarmDemandKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</td>
              <td className="py-2 px-1 border border-slate-300 font-black text-amber-900">{Math.round(totalFarmRefusalKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</td>
              <td className="py-2 px-2 border border-slate-300 font-black text-blue-950 text-sm">{Math.round(totalFarmIntakeKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</td>
              <td className="py-2 px-1 border border-slate-300 font-black text-blue-950">{farmDmSummary.averageDmiPerHeadKg} {isEn ? 'kg' : 'كجم'}</td>
              <td className="py-2 px-2 border border-slate-300 font-black text-rose-900 text-sm">{Math.round(farmEconomics.totalFarmDailyFeedCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}</td>
              <td className="py-2 px-2 border border-slate-300 font-black">{Math.round(totalAllocatedToBarnsKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')}</td>
              <td className="py-2 px-1 border border-slate-300 font-black">{totalCoveragePct}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Engineer Notes */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-1">
        <span className="font-bold text-slate-900 block">
          {isEn ? "Nutrition Engineer's Observations & Directives for Next Shift:" : 'ملاحظات وتوجيهات مهندس التغذية للوردية القادمة:'}
        </span>
        <p className="text-slate-700 min-h-[36px] whitespace-pre-wrap">
          {dailyPlan.notes || (isEn ? 'Feeding plan, forage consumption, and bunk scores reviewed; all indicators conform to approved schedule.' : 'تمت مراجعة خطة التغذية واستهلاك العلف وراجع الطوايل، وكافة المؤشرات متوافقة مع الخطة المعتمدة.')}
        </p>
      </div>

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Senior Nutrition Consultant' : 'مهندس التغذية الاستشاري', name: settings?.engineerName },
            { title: isEn ? 'Station & Operations Manager' : 'مدير المحطة والتشغيل' },
            { title: isEn ? 'Chief Financial Officer' : 'المدير المالي' },
          ]}
        />
      )}
    </div>
  );
};

/* =============================================================
   4.5 DAILY LOG & ARCHIVE COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const DailyLogPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, barns, mixers, rations, rawMaterials, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const batches = dailyPlan.batches || [];

  const totalHeads = activeBarns.reduce((sum, b) => {
    const s = getBarnDailyState(b, dailyPlan);
    return sum + (s.headCount || 0);
  }, 0);

  const totalDemandKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan);
  }, 0);

  const totalRefusalKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan);
  }, 0);

  const totalActualIntakeKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan);
  }, 0);

  const refusalPercent = totalDemandKg > 0
    ? Math.round(((totalRefusalKg / totalDemandKg) * 100) * 10) / 10
    : 0;

  const totalBatchWeightKg = batches.reduce((s, b) => s + (b.targetWeightKg || 0), 0);
  const totalAllocatedKg = batches.reduce((s, b) => s + calculateBatchAllocatedKg(b), 0);

  const milkMetrics = calculateMilkMetrics(
    dailyPlan.milkProduction,
    barns,
    categories,
    rations,
    dailyPlan,
    rawMaterials
  );

  const warehouseReqs = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'Daily Comprehensive Operations & Feeding Log (Archive)' : 'سجل التشغيل والتغذية اليومي الشامل للمزرعة (الأرشيف)'}
        documentSubtitle={isEn ? 'Daily batch schedule, pen deliveries, intakes, milk yield & warehouse disbursements' : 'سجل تشغيل اللفات والعنابر ومأكول القطعان ومؤشرات الحليب وصرفيات المخزن التاريخية'}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings?.engineerName}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Log Status & Date:' : 'حالة وتاريخ السجل:'}</span>
          <span className="text-slate-900 font-black text-sm block">{dailyPlan.date}</span>
          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black ${
            dailyPlan.isClosed ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'
          }`}>
            {dailyPlan.isClosed ? (isEn ? 'Archived & Closed' : 'مؤرشف ومغلق') : (isEn ? 'Open Operational Log' : 'سجل تشغيل مفتوح')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Prepared Batches:' : 'اللفات المحضرة:'}</span>
          <span className="text-slate-900 font-black text-sm">
            {batches.length} {isEn ? 'batches' : 'لفات'}
          </span>
          <span className="text-[10px] text-slate-500 block font-normal">
            {totalBatchWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg target' : 'كجم مستهدف'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Target & Distributed Feed:' : 'المقرر والعلف الموزع:'}</span>
          <span className="text-emerald-900 font-black text-sm">
            {totalAllocatedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
          </span>
          <span className="text-[10px] text-slate-500 block font-normal">
            {isEn ? `of target ${totalDemandKg.toLocaleString('en-US')} kg` : `من مقرر ${totalDemandKg.toLocaleString('ar-EG')} كجم`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Refusal & Actual Intake:' : 'الراجع والمأكول الفعلي:'}</span>
          <span className="text-amber-950 font-black text-sm">
            {refusalPercent}% {isEn ? 'refusal' : 'راجع'}
          </span>
          <span className="text-[10px] text-slate-600 block font-normal">
            {isEn ? 'Net: ' : 'الصافي: '}{totalActualIntakeKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Recorded Milk Output:' : 'إنتاج الحليب المسجل:'}</span>
          <span className="text-blue-950 font-black text-sm">
            {milkMetrics.totalMilkKg > 0 ? `${milkMetrics.totalMilkKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} ${isEn ? 'kg' : 'كجم'}` : (isEn ? 'Not Recorded' : 'لم يُسجل')}
          </span>
          <span className="text-[10px] text-blue-800 block font-normal">
            {milkMetrics.totalMilkKg > 0
              ? `${isEn ? 'Avg: ' : 'متوسط: '}${milkMetrics.averageMilkPerHead} ${isEn ? 'kg' : 'كجم'}`
              : `${totalHeads} ${isEn ? 'total heads' : 'رأس إجمالي'}`}
          </span>
        </div>
      </div>

      {/* Section 1: Batches Details */}
      <div className="space-y-1.5">
        <h5 className="font-black text-slate-900 text-xs">
          {isEn ? `1. Mixer Batches Schedule & Unloading Log (${batches.length} batches):` : `أولاً: كشف لفات المكسر وجدول التفريغ اليومي (${batches.length} لفات):`}
        </h5>
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900 font-extrabold text-center">
            <tr className="border-b border-slate-400">
              <th className="py-1.5 px-2 border border-slate-300 w-12">{isEn ? 'Batch #' : 'رقم اللفة'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Time' : 'التوقيت'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Category' : 'الفئة الحيوانية'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Mixer' : 'المكسر'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Target Weight' : 'الوزن المستهدف'}</th>
              <th className="py-1.5 px-2 border border-slate-300 font-black">{isEn ? 'Actually Distributed' : 'الموزع فعليًا'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Assigned Pens' : 'العنابر المخصصة'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Status' : 'الحالة'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-400 font-bold">
                  {isEn ? 'No batches recorded for this date.' : 'لا توجد لفات مسجلة لهذا التاريخ.'}
                </td>
              </tr>
            ) : (
              batches.map((b, idx) => {
                const cat = categories.find((c) => c.id === b.categoryId);
                const mixer = mixers.find((m) => m.id === b.mixerId);
                const allocated = calculateBatchAllocatedKg(b);
                const allocCount = b.allocations?.length || 0;

                const localizedStatus = isEn
                  ? (b.status === 'تم التوزيع' ? 'Distributed' : b.status === 'تم التحضير' ? 'Prepared' : b.status === 'قيد التحضير' ? 'In Progress' : 'Planned')
                  : b.status;

                return (
                  <tr key={b.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-950">{b.batchNumber}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">{b.time}</td>
                    <td className="py-1.5 px-2 border border-slate-300 font-bold">{cat?.name || '—'}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-700">{mixer?.name || '—'}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                      {b.targetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-900">
                      {allocated.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-xs">
                      {allocCount > 0 ? (isEn ? `${allocCount} Pens` : `${allocCount} عنابر`) : (isEn ? 'Unassigned' : 'غير مخصصة')}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-xs">{localizedStatus}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500 text-center">
            <tr>
              <td colSpan={4} className="py-1.5 px-2 border border-slate-300 text-left font-black">
                {isEn ? 'Grand Total Batches:' : 'الإجمالي الكلي للفات:'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black">
                {totalBatchWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-emerald-950">
                {totalAllocatedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td colSpan={2} className="py-1.5 px-2 border border-slate-300 text-xs">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Section 2: Barns Details */}
      <div className="space-y-1.5">
        <h5 className="font-black text-slate-900 text-xs">
          {isEn ? `2. Pen Feed Intake, Refusals & Net Consumption Log (${activeBarns.length} pens):` : `ثانياً: سجل استهلاك العنابر والراجع والمأكول الفعلي (${activeBarns.length} عنبر):`}
        </h5>
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900 font-extrabold text-center">
            <tr className="border-b border-slate-400">
              <th className="py-1.5 px-2 border border-slate-300 w-12">{isEn ? 'Pen' : 'العنبر'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Category' : 'الفئة الحيوانية'}</th>
              <th className="py-1.5 px-1 border border-slate-300">{isEn ? 'Heads' : 'الرؤوس'}</th>
              <th className="py-1.5 px-2 border border-slate-300 font-black">{isEn ? 'Target (kg)' : 'المقرر (كجم)'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-amber-900">{isEn ? 'Manger Refusal' : 'راجع الطوالة'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-blue-950 font-black">{isEn ? 'Net Intake' : 'المأكول الصافي'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Pen Ration' : 'عليقة العنبر'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {activeBarns.map((barn, idx) => {
              const bState = getBarnDailyState(barn, dailyPlan);
              const cat = categories.find((c) => c.id === barn.categoryId);
              const ration = getBarnRation(barn, categories, rations, dailyPlan);
              const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
              const refusal = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
              const intake = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
              const refPct = demand > 0 ? Math.round(((refusal / demand) * 100) * 10) / 10 : 0;

              return (
                <tr key={barn.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-slate-900">
                    {bState.displayNumber || barn.number}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 font-bold">{cat?.name || '—'}</td>
                  <td className="py-1.5 px-1 border border-slate-300 text-center font-black">{bState.headCount}</td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-950">
                    {Math.round(demand).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center text-amber-900 font-bold">
                    {refPct}% ({Math.round(refusal).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-blue-950">
                    {Math.round(intake).toLocaleString(isEn ? 'en-US' : 'ar-EG')}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-300 text-slate-700 truncate max-w-[130px]">{ration?.name || '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500 text-center">
            <tr>
              <td colSpan={2} className="py-1.5 px-2 border border-slate-300 text-left font-black">
                {isEn ? 'Grand Total Pens:' : 'الإجمالي الكلي للعنابر:'}
              </td>
              <td className="py-1.5 px-1 border border-slate-300 font-black">{totalHeads} {isEn ? 'heads' : 'رأس'}</td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-emerald-950">
                {Math.round(totalDemandKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-amber-900">
                {refusalPercent}% ({Math.round(totalRefusalKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-blue-950">
                {Math.round(totalActualIntakeKg).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-xs">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Section 3: Milk Metrics (if recorded) */}
      {milkMetrics.totalMilkKg > 0 && (
        <div className="space-y-1.5">
          <h5 className="font-black text-slate-900 text-xs">
            {isEn ? '3. Milk Yield Output & Feed Efficiency Metrics:' : 'ثالثاً: كشف إنتاج ومؤشرات الحليب وكفاءة التحويل الغذائي:'}
          </h5>
          <div className="grid grid-cols-3 gap-3 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Milking Yield:' : 'إجمالي إنتاج الحلبات:'}</span>
              <strong className="text-base font-black text-blue-950">
                {milkMetrics.totalMilkKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </strong>
              <div className="text-[10px] text-blue-900 space-y-0.5 mt-1 font-bold">
                {(dailyPlan.milkProduction?.sessions || []).map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span>{s.name}:</span>
                    <span>{s.amountKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{isEn ? 'Feed Efficiency (DMI):' : 'كفاءة التحويل الغذائي:'}</span>
              <strong className="text-base font-black text-emerald-950">{milkMetrics.feedEfficiency}</strong>
              <span className="text-[10px] text-emerald-800 block mt-1">{isEn ? 'kg milk / kg DMI' : 'كجم لبن / كجم مادة جافة DMI'}</span>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                {isEn ? 'Status: ' : 'الحالة: '}
                <strong>
                  {isEn
                    ? (milkMetrics.efficiencyStatus === 'ممتازة' ? 'Excellent' : milkMetrics.efficiencyStatus === 'جيدة' ? 'Good' : milkMetrics.efficiencyStatus === 'متوسطة' ? 'Average' : 'Needs Review')
                    : milkMetrics.efficiencyStatus}
                </strong>
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{isEn ? 'Milking Herd Intake & Refusal:' : 'المأكول وراجع قطيع الحلاب:'}</span>
              <strong className="text-base font-black text-amber-950">
                {milkMetrics.actualFeedIntakeKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </strong>
              <span className="text-[10px] text-amber-900 block mt-1">
                {isEn ? 'Milking Refusal: ' : 'راجع الحلاب: '}
                {milkMetrics.refusalPercent}% ({milkMetrics.refusalKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Warehouse Items */}
      <div className="space-y-1.5">
        <h5 className="font-black text-slate-900 text-xs">
          {isEn ? `4. Warehouse Demand & Daily Feed Disbursement Log (${warehouseReqs.length} items):` : `رابعاً: كشف متطلبات وصرفيات المخزن وخامات العلف اليومية (${warehouseReqs.length} خامة):`}
        </h5>
        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900 font-extrabold text-center">
            <tr className="border-b border-slate-400">
              <th className="py-1.5 px-2 border border-slate-300 w-24">{isEn ? 'Material Code' : 'كود الخامة'}</th>
              <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Feed Raw Material' : 'اسم الخامة العلفية'}</th>
              <th className="py-1.5 px-2 border border-slate-300 font-black">{isEn ? 'Daily Demand (kg)' : 'الاحتياج اليومي (كجم)'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Weight (Tons)' : 'الوزن بالطن'}</th>
              <th className="py-1.5 px-2 border border-slate-300">{isEn ? 'Dry Matter %' : 'المادة الجافة %'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-medium">
            {warehouseReqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400 font-bold">
                  {isEn ? 'No warehouse requirements recorded for this date.' : 'لا توجد متطلبات مخزن مسجلة لهذا التاريخ.'}
                </td>
              </tr>
            ) : (
              warehouseReqs.map((item, idx) => {
                const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
                const rawMat = safeMaterials.find((r) => r.id === item.rawMaterialId);
                return (
                  <tr key={`${item.rawMaterialId || 'rm'}-${idx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-bold text-slate-600">{item.code}</td>
                    <td className="py-1.5 px-2 border border-slate-300 font-black text-slate-900">{item.name}</td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-emerald-950">
                      {item.totalRequiredKgToday.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">
                      {(item.totalRequiredKgToday / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold">{rawMat?.dryMatterPercent || 90}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500 text-center">
            <tr>
              <td colSpan={2} className="py-1.5 px-2 border border-slate-300 text-left font-black">
                {isEn ? 'Total Warehouse Ingredients:' : 'إجمالي خامات المخزن:'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black text-emerald-950">
                {warehouseReqs.reduce((sum, i) => sum + i.totalRequiredKgToday, 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 font-black">
                {(warehouseReqs.reduce((sum, i) => sum + i.totalRequiredKgToday, 0) / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-xs">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes / Audit Remarks */}
      {dailyPlan.notes && (
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-1">
          <span className="font-bold text-slate-900 block">
            {isEn ? 'Recorded Notes on this Day Log:' : 'ملاحظات مسجلة على سجل هذا اليوم:'}
          </span>
          <p className="text-slate-700 min-h-[28px] whitespace-pre-wrap">{dailyPlan.notes}</p>
        </div>
      )}

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Senior Nutrition Consultant' : 'مهندس التغذية الاستشاري', name: settings?.engineerName },
            { title: isEn ? 'Mixer Fleet & Operations Supervisor' : 'مسؤول حركة المكسرات والتشغيل' },
            { title: isEn ? 'Warehouse Manager' : 'أمين المخزن', name: settings?.warehouseManagerName },
            { title: isEn ? 'Station General Manager' : 'مدير المحطة' },
          ]}
        />
      )}
    </div>
  );
};

/* =============================================================
   5. DRIVER SHEET COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const DriverSheetPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  barns: Barn[];
  mixers: Mixer[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, rations, barns, mixers, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const batches = dailyPlan.batches || [];

  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'TMR Driver Delivery & Pen Unloading Sheet' : 'كشف تفريغ وتوزيع العلف للسائق (TMR Driver Delivery Sheet)'}
        documentSubtitle={isEn ? 'Daily mixer truck feed distribution and pen discharge verification sheet' : 'نموذج تسليم وتفريغ العلف اليومي بعنابر المزرعة بواسطة عربة المكسر'}
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      <div className="space-y-6">
        {batches.map((batch, bIdx) => {
          const category = categories.find((c) => c.id === batch.categoryId);
          const mixer = mixers.find((m) => m.id === batch.mixerId);
          const effectiveWeight = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
          const isLast = bIdx === batches.length - 1;

          return (
            <div
              key={batch.id}
              className={`border border-slate-400 rounded-lg p-3.5 space-y-3 ${
                isLast ? '' : 'print:break-after-page'
              }`}
            >
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded border border-slate-300 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm text-white bg-slate-900 px-2.5 py-0.5 rounded">
                    {batch.batchNumber}
                  </span>
                  <span>{isEn ? 'Time: ' : 'الوقت: '}<strong>{batch.time}</strong></span>
                  <span>{isEn ? 'Category: ' : 'الفئة: '}<strong className="text-emerald-900">{category?.name}</strong></span>
                  <span>{isEn ? 'Mixer: ' : 'المكسر: '}<strong>{mixer?.name}</strong></span>
                </div>
                <div className="font-black text-slate-900 text-sm">
                  {isEn ? 'Total Batch Load: ' : 'إجمالي حمولة اللفة: '}
                  <span className="text-emerald-900">
                    {effectiveWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                  </span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-xs">
                <thead className="bg-slate-100 font-bold text-slate-900 text-center">
                  <tr className="border-b border-slate-400">
                    <th className="py-2 px-2 border border-slate-300 w-8">#</th>
                    <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Pen / Barn Location' : 'رقم العنبر / الموقع'}</th>
                    <th className="py-2 px-2 border border-slate-300">{isEn ? 'Heads' : 'الرؤوس'}</th>
                    <th className="py-2 px-2 border border-slate-300">{isEn ? 'Batch %' : 'نسبة اللفة'}</th>
                    <th className="py-2 px-3 border border-slate-300 font-black bg-slate-200">
                      {isEn ? 'Target Discharge (kg)' : 'الوزن المقرر تفريغه (كجم)'}
                    </th>
                    <th className="py-2 px-3 border border-slate-300 font-bold">
                      {isEn ? 'Actual Discharged (kg)' : 'تم التفريغ الفعلي (كجم)'}
                    </th>
                    <th className="py-2 px-3 border border-slate-300">{isEn ? 'Notes & Driver Signature' : 'ملاحظات وتوقيع السائق'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-medium">
                  {(batch.allocations || []).map((alloc, aIdx) => {
                    const barn = barns.find((b) => b.id === alloc.barnId);
                    const allocKg = getDerivedAllocationKg(alloc, barn, categories, rations, dailyPlan);

                    return (
                      <tr key={aIdx}>
                        <td className="py-2 px-2 border border-slate-300 text-center">{aIdx + 1}</td>
                        <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900 text-right">
                          {isEn ? `Barn ${barn?.number || ''}` : `عنبر ${barn?.number || ''}`} {barn?.name ? `(${barn.name})` : ''}
                        </td>
                        <td className="py-2 px-2 border border-slate-300 text-center font-bold">{barn?.headCount || 0}</td>
                        <td className="py-2 px-2 border border-slate-300 text-center">{alloc.allocatedPercent}%</td>
                        <td className="py-2 px-3 border border-slate-300 text-center font-black bg-slate-50 text-slate-900 text-sm">
                          {allocKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 text-center">
                          <span className="inline-block w-24 border-b border-dotted border-slate-500"></span>
                        </td>
                        <td className="py-2 px-3 border border-slate-300 text-center text-slate-400">
                          <span className="inline-block w-28 border-b border-dotted border-slate-400"></span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {showSignatures && (
                <div className="pt-2">
                  <PrintSignatures
                    showOnScreen={true}
                    settings={settings}
                    signatures={[
                      { title: isEn ? 'Mixer Driver & Delivery Operator' : 'سائق عربة المكسر والتوزيع', name: settings?.driverName },
                      { title: isEn ? 'Barn Feeding Supervisor' : 'مشرف عنابر التغذية' },
                      { title: isEn ? 'Nutrition & Operations Engineer' : 'مهندس التغذية والتشغيل', name: settings?.engineerName },
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =============================================================
   6. CONCENTRATE PREMIX COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const ConcentratePremixPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  showSignatures: boolean;
  selectedCategoryId?: string;
  batchWeightKg?: number;
}> = ({
  dailyPlan,
  categories,
  rations,
  rawMaterials,
  settings,
  showSignatures,
  selectedCategoryId = 'ALL',
  batchWeightKg = 1000,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const bagWeightKg = dailyPlan.premixBagWeightKg || settings.defaultBagWeightKg || 50;
  const currency = settings.currency || (isEn ? 'EGP' : 'ج.م');

  const isSpecificBatch = selectedCategoryId && selectedCategoryId !== 'ALL';
  const targetCategory = isSpecificBatch
    ? categories.find((c) => c.id === selectedCategoryId) || categories[0]
    : null;
  const targetRation = targetCategory
    ? rations.find((r) => r.id === (targetCategory.rationId || targetCategory.defaultRationId))
    : null;

  const activeBatchFormula =
    targetRation
      ? calculateConcentrateBatchFormula(targetRation, rawMaterials, batchWeightKg, bagWeightKg)
      : null;

  // If specific batch mode is active
  if (isSpecificBatch && targetCategory && activeBatchFormula) {
    return (
      <div className="space-y-6">
        <PrintHeader
          showOnScreen={true}
          documentTitle={isEn ? 'Concentrate Mixer & Bagging Production Order' : 'أمر تشغيل خلاطة العلف المركز وتعبئة الشكاير'}
          documentSubtitle={
            isEn
              ? `Concentrate feed dispensing & bagging batch ticket - ${settings.farmName}`
              : `إذن صرف خامات العلف المركز وتعبئة الشكاير بالخلاطة - ${settings.farmName}`
          }
          selectedDate={dailyPlan.date}
          settings={settings}
          engineerName={settings.engineerName}
          batchInfo={{
            batchNumber: isEn
              ? `Premix Batch (${targetCategory.name}) - ${(activeBatchFormula.targetBatchKg / 1000).toFixed(1)} tons`
              : `دفعة مركز (${targetCategory.name}) - ${(activeBatchFormula.targetBatchKg / 1000).toFixed(1)} طن`,
            categoryName: targetCategory.name,
            rationName: targetRation?.name || (isEn ? 'Ration ' + targetCategory.name : 'عليقة ' + targetCategory.name),
            mixerName: isEn ? 'Main Concentrate Feed Mixer' : 'خلاطة العلف المركز الرئيسية',
            time: new Date().toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' }),
            targetWeightKg: activeBatchFormula.targetBatchKg,
          }}
        />

        {/* 4 Executive Specification Metric Cards */}
        <div className="grid grid-cols-4 gap-2.5 text-xs font-bold print-avoid-break">
          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-lg space-y-0.5">
            <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Batch Weight:' : 'وزن الدفعة الإجمالي:'}</span>
            <div className="text-base font-black text-slate-900">
              {(activeBatchFormula.targetBatchKg / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'}
            </div>
            <span className="text-[10px] text-slate-600 block">
              ({activeBatchFormula.targetBatchKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'})
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg space-y-0.5">
            <span className="text-amber-800 block text-[10px]">{isEn ? 'Bags to be Packed:' : 'الشكاير المقرر تعبئتها:'}</span>
            <div className="text-base font-black text-amber-950">
              {activeBatchFormula.totalBags} {isEn ? 'bags' : 'شكارة'}
            </div>
            <span className="text-[10px] text-amber-800 block">
              {isEn ? 'Bag Weight: ' : 'وزن الشكارة: '}{bagWeightKg} {isEn ? 'kg' : 'كجم'} {activeBatchFormula.remainingLooseKg > 0 ? (isEn ? ` (+${activeBatchFormula.remainingLooseKg} kg loose)` : ` (+${activeBatchFormula.remainingLooseKg} كجم)`) : ''}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-lg space-y-0.5">
            <span className="text-slate-500 block text-[10px]">{isEn ? 'Estimated Cost per Ton:' : 'تكلفة الطن المقدرة:'}</span>
            <div className="text-base font-black text-emerald-900">
              {(activeBatchFormula.costPerKg * 1000).toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}
            </div>
            <span className="text-[10px] text-slate-600 block">
              ({activeBatchFormula.costPerKg.toFixed(2)} {currency}/{isEn ? 'kg' : 'كجم'})
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-lg space-y-0.5">
            <span className="text-slate-500 block text-[10px]">{isEn ? 'Estimated Cost per Bag:' : 'تكلفة الشكارة الواحدة:'}</span>
            <div className="text-base font-black text-emerald-900">
              {activeBatchFormula.costPerBag.toLocaleString(isEn ? 'en-US' : 'ar-EG', { maximumFractionDigits: 0 })} {currency}
            </div>
            <span className="text-[10px] text-slate-600 block">
              {isEn ? 'Batch Total: ' : 'إجمالي الدفعة: '}{Math.round(activeBatchFormula.totalCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
            </span>
          </div>
        </div>

        {/* Detailed Formulation Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>{isEn ? 'Concentrate Premix Ingredient Weight & Specification Table:' : 'جدول أوزان ومقادير خامات خلطة المركز:'}</span>
            <span className="text-slate-500">
              {isEn ? `(${activeBatchFormula.items.length} concentrate ingredients)` : `(${activeBatchFormula.items.length} خامات مركزة)`}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead className="bg-slate-100 font-bold text-slate-900">
              <tr className="border-b border-slate-400 text-center">
                <th className="py-2 px-2 border border-slate-300 w-8">{isEn ? '#' : 'م'}</th>
                <th className="py-2 px-2 border border-slate-300 text-right">{isEn ? 'Ingredient Code' : 'كود الخامة'}</th>
                <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Concentrate Raw Material' : 'اسم الخامة المركزة'}</th>
                <th className="py-2 px-2 border border-slate-300">{isEn ? 'Share in Premix %' : 'النسبة بالمركز %'}</th>
                <th className="py-2 px-2 border border-slate-300">{isEn ? 'Prescribed in Ration' : 'المقرر بالعليقة'}</th>
                <th className="py-2 px-3 border border-slate-300 font-black bg-amber-50 text-amber-950">
                  {isEn ? 'Mixer Batch Wt (kg)' : 'الوزن للخلاطة (كجم)'}
                </th>
                <th className="py-2 px-3 border border-slate-300 font-black bg-amber-100/70 text-amber-950">
                  {isEn ? `Weight per Bag (${bagWeightKg} kg)` : `الوزن بالشكارة (${bagWeightKg} كجم)`}
                </th>
                <th className="py-2 px-2 border border-slate-300">{isEn ? 'Price/kg' : 'سعر الكيلو'}</th>
                <th className="py-2 px-2 border border-slate-300">{isEn ? 'Total Cost' : 'إجمالي القيمة'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-medium">
              {activeBatchFormula.items.map((item, idx) => {
                const kgPerBag = (item.percentageInConcentrate / 100) * bagWeightKg;
                const bagWeightDisplay =
                  kgPerBag >= 1
                    ? `${kgPerBag.toFixed(2)} ${isEn ? 'kg' : 'كجم'}`
                    : `${Math.round(kgPerBag * 1000)} ${isEn ? 'g' : 'جرام'}`;
                const rowCost = item.requiredKg * (item.costPerKg || 0);

                return (
                  <tr key={item.rawMaterialId} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 font-mono text-[11px] text-slate-600 text-right">
                      {item.code}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 font-black text-slate-900 text-right">
                      {item.name}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-700">
                      {item.percentageInConcentrate.toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-600">
                      {item.amountKgPerHead} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 text-center font-black text-amber-950 bg-amber-50 text-sm">
                      {item.requiredKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-1.5 px-3 border border-slate-300 text-center font-black text-amber-900 bg-amber-50/60 text-xs">
                      {bagWeightDisplay}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center text-slate-700">
                      {item.costPerKg ? `${item.costPerKg.toFixed(2)} ${currency}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-900">
                      {Math.round(rowCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
              <tr className="text-center">
                <td colSpan={3} className="py-2.5 px-3 border border-slate-300 text-right font-black text-xs">
                  {isEn ? 'Total Concentrate Batch & Bags Packed:' : 'إجمالي خلطة المركز وتعبئة الشكاير:'}
                </td>
                <td className="py-2.5 px-2 border border-slate-300 font-black">100%</td>
                <td className="py-2.5 px-2 border border-slate-300">—</td>
                <td className="py-2.5 px-3 border border-slate-300 font-black text-sm text-amber-950 bg-amber-100">
                  {activeBatchFormula.targetBatchKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({activeBatchFormula.totalBags} {isEn ? 'bags' : 'شكارة'})
                </td>
                <td className="py-2.5 px-3 border border-slate-300 font-black text-xs text-amber-950 bg-amber-100/70">
                  {bagWeightKg} {isEn ? 'kg/bag' : 'كجم/شكارة'}
                </td>
                <td className="py-2.5 px-2 border border-slate-300">—</td>
                <td className="py-2.5 px-2 border border-slate-300 font-black text-sm text-emerald-950">
                  {Math.round(activeBatchFormula.totalCost).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Operational & Safety Instructions */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-[11px] space-y-1.5 print-avoid-break">
          <h5 className="font-black text-slate-900 text-xs">
            {isEn ? 'Concentrate Mixer & Bagging Standard Operating Instructions:' : 'تعليمات تشغيل خلاطة المركز وتعبئة الشكاير:'}
          </h5>
          <div className="grid grid-cols-3 gap-3 text-slate-700">
            <div>
              <strong className="block text-slate-900 font-bold">
                {isEn ? '1. Loading Order:' : '1. ترتيب التحميل:'}
              </strong>
              {isEn
                ? 'Load bulk grains and protein meals first (corn, soybean meal, gluten feed), then add mineral premix, vitamins, and sodium bicarbonate midway through mixing.'
                : 'تحميل الخامات الكبرى أولاً (الذرة، كسب الصويا، الجلوتوفيد)، ثم إضافة البريمكس والأملاح والبيكربونات في منتصف وقت الخلط.'}
            </div>
            <div>
              <strong className="block text-slate-900 font-bold">
                {isEn ? '2. Mixing Time:' : '2. زمن الخلط:'}
              </strong>
              {isEn
                ? 'Run mixer for 5 - 8 minutes minimum after all ingredients are loaded to ensure uniform dispersion and avoid salt stratification.'
                : 'التشغيل لمدة 5 - 8 دقائق على الأقل بعد اكتمال دخول كافة الخامات لضمان التجانس التام وعدم ترسب الأملاح.'}
            </div>
            <div>
              <strong className="block text-slate-900 font-bold">
                {isEn ? '3. Bagging Calibration:' : '3. ضبط التعبئة:'}
              </strong>
              {isEn
                ? `Calibrate the bagging scale accurately at ${bagWeightKg} kg, stitch bags securely, and clearly tag with mixing date and feed formula.`
                : `معايرة ميزان التعبئة عند ${bagWeightKg} كجم بدقة، وخياطة الشكاير مع كتابة تاريخ الخلط ونوع المركز بوضوح.`}
            </div>
          </div>
        </div>

        {showSignatures && (
          <PrintSignatures
            showOnScreen={true}
            settings={settings}
            signatures={[
              { title: isEn ? 'Nutrition & Quality Engineer' : 'مهندس التغذية والجودة', name: settings?.engineerName || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية') },
              { title: isEn ? 'Concentrate Mixer Operator' : 'مسؤول تشغيل خلاطة المركز' },
              { title: isEn ? 'Feed & Bags Warehouse Keeper' : 'أمين مخزن الأعلاف والشكاير', name: settings?.warehouseManagerName || (isEn ? 'Warehouse Keeper' : 'أمين المستودع') },
            ]}
          />
        )}
      </div>
    );
  }

  // ALL Categories Standards Overview Mode
  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'Feed Concentrate & Premix Formulations Standards Guide' : 'دليل معايير وتركيبات خلطات العلف المركز لجميع فئات القطيع'}
        documentSubtitle={
          isEn
            ? `Concentrate ingredient ratios and ton/bag formulas (${bagWeightKg} kg) - ${settings.farmName}`
            : `كشف نسب خامات المركز ومقررات الطن والشكارة (زنة ${bagWeightKg} كجم) - ${settings.farmName}`
        }
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* Premix Specifications */}
      <div className="grid grid-cols-3 gap-3 bg-slate-100 border border-slate-300 p-3 rounded-lg text-xs font-bold text-slate-800">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Standard Bag Weight:' : 'وزن الشكارة القياسي:'}</span>
          <span className="text-slate-900 font-black text-sm">{bagWeightKg} {isEn ? 'kg/bag' : 'كجم/شكارة'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Mixing & Packing System:' : 'نظام الخلط والتعبئة:'}</span>
          <span className="text-amber-900 font-black text-sm">{isEn ? 'Pre-batched Concentrate Bags' : 'شكاير مركز مسبقة التجهيز'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Target Categories Count:' : 'عدد الفئات المستهدفة:'}</span>
          <span className="text-emerald-900 font-black text-sm">{categories.length} {isEn ? 'Categories' : 'فئات'}</span>
        </div>
      </div>

      {/* Categories Concentrates Formulations */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catRation = rations.find((r) => r.id === (cat.rationId || cat.defaultRationId));
          if (!catRation) return null;
          const breakdown = getConcentrateAndRoughageBreakdown(catRation, rawMaterials);
          if (breakdown.concentrateIngredients.length === 0) return null;

          return (
            <div key={cat.id} className="border border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50 print-avoid-break">
              <div className="flex justify-between items-center bg-slate-200 p-2 rounded text-xs font-bold">
                <span className="text-slate-900 font-black text-sm">
                  {isEn ? `Premix Formula: ${cat.name} (${catRation.name})` : `تركيبة مركز: ${cat.name} (${catRation.name})`}
                </span>
                <span className="text-slate-600">
                  {isEn ? 'Premix share in ration: ' : 'نسبة المركز بالعليقة: '}<strong>{breakdown.concentrateRatioPercent}%</strong>
                </span>
              </div>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead className="bg-white font-bold">
                  <tr>
                    <th className="py-1.5 px-2 border border-slate-300 text-right">{isEn ? 'Concentrate Ingredient' : 'الخامة العلفية بالمركز'}</th>
                    <th className="py-1.5 px-2 border border-slate-300 text-center">{isEn ? 'Share in Mix %' : 'النسبة بالخلطة %'}</th>
                    <th className="py-1.5 px-2 border border-slate-300 text-center">{isEn ? 'Weight per Ton (1000 kg)' : 'الوزن لكل طن (1000 كجم)'}</th>
                    <th className="py-1.5 px-2 border border-slate-300 text-center">{isEn ? `Weight per Bag (${bagWeightKg} kg)` : `الوزن لكل شكارة (${bagWeightKg} كجم)`}</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {breakdown.concentrateIngredients.map((ing, iIdx) => {
                    const kgPerBag = (ing.shareInConcentratePercent / 100) * bagWeightKg;
                    const bagWeightStr =
                      kgPerBag >= 1
                        ? `${kgPerBag.toFixed(2)} ${isEn ? 'kg' : 'كجم'}`
                        : `${Math.round(kgPerBag * 1000)} ${isEn ? 'g' : 'جرام'}`;

                    return (
                      <tr key={iIdx}>
                        <td className="py-1 px-2 border border-slate-300 font-semibold">{ing.rawMaterial?.name || (isEn ? 'Concentrate Ingredient' : 'خامة مركز')}</td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-bold">{ing.shareInConcentratePercent}%</td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-black text-slate-900">{Math.round(ing.shareInConcentratePercent * 10)} {isEn ? 'kg' : 'كجم'}</td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-bold text-amber-900">{bagWeightStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Nutrition & Quality Engineer' : 'مهندس التغذية والجودة', name: settings?.engineerName || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية') },
            { title: isEn ? 'Concentrate Mixer Operator' : 'مسؤول تشغيل خلاطة المركز' },
            { title: isEn ? 'Feed & Bags Warehouse Keeper' : 'أمين مخزن الأعلاف والشكاير', name: settings?.warehouseManagerName || (isEn ? 'Warehouse Keeper' : 'أمين المستودع') },
          ]}
        />
      )}
    </div>
  );
};

/* =============================================================
   7. DAILY OPERATION PLAN COMPREHENSIVE PRINT CONTENT
   ============================================================= */
const DailyPlanPrintContent: React.FC<{
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  barns: Barn[];
  mixers: Mixer[];
  settings: FarmSettings;
  showSignatures: boolean;
}> = ({ dailyPlan, categories, rations, barns, mixers, settings, showSignatures }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const batches = dailyPlan.batches || [];
  const totalWeight = batches.reduce((s, b) => s + (b.targetWeightKg || 0), 0);

  return (
    <div className="space-y-6">
      <PrintHeader
        showOnScreen={true}
        documentTitle={isEn ? 'Daily Operation Plan & TMR Mixer Schedule' : 'خطة التشغيل اليومية وجدول لفات المكسر'}
        documentSubtitle={
          isEn
            ? `Daily timetable, target weights, and barn distribution - ${settings.farmName}`
            : 'جدول مواعيد وأوزان وتوزيع لفات المكسر لجميع فئات وعنابر المزرعة'
        }
        selectedDate={dailyPlan.date}
        settings={settings}
        engineerName={settings.engineerName}
      />

      {/* Summary Banner */}
      <div className="grid grid-cols-4 gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800">
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Scheduled Batches:' : 'عدد اللفات المقررة:'}</span>
          <span className="text-slate-900 font-black text-sm">{batches.length} {isEn ? 'batches' : 'لفة'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Total Scheduled Feed Weight:' : 'إجمالي وزن العلف المقرر:'}</span>
          <span className="text-emerald-900 font-black text-sm">{totalWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'} ({(totalWeight / 1000).toFixed(2)} {isEn ? 'tons' : 'طن'})</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'TMR Mixers Deployed:' : 'عربات المكسر المستخدمة:'}</span>
          <span className="text-blue-900 font-black text-sm">{mixers.length} {isEn ? 'wagons' : 'عربات'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">{isEn ? 'Active Barns Covered:' : 'إجمالي العنابر المغطاة:'}</span>
          <span className="text-purple-900 font-black text-sm">{barns.filter((b) => b.status === 'نشط').length} {isEn ? 'barns' : 'عنبر'}</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-400 text-xs">
        <thead className="bg-slate-100 font-bold text-slate-900 text-center">
          <tr className="border-b border-slate-400">
            <th className="py-2 px-2 border border-slate-300 w-8">{isEn ? '#' : 'م'}</th>
            <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Batch No.' : 'رقم اللفة'}</th>
            <th className="py-2 px-2 border border-slate-300">{isEn ? 'Time' : 'التوقيت'}</th>
            <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
            <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Ration' : 'العليقة'}</th>
            <th className="py-2 px-2 border border-slate-300">{isEn ? 'Mixer' : 'المكسر'}</th>
            <th className="py-2 px-3 border border-slate-300 font-black bg-slate-200">{isEn ? 'Target Weight (kg)' : 'الوزن المستهدف (كجم)'}</th>
            <th className="py-2 px-3 border border-slate-300 text-right">{isEn ? 'Target Barns & Unloading' : 'العنابر المستهدفة والتفريغ'}</th>
            <th className="py-2 px-2 border border-slate-300">{isEn ? 'Status' : 'الحالة'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300 font-medium">
          {batches.map((batch, idx) => {
            const cat = categories.find((c) => c.id === batch.categoryId);
            const rat = rations.find((r) => r.id === (batch.rationId || cat?.rationId || (cat as any)?.defaultRationId));
            const mix = mixers.find((m) => m.id === batch.mixerId);
            const effectiveWeight = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);

            const getBatchStatusLabel = (st?: string) => {
              if (!isEn) return st || 'مجدولة';
              switch (st) {
                case 'تم التوزيع':
                  return 'Distributed';
                case 'تم التحضير':
                  return 'Prepared';
                case 'قيد التحضير':
                  return 'In Progress';
                case 'مخططة':
                case 'مجدولة':
                default:
                  return 'Planned';
              }
            };

            return (
              <tr key={batch.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                <td className="py-2 px-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="py-2 px-3 border border-slate-300 font-black text-slate-900">{batch.batchNumber}</td>
                <td className="py-2 px-2 border border-slate-300 text-center font-bold">{batch.time}</td>
                <td className="py-2 px-3 border border-slate-300 font-bold">{cat?.name}</td>
                <td className="py-2 px-3 border border-slate-300">{rat?.name}</td>
                <td className="py-2 px-2 border border-slate-300 text-center">{mix?.name}</td>
                <td className="py-2 px-3 border border-slate-300 text-center font-black text-slate-900 bg-slate-100 text-sm">
                  {effectiveWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                </td>
                <td className="py-2 px-3 border border-slate-300 text-right text-[10px]">
                  {(batch.allocations || []).map((a) => {
                    const b = barns.find((bn) => bn.id === a.barnId);
                    const bNum = b?.number || '';
                    const bDisplayName = isEn ? (bNum.startsWith('عنبر') ? `Barn ${bNum.replace('عنبر', '').trim()}` : bNum) : bNum;
                    return `${bDisplayName} (${a.allocatedPercent}%)`;
                  }).join(isEn ? ', ' : '، ')}
                </td>
                <td className="py-2 px-2 border border-slate-300 text-center font-bold text-[11px]">
                  {getBatchStatusLabel(batch.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-500">
          <tr className="text-center">
            <td colSpan={6} className="py-2 px-3 border border-slate-300 text-left font-black">
              {isEn ? 'Total Daily Batches Weight:' : 'إجمالي أوزان جميع لفات اليوم:'}
            </td>
            <td className="py-2 px-3 border border-slate-300 font-black text-sm text-emerald-950">
              {totalWeight.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </td>
            <td colSpan={2} className="py-2 px-3 border border-slate-300 text-center font-bold">
              {batches.length} {isEn ? 'Mixer Batches' : 'لفات مكسر'}
            </td>
          </tr>
        </tfoot>
      </table>

      {showSignatures && (
        <PrintSignatures
          showOnScreen={true}
          settings={settings}
          signatures={[
            { title: isEn ? 'Feeding & Operations Engineer' : 'مهندس التغذية والتشغيل', name: settings?.engineerName || (isEn ? 'Feed Engineer' : 'مهندس التغذية') },
            { title: isEn ? 'Mixer Fleet Supervisor' : 'مشرف حركة المكسرات' },
            { title: isEn ? 'Operations Manager' : 'مدير العمليات' },
          ]}
        />
      )}
    </div>
  );
};
