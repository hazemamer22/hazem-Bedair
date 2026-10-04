import React, { useState } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getMixerDisplayName,
  getBatchNumberDisplayName,
  getRationDisplayName,
} from '../../context/LanguageContext';
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
  calculateRationDmStats,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportDriverSheetToExcel } from '../../utils/excelExport';
import { Truck, Printer, Clock, Layers, Home, Eye } from 'lucide-react';

interface DriverSheetViewProps {
  dailyPlan: DailyOperationPlan;
  categories: AnimalCategory[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  mixers: Mixer[];
  rations?: Ration[];
  settings: FarmSettings;
  onPrint?: () => void;
  onOpenPrintPreview?: () => void;
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
  onOpenPrintPreview,
}) => {
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';

  // Sort batches by category order so department batches stay next to each other
  const sortedBatches = [...(dailyPlan.batches || [])].sort((a, b) => {
    const catIndexA = categories.findIndex((c) => c.id === a.categoryId);
    const catIndexB = categories.findIndex((c) => c.id === b.categoryId);
    if (catIndexA !== catIndexB) return catIndexA - catIndexB;
    return a.batchNumber.localeCompare(b.batchNumber, isEn ? 'en' : 'ar');
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
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Printable Header */}
      <PrintHeader
        documentTitle={isEn ? 'Driver Feed Unloading & Distribution Sheet' : 'كشف تفريغ وتوزيع العلف للسائق'}
        documentSubtitle={
          isEn
            ? 'Daily feed delivery sheet to farm barns via TMR mixer wagon'
            : 'نموذج تسليم العلف اليومي لعنابر المزرعة بواسطة عربة المكسر TMR'
        }
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Screen Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              {isEn
                ? 'TMR Wagon Movement & Distribution Sheet (Driver)'
                : 'كشف حركة وتوزيع عربة المكسر (خاص بالسائق)'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Simplified delivery data for the driver showing required feed weight per barn without raw material details'
                : 'بيانات مبسطة للسائق تتضمن أوزان العلف المطلوبة لكل عنبر بدون تفاصيل الخامات'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onOpenPrintPreview && (
              <button
                type="button"
                onClick={onOpenPrintPreview}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer border border-emerald-700/60"
                title={isEn ? 'Preview driver sheet before printing' : 'معاينة كشف السائق على الورق A4 قبل الطباعة'}
              >
                <Eye className="w-4 h-4 text-emerald-300" />
                <span>{isEn ? 'Print Preview' : 'معاينة الطباعة'}</span>
              </button>
            )}
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Print Driver Sheet' : 'طباعة كشف السائق ورقيًا'}</span>
            </button>
            <ExportExcelButton
              onExport={() =>
                exportDriverSheetToExcel(dailyPlan, mixers, barns, categories, rations)
              }
              label={isEn ? 'Export to Excel' : 'تصدير كشف السائق للإكسيل'}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Batch Filter Buttons Grouped by Department */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {isEn ? 'Filter display & print by batches and sections:' : 'تصفية العرض والطباعة حسب اللفات والأقسام:'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedBatchFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedBatchFilter === 'ALL'
                  ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {isEn
                ? `All Sections & Batches (${sortedBatches.length})`
                : `جميع الأقسام واللفات (${sortedBatches.length})`}
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
                        <span>{isEn ? `Section ${cat.name}` : `قسم ${cat.name}`}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ({catBatches.length} {isEn ? 'batches' : 'لفات'})
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
            {isEn ? 'No mixer batches prepared for display or printing.' : 'لا توجد لفات مكسر مجهزة للطباعة أو العرض.'}
          </div>
        ) : (
          filteredBatches.map((batch, bIdx) => {
            const category = categories.find((c) => c.id === batch.categoryId);
            const mixer = mixers.find((m) => m.id === batch.mixerId);
            const catRation = rations.find((r) => r.id === category?.rationId);
            const catDmStats = catRation ? calculateRationDmStats(catRation) : null;
            const allocations = batch.allocations || [];
            const effectiveTargetWeightKg = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
            const totalAllocatedKg = allocations.reduce((s, a) => {
              const barn = barns.find((b) => b.id === a.barnId);
              return s + getDerivedAllocationKg(a, barn, categories, rations, dailyPlan);
            }, 0);

            const isLastBatch = bIdx === filteredBatches.length - 1;

            return (
              <div
                key={batch.id}
                className={`bg-white rounded-2xl border border-slate-300 shadow-2xs p-5 space-y-4 print:shadow-none print:border-slate-400 ${
                  isLastBatch ? '' : 'print:break-after-page'
                }`}
              >
                {/* Batch Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-900 text-xs font-bold">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-emerald-900 text-emerald-50 px-3 py-1 rounded-lg font-black text-sm">
                      {getBatchNumberDisplayName(batch.batchNumber, isEn)}
                    </span>
                    <span>{isEn ? 'Time:' : 'التوقيت:'} <strong className="text-slate-900">{batch.time}</strong></span>
                    <span>{isEn ? 'Category:' : 'الفئة:'} <strong className="text-emerald-800">{category ? getCategoryDisplayName(category.name, isEn) : (isEn ? 'General' : 'عام')}</strong></span>
                    {catDmStats && catDmStats.dmPercent > 0 && (
                      <span className="text-[10px] font-black text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300">
                        {catDmStats.dmPercent}% DM ({catDmStats.totalDmKgPerHead} {isEn ? 'kg DM/hd' : 'كجم DM/رأس'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span>{isEn ? 'Mixer:' : 'المكسر:'} {mixer?.name}</span>
                    <span>
                      {isEn ? 'Batch Weight:' : 'وزن اللفة:'}{' '}
                      <strong className="text-emerald-900 text-sm font-black">
                        {effectiveTargetWeightKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Barn Distribution Unloading Table */}
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm border border-slate-300 rounded-xl overflow-hidden`}>
                    <thead className="bg-slate-100 text-slate-800 font-bold text-xs border-b border-slate-300">
                      <tr>
                        <th className="py-3 px-3 border-l border-slate-300">#</th>
                        <th className="py-3 px-3 border-l border-slate-300">{isEn ? 'Barn #' : 'رقم واسم العنبر'}</th>
                        <th className="py-3 px-3 border-l border-slate-300">{isEn ? 'Category' : 'الفئة'}</th>
                        <th className="py-3 px-3 border-l border-slate-300">{isEn ? 'Assigned Ration' : 'العليقة المعينة'}</th>
                        <th className="py-3 px-3 border-l border-slate-300">{isEn ? 'Head Count' : 'عدد الرؤوس'}</th>
                        <th className="py-3 px-3 border-l border-slate-300 bg-emerald-50 text-emerald-950 font-black text-sm">
                          {isEn ? 'Delivered Amount (kg)' : 'الكمية الموزعة (كجم)'}
                        </th>
                        <th className="py-3 px-3 border-l border-slate-300">{isEn ? 'Delivery Time' : 'وقت التوزيع'}</th>
                        <th className="py-3 px-3 text-center border-l border-slate-300">{isEn ? 'Unloaded' : 'تم التفريغ'}</th>
                        <th className="py-3 px-3">{isEn ? 'Receiver Signature' : 'توقيع المستلم'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {allocations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400">
                            {isEn ? 'This batch has not been allocated to any barn yet.' : 'لم يتم توزيع هذه اللفة على أي عنبر بعد.'}
                          </td>
                        </tr>
                      ) : (
                        [...allocations]
                          .sort((a, b) => {
                            const barnA = barns.find((bn) => bn.id === a.barnId);
                            const barnB = barns.find((bn) => bn.id === b.barnId);
                            const orderA = barnA?.orderIndex !== undefined ? barnA.orderIndex : 9999;
                            const orderB = barnB?.orderIndex !== undefined ? barnB.orderIndex : 9999;
                            return orderA - orderB;
                          })
                          .map((alloc, idx) => {
                            const barn = barns.find((b) => b.id === alloc.barnId);
                            const barnCategory = categories.find((c) => c.id === barn?.categoryId);
                            const ration = rations.find((r) => r.id === barn?.rationId || r.id === barnCategory?.rationId);
                            const derivedKg = getDerivedAllocationKg(alloc, barn, categories, rations, dailyPlan);

                            return (
                              <tr key={`${batch.id}-${alloc.barnId || 'barn'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3.5 px-3 text-center font-bold text-slate-700 border-l border-slate-300">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-900 text-xs font-black inline-flex items-center justify-center border border-slate-300">
                                    #{barn?.orderIndex || idx + 1}
                                  </span>
                                </td>
                              <td className="py-2.5 px-3 font-black text-slate-900 text-base border-l border-slate-300">
                                <span className="hidden print:inline">{getBarnNumberDisplayName(barn?.number, isEn)}{barn?.name ? ` (${getBarnNameDisplayName(barn.name, isEn)})` : ''}</span>
                                <div className="flex flex-col gap-1 print:hidden">
                                  <input
                                    type="text"
                                    value={barn?.number || ''}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { number: e.target.value })}
                                    className="w-24 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-xs focus:bg-white focus:outline-emerald-600"
                                    placeholder={isEn ? 'Barn #' : 'رقم العنبر'}
                                    title={isEn ? 'Edit Barn #' : 'تعديل رقم العنبر'}
                                  />
                                  <input
                                    type="text"
                                    value={barn?.name || ''}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { name: e.target.value })}
                                    className="w-28 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:bg-white focus:outline-emerald-600"
                                    placeholder={isEn ? 'Barn Name' : 'اسم العنبر'}
                                    title={isEn ? 'Edit Barn Name' : 'تعديل اسم العنبر'}
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-slate-700 text-xs border-l border-slate-300">
                                {getCategoryDisplayName(barnCategory?.name || category?.name, isEn)}
                              </td>
                              <td className="py-3.5 px-3 font-bold text-emerald-900 text-xs border-l border-slate-300">
                                <div>{ration ? getRationDisplayName(ration.name, isEn) : '—'}</div>
                                {(() => {
                                  const rDm = ration ? calculateRationDmStats(ration) : null;
                                  return rDm && rDm.dmPercent > 0 ? (
                                    <div className="text-[10px] text-blue-700 font-bold mt-0.5 print:text-black">
                                      {rDm.dmPercent}% DM ({rDm.totalDmKgPerHead} {isEn ? 'kg DM' : 'كجم مادة جافة'})
                                    </div>
                                  ) : null;
                                })()}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700 border-l border-slate-300">
                                <span className="hidden print:inline">{barn?.headCount || 0} {isEn ? 'hd' : 'رأس'}</span>
                                <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 print:hidden">
                                  <input
                                    type="number"
                                    min={1}
                                    value={barn?.headCount || 0}
                                    onChange={(e) => barn && handleBarnUpdate(barn.id, { headCount: Math.max(1, Number(e.target.value)) })}
                                    className="w-14 text-center font-black text-slate-900 bg-transparent focus:outline-none text-xs"
                                    title={isEn ? 'Edit head count' : 'تعديل عدد الرؤوس'}
                                  />
                                  <span className="font-bold text-slate-600 text-xs">{isEn ? 'hd' : 'رأس'}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 font-black text-emerald-900 bg-emerald-50/70 text-lg border-l border-slate-300">
                                <div>
                                  {derivedKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                                  {alloc.allocatedPercent !== undefined && (
                                    <span className={`text-xs font-bold text-emerald-700 ${isRtl ? 'mr-1.5' : 'ml-1.5'} opacity-80`}>
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
                        <td colSpan={5} className={`py-3 px-3 ${isRtl ? 'text-left' : 'text-right'} border-l border-slate-300`}>
                          {isEn ? 'Total Required Delivery for this Batch:' : 'إجمالي التفريغ المطلوب لهذه اللفة:'}
                        </td>
                        <td className="py-3 px-3 text-emerald-950 font-black text-lg bg-emerald-100 border-l border-slate-300">
                          {totalAllocatedKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-xs text-slate-500 font-bold">
                          {Math.abs(totalAllocatedKg - effectiveTargetWeightKg) <= 0.5
                            ? isEn ? '✓ 100% Allocated' : '✓ موزعة بالكامل 100%'
                            : isEn
                            ? `Remaining in batch: ${Math.round((effectiveTargetWeightKg - totalAllocatedKg) * 100) / 100} kg`
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
