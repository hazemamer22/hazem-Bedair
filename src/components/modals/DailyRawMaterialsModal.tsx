import React, { useState } from 'react';
import { AnimalCategory, Barn, Ration, RawMaterial, DailyOperationPlan } from '../../types';
import {
  calculateTheoreticalRawMaterialRequirements,
  calculateDailyWarehouseRequirements,
  calculateBarnDailyDemand,
} from '../../utils/calculations';
import { X, Scale, Package, Printer, Search, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react';

interface DailyRawMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  barns: Barn[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  onNavigateToWarehouse?: () => void;
}

export const DailyRawMaterialsModal: React.FC<DailyRawMaterialsModalProps> = ({
  isOpen,
  onClose,
  dailyPlan,
  categories,
  barns,
  rations,
  rawMaterials,
  onNavigateToWarehouse,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Theoretical requirement from all active barns
  const theoreticalItems = calculateTheoreticalRawMaterialRequirements(
    barns,
    categories,
    rations,
    rawMaterials,
    dailyPlan
  );

  // Planned batches requirement
  const plannedItems = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  // Use theoretical by default (or planned if theoretical empty)
  const items = theoreticalItems.length > 0 ? theoreticalItems : plannedItems;

  const totalDemandKg = items.reduce((sum, item) => sum + item.totalRequiredKgToday, 0);
  const totalCost = items.reduce((sum, item) => sum + item.totalCostToday, 0);

  // Filter items
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort descending by required quantity
  const sortedItems = [...filteredItems].sort(
    (a, b) => b.totalRequiredKgToday - a.totalRequiredKgToday
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-amber-700 via-amber-800 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black">الاحتياج اليومي من الخامات العلفية</h2>
              <p className="text-xs sm:text-sm text-amber-200 mt-0.5">
                حصر تفصيلي للكميات المطلوبة من كل مادة خام لتغذية المزرعة اليوم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Summary */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">إجمالي العلف المطلوب</span>
            <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
              {totalDemandKg.toLocaleString('ar-EG')}{' '}
              <span className="text-xs font-bold text-slate-500">كجم</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700">
              = {(totalDemandKg / 1000).toFixed(2)} طن
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">عدد الخامات المطلوبة</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {items.length}{' '}
              <span className="text-xs font-bold text-slate-500">خامات</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">التكلفة التقديرية</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
              {totalCost > 0 ? totalCost.toLocaleString('ar-EG') : '—'}{' '}
              {totalCost > 0 && <span className="text-xs font-bold text-slate-500">ج.م</span>}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في الخامات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3.5 px-4">كود الخامة</th>
                  <th className="py-3.5 px-4">اسم المادة الخام</th>
                  <th className="py-3.5 px-4">الكمية المطلوبة (كجم)</th>
                  <th className="py-3.5 px-4">الكمية بالطن</th>
                  <th className="py-3.5 px-4">النسبة من إجمالي العلف</th>
                  {totalCost > 0 && <th className="py-3.5 px-4">التكلفة التقديرية</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      لا توجد خامات مسجلة أو مطابقة لبحثك.
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const percent =
                      totalDemandKg > 0
                        ? Math.round((item.totalRequiredKgToday / totalDemandKg) * 1000) / 10
                        : 0;

                    return (
                      <tr key={item.rawMaterialId} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                          {item.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-950 text-base">
                          {item.totalRequiredKgToday.toLocaleString('ar-EG')}{' '}
                          <span className="text-xs font-bold text-slate-500">كجم</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-900">
                          {(item.totalRequiredKgToday / 1000).toFixed(3)} طن
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                              <div
                                className="bg-amber-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 text-xs">{percent}%</span>
                          </div>
                        </td>
                        {totalCost > 0 && (
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            {item.totalCostToday > 0
                              ? `${item.totalCostToday.toLocaleString('ar-EG')} ج.م`
                              : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {sortedItems.length > 0 && (
                <tfoot className="bg-amber-50/80 font-black text-amber-950 border-t-2 border-amber-200">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 text-sm font-black">
                      الإجمالي اليومي:
                    </td>
                    <td className="py-3.5 px-4 text-base font-black text-emerald-950">
                      {totalDemandKg.toLocaleString('ar-EG')} كجم
                    </td>
                    <td className="py-3.5 px-4 text-base font-black text-amber-900">
                      {(totalDemandKg / 1000).toFixed(3)} طن
                    </td>
                    <td className="py-3.5 px-4 text-sm font-black text-slate-800">
                      100%
                    </td>
                    {totalCost > 0 && (
                      <td className="py-3.5 px-4 text-sm font-black text-emerald-900">
                        {totalCost.toLocaleString('ar-EG')} ج.م
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500">
            * يتم احتساب هذه الكميات بدقة من إجمالي احتياجات العنابر ومكونات العلائق المعتمدة.
          </span>
          <div className="flex items-center gap-2">
            {onNavigateToWarehouse && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToWarehouse();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Package className="w-4 h-4" />
                <span>الانتقال لإذن صرف المخزن</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
