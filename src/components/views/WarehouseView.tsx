import React, { useState, useMemo } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  FarmSettings,
  Barn,
  WarehouseTransaction,
  DailyWarehouseItemState,
} from '../../types';
import {
  calculateChronologicalWarehouseLedger,
  WarehouseDailyLedgerItem,
  checkLowStockMaterials,
} from '../../utils/calculations';
import { loadAllDailyPlans } from '../../services/storage';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportWarehouseToExcel } from '../../utils/excelExport';
import {
  Warehouse,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  TrendingDown,
  PackagePlus,
  Scale,
  Search,
  Filter,
  Plus,
  History,
  Trash2,
  FileText,
  Clock,
  Truck,
  RotateCcw,
  Info,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';

interface WarehouseViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan?: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  setRawMaterials?: (materials: RawMaterial[]) => void;
  settings?: FarmSettings;
  barns?: Barn[];
  onPrint?: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  rations,
  rawMaterials,
  setRawMaterials,
  settings,
  barns = [],
  onPrint,
}) => {
  const { showToast, showConfirm } = useFeedback();
  // Load all plans for chronological roll-forward
  const allPlans = useMemo(() => loadAllDailyPlans(), [dailyPlan]);

  // Compute live chronological ledger for the selected date
  const ledgerItems = useMemo(() => {
    return calculateChronologicalWarehouseLedger(
      dailyPlan.date,
      rawMaterials,
      categories,
      rations,
      barns,
      allPlans,
      dailyPlan
    );
  }, [dailyPlan, rawMaterials, categories, rations, barns, allPlans]);

  // Compute low stock / shortage alerts
  const lowStockAlerts = useMemo(() => {
    return checkLowStockMaterials(rawMaterials, dailyPlan, categories, rations, barns);
  }, [rawMaterials, dailyPlan, categories, rations, barns]);

  // Filter & Search states
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE_TODAY' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active view tab inside Warehouse: 'LEDGER' (جدول الأرصدة) | 'TRANSACTIONS' (أذونات التوريد والحركات)
  const [activeSubTab, setActiveSubTab] = useState<'LEDGER' | 'TRANSACTIONS'>('LEDGER');

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptMaterialId, setReceiptMaterialId] = useState<string>(rawMaterials[0]?.id || '');
  const [receiptUnit, setReceiptUnit] = useState<'KG' | 'TON'>('TON');
  const [receiptQuantity, setReceiptQuantity] = useState<string>('');
  const [receiptSupplier, setReceiptSupplier] = useState<string>('');
  const [receiptInvoice, setReceiptInvoice] = useState<string>('');
  const [receiptVehicle, setReceiptVehicle] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('');

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMaterialId, setAdjustMaterialId] = useState<string>(rawMaterials[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'WASTE' | 'PHYSICAL_AUDIT'>('WASTE');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // Timeline / History Modal
  const [historyMaterialId, setHistoryMaterialId] = useState<string | null>(null);

  // Notification / Feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Helper to update dailyPlan.warehouseState
  const updateMaterialState = (
    rawMaterialId: string,
    updates: Partial<DailyWarehouseItemState>
  ) => {
    if (!setDailyPlan) return;

    const currentStates = { ...(dailyPlan.warehouseState || {}) };
    const currentItemState = currentStates[rawMaterialId] || { rawMaterialId };

    currentStates[rawMaterialId] = {
      ...currentItemState,
      ...updates,
    };

    setDailyPlan({
      ...dailyPlan,
      warehouseState: currentStates,
    });
  };

  // Inline Handlers
  const handleIncomingChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    updateMaterialState(rawMaterialId, { incomingKg: safeVal });
  };

  const handleIssuedChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    updateMaterialState(rawMaterialId, { manualIssuedKg: safeVal });
  };

  const handleWasteChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    updateMaterialState(rawMaterialId, { wasteKg: safeVal });
  };

  const handleOpeningStockChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    updateMaterialState(rawMaterialId, { openingStockKg: safeVal });
  };

  const handleResetOpeningToCarried = (rawMaterialId: string) => {
    if (!setDailyPlan) return;
    const currentStates = { ...(dailyPlan.warehouseState || {}) };
    if (currentStates[rawMaterialId]) {
      const { openingStockKg, ...rest } = currentStates[rawMaterialId];
      currentStates[rawMaterialId] = rest;
      setDailyPlan({ ...dailyPlan, warehouseState: currentStates });
      showNotification('تمت استعادة الرصيد المرحل التلقائي من اليوم السابق', 'info');
    }
  };

  const handleResetIssuedToCalculated = (rawMaterialId: string) => {
    if (!setDailyPlan) return;
    const currentStates = { ...(dailyPlan.warehouseState || {}) };
    if (currentStates[rawMaterialId]) {
      const { manualIssuedKg, ...rest } = currentStates[rawMaterialId];
      currentStates[rawMaterialId] = rest;
      setDailyPlan({ ...dailyPlan, warehouseState: currentStates });
      showNotification('تمت استعادة المنصرف المحسوب من لفات المكسر', 'info');
    }
  };

  // Goods Receipt Submission
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(receiptQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('يرجى إدخال كمية وارد صحيحة', 'warning');
      return;
    }

    const qtyKg = receiptUnit === 'TON' ? qtyNum * 1000 : qtyNum;
    const targetMaterial = rawMaterials.find((rm) => rm.id === receiptMaterialId);

    const newTx: WarehouseTransaction = {
      id: generateId('tx'),
      rawMaterialId: receiptMaterialId,
      date: dailyPlan.date,
      type: 'INCOMING',
      quantityKg: qtyKg,
      supplierName: receiptSupplier.trim() || undefined,
      invoiceNumber: receiptInvoice.trim() || undefined,
      vehicleNumber: receiptVehicle.trim() || undefined,
      notes: receiptNotes.trim() || undefined,
      createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    const currentTxs = [...(dailyPlan.warehouseTransactions || []), newTx];

    // Compute new total incoming for this material on this day
    const totalIncomingForMat = currentTxs
      .filter((t) => t.rawMaterialId === receiptMaterialId && t.type === 'INCOMING')
      .reduce((sum, t) => sum + t.quantityKg, 0);

    const currentStates = { ...(dailyPlan.warehouseState || {}) };
    currentStates[receiptMaterialId] = {
      ...(currentStates[receiptMaterialId] || { rawMaterialId: receiptMaterialId }),
      incomingKg: totalIncomingForMat,
    };

    if (setDailyPlan) {
      setDailyPlan({
        ...dailyPlan,
        warehouseTransactions: currentTxs,
        warehouseState: currentStates,
      });
    }

    // Reset modal
    setReceiptQuantity('');
    setReceiptSupplier('');
    setReceiptInvoice('');
    setReceiptVehicle('');
    setReceiptNotes('');
    setIsReceiptModalOpen(false);

    showNotification(
      `تم تسجيل إذن توريد ${qtyKg.toLocaleString()} كجم من (${targetMaterial?.name || 'الخامة'}) بنجاح وترحيلها للرصيد`
    );
  };

  // Adjust / Waste Submission
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(adjustQuantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      showToast('يرجى إدخال كمية صحيحة', 'warning');
      return;
    }

    const targetMaterial = rawMaterials.find((rm) => rm.id === adjustMaterialId);

    if (adjustType === 'WASTE') {
      updateMaterialState(adjustMaterialId, { wasteKg: qtyNum });
      showNotification(`تم تسجيل هالك وفاقد قدره ${qtyNum.toLocaleString()} كجم من (${targetMaterial?.name})`);
    } else {
      updateMaterialState(adjustMaterialId, { openingStockKg: qtyNum });
      showNotification(`تم اعتماد التسوية الجردية للرصيد الفعلي (${qtyNum.toLocaleString()} كجم) لخامة (${targetMaterial?.name})`);
    }

    setAdjustQuantity('');
    setAdjustNotes('');
    setIsAdjustModalOpen(false);
  };

  // Delete Transaction
  const handleDeleteTransaction = (txId: string) => {
    showConfirm({
      title: 'حذف حركة مخزن',
      message: 'هل أنت متأكد من حذف هذه الحركة؟',
      isDanger: true,
      confirmText: 'حذف',
      onConfirm: () => {
        const currentTxs = (dailyPlan.warehouseTransactions || []).filter((t) => t.id !== txId);
        const targetTx = (dailyPlan.warehouseTransactions || []).find((t) => t.id === txId);

        if (targetTx && setDailyPlan) {
          const matId = targetTx.rawMaterialId;
          const totalIncomingForMat = currentTxs
            .filter((t) => t.rawMaterialId === matId && t.type === 'INCOMING')
            .reduce((sum, t) => sum + t.quantityKg, 0);

          const currentStates = { ...(dailyPlan.warehouseState || {}) };
          currentStates[matId] = {
            ...(currentStates[matId] || { rawMaterialId: matId }),
            incomingKg: totalIncomingForMat,
          };

          setDailyPlan({
            ...dailyPlan,
            warehouseTransactions: currentTxs,
            warehouseState: currentStates,
          });

          showNotification('تم حذف الحركة وتحديث رصيد المخزن', 'info');
        }
      },
    });
  };

  // Save changes to master rawMaterials if needed
  const handleSyncMasterStock = () => {
    if (setRawMaterials) {
      const updated = rawMaterials.map((rm) => {
        const item = ledgerItems.find((l) => l.rawMaterialId === rm.id);
        return {
          ...rm,
          currentStockKg: item ? item.closingStockKg : (rm.currentStockKg ?? 0),
        };
      });
      setRawMaterials(updated);
      showNotification('تم حفظ واعتماد وتثبيت أرصدة المخزن بنجاح!');
    }
  };

  // Filtered ledger items for display
  const filteredLedger = ledgerItems.filter((item) => {
    // Search matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    // Filter mode
    if (filterMode === 'ACTIVE_TODAY') {
      return item.requiredDailyKg > 0 || item.incomingKg > 0 || item.issuedKg > 0;
    }
    if (filterMode === 'CRITICAL') {
      return (
        item.stockStatus === 'CRITICAL' ||
        item.stockStatus === 'OUT_OF_STOCK' ||
        item.stockStatus === 'LOW'
      );
    }
    return true;
  });

  // Summary Metrics
  const totalOpeningKg = ledgerItems.reduce((s, i) => s + i.openingStockKg, 0);
  const totalIncomingKg = ledgerItems.reduce((s, i) => s + i.incomingKg, 0);
  const totalRequiredKg = ledgerItems.reduce((s, i) => s + i.requiredDailyKg, 0);
  const totalIssuedKg = ledgerItems.reduce((s, i) => s + i.issuedKg, 0);
  const totalWasteKg = ledgerItems.reduce((s, i) => s + i.wasteKg, 0);
  const totalClosingKg = ledgerItems.reduce((s, i) => s + i.closingStockKg, 0);
  const totalCostToday = ledgerItems.reduce((s, i) => s + i.totalCostToday, 0);
  const criticalCount = ledgerItems.filter((i) => i.stockStatus === 'CRITICAL' || i.stockStatus === 'OUT_OF_STOCK').length;

  const todayTransactions = dailyPlan.warehouseTransactions || [];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="إذن صرف وتقرير دفتر أستاذ المخزن اليومي للخامات العلفية"
        documentSubtitle="متابعة الرصيد السابق + الوارد الجديد - المنصرف اليومي - الهالك = الرصيد المتبقي المرحل"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Header & Top Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-900 text-emerald-100 rounded-2xl shadow-xs">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>إدارة وحسابات أرصدة المخزن المرحّلة</span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {dailyPlan.date}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                نظام دفتر أستاذ متكامل: الأرصدة والواردات تترحل تلقائياً بين الأيام مع احتساب كفاية المخزون
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReceiptMaterialId(rawMaterials[0]?.id || '');
                setIsReceiptModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>إذن توريد وارد جديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdjustMaterialId(rawMaterials[0]?.id || '');
                setIsAdjustModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Scale className="w-4 h-4 text-slate-600" />
              <span>هالك / تسوية جردية</span>
            </button>

            <button
              type="button"
              onClick={handleSyncMasterStock}
              className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              title="تثبيت الأرصدة في قاعدة البيانات"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>حفظ واعتماد الأرصدة</span>
            </button>

            <button
              type="button"
              onClick={onPrint || (() => window.print())}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
              title="طباعة إذن الصرف وتقرير المخزن"
            >
              <Printer className="w-4 h-4" />
            </button>

            <ExportExcelButton
              onExport={() =>
                exportWarehouseToExcel(
                  dailyPlan,
                  rawMaterials,
                  categories,
                  rations,
                  barns
                )
              }
              label="تصدير المخزن للإكسيل"
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'LEDGER'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>دفتر حسابات المخزن اليومي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'TRANSACTIONS'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>أذونات التوريد وحركات اليوم</span>
            {todayTransactions.length > 0 && (
              <span className="bg-amber-400 text-emerald-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {todayTransactions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
        {/* Total Opening */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500">الرصيد السابق (المرحّل)</span>
          <div className="text-lg font-black text-slate-900">
            {(totalOpeningKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">طن</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block truncate">
            {totalOpeningKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Total Incoming */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <PackagePlus className="w-3 h-3 text-emerald-600" />
            <span>الوارد اليومي الجديد</span>
          </span>
          <div className="text-lg font-black text-emerald-900">
            {(totalIncomingKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-emerald-700">طن</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block truncate">
            +{totalIncomingKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Total Demand / Issued */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-blue-600" />
            <span>المنصرف للمكسر</span>
          </span>
          <div className="text-lg font-black text-blue-950">
            {(totalIssuedKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-blue-700">طن</span>
          </div>
          <span className="text-[10px] text-blue-700 font-semibold block truncate">
            المطلوب: {totalRequiredKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Spoilage / Waste */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-500" />
            <span>الهالك والفاقد</span>
          </span>
          <div className="text-lg font-black text-rose-900">
            {totalWasteKg > 0 ? (totalWasteKg / 1000).toFixed(2) : '0.00'}{' '}
            <span className="text-xs font-normal text-slate-500">طن</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            {totalWasteKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Total Ending Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-700">الرصيد المتبقي بالمخزن</span>
          <div className="text-lg font-black text-slate-900">
            {(totalClosingKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-500">طن</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block truncate">
            {totalClosingKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Critical Alerts / Cost */}
        <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
          criticalCount > 0
            ? 'bg-rose-50 border-rose-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            {criticalCount > 0 && <AlertTriangle className="w-3 h-3 text-rose-600" />}
            <span>حالة المخزون</span>
          </span>
          <div className={`text-lg font-black ${criticalCount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
            {criticalCount > 0 ? `${criticalCount} خامات حرجة` : 'مستقر وآمن'}
          </div>
          <span className="text-[10px] text-slate-600 font-semibold block truncate">
            تكلفة اليوم: {totalCostToday.toLocaleString()} {settings?.currency || 'ج.م'}
          </span>
        </div>
      </div>

      {/* Stock Shortage Warning Banner if any material is low or insufficient */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-2xs space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>تنبيه عاجل: نقص ونفاد في أرصدة خامات المخزن ({lowStockAlerts.length} خامة تحت حد الأمان)</span>
            </div>
            <button
              type="button"
              onClick={() => setFilterMode('CRITICAL')}
              className="text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1 rounded-xl transition-colors"
            >
              عرض الخامات الحرجة فقط
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockAlerts.map((alert, idx) => (
              <div
                key={`alert-${alert.rawMaterialId || 'rm'}-${idx}`}
                className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span>{alert.name}</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                      {alert.currentStockKg < alert.dailyRequiredKg
                        ? `عجز ${(alert.dailyRequiredKg - alert.currentStockKg).toLocaleString()} كجم اليوم`
                        : alert.currentStockKg <= alert.minStockKg
                        ? 'تحت حد الأمان'
                        : 'مخزون حرج'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    الرصيد: <strong className="text-slate-800">{alert.currentStockKg.toLocaleString()} كجم</strong> | المطلوب اليوم: <strong className="text-slate-800">{alert.dailyRequiredKg.toLocaleString()} كجم</strong>
                  </div>
                </div>
                <div className="text-left">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                    alert.daysRemaining <= 0
                      ? 'bg-rose-600 text-white'
                      : alert.daysRemaining <= 1
                      ? 'bg-rose-500 text-white'
                      : alert.daysRemaining <= 2.5
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {alert.daysRemaining <= 0 ? 'نفد تماماً' : `يكفي ${alert.daysRemaining} يوم`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'LEDGER' ? (
        /* Main Ledger Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                جميع خامات المخزن ({ledgerItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ACTIVE_TODAY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filterMode === 'ACTIVE_TODAY'
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                المطلوبة بالخلطات اليوم ({ledgerItems.filter((i) => i.requiredDailyKg > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                  filterMode === 'CRITICAL'
                    ? 'bg-rose-900 text-white border-rose-950 shadow-xs'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>حرجة وتحت حد الأمان ({criticalCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم أو كود الخامة..."
                className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">الخامة العلفية</th>
                  <th className="py-3 px-2 text-center">الرصيد السابق (كجم)</th>
                  <th className="py-3 px-2 text-center bg-emerald-50/50 text-emerald-950">الوارد اليومي (كجم)</th>
                  <th className="py-3 px-2 text-center bg-slate-50">إجمالي المتاح (كجم)</th>
                  <th className="py-3 px-2 text-center">المطلوب للخلطات</th>
                  <th className="py-3 px-2 text-center bg-blue-50/50 text-blue-950">المنصرف الفعلي (كجم)</th>
                  <th className="py-3 px-2 text-center">الهالك (كجم)</th>
                  <th className="py-3 px-3 text-center bg-slate-100 font-black">الرصيد المتبقي</th>
                  <th className="py-3 px-2 text-center">كفاية المخزون</th>
                  <th className="py-3 px-2 text-center print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 font-semibold">
                      لا توجد خامات مطابقة لشروط البحث والتصفية.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item, idx) => {
                    return (
                      <tr key={`ledger-${item.rawMaterialId || 'rm'}-${idx}`} className="hover:bg-slate-50/90 transition-colors">
                        {/* Raw Material Info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                <span>{item.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {item.code}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {item.pricePerKg ? `${item.pricePerKg} ${settings.currency}/كجم` : '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Opening Stock (Editable / Rolled) */}
                        <td className="py-2 px-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={item.openingStockKg || ''}
                              onChange={(e) =>
                                handleOpeningStockChange(item.rawMaterialId, e.target.value === '' ? 0 : parseFloat(e.target.value))
                              }
                              className={`w-24 px-2 py-1 bg-white border rounded-lg text-xs font-black text-center focus:outline-emerald-600 shadow-2xs ${
                                item.isOpeningOverridden
                                  ? 'border-amber-400 bg-amber-50/40 text-amber-900'
                                  : 'border-slate-300 text-slate-800'
                              }`}
                              title={item.isOpeningOverridden ? 'تم تعديل الرصيد يدوياً' : 'مرحّل تلقائياً من اليوم السابق'}
                            />
                            {item.isOpeningOverridden && (
                              <button
                                type="button"
                                onClick={() => handleResetOpeningToCarried(item.rawMaterialId)}
                                className="p-1 text-slate-400 hover:text-emerald-700 rounded-md"
                                title="استعادة الرصيد المرحل التلقائي"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Incoming Stock (Editable) */}
                        <td className="py-2 px-2 text-center bg-emerald-50/20">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={item.incomingKg || ''}
                              placeholder="0"
                              onChange={(e) =>
                                handleIncomingChange(item.rawMaterialId, e.target.value === '' ? 0 : parseFloat(e.target.value))
                              }
                              className="w-24 px-2 py-1 bg-white border border-emerald-400 rounded-lg text-xs font-black text-center text-emerald-950 focus:outline-emerald-600 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptMaterialId(item.rawMaterialId);
                                setIsReceiptModalOpen(true);
                              }}
                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md print:hidden cursor-pointer"
                              title="تسجيل إذن توريد مفصل"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Total Available */}
                        <td className="py-2 px-2 text-center bg-slate-50 font-bold text-slate-800 text-xs">
                          {item.availableKg.toLocaleString()}
                        </td>

                        {/* Required Daily (From Mixers) */}
                        <td className="py-2 px-2 text-center font-bold text-slate-700">
                          {item.requiredDailyKg.toLocaleString()}
                        </td>

                        {/* Issued Weight (Editable) */}
                        <td className="py-2 px-2 text-center bg-blue-50/20">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={item.issuedKg || ''}
                              placeholder="0"
                              onChange={(e) =>
                                handleIssuedChange(item.rawMaterialId, e.target.value === '' ? 0 : parseFloat(e.target.value))
                              }
                              className={`w-24 px-2 py-1 bg-white border rounded-lg text-xs font-black text-center focus:outline-blue-600 shadow-2xs ${
                                item.isIssuedOverridden
                                  ? 'border-blue-500 bg-blue-50/40 text-blue-950'
                                  : 'border-slate-300 text-slate-800'
                              }`}
                            />
                            {item.isIssuedOverridden && (
                              <button
                                type="button"
                                onClick={() => handleResetIssuedToCalculated(item.rawMaterialId)}
                                className="p-1 text-slate-400 hover:text-blue-700 rounded-md"
                                title="استعادة المنصرف المحسوب تلقائياً"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Waste / Spoilage */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="any"
                            value={item.wasteKg || ''}
                            placeholder="0"
                            onChange={(e) =>
                              handleWasteChange(item.rawMaterialId, e.target.value === '' ? 0 : parseFloat(e.target.value))
                            }
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-center text-rose-800 focus:outline-rose-600"
                          />
                        </td>

                        {/* Remaining Closing Stock */}
                        <td className="py-2 px-3 text-center bg-slate-100 font-black text-slate-900 text-sm">
                          <span
                            className={
                              item.closingStockKg <= 0 && item.requiredDailyKg > 0
                                ? 'text-rose-600'
                                : 'text-slate-900'
                            }
                          >
                            {item.closingStockKg.toLocaleString()}
                          </span>
                        </td>

                        {/* Stock Coverage / Days Remaining */}
                        <td className="py-2 px-2 text-center">
                          {item.requiredDailyKg > 0 ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                item.stockStatus === 'OUT_OF_STOCK'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : item.stockStatus === 'CRITICAL'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.stockStatus === 'LOW'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {item.daysRemaining >= 999
                                ? 'وفير جداً'
                                : `${item.daysRemaining} يوم`}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              لا استهلاك اليوم
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => setHistoryMaterialId(item.rawMaterialId)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 text-xs font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            title="عرض كشف حركة الخامة عبر الأيام"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>الحركة</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-3 text-slate-900">إجمالي كميات المخزن:</td>
                  <td className="py-3 px-2 text-center">{totalOpeningKg.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center text-emerald-900">+{totalIncomingKg.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center">{(totalOpeningKg + totalIncomingKg).toLocaleString()}</td>
                  <td className="py-3 px-2 text-center">{totalRequiredKg.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center text-blue-900">{totalIssuedKg.toLocaleString()}</td>
                  <td className="py-3 px-2 text-center text-rose-800">{totalWasteKg.toLocaleString()}</td>
                  <td className="py-3 px-3 text-center text-emerald-950 text-sm">{totalClosingKg.toLocaleString()} كجم</td>
                  <td colSpan={2} className="py-3 px-2 text-center text-slate-600">
                    التكلفة: {totalCostToday.toLocaleString()} {settings?.currency || 'ج.م'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Transactions & Goods Receipts Log Tab */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">سجل أذونات التوريد والحركات المسجلة ليوم ({dailyPlan.date})</h3>
              <p className="text-xs text-slate-500 mt-0.5">يمكنك مراجعة كافة شحنات التوريد الواردة للمخزن وإدارتها</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReceiptMaterialId(rawMaterials[0]?.id || '');
                setIsReceiptModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إذن توريد</span>
            </button>
          </div>

          {todayTransactions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <Truck className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">لم يتم تسجيل أذونات توريد واردة لهذا اليوم حتى الآن</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك الضغط على زر "إذن توريد وارد جديد" لتسجيل توريدات الأعلاف والخامات واستلامها فوراً.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">الخامة</th>
                    <th className="py-3 px-3 text-center">نوع الحركة</th>
                    <th className="py-3 px-3 text-center">الكمية المستلمة (كجم)</th>
                    <th className="py-3 px-3 text-center">الكمية (بالطن)</th>
                    <th className="py-3 px-3">المورد / الشركة</th>
                    <th className="py-3 px-3">رقم البوليصة / الفاتورة</th>
                    <th className="py-3 px-3">رقم السيارة / السائق</th>
                    <th className="py-3 px-3">الوقت والملاحظات</th>
                    <th className="py-3 px-3 text-center print:hidden">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayTransactions.map((tx) => {
                    const mat = rawMaterials.find((rm) => rm.id === tx.rawMaterialId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-black text-slate-900 text-sm">
                          {mat?.name || 'خامة غير معروفة'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            {tx.type === 'INCOMING' ? 'توريد وارد' : tx.type === 'WASTE' ? 'هالك' : 'تسوية'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-black text-emerald-900 text-sm">
                          +{tx.quantityKg.toLocaleString()} كجم
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {(tx.quantityKg / 1000).toFixed(2)} طن
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {tx.supplierName || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {tx.invoiceNumber || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {tx.vehicleNumber || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          <div className="text-[11px]">{tx.createdAt && <span className="font-bold">{tx.createdAt} - </span>}{tx.notes || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الحركة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Printable Signatures */}
      <PrintSignatures
        settings={settings}
        signatures={[
          { title: 'أمين المخزن والمستودع', name: settings?.warehouseManagerName || 'أمين المخزن' },
          { title: 'مهندس التغذية والتشغيل', name: settings?.engineerName || 'مهندس التغذية' },
          { title: 'المدير المالي والإداري' },
        ]}
      />

      {/* MODAL 1: Goods Receipt (إذن توريد وارد جديد) */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">تسجيل إذن توريد خامات واردة جديدة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              {/* Material Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخامة العلفية المستلمة:</label>
                <select
                  value={receiptMaterialId}
                  onChange={(e) => setReceiptMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {rawMaterials.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} ({rm.code}) — الرصيد الحالي: {rm.currentStockKg?.toLocaleString() || 0} كجم
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية المستلمة:</label>
                  <input
                    type="number"
                    step="any"
                    value={receiptQuantity}
                    onChange={(e) => setReceiptQuantity(e.target.value)}
                    placeholder="مثلاً 25"
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوحدة:</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setReceiptUnit('TON')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        receiptUnit === 'TON'
                          ? 'bg-white text-emerald-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      طن
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptUnit('KG')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        receiptUnit === 'KG'
                          ? 'bg-white text-emerald-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      كجم
                    </button>
                  </div>
                </div>
              </div>

              {/* Supplier & Invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد / الشركة:</label>
                  <input
                    type="text"
                    value={receiptSupplier}
                    onChange={(e) => setReceiptSupplier(e.target.value)}
                    placeholder="مثلاً شركة الوادي للأعلاف"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البوليصة / الفاتورة:</label>
                  <input
                    type="text"
                    value={receiptInvoice}
                    onChange={(e) => setReceiptInvoice(e.target.value)}
                    placeholder="مثلاً بوليصة #4892"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Vehicle & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم السيارة / السائق (اختياري):</label>
                <input
                  type="text"
                  value={receiptVehicle}
                  onChange={(e) => setReceiptVehicle(e.target.value)}
                  placeholder="مثلاً سيارة نقل أ ب ج 123"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الاستلام والفحص الجودوي:</label>
                <textarea
                  rows={2}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="مثلاً تم فحص الرطوبة مطابقة للمواصفات..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وتوريد للمخزن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Waste & Physical Audit (هالك / تسوية جردية) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">تسجيل هالك أو تسوية جردية</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخامة العلفية:</label>
                <select
                  value={adjustMaterialId}
                  onChange={(e) => setAdjustMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {rawMaterials.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} ({rm.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة:</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdjustType('WASTE')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      adjustType === 'WASTE'
                        ? 'bg-white text-rose-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    هالك / فاقد (خصم)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('PHYSICAL_AUDIT')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      adjustType === 'PHYSICAL_AUDIT'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    تسوية جرد فعلي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustType === 'WASTE'
                    ? 'كمية الهالك بالكيلوجرام (كجم):'
                    : 'الرصيد الفعلي بعد الجرد بالكيلوجرام (كجم):'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="مثلاً 500"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السبب / الملاحظات:</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="مثلاً فاقد سلاج طبيعي، تطاير دريس..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  حفظ التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Material Movement Card / History Timeline (كشف حركة الخامة) */}
      {historyMaterialId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-right">
            {(() => {
              const mat = rawMaterials.find((r) => r.id === historyMaterialId);
              const currentItem = ledgerItems.find((l) => l.rawMaterialId === historyMaterialId);

              // Gather plan dates
              const allDates = Array.from(new Set([...Object.keys(allPlans), dailyPlan.date])).sort();

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          كشف حركة خام: {mat?.name} ({mat?.code})
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          الرصيد المتبقي ليوم ({dailyPlan.date}): {currentItem?.closingStockKg.toLocaleString()} كجم
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryMaterialId(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">التاريخ</th>
                            <th className="py-2.5 px-2 text-center">الرصيد السابق</th>
                            <th className="py-2.5 px-2 text-center text-emerald-800">الوارد</th>
                            <th className="py-2.5 px-2 text-center text-blue-800">المنصرف</th>
                            <th className="py-2.5 px-2 text-center text-rose-800">الهالك</th>
                            <th className="py-2.5 px-3 text-center font-black">الرصيد المتبقي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allDates.map((dateStr) => {
                            const dateLedger = calculateChronologicalWarehouseLedger(
                              dateStr,
                              rawMaterials,
                              categories,
                              rations,
                              barns,
                              allPlans,
                              dateStr === dailyPlan.date ? dailyPlan : undefined
                            );
                            const itemOnDate = dateLedger.find((l) => l.rawMaterialId === historyMaterialId);
                            if (!itemOnDate) return null;

                            const isSelectedDate = dateStr === dailyPlan.date;

                            return (
                              <tr
                                key={dateStr}
                                className={`transition-colors ${
                                  isSelectedDate ? 'bg-emerald-50/80 font-bold text-emerald-950' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-2 px-3 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{dateStr}</span>
                                  {isSelectedDate && (
                                    <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.2 rounded">
                                      اليوم المحدد
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">{itemOnDate.openingStockKg.toLocaleString()}</td>
                                <td className="py-2 px-2 text-center text-emerald-800 font-bold">
                                  {itemOnDate.incomingKg > 0 ? `+${itemOnDate.incomingKg.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-2 px-2 text-center text-blue-800 font-bold">
                                  {itemOnDate.issuedKg > 0 ? `-${itemOnDate.issuedKg.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-2 px-2 text-center text-rose-800">
                                  {itemOnDate.wasteKg > 0 ? `-${itemOnDate.wasteKg.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-2 px-3 text-center font-black text-slate-900">
                                  {itemOnDate.closingStockKg.toLocaleString()} كجم
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setHistoryMaterialId(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
