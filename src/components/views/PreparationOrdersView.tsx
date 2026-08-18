import React, { useState } from 'react';
import {
  DailyOperationPlan,
  AnimalCategory,
  Ration,
  RawMaterial,
  Mixer,
  FarmSettings,
  MixBatch,
} from '../../types';
import {
  calculateBatchIngredients,
  calculateRationTotalKgPerHead,
  getBatchDerivedTargetWeightKg,
} from '../../utils/calculations';
import { PrintHeader, PrintSignatures } from '../PrintHeader';
import {
  ClipboardList,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { Barn } from '../../types';

interface PreparationOrdersViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  rations: Ration[];
  rawMaterials: RawMaterial[];
  mixers: Mixer[];
  settings: FarmSettings;
  barns?: Barn[];
  initialBatchId?: string;
  onPrint?: () => void;
}

export const PreparationOrdersView: React.FC<PreparationOrdersViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  rations,
  rawMaterials,
  mixers,
  settings,
  barns = [],
  initialBatchId,
  onPrint,
}) => {
  const batches = dailyPlan.batches || [];
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchId || batches[0]?.id || ''
  );

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const category = categories.find((c) => c.id === activeBatch?.categoryId);
  const ration = rations.find((r) => r.id === category?.rationId);
  const mixer = mixers.find((m) => m.id === activeBatch?.mixerId);
  const effectiveTargetWeightKg = activeBatch
    ? getBatchDerivedTargetWeightKg(activeBatch, barns, categories, rations, dailyPlan)
    : 0;

  // Local state for actual weights loaded into the mixer
  const [actualWeights, setActualWeights] = useState<Record<string, number>>(() => {
    return activeBatch?.actualIngredientWeights || {};
  });

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const targetB = batches.find((b) => b.id === batchId);
    setActualWeights(targetB?.actualIngredientWeights || {});
  };

  const handleActualChange = (rawMaterialId: string, valueKg: number) => {
    setActualWeights((prev) => ({
      ...prev,
      [rawMaterialId]: Math.max(0, valueKg),
    }));
  };

  const handleApproveAndPrepare = () => {
    if (!activeBatch) return;
    const updatedBatches = batches.map((b) =>
      b.id === activeBatch.id
        ? {
            ...b,
            targetWeightKg: effectiveTargetWeightKg,
            status: 'تم التحضير' as const,
            actualIngredientWeights: actualWeights,
          }
        : b
    );
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    alert(`تم اعتماد وتحضير اللفة (${activeBatch.batchNumber}) بنجاح وتحويل حالتها إلى (تم التحضير)!`);
  };

  const calculatedIngredients = activeBatch && ration
    ? calculateBatchIngredients(
        effectiveTargetWeightKg,
        ration,
        rawMaterials,
        actualWeights
      )
    : [];

  const totalRequiredKg = calculatedIngredients.reduce((s, i) => s + i.requiredKg, 0);
  const totalActualKg = calculatedIngredients.reduce((s, i) => s + (i.actualKg || 0), 0);
  const totalDiffKg = Math.round((totalActualKg - totalRequiredKg) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Printable Formal Header */}
      <PrintHeader
        documentTitle="أمر تحضير وتحميل المكسر (المركب) TMR"
        documentSubtitle="نموذج صرف الخامات من المخزن إلى المكسر حسب النسبة المئوية للعليقة"
        selectedDate={dailyPlan.date}
        settings={settings}
        batchInfo={
          activeBatch
            ? {
                batchNumber: activeBatch.batchNumber,
                categoryName: category?.name,
                rationName: ration?.name,
                mixerName: mixer?.name,
                time: activeBatch.time,
                targetWeightKg: effectiveTargetWeightKg,
              }
            : undefined
        }
      />

      {/* Screen Controls & Batch Picker */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
              أمر تحضير خامات المكسر اليومي
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              حساب نسبي دقيق لكميات الخامات لكل لفة مكسر بناءً على وزن اللفة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApproveAndPrepare}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>اعتماد وتحضير اللفة</span>
            </button>
            <button
              onClick={() => onPrint?.() || window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة أمر التحضير</span>
            </button>
          </div>
        </div>

        {/* Batch Picker Buttons */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">اختر أمر التحضير المطلوبة طبعها أو تعديلها:</label>
          <div className="flex flex-wrap gap-2">
            {batches.map((b) => {
              const isSelected = b.id === activeBatch?.id;
              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectBatch(b.id)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-900 text-emerald-50 border-emerald-950 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-black">{b.batchNumber}</span>
                  <span className="text-[11px] opacity-80">({b.targetWeightKg}كجم)</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeBatch && ration ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
          {/* Active Batch Summary Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold">
            <div>
              <span className="text-slate-500 block text-[11px]">الفئة المستهدفة:</span>
              <span className="text-emerald-900 text-sm font-black">{category?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">تركيبة العليقة:</span>
              <span className="text-slate-900 text-sm">{ration.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">المكسر والوقت:</span>
              <span className="text-slate-900">{mixer?.name} ({activeBatch.time})</span>
            </div>
            <div className="text-left">
              <span className="text-slate-500 block text-[11px]">وزن الخلطة المستهدف:</span>
              <span className="text-emerald-800 text-base font-black">
                {activeBatch.targetWeightKg.toLocaleString('ar-EG')} كجم
              </span>
            </div>
          </div>

          {/* Preparation Ingredient Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 border-l border-slate-200">م</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">كود الخامة</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">اسم الخامة العلفية</th>
                  <th className="py-3.5 px-4 border-l border-slate-200">نسبة الخامة بالعليقة (كجم/رأس)</th>
                  <th className="py-3.5 px-4 border-l border-slate-200 text-emerald-950 bg-emerald-50">
                    الكمية المطلوبة للفة (كجم)
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200 print:table-cell">
                    الكمية الفعلية المحملة (كجم)
                  </th>
                  <th className="py-3.5 px-4 border-l border-slate-200">الفرق (كجم)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {calculatedIngredients.map((item, index) => (
                  <tr key={item.rawMaterialId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400 border-l border-slate-200">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600 border-l border-slate-200">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 border-l border-slate-200">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600 border-l border-slate-200">
                      {item.amountKgPerHead} كجم/رأس
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-900 bg-emerald-50/60 border-l border-slate-200 text-base">
                      {item.requiredKg.toLocaleString('ar-EG')} {item.unit}
                    </td>
                    <td className="py-3 px-4 border-l border-slate-200">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={actualWeights[item.rawMaterialId] ?? item.requiredKg}
                          onChange={(e) =>
                            handleActualChange(item.rawMaterialId, Number(e.target.value))
                          }
                          className="w-28 px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm print:border-none print:bg-transparent print:w-auto"
                        />
                        <span className="text-xs font-bold text-slate-500 print:hidden">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-l border-slate-200 font-bold text-xs">
                      {item.diffKg === 0 ? (
                        <span className="text-emerald-600">مطابق (0)</span>
                      ) : (item.diffKg || 0) > 0 ? (
                        <span className="text-rose-600">زيادة +{item.diffKg} كجم</span>
                      ) : (
                        <span className="text-amber-600">نقص {item.diffKg} كجم</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 text-sm border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-left border-l border-slate-200">
                    إجمالي وزن خلطة المكسر:
                  </td>
                  <td className="py-4 px-4 text-emerald-900 font-black text-lg bg-emerald-100/80 border-l border-slate-200">
                    {totalRequiredKg.toLocaleString('ar-EG')} كجم
                  </td>
                  <td className="py-4 px-4 text-slate-900 font-black text-lg border-l border-slate-200">
                    {totalActualKg.toLocaleString('ar-EG')} كجم
                  </td>
                  <td className="py-4 px-4 text-xs font-bold">
                    {Math.abs(totalDiffKg) <= 0.01 ? (
                      <span className="text-emerald-700">✓ مطابق بالكامل</span>
                    ) : (
                      <span className={totalDiffKg > 0 ? 'text-rose-700' : 'text-amber-700'}>
                        الفرق الإجمالي: {totalDiffKg} كجم
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Formal Print Signatures */}
          <PrintSignatures settings={settings} />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400">
          لا يملك هذا المكسر عليقة محددة أو لا توجد لفات مخصصة.
        </div>
      )}
    </div>
  );
};
