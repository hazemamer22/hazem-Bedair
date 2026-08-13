import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  FarmSettings,
} from '../../types';
import { calculateDailyWarehouseRequirements } from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { Warehouse, Printer, Save, CheckCircle2 } from 'lucide-react';

interface WarehouseViewProps {
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings: FarmSettings;
  onPrint?: () => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  dailyPlan,
  categories,
  rations,
  rawMaterials,
  settings,
  onPrint,
}) => {
  const requirementItems = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials
  );

  const [issuedWeights, setIssuedWeights] = useState<Record<string, number>>({});

  const handleIssuedChange = (rawMaterialId: string, valueKg: number) => {
    setIssuedWeights((prev) => ({
      ...prev,
      [rawMaterialId]: Math.max(0, valueKg),
    }));
  };

  const handleSaveIssued = () => {
    alert('تم حفظ كميات الخامات المنصرفة فعلياً من المخزن الرئيسي بنجاح!');
  };

  const totalDailyWeightKg = requirementItems.reduce((s, i) => s + i.totalRequiredKgToday, 0);
  const totalIssuedWeightKg = requirementItems.reduce(
    (s, i) => s + (issuedWeights[i.rawMaterialId] ?? i.totalRequiredKgToday),
    0
  );
  const totalDailyCost = requirementItems.reduce((s, i) => s + i.totalCostToday, 0);

  return (
    <div className="space-y-6">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="إذن احتياجات وسحب الخامات من المخزن الرئيسي"
        documentSubtitle="بيان إجمالي كميات الخامات المطلوبة لتغطية كافة لفات المكسر المخططة اليوم"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls & Stat Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-emerald-700" />
              أمر وإذن صرف المخزن اليومي للخامات
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تجميع كلي لكافة أوزان الخامات المطلوبة وتسجيل الكميات المنصرفة فعلياً من المخزن
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveIssued}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>حفظ المنصرف</span>
            </button>
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة كشف المخزن</span>
            </button>
          </div>
        </div>

        {/* Overview Stat Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl">
            <span className="text-xs font-bold text-emerald-800 block">إجمالي أوزان الخامات المطلوبة اليوم</span>
            <span className="text-2xl font-black text-emerald-950 mt-1 block">
              {totalDailyWeightKg.toLocaleString()} <span className="text-sm font-bold">كجم</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              = {(totalDailyWeightKg / 1000).toFixed(2)} طن علف خامات
            </span>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-xl">
            <span className="text-xs font-bold text-amber-800 block">إجمالي الخامات المنصرفة فعلياً</span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">
              {totalIssuedWeightKg.toLocaleString()} <span className="text-sm font-bold">كجم</span>
            </span>
            <span className="text-[11px] text-amber-700 font-medium">الفرق الكلي: {Math.round(totalIssuedWeightKg - totalDailyWeightKg)} كجم</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-600 block">التكلفة التقديرية اليومية للخامات</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {totalDailyCost.toLocaleString()} <span className="text-sm font-bold">{settings.currency}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">بناءً على أسعار قاعدة الخامات</span>
          </div>
        </div>
      </div>

      {/* Warehouse Requirements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 border-l border-slate-200">م</th>
                <th className="py-3.5 px-4 border-l border-slate-200">كود الخامة</th>
                <th className="py-3.5 px-4 border-l border-slate-200">اسم الخامة العلفية</th>
                <th className="py-3.5 px-4 border-l border-slate-200 bg-emerald-50 text-emerald-950 font-black text-sm">
                  المطلوب (كجم)
                </th>
                <th className="py-3.5 px-4 border-l border-slate-200 font-black text-sm">
                  المنصرف فعلياً (كجم)
                </th>
                <th className="py-3.5 px-4 border-l border-slate-200">الفرق (كجم)</th>
                <th className="py-3.5 px-4 border-l border-slate-200">سعر الوحدة ({settings.currency})</th>
                <th className="py-3.5 px-4">إجمالي التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {requirementItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد خامات مطلوبة اليوم. يرجى إضافة لفات مكسر بخطة التشغيل اليومية.
                  </td>
                </tr>
              ) : (
                requirementItems.map((item, idx) => {
                  const issuedKg = issuedWeights[item.rawMaterialId] ?? item.totalRequiredKgToday;
                  const diffKg = Math.round((issuedKg - item.totalRequiredKgToday) * 100) / 100;

                  return (
                    <tr key={item.rawMaterialId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400 border-l border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600 border-l border-slate-200">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 border-l border-slate-200">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-900 bg-emerald-50/60 border-l border-slate-200 text-base">
                        {item.totalRequiredKgToday.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200">
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={issuedKg}
                          onChange={(e) => handleIssuedChange(item.rawMaterialId, Number(e.target.value))}
                          className="w-28 px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-extrabold text-slate-900 text-center text-sm print:border-none print:bg-transparent print:w-auto"
                        />
                      </td>
                      <td className="py-3 px-4 border-l border-slate-200 font-bold text-xs">
                        {diffKg === 0 ? (
                          <span className="text-emerald-600">✓ مطابق (0)</span>
                        ) : diffKg > 0 ? (
                          <span className="text-rose-600">زيادة +{diffKg} كجم</span>
                        ) : (
                          <span className="text-amber-600">نقص {diffKg} كجم</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-700 border-l border-slate-200">
                        {item.pricePerKg ? `${item.pricePerKg.toLocaleString()} ج` : '—'}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-sm">
                        {item.totalCostToday > 0 ? `${item.totalCostToday.toLocaleString()} ج` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-left border-l border-slate-200">
                  إجمالي احتياجات المخزن اليومية:
                </td>
                <td className="py-4 px-4 text-emerald-950 font-black text-lg bg-emerald-100 border-l border-slate-200">
                  {totalDailyWeightKg.toLocaleString()} كجم
                </td>
                <td className="py-4 px-4 text-amber-950 font-black text-lg border-l border-slate-200">
                  {totalIssuedWeightKg.toLocaleString()} كجم
                </td>
                <td colSpan={2} className="py-4 px-4 border-l border-slate-200">—</td>
                <td className="py-4 px-4 text-emerald-950 font-black text-base">
                  {totalDailyCost.toLocaleString()} {settings.currency}
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
