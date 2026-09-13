import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  Ration,
  FarmSettings,
} from '../../types';
import {
  calculateBarnDailyDemand,
  getDerivedAllocationKg,
  getBatchDerivedTargetWeightKg,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportDriverSheetToExcel } from '../../utils/excelExport';
import { Truck, Printer, Clock, Layers, Home } from 'lucide-react';

interface DriverSheetViewProps {
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  mixers: Mixer[];
  rations?: Ration[];
  settings: FarmSettings;
  onPrint?: () => void;
}

export const DriverSheetView: React.FC<DriverSheetViewProps> = ({
  dailyPlan,
  categories,
  barns,
  setBarns,
  mixers,
  rations = [],
  settings,
  onPrint,
}) => {
  // Sort batches by category order so department batches stay next to each other
  const sortedBatches = [...(dailyPlan.batches || [])].sort((a, b) => {
    const catIndexA = categories.findIndex((c) => c.id === a.categoryId);
    const catIndexB = categories.findIndex((c) => c.id === b.categoryId);
    if (catIndexA !== catIndexB) return catIndexA - catIndexB;
    return a.batchNumber.localeCompare(b.batchNumber, 'ar');
  });

  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');

  const filteredBatches = selectedBatchFilter === 'ALL'
    ? sortedBatches
    : sortedBatches.filter((b) => b.id === selectedBatchFilter);

  const handleBarnUpdate = (barnId: string, updates: Partial<Barn>) => {
    if (!setBarns) return;
    const updated = barns.map((b) => (b.id === barnId ? { ...b, ...updates } : b));
    setBarns(updated);
  };

  return (
    <div className="space-y-6">
      {/* Printable Header */}
      <PrintHeader
        documentTitle="كشف تفريغ وتوزيع العلف للسائق"
        documentSubtitle="نموذج تسليم العلف اليومي لعنابر المزرعة بواسطة عربة المكسر TMR"
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              كشف حركة وتوزيع عربة المكسر (خاص بالسائق)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              بيانات مبسطة للسائق تتضمن أوزان العلف المطلوبة لكل عنبر بدون تفاصيل الخامات
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة كشف السائق ورقيًا</span>
            </button>
            <ExportExcelButton
              onExport={() =>
                exportDriverSheetToExcel(dailyPlan, mixers, barns, categories, rations)
              }
              label="تصدير كشف السائق للإكسيل"
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Batch Filter Buttons Grouped by Department */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">تصفية العرض والطباعة حسب اللفات والأقسام:</span>
            <button
              type="button"
              onClick={() => setSelectedBatchFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedBatchFilter === 'ALL'
                  ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              جميع الأقسام واللفات ({sortedBatches.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories
              .filter((cat) => sortedBatches.some((b) => b.categoryId === cat.id))
              .map((cat) => {
                const catBatches = sortedBatches.filter((b) => b.categoryId === cat.id);
                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-800" />
                        <span>قسم {cat.name}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ({catBatches.length} لفات)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {catBatches.map((b) => {
                        const isSelected = selectedBatchFilter === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBatchFilter(b.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-500/30'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span>{b.batchNumber}</span>
                            <span className="text-[11px] opacity-80">({b.time})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Driver Cards / Tables for Each Batch */}
      <div className="space-y-6">
        {filteredBatches.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400">
            لا توجد لفات مكسر مجهزة للطباعة أو العرض.
          </div>
        ) : (
          filteredBatches.map((batch) => {
            const category = categories.find((c) => c.id === batch.categoryId);
            const mixer = mixers.find((m) => m.id === batch.mixerId);
            const allocations = batch.allocations || [];
            const effectiveTargetWeightKg = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
            const totalAllocatedKg = allocations.reduce((s, a) => {
              const barn = barns.find((b) => b.id === a.barnId);
              return s + getDerivedAllocationKg(a, barn, categories, rations, dailyPlan);
            }, 0);

            return (
              <div
                key={batch.id}
                className="bg-white rounded-2xl border border-slate-300 shadow-2xs p-5 space-y-4 print:shadow-none print:border-slate-400 print:break-after-page"
              >
                {/* Batch Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-900 text-xs font-bold">
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-900 text-emerald-50 px-3 py-1 rounded-lg font-black text-sm">
                      {batch.batchNumber}
                    </span>
                    <span>التوقيت: <strong className="text-slate-900">{batch.time}</strong></span>
                    <span>الفئة: <strong className="text-emerald-800">{category?.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span>المكسر: {mixer?.name}</span>
                    <span>وزن اللفة: <strong className="text-emerald-900 text-sm font-black">{effectiveTargetWeightKg.toLocaleString('ar-EG')} كجم</strong></span>
                  </div>
                </div>

                {/* Barn Distribution Unloading Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm border border-slate-300 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-xs border-b border-slate-300">
                      <tr>
                        <th className="py-3 px-3 border-l border-slate-300">م</th>
                        <th className="py-3 px-3 border-l border-slate-300">رقم واسم العنبر</th>
                        <th className="py-3 px-3 border-l border-slate-300">الفئة</th>
                        <th className="py-3 px-3 border-l border-slate-300">العليقة المعينة</th>
                        <th className="py-3 px-3 border-l border-slate-300">عدد الرؤوس</th>
                        <th className="py-3 px-3 border-l border-slate-300 bg-emerald-50 text-emerald-950 font-black text-sm">
                          الكمية الموزعة (كجم)
                        </th>
                        <th className="py-3 px-3 border-l border-slate-300">وقت التوزيع</th>
                        <th className="py-3 px-3 text-center border-l border-slate-300">تم التفريغ</th>
                        <th className="py-3 px-3">توقيع المستلم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {allocations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400">
                            لم يتم توزيع هذه اللفة على أي عنبر بعد.
                          </td>
                        </tr>
                      ) : (
                        allocations.map((alloc, idx) => {
                          const barn = barns.find((b) => b.id === alloc.barnId);
                          const barnCategory = categories.find((c) => c.id === barn?.categoryId);
                          const ration = rations.find((r) => r.id === barn?.rationId || r.id === barnCategory?.rationId);
                          const derivedKg = getDerivedAllocationKg(alloc, barn, categories, rations, dailyPlan);

                          return (
                            <tr key={`${batch.id}-${alloc.barnId || 'barn'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-3 text-center font-bold text-slate-400 border-l border-slate-300">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-black text-slate-900 text-base border-l border-slate-300">
                                <span className="hidden print:inline">{barn?.number || 'عنبر'} {barn?.name ? `(${barn.name})` : ''}</span>
                                <div className="flex flex-col gap-1 print:hidden">
                                  <input
                                    type="text"
                                    value={barn?.number || ''}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { number: e.target.value })}
                                    className="w-24 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-xs focus:bg-white focus:outline-emerald-600"
                                    placeholder="رقم العنبر"
                                    title="تعديل رقم العنبر"
                                  />
                                  <input
                                    type="text"
                                    value={barn?.name || ''}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { name: e.target.value })}
                                    className="w-28 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:bg-white focus:outline-emerald-600"
                                    placeholder="اسم العنبر"
                                    title="تعديل اسم العنبر"
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-slate-700 text-xs border-l border-slate-300">
                                {barnCategory?.name || category?.name || '—'}
                              </td>
                              <td className="py-3.5 px-3 font-bold text-emerald-900 text-xs border-l border-slate-300">
                                {ration?.name || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700 border-l border-slate-300">
                                <span className="hidden print:inline">{barn?.headCount || 0} رأس</span>
                                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 print:hidden">
                                  <input
                                    type="number"
                                    min={1}
                                    value={barn?.headCount || 0}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { headCount: Math.max(1, Number(e.target.value)) })}
                                    className="w-14 text-center font-black text-slate-900 bg-transparent focus:outline-none text-xs"
                                    title="تعديل عدد الرؤوس"
                                  />
                                  <span className="font-bold text-slate-600 text-xs">رأس</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-black text-emerald-900 bg-emerald-50/70 text-lg border-l border-slate-300">
                                <div>
                                  {derivedKg.toLocaleString()} كجم
                                  {alloc.allocatedPercent !== undefined && (
                                    <span className="text-xs font-bold text-emerald-700 mr-1.5 opacity-80">
                                      ({alloc.allocatedPercent}%)
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-slate-700 border-l border-slate-300 text-xs">
                                {batch.time}
                              </td>
                              <td className="py-3.5 px-3 text-center border-l border-slate-300">
                                <div className="w-6 h-6 border-2 border-slate-400 rounded-md mx-auto" />
                              </td>
                              <td className="py-3.5 px-3 text-xs text-slate-400 italic">
                                ................................................
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-left border-l border-slate-300">
                          إجمالي التفريغ المطلوب لهذه اللفة:
                        </td>
                        <td className="py-3 px-3 text-emerald-950 font-black text-lg bg-emerald-100 border-l border-slate-300">
                          {totalAllocatedKg.toLocaleString('ar-EG')} كجم
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-xs text-slate-500 font-bold">
                          {Math.abs(totalAllocatedKg - effectiveTargetWeightKg) <= 0.5
                            ? '✓ موزعة بالكامل 100%'
                            : `متبقي من اللفة: ${Math.round((effectiveTargetWeightKg - totalAllocatedKg) * 100) / 100} كجم`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Drivers Signatures */}
                <PrintSignatures settings={settings} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
