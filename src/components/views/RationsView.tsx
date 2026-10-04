import React, { useState } from 'react';
import {
  useLanguage,
  getRationDisplayName,
  getMaterialDisplayName,
  getUnitDisplayName,
} from '../../context/LanguageContext';
import { Ration, RationIngredient, RawMaterial } from '../../types';
import {
  calculateRationTotalKgPerHead,
  isConcentrateMaterial,
  isIngredientInConcentratePremix,
  calculateRationDmStats,
  getRawMaterialDryMatterPercent,
} from '../../utils/calculations';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportRationsToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { FatteningRationWizardModal } from '../modals/FatteningRationWizardModal';
import {
  Scale,
  Plus,
  Edit,
  Trash2,
  Wheat,
  ChevronDown,
  Package,
  Truck,
  Info,
  Sliders,
  Sparkles,
  Calculator,
} from 'lucide-react';

interface RationsViewProps {
  rations: Ration[];
  setRations: (items: Ration[]) => void;
  rawMaterials: RawMaterial[];
  hasConcentrateMixer?: boolean;
}

interface FormIngredient {
  rawMaterialId: string;
  amountStr: string;
  inConcentratePremix: boolean;
}

export const RationsView: React.FC<RationsViewProps> = ({
  rations,
  setRations,
  rawMaterials,
  hasConcentrateMixer = true,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { showToast, showConfirm } = useFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRation, setEditingRation] = useState<Ration | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTargetRation, setWizardTargetRation] = useState<Ration | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [calculationType, setCalculationType] = useState<'per_head' | 'fixed_tonnage'>('per_head');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<FormIngredient[]>([]);

  const handleOpenAdd = () => {
    setEditingRation(null);
    setName('');
    setCode(`RAT-00${rations.length + 1}`);
    setCalculationType('per_head');
    setNotes('');
    const defaultIngs: FormIngredient[] = rawMaterials.slice(0, 3).map((rm) => ({
      rawMaterialId: rm.id,
      amountStr: '2',
      inConcentratePremix: isConcentrateMaterial(rm),
    }));
    setIngredients(defaultIngs);
    setIsModalOpen(true);
  };

  const handleApplyWizardRation = (newRation: Ration) => {
    const exists = rations.some((r) => r.id === newRation.id);
    if (exists) {
      setRations(rations.map((r) => (r.id === newRation.id ? newRation : r)));
    } else {
      setRations([...rations, newRation]);
    }
    setEditingRation(newRation);
    setName(newRation.name);
    setCode(newRation.code || '');
    setCalculationType(newRation.calculationType || 'per_head');
    setNotes(newRation.notes || '');
    setIngredients(
      newRation.ingredients.map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        amountStr: String(ing.amountKgPerHead),
        inConcentratePremix: ing.inConcentratePremix ?? true,
      }))
    );
  };

  const handleOpenEdit = (ration: Ration) => {
    setEditingRation(ration);
    setName(ration.name);
    setCode(ration.code || '');
    setCalculationType(ration.calculationType || 'per_head');
    setNotes(ration.notes || '');
    setIngredients(
      ration.ingredients
        ? ration.ingredients.map((ing) => {
            const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
            return {
              rawMaterialId: ing.rawMaterialId,
              amountStr:
                ing.amountKgPerHead !== undefined && ing.amountKgPerHead !== null
                  ? String(ing.amountKgPerHead)
                  : '0',
              inConcentratePremix: isIngredientInConcentratePremix(ing, rawMat),
            };
          })
        : []
    );
    setIsModalOpen(true);
  };

  const handleDeleteRation = (id: string, rationName: string) => {
    showConfirm({
      title: isEn ? 'Delete Ration' : 'حذف عليقة',
      message: isEn
        ? `Are you sure you want to delete ration "${rationName}"?`
        : `هل أنت متأكد من حذف العليقة "${rationName}"؟`,
      isDanger: true,
      confirmText: isEn ? 'Delete' : 'حذف',
      onConfirm: () => {
        setRations(rations.filter((r) => r.id !== id));
        showToast(
          isEn ? 'Ration deleted successfully.' : 'تم حذف العليقة بنجاح.',
          'info'
        );
      },
    });
  };

  const handleAddIngredient = () => {
    const activeMaterials = rawMaterials.filter((rm) => rm.status === 'نشطة');
    const firstMat = activeMaterials[0] || rawMaterials[0];
    if (!firstMat) {
      showToast(
        isEn
          ? 'Please add raw materials first from "Raw Materials" view.'
          : 'يرجى إضافة خامات أولاً من صفحة "الخامات".',
        'warning'
      );
      return;
    }
    setIngredients([
      ...ingredients,
      {
        rawMaterialId: firstMat.id,
        amountStr: calculationType === 'fixed_tonnage' ? '100' : '1',
        inConcentratePremix: isConcentrateMaterial(firstMat),
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: 'rawMaterialId' | 'amountStr' | 'inConcentratePremix',
    value: string | boolean
  ) => {
    const updated = [...ingredients];
    if (field === 'rawMaterialId') {
      const newMat = rawMaterials.find((rm) => rm.id === value);
      updated[index] = {
        ...updated[index],
        rawMaterialId: String(value),
        inConcentratePremix: isConcentrateMaterial(newMat),
      };
    } else if (field === 'amountStr') {
      updated[index] = {
        ...updated[index],
        amountStr: String(value),
      };
    } else if (field === 'inConcentratePremix') {
      updated[index] = {
        ...updated[index],
        inConcentratePremix: Boolean(value),
      };
    }
    setIngredients(updated);
  };

  const handleSaveRation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || ingredients.length === 0) {
      showToast(
        isEn
          ? 'Please enter ration name and add at least one ingredient'
          : 'يرجى إدخال اسم العليقة وإضافة خامة واحدة على الأقل',
        'warning'
      );
      return;
    }

    const finalIngredients: RationIngredient[] = ingredients.map((ing) => {
      const numVal = parseFloat(ing.amountStr);
      return {
        rawMaterialId: ing.rawMaterialId,
        amountKgPerHead: isNaN(numVal) ? 0 : Math.max(0, numVal),
        inConcentratePremix: ing.inConcentratePremix,
      };
    });

    if (editingRation) {
      const updated = rations.map((r) =>
        r.id === editingRation.id
          ? { ...r, name, code, calculationType, notes, ingredients: finalIngredients }
          : r
      );
      setRations(updated);
      showToast(
        isEn ? 'Ration updated successfully.' : 'تم تحديث العليقة بنجاح.',
        'success'
      );
    } else {
      const newRation: Ration = {
        id: generateId('rat'),
        name,
        code,
        calculationType,
        notes,
        ingredients: finalIngredients,
      };
      setRations([...rations, newRation]);
      showToast(
        isEn ? 'New ration added successfully.' : 'تمت إضافة العليقة الجديدة بنجاح.',
        'success'
      );
    }

    setIsModalOpen(false);
  };

  const tempTotalKgPerHead = ingredients.reduce((s, i) => {
    const val = parseFloat(i.amountStr);
    return s + (isNaN(val) ? 0 : val);
  }, 0);

  const formDraftRation: Ration = {
    id: editingRation?.id || 'temp',
    name: name || 'temp',
    calculationType,
    ingredients: ingredients.map((ing) => ({
      rawMaterialId: ing.rawMaterialId,
      amountKgPerHead: Math.max(0, parseFloat(ing.amountStr) || 0),
      inConcentratePremix: ing.inConcentratePremix,
    })),
  };
  const formDmStats = calculateRationDmStats(formDraftRation, rawMaterials);

  const premixKg = ingredients
    .filter((i) => i.inConcentratePremix)
    .reduce((s, i) => s + (parseFloat(i.amountStr) || 0), 0);
  const directKg = tempTotalKgPerHead - premixKg;
  const premixPercent =
    tempTotalKgPerHead > 0 ? Math.round((premixKg / tempTotalKgPerHead) * 1000) / 10 : 0;
  const directPercent =
    tempTotalKgPerHead > 0 ? Math.round((directKg / tempTotalKgPerHead) * 1000) / 10 : 0;

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <span>
              {isEn
                ? 'Ration Formulations & Premix Mixer Assignments'
                : 'تركيبات العلائق وتحديد خامات خلاطة المركز'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Full support for assigning bagged premix materials versus direct loader feeding materials into the TMR mixer'
              : 'دعم كامل لتحديد خامات المركز التي تُخلط وتُعبأ في شكاير مسبقاً مقابل خامات التحميل المباشر لمكسر الـ TMR'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              setWizardTargetRation(null);
              setIsWizardOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 font-black rounded-xl text-xs border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>
              {isEn
                ? '⚡ Smart Beef Wizard (1 Ton Conc. + Roughage)'
                : '⚡ حاسبة التسمين الذكية (طن مركز + مالئ)'}
            </span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Create New Ration' : 'إنشاء عليقة جديدة'}</span>
          </button>
          <ExportExcelButton
            onExport={() => exportRationsToExcel(rations, rawMaterials)}
            label={isEn ? 'Export to Excel' : 'تصدير العلائق للإكسيل'}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Rations Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rations.map((ration) => {
          const totalKgPerHead = calculateRationTotalKgPerHead(ration);
          const isFixedTonnage = ration.calculationType === 'fixed_tonnage';
          const dmStats = calculateRationDmStats(ration, rawMaterials);

          const cardPremixKg = ration.ingredients
            .filter((i) =>
              isIngredientInConcentratePremix(
                i,
                rawMaterials.find((rm) => rm.id === i.rawMaterialId)
              )
            )
            .reduce((s, i) => s + i.amountKgPerHead, 0);
          const cardDirectKg = Math.max(0, totalKgPerHead - cardPremixKg);
          const cardPremixPercent =
            totalKgPerHead > 0 ? Math.round((cardPremixKg / totalKgPerHead) * 1000) / 10 : 0;
          const cardDirectPercent =
            totalKgPerHead > 0 ? Math.round((cardDirectKg / totalKgPerHead) * 1000) / 10 : 0;

          return (
            <div
              key={ration.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">{ration.code}</span>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                          isFixedTonnage
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {isFixedTonnage
                          ? isEn
                            ? '📦 Ton Batch (1000 kg)'
                            : '📦 خلطة بالطن (1000 كجم)'
                          : isEn
                          ? '🐄 Daily Head Feed'
                          : '🐄 علف يومي لكل رأس'}
                      </span>
                    </div>
                    <h4 className="font-black text-lg text-slate-900 mt-1">{getRationDisplayName(ration.name, isEn)}</h4>
                  </div>

                  {/* Summary Metric Badges: As-Fed & Dry Matter (DM) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {/* As-Fed Total */}
                    <div
                      className={`text-left px-3 py-1.5 rounded-xl border ${
                        isFixedTonnage
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold block ${
                          isFixedTonnage ? 'text-purple-800' : 'text-emerald-800'
                        }`}
                      >
                        {isEn ? 'As-Fed Weight' : 'الوزن الرطب (As-Fed)'}
                      </span>
                      <span
                        className={`text-base sm:text-lg font-black ${
                          isFixedTonnage ? 'text-purple-950' : 'text-emerald-950'
                        }`}
                      >
                        {totalKgPerHead.toLocaleString()}{' '}
                        <span className="text-xs font-bold">
                          {isFixedTonnage
                            ? isEn
                              ? 'kg/ton'
                              : 'كجم/طن'
                            : isEn
                            ? 'kg/head'
                            : 'كجم/رأس'}
                        </span>
                      </span>
                    </div>

                    {/* Dry Matter (DM) Total */}
                    <div className="text-left px-3 py-1.5 rounded-xl border bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold text-blue-800 block">
                          {isEn ? 'Dry Matter (DM)' : 'المادة الجافة (DM)'}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.2 bg-blue-600 text-white rounded-md">
                          {dmStats.dmPercent}% DM
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-black text-blue-950">
                        {dmStats.totalDmKgPerHead.toLocaleString()}{' '}
                        <span className="text-xs font-bold">
                          {isFixedTonnage
                            ? isEn
                              ? 'kg DM/ton'
                              : 'كجم DM/طن'
                            : isEn
                            ? 'kg DM/head'
                            : 'كجم DM/رأس'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mixing & Dry Matter Quick Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* DM Badge */}
                    <span className="font-black text-blue-950 bg-blue-100/90 px-2 py-1 rounded-md border border-blue-300 flex items-center gap-1">
                      <Wheat className="w-3.5 h-3.5 text-blue-700" />
                      <span>
                        {isEn ? 'Total Dry Matter (DM):' : 'المادة الجافة الكلية (DM):'}{' '}
                        <strong>{dmStats.dmPercent}%</strong> ({dmStats.totalDmKgPerHead.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'})
                      </span>
                    </span>

                    {hasConcentrateMixer && (
                      <>
                        <span className="font-extrabold text-amber-950 bg-amber-100/80 px-2 py-1 rounded-md border border-amber-300 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {isEn ? 'Concentrate Mixer:' : 'خلاطة المركز:'} {Math.round(cardPremixKg * 10) / 10} {isEn ? 'kg' : 'كجم'} ({cardPremixPercent}%)
                          </span>
                        </span>
                        <span className="font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {isEn ? 'Direct TMR:' : 'مكسر TMR مباشر:'} {Math.round(cardDirectKg * 10) / 10} {isEn ? 'kg' : 'كجم'} ({cardDirectPercent}%)
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  {ration.notes || (isEn ? 'No additional notes' : 'لا توجد ملاحظات إضافية')}
                </p>

                {/* Ingredient Table preview with DM columns */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className={`w-full ${isEn ? 'text-left' : 'text-right'} text-xs`}>
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">{isEn ? 'Feed Material' : 'الخامة العلفية'}</th>
                        <th className="py-2 px-3">
                          {isFixedTonnage
                            ? isEn
                              ? 'As-Fed (kg/ton)'
                              : 'الكمية الرطبة (كجم/طن)'
                            : isEn
                            ? 'As-Fed (kg/head)'
                            : 'الكمية الرطبة (كجم/رأس)'}
                        </th>
                        <th className="py-2 px-3">{isEn ? 'Ratio %' : 'النسبة %'}</th>
                        <th className="py-2 px-3 bg-blue-50/70 text-blue-900">{isEn ? 'Dry Matter %' : 'المادة الجافة % (DM)'}</th>
                        <th className="py-2 px-3 bg-blue-50/70 text-blue-900">
                          {isFixedTonnage
                            ? isEn
                              ? 'kg DM / Ton'
                              : 'كجم DM / طن'
                            : isEn
                            ? 'kg DM / Head'
                            : 'كجم DM / رأس'}
                        </th>
                        {hasConcentrateMixer && <th className="py-2 px-3">{isEn ? 'Loading Method' : 'طريقة الخلط والتجهيز'}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {ration.ingredients.map((ing, idx) => {
                        const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                        const percent =
                          totalKgPerHead > 0
                            ? Math.round((ing.amountKgPerHead / totalKgPerHead) * 1000) / 10
                            : 0;
                        const inPremix = isIngredientInConcentratePremix(ing, rawMat);
                        const matDmPercent = getRawMaterialDryMatterPercent(rawMat);
                        const ingDmKg = Math.round(ing.amountKgPerHead * (matDmPercent / 100) * 1000) / 1000;

                        return (
                          <tr
                            key={`${ration.id}-${ing.rawMaterialId || 'ing'}-${idx}`}
                            className="hover:bg-slate-50"
                          >
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {rawMat ? getMaterialDisplayName(rawMat.name, isEn) : (isEn ? 'Raw Material' : 'خامة')}
                            </td>
                            <td className="py-2 px-3 font-extrabold text-emerald-950">
                              {ing.amountKgPerHead.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-bold">{percent}%</td>
                            <td className="py-2 px-3 font-black text-blue-800 bg-blue-50/30">
                              {matDmPercent}%
                            </td>
                            <td className="py-2 px-3 font-extrabold text-blue-950 bg-blue-50/30">
                              {ingDmKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                            </td>
                            {hasConcentrateMixer && (
                              <td className="py-2 px-3">
                                {inPremix ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                                    <Package className="w-3 h-3 text-amber-700" />
                                    <span>{isEn ? 'Concentrate Mixer (Bags)' : 'خلاطة المركز (شكاير)'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                    <Truck className="w-3 h-3 text-slate-500" />
                                    <span>{isEn ? 'Direct TMR Loader' : 'مكسر TMR مباشر'}</span>
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900">
                      <tr>
                        <td className="py-2 px-3 text-slate-700">{isEn ? 'Total:' : 'الإجمالي:'}</td>
                        <td className="py-2 px-3 text-emerald-950">
                          {totalKgPerHead.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                        </td>
                        <td className="py-2 px-3 text-slate-600">100%</td>
                        <td className="py-2 px-3 text-blue-800 bg-blue-100/60 font-black">
                          {dmStats.dmPercent}% DM
                        </td>
                        <td className="py-2 px-3 text-blue-950 bg-blue-100/60 font-black">
                          {dmStats.totalDmKgPerHead.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                        </td>
                        {hasConcentrateMixer && <td className="py-2 px-3">-</td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setWizardTargetRation(ration);
                    setIsWizardOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 font-extrabold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title={isEn ? 'Recompute ration using beef weight and target gain wizard' : 'إعادة احتساب وتعديل العليقة بواسطة حاسبة التسمين الذكية'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isEn ? 'Adjust with Beef Calculator' : 'تعديل بحاسبة التسمين والوزن'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(ration)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> {isEn ? 'Edit' : 'تعديل يدوي'}
                  </button>
                  <button
                    onClick={() => handleDeleteRation(ration.id, ration.name)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {isEn ? 'Delete' : 'حذف'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Ration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto ${isEn ? 'text-left' : 'text-right'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editingRation
                    ? isEn
                      ? 'Edit Ration Formula & Mixer Assignments'
                      : 'تعديل تركيبة العليقة وتحديد خامات الخلاطة'
                    : isEn
                    ? 'Create New Ration'
                    : 'إنشاء عليقة جديدة'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'Select concentrate premix materials to be bagged with a single click'
                    : 'حدد خامات المركز التي ستُخلط وتُعبأ في شكاير بنقرة واحدة'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick banner for fattening wizard */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-950 font-bold">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {isEn
                    ? 'Want to calculate a feedlot ration automatically (1 ton conc. + silage/straw per steer weight)?'
                    : 'تريد حساب عليقة تسمين تلقائياً (طن مركز + سيلاج وتبن ثابت حسب وزن العجل)؟'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentFormIngredients: RationIngredient[] = ingredients
                    .filter((ing) => ing.rawMaterialId && Number(ing.amountStr) > 0)
                    .map((ing) => ({
                      rawMaterialId: ing.rawMaterialId,
                      amountKgPerHead: parseFloat(ing.amountStr) || 0,
                      inConcentratePremix: ing.inConcentratePremix,
                    }));

                  const draftRation: Ration = {
                    id: editingRation?.id || generateId('rat'),
                    name: name.trim() || (editingRation?.name || (isEn ? 'Complete Feedlot Ration' : 'عليقة تسمين متكاملة')),
                    code: code.trim() || (editingRation?.code || 'RAT-FAT-NEW'),
                    calculationType: 'per_head',
                    notes: notes || (editingRation?.notes || ''),
                    ingredients: currentFormIngredients.length > 0 ? currentFormIngredients : (editingRation?.ingredients || []),
                  };

                  setWizardTargetRation(draftRation);
                  setIsModalOpen(false);
                  setIsWizardOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                {isEn ? 'Open Smart Wizard ⚡' : 'فتح الحاسبة الذكية ⚡'}
              </button>
            </div>

            <form onSubmit={handleSaveRation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Ration Name *' : 'اسم العليقة *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isEn ? 'e.g., High-Yield Dairy TMR...' : 'مثال: عليقة الحلاب عالية الإنتاج...'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Ration Code' : 'كود العليقة'}
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Calculation Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Calculation & Formulation Method:' : 'طريقة الحساب والتصميم العلفي:'}
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCalculationType('per_head')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      calculationType === 'per_head'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isEn
                      ? '🐄 Daily kg per Head (Dairy / Beef / Growing)'
                      : '🐄 كجم لكل رأس يومياً (حلاب / تسمين / نامي)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationType('fixed_tonnage')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      calculationType === 'fixed_tonnage'
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isEn
                      ? '📦 1 Ton Batch Mix (1000 kg for Calves & Weaners)'
                      : '📦 خلطة بالطن (1 طن = 1000 كجم للرضيع والفطام)'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {calculationType === 'fixed_tonnage'
                    ? isEn
                      ? '💡 In ton mixes: Enter ingredients for 1 single ton (1000 kg). The system automatically scales materials when batch orders are generated.'
                      : '💡 في الخلطات بالطن: يتم إدخال مقادير الطن الواحد (1000 كجم) وسيقوم البرنامج بمضاعفة الخامات تلقائياً عند طلب أطنان إضافية.'
                    : isEn
                    ? '💡 In per-head rations: The system calculates daily demand by multiplying head amount × head count × feeding ratio %.'
                    : '💡 في علائق الرأس: يحسب البرنامج الاحتياج اليومي بضرب كمية الرأس × عدد الرؤوس × نسبة التغذية.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Ration Remarks' : 'ملاحظات العليقة'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Production target, physiological phase...' : 'مستهدف الإنتاج، المرحلة الفسيولوجية...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              {/* Dynamic Ingredient Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {calculationType === 'fixed_tonnage'
                        ? isEn
                          ? 'Ingredients in 1 Ton (kg per 1000 kg):'
                          : 'مكونات الطن الواحد (كجم في كل 1000 كجم):'
                        : isEn
                        ? 'Ingredient Amounts (kg / head / day):'
                        : 'مكونات الخامات (كجم / رأس / يوم):'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isEn
                        ? 'Designate each material for bagged dry premix or direct TMR loader feeding'
                        : 'حدد لكل خامة ما إذا كانت ستدخل في خلاطة المركز المسبق أو تُحمّل مباشرة بالمكسر'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> {isEn ? 'Add Material' : 'إضافة خامة'}
                  </button>
                </div>

                {/* Explanation Banner */}
                {hasConcentrateMixer && (
                  <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black">{isEn ? 'Flexible Mixer Allocation: ' : 'مرونة تحديد خامات الخلاطة: '}</span>
                      <span>
                        {isEn
                          ? 'Toggle the badge on each material to specify if it is bagged via Premix Mixer 📦 or loaded directly via TMR Mixer 🚜 (such as silage, straw, and hay).'
                          : 'انقر على زر كل خامة لاختيار ما إذا كانت ستدخل في خلاطة المركز المسبق (شكاير) 📦 أو ستُحمّل مباشرة بمكسر الـ TMR 🚜 (كالسيلاج، الدريس، أو أي خامات أخرى تفضل تحميلها باللودر مباشرة).'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200"
                    >
                      <select
                        value={ing.rawMaterialId}
                        onChange={(e) =>
                          handleIngredientChange(idx, 'rawMaterialId', e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {getMaterialDisplayName(rm.name, isEn)} ({getUnitDisplayName(rm.unit, isEn)}) - [DM: {rm.dryMatterPercent ?? 88}%]
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ing.amountStr}
                          onChange={(e) =>
                            handleIngredientChange(idx, 'amountStr', e.target.value)
                          }
                          placeholder="0"
                          className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-emerald-950 text-center text-xs focus:outline-emerald-600"
                        />
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">
                          {calculationType === 'fixed_tonnage'
                            ? isEn
                              ? 'kg/ton'
                              : 'كجم/طن'
                            : isEn
                            ? 'kg/head'
                            : 'كجم/رأس'}
                        </span>
                      </div>

                      {/* Ingredient DM Calculation Tag */}
                      {(() => {
                        const curMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                        const matDm = getRawMaterialDryMatterPercent(curMat);
                        const curKg = parseFloat(ing.amountStr) || 0;
                        const curDmKg = Math.round(curKg * (matDm / 100) * 100) / 100;
                        return (
                          <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-950 flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
                            <span className="text-blue-700 font-black">{matDm}% DM</span>
                            <span className="text-slate-300">|</span>
                            <span>{curDmKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}</span>
                          </div>
                        );
                      })()}

                      {/* Mixing Method Toggle Button */}
                      {hasConcentrateMixer && (
                        <button
                          type="button"
                          onClick={() =>
                            handleIngredientChange(idx, 'inConcentratePremix', !ing.inConcentratePremix)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border shrink-0 ${
                            ing.inConcentratePremix
                              ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200 shadow-2xs'
                              : 'bg-slate-200/80 text-slate-700 border-slate-300 hover:bg-slate-300'
                          }`}
                          title={isEn ? 'Toggle between bagged premix mixer or direct loader feeding' : 'انقر للتبديل بين وضع الخامة في خلاطة المركز المسبق أو تحميلها مباشرة بمكسر الـ TMR'}
                        >
                          {ing.inConcentratePremix ? (
                            <>
                              <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="whitespace-nowrap font-black">
                                {isEn ? 'Concentrate Mixer (Bags) 📦' : 'خلاطة المركز (شكاير) 📦'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span className="whitespace-nowrap font-bold">
                                {isEn ? 'Direct TMR Loader 🚜' : 'مكسر TMR مباشر 🚜'}
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer self-end sm:self-auto"
                        title={isEn ? 'Remove material' : 'حذف الخامة'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-black text-amber-950">
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-amber-700" />
                        <span>{isEn ? 'Premix Mixer (Bags):' : 'خلاطة المركز (شكاير):'}</span>
                      </span>
                      <span className="text-amber-900 font-extrabold text-sm">{premixPercent}%</span>
                    </div>
                    <div className="text-sm font-black text-amber-950">
                      {Math.round(premixKg * 100) / 100}{' '}
                      <span className="text-xs font-normal">
                        {calculationType === 'fixed_tonnage'
                          ? isEn
                            ? 'kg / ton'
                            : 'كجم / طن'
                          : isEn
                          ? 'kg / head'
                          : 'كجم / رأس'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      {isEn
                        ? 'Premixed and bagged in advance, ready for TMR batches'
                        : 'تُخلط وتُعبأ في شكاير مسبقاً وتُسحب جاهزة لخلطات المكسر'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-black text-slate-800">
                      <span className="flex items-center gap-1">
                        <Truck className="w-4 h-4 text-slate-600" />
                        <span>{isEn ? 'Direct TMR Loading:' : 'التحميل المباشر بمكسر TMR:'}</span>
                      </span>
                      <span className="text-slate-900 font-extrabold text-sm">{directPercent}%</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {Math.round(directKg * 100) / 100}{' '}
                      <span className="text-xs font-normal">
                        {calculationType === 'fixed_tonnage'
                          ? isEn
                            ? 'kg / ton'
                            : 'كجم / طن'
                          : isEn
                          ? 'kg / head'
                          : 'كجم / رأس'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {isEn
                        ? 'Loaded directly by loader into TMR mixer (silage and hay)'
                        : 'تُحمّل منفردة باللودر مباشرة في مكسر الـ TMR (كالسيلاج والدريس)'}
                    </p>
                  </div>

                  {/* Dry Matter (DM) Live Card */}
                  <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-black text-blue-950">
                      <span className="flex items-center gap-1">
                        <Wheat className="w-4 h-4 text-blue-700" />
                        <span>{isEn ? 'Dry Matter (DM):' : 'المادة الجافة (Dry Matter):'}</span>
                      </span>
                      <span className="text-blue-900 font-black text-sm bg-blue-200/80 px-1.5 py-0.5 rounded-md">
                        {formDmStats.dmPercent}% DM
                      </span>
                    </div>
                    <div className="text-sm font-black text-blue-950">
                      {formDmStats.totalDmKgPerHead.toLocaleString()}{' '}
                      <span className="text-xs font-normal">
                        {calculationType === 'fixed_tonnage'
                          ? isEn
                            ? 'kg DM / ton'
                            : 'كجم DM / طن'
                          : isEn
                            ? 'kg DM / head'
                            : 'كجم DM / رأس'}
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700">
                      {isEn ? 'Total moisture:' : 'نسبة الرطوبة الإجمالية:'}{' '}
                      {Math.max(0, Math.round((100 - formDmStats.dmPercent) * 10) / 10)}%
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-black text-xs ${
                    calculationType === 'fixed_tonnage'
                      ? 'bg-purple-900 text-purple-50'
                      : 'bg-emerald-900 text-emerald-50'
                  }`}
                >
                  <div>
                    <span className="block text-sm">
                      {calculationType === 'fixed_tonnage'
                        ? isEn
                          ? 'Total 1-Ton Mix Formulation Weight:'
                          : 'إجمالي وزن تركيبة الطن الواحد الكاملة:'
                        : isEn
                        ? 'Total Daily Ration Weight per Head:'
                        : 'إجمالي وزن العليقة للرأس الواحدة باليوم:'}
                    </span>
                    <span className="text-[11px] text-emerald-200/90 font-normal">
                      {isEn ? 'Dry Matter:' : 'المادة الجافة:'}{' '}
                      {formDmStats.totalDmKgPerHead.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'} ({isEn ? 'DM Ratio:' : 'نسبة DM:'} {formDmStats.dmPercent}%)
                    </span>
                  </div>
                  <span className="text-amber-300 text-base font-mono font-black">
                    {(Math.round(tempTotalKgPerHead * 10000) / 10000).toLocaleString()}{' '}
                    {calculationType === 'fixed_tonnage'
                      ? isEn
                        ? 'kg / ton'
                        : 'كجم / طن'
                      : isEn
                      ? 'kg / head'
                      : 'كجم / رأس'}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  {isEn ? 'Save Ration & Settings' : 'حفظ العليقة والخيارات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fattening Ration Wizard Modal */}
      <FatteningRationWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardTargetRation(null);
        }}
        rawMaterials={rawMaterials}
        rations={rations}
        onApplyRation={handleApplyWizardRation}
        existingRation={wizardTargetRation}
      />
    </div>
  );
};
