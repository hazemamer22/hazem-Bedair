import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AnimalCategory, Barn, Ration, RawMaterial, DailyOperationPlan } from '../../types';
import {
  calculateTheoreticalRawMaterialRequirements,
  calculateDailyWarehouseRequirements,
  calculateBarnDailyDemand,
  getRawMaterialDryMatterPercent,
} from '../../utils/calculations';
import { X, Scale, Package, Printer, Search, TrendingUp, DollarSign, CheckCircle2, Wheat } from 'lucide-react';

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
  const { language } = useLanguage();
  const isEn = language === 'en';
  const currency = isEn ? 'USD' : 'ج.م';
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

  // Use theoretical by default (or planned if theoretical empty), filtering only active requirements
  const rawItems = theoreticalItems.length > 0 ? theoreticalItems : plannedItems;
  const items = rawItems.filter((i) => i.totalRequiredKgToday > 0);

  // Enrich items with Dry Matter calculations
  const itemsWithDm = items.map((item) => {
    const rawMat = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
    const dmPercent = getRawMaterialDryMatterPercent(rawMat);
    const dmKg = Math.round(item.totalRequiredKgToday * (dmPercent / 100) * 10) / 10;
    return {
      ...item,
      dmPercent,
      dmKg,
    };
  });

  const totalDemandKg = itemsWithDm.reduce((sum, item) => sum + item.totalRequiredKgToday, 0);
  const totalDmKg = itemsWithDm.reduce((sum, item) => sum + item.dmKg, 0);
  const averageDmPercent = totalDemandKg > 0 ? Math.round((totalDmKg / totalDemandKg) * 1000) / 10 : 0;
  const totalCost = itemsWithDm.reduce((sum, item) => sum + item.totalCostToday, 0);

  // Filter items
  const filteredItems = itemsWithDm.filter(
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
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ${
          isEn ? 'text-left' : 'text-right'
        }`}
        dir={isEn ? 'ltr' : 'rtl'}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-amber-700 via-amber-800 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black">
                {isEn ? 'Daily Feed Raw Materials & Dry Matter Requirements' : 'الاحتياج اليومي من الخامات العلفية والمادة الجافة'}
              </h2>
              <p className="text-xs sm:text-sm text-amber-200 mt-0.5">
                {isEn
                  ? 'Comprehensive summary of required quantities in As-Fed and Dry Matter (DM) for the entire farm today'
                  : 'حصر تفصيلي للكميات المطلوبة بالوزن الرطب (As-Fed) والمادة الجافة (Dry Matter) لتغذية المزرعة اليوم'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Summary */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">
              {isEn ? 'Total As-Fed Feed' : 'إجمالي العلف الطازج'}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">
              {totalDemandKg.toLocaleString()}{' '}
              <span className="text-xs font-bold text-slate-500">{isEn ? 'kg' : 'كجم'}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700">
              = {(totalDemandKg / 1000).toFixed(2)} {isEn ? 'tons As-Fed' : 'طن As-Fed'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-blue-200 shadow-2xs bg-blue-50/20">
            <span className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
              <Wheat className="w-3.5 h-3.5 text-blue-700" />
              <span>{isEn ? 'Total Dry Matter (DM)' : 'إجمالي المادة الجافة (DM)'}</span>
            </span>
            <div className="text-lg sm:text-xl font-black text-blue-950 mt-0.5">
              {Math.round(totalDmKg).toLocaleString()}{' '}
              <span className="text-xs font-bold text-blue-700">{isEn ? 'kg DM' : 'كجم DM'}</span>
            </div>
            <span className="text-[10px] font-bold text-blue-700">
              {isEn ? 'Avg DM:' : 'متوسط DM:'} {averageDmPercent}%
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">
              {isEn ? 'Materials Count' : 'عدد الخامات'}
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {items.length}{' '}
              <span className="text-xs font-bold text-slate-500">{isEn ? 'materials' : 'خامات'}</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">
              {isEn ? 'Estimated Cost' : 'التكلفة التقديرية'}
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-800 mt-0.5">
              {totalCost > 0 ? totalCost.toLocaleString() : '—'}{' '}
              {totalCost > 0 && <span className="text-xs font-bold text-slate-500">{currency}</span>}
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1 flex flex-col justify-center">
            <div className="relative">
              <input
                type="text"
                placeholder={isEn ? 'Search materials...' : 'بحث في الخامات...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isEn ? 'pl-8 pr-3' : 'pl-3 pr-8'} py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold`}
              />
              <Search className={`w-4 h-4 text-slate-400 absolute ${isEn ? 'left-2.5' : 'right-2.5'} top-2.5`} />
            </div>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className={`w-full ${isEn ? 'text-left' : 'text-right'} text-xs sm:text-sm`}>
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3.5 px-4">{isEn ? 'Material Code' : 'كود الخامة'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Raw Material Name' : 'اسم المادة الخام'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Required Qty (kg)' : 'الكمية المطلوبة (كجم)'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Qty in Tons' : 'الكمية بالطن'}</th>
                  <th className="py-3.5 px-4">{isEn ? '% of Total Feed' : 'النسبة من إجمالي العلف'}</th>
                  <th className="py-3.5 px-4 bg-blue-50/80 text-blue-900 text-center">{isEn ? 'Dry Matter % (DM)' : 'المادة الجافة % (DM)'}</th>
                  <th className="py-3.5 px-4 bg-blue-50/80 text-blue-900 text-center">{isEn ? 'Qty (kg DM)' : 'الكمية (كجم DM)'}</th>
                  {totalCost > 0 && <th className="py-3.5 px-4">{isEn ? 'Estimated Cost' : 'التكلفة التقديرية'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {isEn ? 'No raw materials found matching your search.' : 'لا توجد خامات مسجلة أو مطابقة لبحثك.'}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item, idx) => {
                    const percent =
                      totalDemandKg > 0
                        ? Math.round((item.totalRequiredKgToday / totalDemandKg) * 1000) / 10
                        : 0;

                    return (
                      <tr key={`raw-req-${item.rawMaterialId || 'rm'}-${idx}`} className="hover:bg-amber-50/40 transition-colors">
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
                          {item.totalRequiredKgToday.toLocaleString()}{' '}
                          <span className="text-xs font-bold text-slate-500">{isEn ? 'kg' : 'كجم'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-900">
                          {(item.totalRequiredKgToday / 1000).toFixed(3)} {isEn ? 'ton' : 'طن'}
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
                        <td className="py-3.5 px-4 text-center font-bold text-blue-900 bg-blue-50/30">
                          {item.dmPercent}%
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-blue-950 bg-blue-50/30">
                          {item.dmKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                        </td>
                        {totalCost > 0 && (
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            {item.totalCostToday > 0
                              ? `${item.totalCostToday.toLocaleString()} ${currency}`
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
                      {isEn ? 'Daily Grand Total:' : 'الإجمالي اليومي:'}
                    </td>
                    <td className="py-3.5 px-4 text-base font-black text-emerald-950">
                      {totalDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-4 text-base font-black text-amber-900">
                      {(totalDemandKg / 1000).toFixed(3)} {isEn ? 'ton' : 'طن'}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-black text-slate-800">
                      100%
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-blue-900 bg-blue-100/60">
                      {averageDmPercent}% DM
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-blue-950 bg-blue-100/60">
                      {Math.round(totalDmKg).toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                    </td>
                    {totalCost > 0 && (
                      <td className="py-3.5 px-4 text-sm font-black text-emerald-900">
                        {totalCost.toLocaleString()} {currency}
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
            {isEn
              ? '* Quantities are accurately computed from pen requirements and approved ration formulas.'
              : '* يتم احتساب هذه الكميات بدقة من إجمالي احتياجات العنابر ومكونات العلائق المعتمدة.'}
          </span>
          <div className="flex items-center gap-2">
            {onNavigateToWarehouse && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToWarehouse();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>{isEn ? 'Go to Warehouse Issue Slip' : 'الانتقال لإذن صرف المخزن'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isEn ? 'Close' : 'إغلاق'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
