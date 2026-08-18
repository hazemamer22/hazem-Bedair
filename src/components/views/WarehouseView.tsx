import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  FarmSettings,
  Barn,
} from '../../types';
import { calculateDailyWarehouseRequirements } from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
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
} from 'lucide-react';

interface WarehouseViewProps {
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  setRawMaterials?: (materials: RawMaterial[]) => void;
  settings: FarmSettings;
  barns?: Barn[];
  onPrint?: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  dailyPlan,
  categories,
  rations,
  rawMaterials,
  setRawMaterials,
  settings,
  barns = [],
  onPrint,
}) => {
  const requirementItems = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  // Editable previous stock state (الرصيد السابق بالمخزن) - initialized from rawMaterials or defaults
  const [openingStock, setOpeningStock] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    rawMaterials.forEach((rm) => {
      initial[rm.id] = rm.currentStockKg ?? 0;
    });
    return initial;
  });

  // State for new incoming stock (وارد جديد / توريد)
  const [incomingStock, setIncomingStock] = useState<Record<string, number>>({});

  // State for actual issued weight (المنصرف الفعلي لليوم - افتراضياً يساوي المطلوب)
  const [issuedWeights, setIssuedWeights] = useState<Record<string, number>>({});

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Handlers for inline cell changes
  const handleOpeningStockChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    setOpeningStock((prev) => ({ ...prev, [rawMaterialId]: safeVal }));
  };

  const handleIncomingChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    setIncomingStock((prev) => ({ ...prev, [rawMaterialId]: safeVal }));
  };

  const handleIssuedChange = (rawMaterialId: string, valKg: number) => {
    const safeVal = Math.max(0, isNaN(valKg) ? 0 : valKg);
    setIssuedWeights((prev) => ({ ...prev, [rawMaterialId]: safeVal }));
  };

  // Save changes to rawMaterials persistent state
  const handleSaveAll = () => {
    if (setRawMaterials) {
      const updatedMaterials = rawMaterials.map((rm) => {
        const opening = openingStock[rm.id] ?? rm.currentStockKg ?? 0;
        const incoming = incomingStock[rm.id] ?? 0;
        const reqItem = requirementItems.find((i) => i.rawMaterialId === rm.id);
        const issued = issuedWeights[rm.id] ?? reqItem?.totalRequiredKgToday ?? 0;

        // New persistent stock = (Opening + Incoming) - Issued
        const finalRemaining = Math.max(0, opening + incoming - issued);

        return {
          ...rm,
          currentStockKg: finalRemaining,
        };
      });

      setRawMaterials(updatedMaterials);
    }

    setSaveSuccessMsg('تم حفظ وتحديث أرصدة وحسابات المخزن بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Summary Computations
  const totalOpeningStockKg = requirementItems.reduce((sum, i) => {
    return sum + (openingStock[i.rawMaterialId] ?? 0);
  }, 0);

  const totalIncomingKg = requirementItems.reduce((sum, i) => {
    return sum + (incomingStock[i.rawMaterialId] ?? 0);
  }, 0);

  const totalAvailableKg = totalOpeningStockKg + totalIncomingKg;

  const totalRequiredDailyKg = requirementItems.reduce((sum, i) => sum + i.totalRequiredKgToday, 0);

  const totalIssuedKg = requirementItems.reduce((sum, i) => {
    return sum + (issuedWeights[i.rawMaterialId] ?? i.totalRequiredKgToday);
  }, 0);

  const totalRemainingKg = totalAvailableKg - totalIssuedKg;

  const totalCost = requirementItems.reduce((sum, i) => sum + i.totalCostToday, 0);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="إذن سحب وحسابات أرصدة المخزن اليومي للخامات"
        documentSubtitle="بيان الرصيد السابق + الوارد الجديد - المنصرف اليومي = الرصيد المتبقي"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls & Overview Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                إذن صرف ومتابعة أرصدة المخزن
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                (الرصيد السابق + وارد جديد) = إجمالي المتاح - المنصرف اليومي = صافي الرصيد المتبقي
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-200" />
              <span>حفظ الأرصدة والمنصرف</span>
            </button>
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة كشف المخزن</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 5 Clear Step Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Opening Stock */}
          <div className="bg-slate-50 border border-slate-200/90 p-3.5 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 block">1. الرصيد السابق بالمخزن</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 mt-1 block">
              {totalOpeningStockKg.toLocaleString()} <span className="text-xs font-bold text-slate-400">كجم</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              ≈ {(totalOpeningStockKg / 1000).toFixed(1)} طن
            </span>
          </div>

          {/* 2. Incoming Stock */}
          <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl">
            <span className="text-[11px] font-bold text-blue-700 block">2. + وارد جديد (توريدات)</span>
            <span className="text-lg sm:text-xl font-black text-blue-950 mt-1 block">
              +{totalIncomingKg.toLocaleString()} <span className="text-xs font-bold text-blue-500">كجم</span>
            </span>
            <span className="text-[10px] font-semibold text-blue-600">
              يضاف مباشرة للمخزون
            </span>
          </div>

          {/* 3. Total Available */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-2xl">
            <span className="text-[11px] font-bold text-indigo-700 block">3. = إجمالي المتاح</span>
            <span className="text-lg sm:text-xl font-black text-indigo-950 mt-1 block">
              {totalAvailableKg.toLocaleString()} <span className="text-xs font-bold text-indigo-500">كجم</span>
            </span>
            <span className="text-[10px] font-semibold text-indigo-600">
              قبل خصم الخلطات
            </span>
          </div>

          {/* 4. Issued Daily Demand */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
            <span className="text-[11px] font-bold text-amber-800 block">4. - المنصرف اليومي</span>
            <span className="text-lg sm:text-xl font-black text-amber-950 mt-1 block">
              {totalIssuedKg.toLocaleString()} <span className="text-xs font-bold text-amber-600">كجم</span>
            </span>
            <span className="text-[10px] font-semibold text-amber-700">
              مطلوب: {totalRequiredDailyKg.toLocaleString()} كجم
            </span>
          </div>

          {/* 5. Net Remaining */}
          <div className={`p-3.5 rounded-2xl border col-span-2 sm:col-span-1 ${
            totalRemainingKg >= 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <span className="text-[11px] font-bold block opacity-80">5. = الرصيد المتبقي بالمخزن</span>
            <span className="text-lg sm:text-xl font-black mt-1 block">
              {totalRemainingKg.toLocaleString()} <span className="text-xs font-bold">كجم</span>
            </span>
            <span className="text-[10px] font-bold">
              {totalRemainingKg >= 0 ? '✓ المخزون آمن وكافي' : '🛑 يوجد عجز بالخامات'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Calculation Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <span>جدول حركة وأرصدة الخامات العلفية اليومية</span>
          </h4>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            {requirementItems.length} خامة علفية
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-700 font-black text-xs border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 border-l border-slate-200 text-center w-12">م</th>
                <th className="py-3.5 px-4 border-l border-slate-200 min-w-[160px]">اسم الخامة العلفية</th>
                
                {/* 1. Opening Stock */}
                <th className="py-3.5 px-3 border-l border-slate-200 bg-slate-200/70 text-slate-900 text-center min-w-[120px]">
                  1. الرصيد السابق (كجم)
                </th>

                {/* 2. Incoming Stock */}
                <th className="py-3.5 px-3 border-l border-slate-200 bg-blue-100/70 text-blue-950 text-center min-w-[120px]">
                  2. + وارد جديد (كجم)
                </th>

                {/* 3. Available Stock */}
                <th className="py-3.5 px-3 border-l border-slate-200 bg-indigo-100/70 text-indigo-950 text-center min-w-[110px]">
                  3. = إجمالي المتاح (كجم)
                </th>

                {/* 4. Issued Weight */}
                <th className="py-3.5 px-3 border-l border-slate-200 bg-amber-100/70 text-amber-950 text-center min-w-[120px]">
                  4. - المنصرف اليوم (كجم)
                </th>

                {/* 5. Remaining Balance */}
                <th className="py-3.5 px-3 border-l border-slate-200 bg-emerald-100 text-emerald-950 text-center min-w-[130px] font-black">
                  5. = المتبقي بالمخزن (كجم)
                </th>

                {/* 6. Status */}
                <th className="py-3.5 px-3 text-center min-w-[100px]">حالة الرصيد</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {requirementItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    لا توجد خامات مطلوبة اليوم. يرجى إضافة لفات مكسر بخطة التشغيل اليومية.
                  </td>
                </tr>
              ) : (
                requirementItems.map((item, idx) => {
                  const rawMat = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
                  const opening = openingStock[item.rawMaterialId] ?? rawMat?.currentStockKg ?? 0;
                  const incoming = incomingStock[item.rawMaterialId] ?? 0;
                  const available = opening + incoming;
                  const issued = issuedWeights[item.rawMaterialId] ?? item.totalRequiredKgToday;
                  const remaining = available - issued;

                  const isShortage = remaining < 0;
                  const isWarning = remaining >= 0 && rawMat?.minStockKg && remaining <= rawMat.minStockKg;

                  return (
                    <tr key={item.rawMaterialId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400 border-l border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Name & Code */}
                      <td className="py-3 px-4 font-black text-slate-900 border-l border-slate-200">
                        <div className="text-sm font-black text-slate-900">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 font-bold">{item.code}</div>
                      </td>

                      {/* 1. Previous Opening Stock Input */}
                      <td className="py-3 px-3 text-center bg-slate-50/50 border-l border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={opening === 0 ? '' : opening}
                          onChange={(e) => handleOpeningStockChange(item.rawMaterialId, Number(e.target.value))}
                          placeholder="0"
                          className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-center text-xs focus:ring-2 focus:ring-slate-400 focus:outline-none"
                          title="تعديل الرصيد السابق بالمخزن"
                        />
                      </td>

                      {/* 2. New Incoming Stock Input */}
                      <td className="py-3 px-3 text-center bg-blue-50/30 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-bold text-blue-600">+</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={incoming === 0 ? '' : incoming}
                            onChange={(e) => handleIncomingChange(item.rawMaterialId, Number(e.target.value))}
                            placeholder="0"
                            className="w-24 px-2 py-1.5 bg-white border border-blue-300 rounded-xl font-black text-blue-950 text-center text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            title="أدخل كمية التوريد الواردة الجديدة"
                          />
                        </div>
                      </td>

                      {/* 3. Total Available (Computed) */}
                      <td className="py-3 px-3 text-center font-extrabold text-indigo-950 bg-indigo-50/30 border-l border-slate-200 text-sm">
                        {available.toLocaleString()}
                      </td>

                      {/* 4. Issued Input (Defaults to Required) */}
                      <td className="py-3 px-3 text-center bg-amber-50/30 border-l border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={issued}
                          onChange={(e) => handleIssuedChange(item.rawMaterialId, Number(e.target.value))}
                          className="w-24 px-2 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-slate-900 text-center text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          title="الكمية المنصرفة فعلياً من المخزن اليوم"
                        />
                      </td>

                      {/* 5. Remaining Balance (Computed Formula) */}
                      <td className={`py-3 px-3 text-center font-black border-l border-slate-200 ${
                        isShortage
                          ? 'bg-rose-100 text-rose-950 font-black'
                          : isWarning
                          ? 'bg-amber-100 text-amber-950 font-black'
                          : 'bg-emerald-100 text-emerald-950 font-black'
                      }`}>
                        <div className="text-sm font-black">
                          {remaining.toLocaleString()} كجم
                        </div>
                        <div className="text-[10px] opacity-75 font-semibold">
                          ≈ {(remaining / 1000).toFixed(2)} طن
                        </div>
                      </td>

                      {/* 6. Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isShortage ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            عجز ({Math.abs(remaining).toLocaleString()})
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            قرب الأمان
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary Row */}
            <tfoot className="bg-slate-100 font-black text-slate-900 text-xs sm:text-sm border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="py-4 px-4 text-center border-l border-slate-200">
                  إجمالي حركة المخزن الكلية:
                </td>
                <td className="py-4 px-3 text-center font-black text-slate-900 bg-slate-200 border-l border-slate-200">
                  {totalOpeningStockKg.toLocaleString()} كجم
                </td>
                <td className="py-4 px-3 text-center font-black text-blue-950 bg-blue-200 border-l border-slate-200">
                  +{totalIncomingKg.toLocaleString()} كجم
                </td>
                <td className="py-4 px-3 text-center font-black text-indigo-950 bg-indigo-200 border-l border-slate-200">
                  {totalAvailableKg.toLocaleString()} كجم
                </td>
                <td className="py-4 px-3 text-center font-black text-amber-950 bg-amber-200 border-l border-slate-200">
                  {totalIssuedKg.toLocaleString()} كجم
                </td>
                <td className={`py-4 px-3 text-center font-black border-l border-slate-200 ${
                  totalRemainingKg >= 0 ? 'bg-emerald-300 text-emerald-950' : 'bg-rose-300 text-rose-950'
                }`}>
                  {totalRemainingKg.toLocaleString()} كجم
                </td>
                <td className="py-4 px-3 text-center text-slate-700 font-bold">
                  التكلفة: {totalCost.toLocaleString()} {settings.currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Print Signatures */}
        <PrintSignatures settings={settings} />
      </div>
    </div>
  );
};
