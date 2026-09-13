import React, { useState } from 'react';
import { Barn, AnimalCategory, Ration } from '../../types';
import {
  calculateBarnDailyDemand,
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateRationTotalKgPerHead,
  estimateCalfStarterIntakeKgPerHead,
  getBarnEffectiveBaseFeedPerHead,
} from '../../utils/calculations';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportBarnsToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { Home, Plus, Edit, Trash2, Scale, ArrowDownRight, RefreshCw, Sparkles } from 'lucide-react';

interface BarnsViewProps {
  barns: Barn[];
  setBarns: (items: Barn[]) => void;
  categories: AnimalCategory[];
  rations?: Ration[];
}

export const BarnsView: React.FC<BarnsViewProps> = ({
  barns,
  setBarns,
  categories,
  rations = [],
}) => {
  const { showToast, showConfirm } = useFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarn, setEditingBarn] = useState<Barn | null>(null);

  // Form
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [headCount, setHeadCount] = useState<number>(50);
  const [baseFeedKgPerHead, setBaseFeedKgPerHead] = useState<number>(50);
  const [feedingRatioPercent, setFeedingRatioPercent] = useState<number>(100);
  
  // Calf / Weaner & Custom Estimation fields
  const [averageAgeDays, setAverageAgeDays] = useState<number | undefined>(undefined);
  const [averageWeightKg, setAverageWeightKg] = useState<number | undefined>(undefined);
  const [customDailyTotalKg, setCustomDailyTotalKg] = useState<number | undefined>(undefined);
  const [calculationMode, setCalculationMode] = useState<'auto_ration' | 'calf_growth' | 'manual_total'>('auto_ration');

  const [recycledRefusalAllocatedKg, setRecycledRefusalAllocatedKg] = useState<number>(0);
  const [refusalType, setRefusalType] = useState<'percent' | 'kg'>('percent');
  const [refusalValue, setRefusalValue] = useState<number>(0);
  const [status, setStatus] = useState<Barn['status']>('نشط');
  const [notes, setNotes] = useState('');

  // Selected Category Helper
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCategoryRation = rations.find((r) => r.id === selectedCategory?.rationId);
  const rationTotalKgPerHead = calculateRationTotalKgPerHead(selectedCategoryRation);

  // Handle Category Change inside form
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    const catRation = rations.find((r) => r.id === cat?.rationId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام') ||
      (cat?.name || '').toLowerCase().includes('calf');

    if (isCalf) {
      if (calculationMode === 'auto_ration') {
        setCalculationMode('calf_growth');
      }
      const estimated = estimateCalfStarterIntakeKgPerHead(averageAgeDays || 45, averageWeightKg);
      setBaseFeedKgPerHead(estimated);
    } else {
      setCalculationMode('auto_ration');
      const rationKg = calculateRationTotalKgPerHead(catRation);
      if (rationKg > 0) {
        setBaseFeedKgPerHead(rationKg);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingBarn(null);
    setNumber(`عنبر ${barns.length + 1}`);
    setName('');
    const defaultCat = categories[0]?.id || '';
    setCategoryId(defaultCat);
    
    const cat = categories.find((c) => c.id === defaultCat);
    const catRation = rations.find((r) => r.id === cat?.rationId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام');

    if (isCalf) {
      setCalculationMode('calf_growth');
      setAverageAgeDays(45);
      setAverageWeightKg(65);
      setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(45, 65));
    } else {
      setCalculationMode('auto_ration');
      const rationKg = calculateRationTotalKgPerHead(catRation);
      setBaseFeedKgPerHead(rationKg > 0 ? rationKg : 44.5);
      setAverageAgeDays(undefined);
      setAverageWeightKg(undefined);
    }

    setCustomDailyTotalKg(undefined);
    setHeadCount(50);
    setFeedingRatioPercent(100);
    setRecycledRefusalAllocatedKg(0);
    setRefusalType('percent');
    setRefusalValue(0);
    setStatus('نشط');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (barn: Barn) => {
    setEditingBarn(barn);
    setNumber(barn.number);
    setName(barn.name || '');
    setCategoryId(barn.categoryId);
    setHeadCount(barn.headCount);
    setBaseFeedKgPerHead(barn.baseFeedKgPerHead);
    setFeedingRatioPercent(barn.feedingRatioPercent);
    setAverageAgeDays(barn.averageAgeDays);
    setAverageWeightKg(barn.averageWeightKg);
    setCustomDailyTotalKg(barn.customDailyTotalKg);

    const cat = categories.find((c) => c.id === barn.categoryId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام');

    if (barn.customDailyTotalKg && barn.customDailyTotalKg > 0) {
      setCalculationMode('manual_total');
    } else if (isCalf || barn.averageAgeDays || barn.averageWeightKg) {
      setCalculationMode('calf_growth');
    } else {
      setCalculationMode('auto_ration');
    }

    setRecycledRefusalAllocatedKg(barn.recycledRefusalAllocatedKg || 0);
    setRefusalType(barn.refusalType || 'percent');
    setRefusalValue(barn.refusalValue || 0);
    setStatus(barn.status);
    setNotes(barn.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteBarn = (id: string, barnLabel: string) => {
    showConfirm({
      title: 'حذف عنبر',
      message: `هل أنت متأكد من حذف العنبر (${barnLabel})؟`,
      isDanger: true,
      confirmText: 'حذف',
      onConfirm: () => {
        setBarns(barns.filter((b) => b.id !== id));
        showToast('تم حذف العنبر بنجاح.', 'info');
      },
    });
  };

  const handleSaveBarn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !categoryId || headCount <= 0) {
      showToast('يرجى كتابة رقم العنبر واختيار الفئة وإدخال عدد الرؤوس.', 'warning');
      return;
    }

    // Effective final baseFeedKg
    let finalBaseFeed = baseFeedKgPerHead;
    if (calculationMode === 'auto_ration' && rationTotalKgPerHead > 0) {
      finalBaseFeed = rationTotalKgPerHead;
    } else if (calculationMode === 'calf_growth') {
      finalBaseFeed = estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg);
    }

    const finalCustomTotal = calculationMode === 'manual_total' ? (Number(customDailyTotalKg) || 0) : undefined;

    if (editingBarn) {
      const updated = barns.map((b) =>
        b.id === editingBarn.id
          ? {
              ...b,
              number,
              name,
              categoryId,
              headCount,
              baseFeedKgPerHead: finalBaseFeed > 0 ? finalBaseFeed : 1,
              feedingRatioPercent,
              averageAgeDays: calculationMode === 'calf_growth' ? averageAgeDays : undefined,
              averageWeightKg: calculationMode === 'calf_growth' ? averageWeightKg : undefined,
              customDailyTotalKg: finalCustomTotal,
              recycledRefusalAllocatedKg: Math.max(0, Number(recycledRefusalAllocatedKg) || 0),
              refusalType,
              refusalValue,
              status,
              notes,
            }
          : b
      );
      setBarns(updated);
      showToast('تم تحديث بيانات العنبر بنجاح.', 'success');
    } else {
      const newBarn: Barn = {
        id: generateId('barn'),
        number,
        name,
        categoryId,
        headCount,
        baseFeedKgPerHead: finalBaseFeed > 0 ? finalBaseFeed : 1,
        feedingRatioPercent,
        averageAgeDays: calculationMode === 'calf_growth' ? averageAgeDays : undefined,
        averageWeightKg: calculationMode === 'calf_growth' ? averageWeightKg : undefined,
        customDailyTotalKg: finalCustomTotal,
        recycledRefusalAllocatedKg: Math.max(0, Number(recycledRefusalAllocatedKg) || 0),
        refusalType,
        refusalValue,
        status,
        notes,
      };
      setBarns([...barns, newBarn]);
      showToast('تمت إضافة العنبر بنجاح.', 'success');
    }

    setIsModalOpen(false);
  };

  // Preview Calculations inside modal
  const previewEffectiveBase = calculationMode === 'manual_total'
    ? (customDailyTotalKg && headCount > 0 ? Math.round((customDailyTotalKg / headCount) * 100) / 100 : 0)
    : calculationMode === 'calf_growth'
    ? estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg)
    : (rationTotalKgPerHead > 0 ? rationTotalKgPerHead : baseFeedKgPerHead);

  const currentGrossDemand = calculationMode === 'manual_total' && (customDailyTotalKg || 0) > 0
    ? Math.round((Number(customDailyTotalKg) || 0) * (feedingRatioPercent / 100) * 100) / 100
    : Math.round(headCount * previewEffectiveBase * (feedingRatioPercent / 100) * 100) / 100;

  const currentNetFreshDemand = Math.max(0, Math.round((currentGrossDemand - (Number(recycledRefusalAllocatedKg) || 0)) * 100) / 100);

  const currentCalculatedRefusalKg = refusalType === 'kg'
    ? Math.min(currentGrossDemand, refusalValue)
    : Math.round(((currentGrossDemand * Math.max(0, Math.min(100, refusalValue))) / 100) * 100) / 100;

  const currentCalculatedIntakeKg = Math.max(0, currentGrossDemand - currentCalculatedRefusalKg);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-700" />
            <span>إدارة العنابر والأحواش (Barns & Pens)</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            تسجيل العنابر وربطها التلقائي بالعلائق، مع دعم حساب سحب الرواضع والفطام بالعمر والوزن أو التقدير المباشر
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عنبر جديد</span>
          </button>
          <ExportExcelButton
            onExport={() => exportBarnsToExcel(barns, categories, rations)}
            label="تصدير العنابر للإكسيل"
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Barns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-700 font-bold">
                <th className="py-3.5 px-4">رقم العنبر</th>
                <th className="py-3.5 px-4">الفئة</th>
                <th className="py-3.5 px-4">عدد الرؤوس</th>
                <th className="py-3.5 px-4">الأساسي (كجم/رأس)</th>
                <th className="py-3.5 px-4">نسبة التغذية %</th>
                <th className="py-3.5 px-4 text-emerald-950 bg-emerald-50/80">صافي الطازج المطلوب TMR</th>
                <th className="py-3.5 px-4 text-cyan-950 bg-cyan-50/80">راجع حلاب محول (كجم)</th>
                <th className="py-3.5 px-4 text-amber-950 bg-amber-50/60">راجع طوالة العنبر</th>
                <th className="py-3.5 px-4 text-blue-950 bg-blue-50/60">المأكول الفعلي (كجم)</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {barns.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    لا توجد عنابر مضافة.
                  </td>
                </tr>
              ) : (
                barns.map((barn) => {
                  const category = categories.find((c) => c.id === barn.categoryId);
                  const netFreshDemandKg = calculateBarnDailyDemand(barn, categories, rations);
                  const grossDemandKg = calculateBarnGrossDemandKg(barn, categories, rations);
                  const recycledKg = calculateBarnRecycledRefusalKg(barn);
                  const refusalKg = calculateBarnRefusalKg(barn, categories, rations);
                  const intakeKg = calculateBarnActualIntakeKg(barn, categories, rations);
                  const effectiveBase = getBarnEffectiveBaseFeedPerHead(barn, categories, rations);

                  const isCalf =
                    category?.calculationType === 'fixed_tonnage' ||
                    category?.isPeriodicMixer ||
                    (category?.name || '').toLowerCase().includes('رضيع') ||
                    (category?.name || '').toLowerCase().includes('فطام');

                  return (
                    <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 text-base">
                        <div className="flex flex-col">
                          <span>{barn.number}</span>
                          {barn.name && <span className="text-[11px] font-semibold text-slate-500">{barn.name}</span>}
                          {isCalf && (barn.averageAgeDays || barn.averageWeightKg) && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block w-fit">
                              {barn.averageAgeDays ? `عمر ${barn.averageAgeDays} يوم` : ''}
                              {barn.averageAgeDays && barn.averageWeightKg ? ' • ' : ''}
                              {barn.averageWeightKg ? `وزن ${barn.averageWeightKg} كجم` : ''}
                            </span>
                          )}
                          {barn.customDailyTotalKg && (
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5 inline-block w-fit">
                              تقدير يدوي: {barn.customDailyTotalKg} كجم
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs border border-emerald-200">
                          {category?.name || 'عام'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{barn.headCount} رأس</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {effectiveBase} كجم
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md font-bold text-xs text-slate-800">
                          {barn.feedingRatioPercent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-950 bg-emerald-50/70 text-base">
                        <div>{netFreshDemandKg.toLocaleString()} كجم</div>
                        {recycledKg > 0 && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            (من إجمالي {grossDemandKg.toLocaleString()} كجم)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 bg-cyan-50/40">
                        {recycledKg > 0 ? (
                          <span className="inline-flex items-center gap-1 font-black text-cyan-900 bg-cyan-100/80 px-2 py-0.5 rounded-md text-xs border border-cyan-300">
                            <RefreshCw className="w-3 h-3 text-cyan-700" />
                            {recycledKg.toLocaleString()} كجم
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 bg-amber-50/40">
                        {refusalKg > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-amber-900 text-xs">
                              {refusalKg} كجم
                            </span>
                            <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                              {barn.refusalType === 'kg' ? 'وزن' : `${barn.refusalValue || 0}%`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">0 (ممسوح)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-blue-900 bg-blue-50/40 text-sm">
                        {intakeKg.toLocaleString()} كجم
                      </td>
                      <td className="py-3.5 px-4 font-bold text-xs">
                        <span className={`px-2.5 py-1 rounded-full ${barn.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {barn.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(barn)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarn(barn.id, barn.name ? `${barn.number} (${barn.name})` : barn.number)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Barn Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBarn ? 'تعديل بيانات العنبر' : 'إضافة عنبر جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBarn} className="space-y-4 text-right">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم/رمز العنبر *</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="عنبر 1، عنبر 2..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العنبر (اختياري)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نامي A، حلاب 1، رضيع 70 يوم..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الفئة الحيوانية التابع لها *</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isPeriodicMixer ? '(دوري بالطن / خلط متباعد)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Selector for Feed Calculation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">طريقة احتساب كمية علف العنبر:</span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCalculationMode('auto_ration')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'auto_ration'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      تلقائي من العليقة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalculationMode('calf_growth');
                        if (!averageAgeDays) setAverageAgeDays(45);
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'calf_growth'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      بالعمر والوزن (رضيع)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalculationMode('manual_total')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'manual_total'
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      تقدير يدوي بالعين
                    </button>
                  </div>
                </div>

                {/* Sub-panels based on mode */}
                {calculationMode === 'auto_ration' && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-950 font-bold">
                      <span>العليقة المعتمدة للفئة:</span>
                      <span className="font-black text-emerald-800">{selectedCategoryRation?.name || 'محددة بالنظام'}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-900">
                      <span>مقرر الرأس التلقائي من العليقة:</span>
                      <span className="font-black text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {rationTotalKgPerHead > 0 ? `${rationTotalKgPerHead} كجم/رأس` : `${baseFeedKgPerHead} كجم/رأس`}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-medium pt-1">
                      يتم سحب الوزن التلقائي للرأس من مجموع مكونات العليقة المعتمدة مباشرة بدون الحاجة لإدخاله يدوياً.
                    </p>
                  </div>
                )}

                {calculationMode === 'calf_growth' && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span>حساب استهلاك الرضيع والفطام بناءً على منحنى العمر والوزن:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">متوسط العمر (بالأيام)</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={averageAgeDays !== undefined ? averageAgeDays : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            setAverageAgeDays(val);
                            setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(val, averageWeightKg));
                          }}
                          placeholder="مثال 30 أو 70 يوم"
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">متوسط وزن الرأس (كجم اختياري)</label>
                        <input
                          type="number"
                          step="any"
                          min={1}
                          value={averageWeightKg !== undefined ? averageWeightKg : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            setAverageWeightKg(val);
                            setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(averageAgeDays, val));
                          }}
                          placeholder="مثال 60 أو 90 كجم"
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/90 p-2 rounded-lg border border-amber-200 text-amber-950 font-bold text-[11px]">
                      <span>معدل سحب الرأس المتوقع للعمر:</span>
                      <span className="text-amber-800 font-black text-xs bg-amber-100/70 px-2 py-0.5 rounded">
                        {estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg)} كجم علف مركز / رأس / يوم
                      </span>
                    </div>
                  </div>
                )}

                {calculationMode === 'manual_total' && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-purple-700" />
                        <span>تقدير إجمالي كمية العلف للعنبر بالكامل (كجم)</span>
                      </label>
                      <span className="text-[10px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded border border-purple-200">
                        تقدير عيني مباشر
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min={1}
                        value={customDailyTotalKg !== undefined ? customDailyTotalKg : ''}
                        placeholder="مثال 100 كجم..."
                        onChange={(e) => setCustomDailyTotalKg(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-black text-purple-950 focus:outline-purple-600 text-center"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs font-bold text-purple-700 pointer-events-none">
                        كجم إجمالي للعنبر
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-800 font-medium">
                      اكتب تقديرك بالعين (مثلاً 100 كجم)، وسيحسب النظام تلقائياً حصة كل رأس ويوزعها على لفة المكسر بدقة.
                    </p>
                  </div>
                )}
              </div>

              {/* HeadCount & Feeding Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد الرؤوس في العنبر *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={headCount || ''}
                    onChange={(e) => setHeadCount(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نسبة التغذية % *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="300"
                      required
                      value={feedingRatioPercent || ''}
                      onChange={(e) => setFeedingRatioPercent(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 text-center"
                    />
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
              </div>

              {/* Recycled Refusal Allocation from Milking Barns */}
              <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-cyan-700" />
                    <span>تخصيص راجع حلاب مدوّر للعنبر (كجم)</span>
                  </label>
                  <span className="text-[11px] text-cyan-800 font-bold">مخصص للنامي والتسمين</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={recycledRefusalAllocatedKg !== undefined ? recycledRefusalAllocatedKg : ''}
                    placeholder="مثال 200 كجم..."
                    onChange={(e) => setRecycledRefusalAllocatedKg(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-lg text-xs font-black text-cyan-950 focus:outline-cyan-600 text-center"
                  />
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-cyan-800 pointer-events-none">
                    كجم راجع حلاب
                  </span>
                </div>
                <p className="text-[10px] text-cyan-800 font-medium">
                  يتم خصم كمية الراجع تلقائياً من كمية العلف الطازج المطلوب خلطه بالمكسر لهذا العنبر.
                </p>
              </div>

              {/* Individual Barn Feed Refusal Controls */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-amber-700" />
                    <span>راجع طوالة العنبر المتبقي في نهاية اليوم</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (refusalType === 'percent') return;
                        const kgVal = Number(refusalValue) || 0;
                        const pctVal = currentGrossDemand > 0
                          ? Math.round(((kgVal / currentGrossDemand) * 100) * 10) / 10
                          : 0;
                        setRefusalValue(pctVal);
                        setRefusalType('percent');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        refusalType === 'percent'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      نسبة %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (refusalType === 'kg') return;
                        const pctVal = Number(refusalValue) || 0;
                        const kgVal = Math.round(((currentGrossDemand * pctVal) / 100) * 10) / 10;
                        setRefusalValue(kgVal);
                        setRefusalType('kg');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        refusalType === 'kg'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      وزن كجم
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={refusalValue !== undefined ? refusalValue : ''}
                      placeholder={refusalType === 'percent' ? 'مثال 5%' : 'مثال 150 كجم'}
                      onChange={(e) => setRefusalValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                    />
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-amber-800 pointer-events-none">
                      {refusalType === 'kg' ? 'كجم' : '%'}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-900 font-bold bg-white/80 p-2 rounded-lg border border-amber-200 text-center">
                    الراجع الفعلي: <span className="text-amber-700 font-black">{currentCalculatedRefusalKg} كجم</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                      {refusalType === 'kg'
                        ? `(يعادل ${currentGrossDemand > 0 ? ((currentCalculatedRefusalKg / currentGrossDemand) * 100).toFixed(1) : 0}%)`
                        : `(من إجمالي ${currentGrossDemand} كجم)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Demand & Intake Summary */}
              <div className="p-3 bg-emerald-950 text-emerald-50 rounded-xl space-y-1.5 font-bold text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-200">إجمالي الاحتياج الكلي للعنبر:</span>
                  <span className="text-amber-300 text-sm font-black">{currentGrossDemand.toLocaleString()} كجم</span>
                </div>
                {Number(recycledRefusalAllocatedKg) > 0 && (
                  <div className="flex items-center justify-between text-cyan-300 text-[11px]">
                    <span>- راجع الحلاب المحول:</span>
                    <span className="font-black">{(Number(recycledRefusalAllocatedKg) || 0).toLocaleString()} كجم</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800 text-emerald-100">
                  <span className="font-extrabold">صافي الطازج المطلوب خلطه بالمكسر:</span>
                  <span className="text-white text-base font-black">{currentNetFreshDemand.toLocaleString()} كجم</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800 text-[11px]">
                  <span className="text-emerald-300">صافي المأكول الفعلي المتوقع:</span>
                  <span className="text-emerald-100 font-black">{currentCalculatedIntakeKg.toLocaleString()} كجم</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة العنبر</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Barn['status'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  <option value="نشط">نشط</option>
                  <option value="صيانة">صيانة</option>
                  <option value="فارغ">فارغ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات حول موقع العنبر، دورية التغذية، أو حالته..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  حفظ العنبر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
