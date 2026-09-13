import React, { useState, useMemo } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  RawMaterial,
  FarmSettings,
} from '../../types';
import {
  loadDailyPlan,
  saveDailyPlan,
  getAllPlanDates,
} from '../../services/storage';
import {
  calculateBarnDailyDemand,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateBatchAllocatedKg,
  getBarnDailyState,
  calculateMilkMetrics,
  calculateDailyWarehouseRequirements,
} from '../../utils/calculations';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportDailyPlanToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import {
  History,
  Calendar,
  Copy,
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  Milk,
  Boxes,
  Activity,
  ChevronLeft,
  FileSpreadsheet,
  Wheat,
  Scale,
  Sparkles,
} from 'lucide-react';

interface DailyLogViewProps {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials?: RawMaterial[];
  settings?: FarmSettings;
  onNavigateTab?: (tab: string) => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  currentDate,
  setCurrentDate,
  categories,
  barns,
  mixers,
  rations,
  rawMaterials = [],
  settings,
  onNavigateTab,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const planDates = useMemo(() => getAllPlanDates(), [currentDate]);
  const [inspectDate, setInspectDate] = useState<string>(currentDate);
  const [activeSubTab, setActiveSubTab] = useState<'batches' | 'barns' | 'milk' | 'warehouse'>('batches');
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);

  // Load the inspected plan with deep fallback
  const inspectedPlan = useMemo(() => loadDailyPlan(inspectDate), [inspectDate]);
  const activeBarns = barns.filter((b) => b.status === 'نشط');

  // Barn calculations for inspected date
  const totalInspectedHeads = activeBarns.reduce((sum, b) => {
    const s = getBarnDailyState(b, inspectedPlan);
    return sum + (s.headCount || 0);
  }, 0);

  const totalInspectedDemandKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnDailyDemand(b, categories, rations, inspectedPlan);
  }, 0);

  const totalInspectedRefusalKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnRefusalKg(b, categories, rations, inspectedPlan);
  }, 0);

  const totalInspectedActualIntakeKg = activeBarns.reduce((sum, b) => {
    return sum + calculateBarnActualIntakeKg(b, categories, rations, inspectedPlan);
  }, 0);

  const inspectedRefusalPercent = totalInspectedDemandKg > 0
    ? Math.round(((totalInspectedRefusalKg / totalInspectedDemandKg) * 100) * 10) / 10
    : 0;

  // Batches for inspected date
  const batches = inspectedPlan.batches || [];
  const totalInspectedBatchWeightKg = batches.reduce((s, b) => s + (b.targetWeightKg || 0), 0);
  const totalInspectedAllocatedKg = batches.reduce((s, b) => s + calculateBatchAllocatedKg(b), 0);

  // Milk metrics for inspected date
  const milkMetrics = calculateMilkMetrics(
    inspectedPlan.milkProduction,
    barns,
    categories,
    rations,
    inspectedPlan,
    rawMaterials
  );

  // Warehouse requirements
  const warehouseReqs = calculateDailyWarehouseRequirements(
    inspectedPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  // Copy full plan handler
  const handleCopyPlanToToday = () => {
    if (inspectDate === currentDate) {
      showToast('أنت بالفعل تعرض خطة اليوم الحالي.', 'info');
      return;
    }

    showConfirm({
      title: 'نسخ خطة العمل',
      message: `هل أنت متأكد من نسخ كامل تفاصيل خطة يوم (${inspectDate}) بما فيها اللفات والعنابر وتوزيعاتها إلى اليوم الحالي (${currentDate})؟`,
      confirmText: 'نسخ واعتماد',
      onConfirm: () => {
        const clonedBatches = (inspectedPlan.batches || []).map((b) => ({
          ...b,
          id: generateId('batch'),
          status: 'مخططة' as const,
        }));

        const newTodayPlan: DailyOperationPlan = {
          date: currentDate,
          batches: clonedBatches,
          dailyBarnStates: inspectedPlan.dailyBarnStates ? JSON.parse(JSON.stringify(inspectedPlan.dailyBarnStates)) : undefined,
          fatteningAdgKg: inspectedPlan.fatteningAdgKg,
          notes: `تم نسخ الخطة من أرشيف تاريخ ${inspectDate} في ${new Date().toLocaleTimeString('ar-EG')}`,
          isClosed: false,
        };

        saveDailyPlan(newTodayPlan);
        showToast(`تم نسخ خطة يوم (${inspectDate}) بنجاح إلى اليوم الحالي!`, 'success');
        setCopySuccessMsg(`تم نسخ خطة يوم (${inspectDate}) بنجاح إلى اليوم الحالي! يمكنك التبديل لشاشات الخطة اليومية لمتابعتها.`);
        setTimeout(() => setCopySuccessMsg(null), 5000);
        setCurrentDate(currentDate);
      },
    });
  };

  // Toggle day lock/archive
  const handleToggleDayLock = () => {
    const updatedPlan: DailyOperationPlan = {
      ...inspectedPlan,
      isClosed: !inspectedPlan.isClosed,
      closedAt: !inspectedPlan.isClosed ? new Date().toISOString() : undefined,
    };
    saveDailyPlan(updatedPlan);
    setInspectDate(inspectDate); // Trigger re-render
  };

  return (
    <div className="space-y-6">
      {/* Date Archives & Navigation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <History className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                أرشيف السجلات اليومية ومطابقة التغذية التاريخية
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              استعراض شامل ودقيق لأي يوم سابق: أوزان اللفات، راجع ومأكول العنابر، كفاءة وإنتاج الحليب، وصرفيات المخزن.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleDayLock}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                inspectedPlan.isClosed
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title={inspectedPlan.isClosed ? 'إلغاء قفل السجل للتعديل' : 'إغلاق وقفل هذا اليوم في الأرشيف'}
            >
              {inspectedPlan.isClosed ? (
                <>
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>السجل مغلق ومرحل</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-slate-600" />
                  <span>قفل وترحيل السجل</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyPlanToToday}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ خطة ({inspectDate}) إلى اليوم الحالي</span>
            </button>

            <ExportExcelButton
              onExport={() =>
                exportDailyPlanToExcel(
                  inspectedPlan,
                  categories,
                  mixers,
                  rations,
                  barns
                )
              }
              label={`تصدير خطة (${inspectDate}) للإكسيل`}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Date Selector and Fast Pills */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-700">
            اختر التاريخ المطلوب استعراضه من الأرشيف:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={inspectDate}
                onChange={(e) => e.target.value && setInspectDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 cursor-pointer shadow-2xs"
              />
            </div>

            <span className="text-xs text-slate-400 font-bold px-1">السجلات المحفوظة:</span>

            {planDates.map((dateStr) => {
              const isSelected = dateStr === inspectDate;
              const isToday = dateStr === currentDate;
              return (
                <button
                  key={dateStr}
                  onClick={() => setInspectDate(dateStr)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-600/30'
                      : isToday
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {dateStr} {isToday && '★ (اليوم)'}
                </button>
              );
            })}
          </div>
        </div>

        {copySuccessMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{copySuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Inspected Date Key Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            التاريخ المعروض
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">{inspectDate}</div>
          <span className={`inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-black ${
            inspectedPlan.isClosed ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
          }`}>
            {inspectedPlan.isClosed ? 'مؤرشف ومغلق' : 'سجل تشغيل مفتوح'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            اللفات المحضرة
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">{batches.length} لفات</div>
          <span className="text-[11px] text-slate-500 font-bold">
            {totalInspectedBatchWeightKg.toLocaleString()} كجم مستهدف
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            المقرر والعلف الموزع
          </span>
          <div className="text-lg font-black text-emerald-800 mt-1">
            {totalInspectedAllocatedKg.toLocaleString()} كجم
          </div>
          <span className="text-[11px] text-slate-500 font-bold">
            من مقرر {totalInspectedDemandKg.toLocaleString()} كجم
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            الراجع والمأكول الفعلي
          </span>
          <div className="text-lg font-black text-amber-900 mt-1">
            {inspectedRefusalPercent}%
          </div>
          <span className="text-[11px] text-amber-700 font-bold">
            الراجع: {totalInspectedRefusalKg.toLocaleString()} كجم | المأكول: {totalInspectedActualIntakeKg.toLocaleString()} كجم
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
            <Milk className="w-3.5 h-3.5 text-blue-600" />
            إنتاج الحليب المسجل
          </span>
          <div className="text-lg font-black text-blue-950 mt-1">
            {milkMetrics.totalMilkKg > 0 ? `${milkMetrics.totalMilkKg.toLocaleString()} كجم` : 'لم يُسجل'}
          </div>
          <span className="text-[11px] text-blue-700 font-bold">
            {milkMetrics.totalMilkKg > 0 ? `متوسط البقرة: ${milkMetrics.averageMilkPerHead} كجم` : `${totalInspectedHeads} رأس إجمالي`}
          </span>
        </div>
      </div>

      {/* Sub-Tabs for Deep Inspection */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveSubTab('batches')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'batches'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>لفات المكسر والتفريغ ({batches.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('barns')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'barns'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>سجل العنابر والراجع ({activeBarns.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('milk')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'milk'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Milk className="w-3.5 h-3.5" />
              <span>إنتاج ومؤشرات الحليب</span>
            </button>

            <button
              onClick={() => setActiveSubTab('warehouse')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'warehouse'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>صرفيات المخزن ({warehouseReqs.length})</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500">
            سجل يوم: <strong className="text-slate-900">{inspectDate}</strong>
          </div>
        </div>

        {/* Tab 1: Batches Details */}
        {activeSubTab === 'batches' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-700 font-black text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">رقم اللفة</th>
                    <th className="py-3 px-4">التوقيت</th>
                    <th className="py-3 px-4">الفئة الحيوانية</th>
                    <th className="py-3 px-4">المكسر</th>
                    <th className="py-3 px-4">الوزن المستهدف</th>
                    <th className="py-3 px-4">الموزع فعليًا</th>
                    <th className="py-3 px-4">العنابر المخصصة</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد لفات مجهزة لهذا التاريخ.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => {
                      const cat = categories.find((c) => c.id === b.categoryId);
                      const mixer = mixers.find((m) => m.id === b.mixerId);
                      const allocatedKg = calculateBatchAllocatedKg(b);
                      const allocCount = b.allocations?.length || 0;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-black text-emerald-900">{b.batchNumber}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{b.time}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{cat?.name}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">{mixer?.name}</td>
                          <td className="py-3.5 px-4 font-black text-slate-900">{b.targetWeightKg.toLocaleString()} كجم</td>
                          <td className="py-3.5 px-4 font-black text-emerald-900">{allocatedKg.toLocaleString()} كجم</td>
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-600">
                            {allocCount > 0 ? `${allocCount} عنابر` : 'غير مخصصة'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                              b.status === 'تم التوزيع'
                                ? 'bg-blue-100 text-blue-900'
                                : b.status === 'تم التحضير'
                                ? 'bg-emerald-100 text-emerald-900'
                                : b.status === 'قيد التحضير'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Barns Details */}
        {activeSubTab === 'barns' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-700 font-black text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">رقم واسم العنبر</th>
                    <th className="py-3 px-4">الفئة الحيوانية</th>
                    <th className="py-3 px-4">الرؤوس المسجلة</th>
                    <th className="py-3 px-4">المقرر اليومي</th>
                    <th className="py-3 px-4 text-center">راجع الطوالة</th>
                    <th className="py-3 px-4">المأكول الصافي</th>
                    <th className="py-3 px-4">عليقة العنبر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {activeBarns.map((barn) => {
                    const bState = getBarnDailyState(barn, inspectedPlan);
                    const cat = categories.find((c) => c.id === barn.categoryId);
                    const ration = rations.find((r) => r.id === (bState.rationId || barn.rationId || cat?.rationId));
                    const demandKg = calculateBarnDailyDemand(barn, categories, rations, inspectedPlan);
                    const refusalKg = calculateBarnRefusalKg(barn, categories, rations, inspectedPlan);
                    const actualIntakeKg = calculateBarnActualIntakeKg(barn, categories, rations, inspectedPlan);
                    const refusalPct = demandKg > 0 ? Math.round(((refusalKg / demandKg) * 100) * 10) / 10 : 0;

                    return (
                      <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {bState.displayNumber || barn.number} - {bState.displayName || barn.name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{cat?.name}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">{bState.headCount} رأس</td>
                        <td className="py-3.5 px-4 font-black text-emerald-900">{demandKg.toLocaleString()} كجم</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-black text-amber-900">
                            {refusalPct}% ({refusalKg.toLocaleString()} كجم)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-blue-950">{actualIntakeKg.toLocaleString()} كجم</td>
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-600">{ration?.name || 'غير محدد'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Milk Metrics */}
        {activeSubTab === 'milk' && (
          <div className="p-5 space-y-4">
            {milkMetrics.totalMilkKg > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                  <span className="text-xs font-bold text-blue-800">إجمالي إنتاج الحلبات</span>
                  <div className="text-2xl font-black text-blue-950 mt-1">{milkMetrics.totalMilkKg.toLocaleString()} كجم</div>
                  <div className="mt-2 space-y-1 text-xs text-blue-900 font-bold">
                    {(inspectedPlan.milkProduction?.sessions || []).map((s) => (
                      <div key={s.id} className="flex justify-between">
                        <span>{s.name}:</span>
                        <span>{s.amountKg.toLocaleString()} كجم</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800">كفاءة التحويل الغذائي (Feed Efficiency)</span>
                  <div className="text-2xl font-black text-emerald-950 mt-1">{milkMetrics.feedEfficiency}</div>
                  <span className="text-xs text-emerald-700 font-bold block mt-1">
                    كيلو لبن / كيلو مادة جافة DMI
                  </span>
                  <div className="mt-2 text-xs font-bold text-slate-600">
                    الحالة: <strong className="text-emerald-800">{milkMetrics.efficiencyStatus}</strong>
                  </div>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-800">المأكول وتكلفة التغذية</span>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {milkMetrics.actualFeedIntakeKg.toLocaleString()} كجم
                  </div>
                  <span className="text-xs text-amber-800 font-bold block mt-1">
                    المأكول الفعلي لقطيع الحلاب ({milkMetrics.milkingHeadCount} رأس)
                  </span>
                  <div className="mt-2 text-xs font-bold text-slate-600">
                    الراجع العام للحلاب: <strong className="text-amber-900">{milkMetrics.refusalPercent}%</strong> ({milkMetrics.refusalKg.toLocaleString()} كجم)
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 font-bold">
                <Milk className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>لم يتم تسجيل كميات حليب لهذا التاريخ في السجل اليومي.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Warehouse Items */}
        {activeSubTab === 'warehouse' && (
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-700 font-black text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">كود الخامة</th>
                    <th className="py-3 px-4">اسم الخامة العلفية</th>
                    <th className="py-3 px-4">الاحتياج اليومي المطلوب</th>
                    <th className="py-3 px-4">الوزن بالطن</th>
                    <th className="py-3 px-4">المادة الجافة %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {warehouseReqs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد متطلبات مخزن مسجلة لهذا التاريخ.
                      </td>
                    </tr>
                  ) : (
                    warehouseReqs.map((item, index) => {
                      const rawMat = rawMaterials.find((r) => r.id === item.rawMaterialId);
                      return (
                        <tr key={`${item.rawMaterialId || 'rm'}-${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{item.code}</td>
                          <td className="py-3.5 px-4 font-black text-slate-900">{item.name}</td>
                          <td className="py-3.5 px-4 font-black text-emerald-900">{item.totalRequiredKgToday.toLocaleString()} كجم</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{(item.totalRequiredKgToday / 1000).toFixed(2)} طن</td>
                          <td className="py-3.5 px-4 font-bold text-slate-600">{rawMat?.dryMatterPercent || 90}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Notes & Audit Info */}
      {inspectedPlan.notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-700 flex items-start gap-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-slate-900">ملاحظات مسجلة على سجل هذا اليوم:</span>
            <p className="text-slate-600 mt-0.5">{inspectedPlan.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

