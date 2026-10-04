import React, { useState } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getRationDisplayName,
  getMixerDisplayName,
} from '../../context/LanguageContext';
import { AnimalCategory, Ration, Mixer } from '../../types';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportCategoriesToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { Beef, Plus, Edit, Trash2 } from 'lucide-react';

interface CategoriesViewProps {
  categories: AnimalCategory[];
  setCategories: (items: AnimalCategory[]) => void;
  rations: Ration[];
  mixers: Mixer[];
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  setCategories,
  rations,
  mixers,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AnimalCategory | null>(null);

  const [name, setName] = useState('');
  const [rationId, setRationId] = useState('');
  const [mixerId, setMixerId] = useState('');
  const [calculationType, setCalculationType] = useState<'per_head' | 'fixed_tonnage'>('per_head');
  const [isPeriodicMixer, setIsPeriodicMixer] = useState(false);
  const [defaultTonnageKg, setDefaultTonnageKg] = useState<string>('2000');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setRationId(rations[0]?.id || '');
    setMixerId(mixers[0]?.id || '');
    setCalculationType('per_head');
    setIsPeriodicMixer(false);
    setDefaultTonnageKg('2000');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: AnimalCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setRationId(cat.rationId);
    setMixerId(cat.mixerId);
    setCalculationType(cat.calculationType || 'per_head');
    setIsPeriodicMixer(!!cat.isPeriodicMixer);
    setDefaultTonnageKg(String(cat.defaultTonnageKg || 2000));
    setNotes(cat.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteCategory = (id: string, catName: string) => {
    showConfirm({
      title: isEn ? 'Delete Category' : 'حذف فئة حيوانية',
      message: isEn
        ? `Are you sure you want to delete category "${catName}"?`
        : `هل أنت متأكد من حذف الفئة "${catName}"؟`,
      isDanger: true,
      confirmText: isEn ? 'Delete' : 'حذف',
      onConfirm: () => {
        setCategories(categories.filter((c) => c.id !== id));
        showToast(isEn ? 'Category deleted successfully.' : 'تم حذف الفئة بنجاح.', 'info');
      },
    });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rationId || !mixerId) {
      showToast(
        isEn
          ? 'Please enter category name and select assigned ration and mixer.'
          : 'يرجى ملء اسم الفئة واختيار العليقة والمكسر المخصص.',
        'warning'
      );
      return;
    }

    const tonKg = parseFloat(defaultTonnageKg);
    const validTonKg = isNaN(tonKg) || tonKg <= 0 ? 2000 : tonKg;

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name,
              rationId,
              mixerId,
              calculationType,
              isPeriodicMixer,
              defaultTonnageKg: validTonKg,
              notes,
            }
          : c
      );
      setCategories(updated);
      showToast(isEn ? 'Category updated successfully.' : 'تم تحديث بيانات الفئة بنجاح.', 'success');
    } else {
      const newCat: AnimalCategory = {
        id: generateId('cat'),
        name,
        rationId,
        mixerId,
        calculationType,
        isPeriodicMixer,
        defaultTonnageKg: validTonKg,
        notes,
      };
      setCategories([...categories, newCat]);
      showToast(isEn ? 'New category added successfully.' : 'تمت إضافة الفئة الجديدة بنجاح.', 'success');
    }

    setIsModalOpen(false);
  };

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Beef className="w-5 h-5 text-emerald-700" />
            <span>{isEn ? 'Farm Animal Categories & Herds' : 'الفئات الحيوانية بالمزرعة'}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Link each animal category (milking, fattening, growers, calves) with assigned ration, mixer, and feeding schedule'
              : 'ربط كل فئة حيوانية (حلاب، تسمين، نامي، رضيع وفطام) بالعليقة المخصصة والمكسر ونمط الخلط اليومي أو الدوري بالطن'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add New Category' : 'إضافة فئة حيوانية جديدة'}</span>
          </button>
          <ExportExcelButton
            onExport={() => exportCategoriesToExcel(categories, rations, mixers, [])}
            label={isEn ? 'Export to Excel' : 'تصدير الفئات للإكسيل'}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const ration = rations.find((r) => r.id === cat.rationId);
          const mixer = mixers.find((m) => m.id === cat.mixerId);
          const isFixedTon = cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer;

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xl text-slate-900">{getCategoryDisplayName(cat.name, isEn)}</h4>
                  <div className="flex items-center gap-1.5">
                    {isFixedTon && (
                      <span className="text-[10px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                        {isEn ? '📦 Periodic Tonnage' : '📦 خلط دوري بالطن'}
                      </span>
                    )}
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      {isEn ? 'Active Herd' : 'فئة نشطة'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Linked Ration:' : 'العليقة المرتبطة:'}</span>
                    <span className="font-bold text-slate-900">
                      {ration ? getRationDisplayName(ration.name, isEn) : (isEn ? 'Unassigned' : 'غير محددة')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Assigned Mixer:' : 'المكسر المخصص:'}</span>
                    <span className="font-bold text-emerald-900">
                      {mixer ? getMixerDisplayName(mixer.name, isEn) : (isEn ? 'Unassigned' : 'غير محدد')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Calculation Type:' : 'نمط الاحتساب:'}</span>
                    <span className={`font-black ${isFixedTon ? 'text-purple-700' : 'text-slate-700'}`}>
                      {isFixedTon
                        ? (isEn
                            ? `By Tonnage (${((cat.defaultTonnageKg || 2000) / 1000).toLocaleString('en-US')} Ton/batch)`
                            : `بالطن (${((cat.defaultTonnageKg || 2000) / 1000).toLocaleString('ar-EG')} طن/دفعة)`)
                        : (isEn ? 'Per head count daily' : 'حسب عدد الرؤوس يومياً')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                  {cat.notes || (isEn ? 'No notes provided' : 'لا توجد ملاحظات')}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Edit' : 'تعديل'}</span>
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Delete' : 'حذف'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingCategory
                  ? (isEn ? 'Edit Animal Category' : 'تعديل الفئة الحيوانية')
                  : (isEn ? 'Add New Animal Category' : 'إضافة فئة حيوانية جديدة')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className={`space-y-4 ${isEn ? 'text-left' : 'text-right'}`}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Category Name *' : 'اسم الفئة *'}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'e.g. Milking Cows, Feedlot, Calves & Weaners...' : 'مثال: حلاب، نامي، رضيع وفطام، تسمين...'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Assigned Ration *' : 'العليقة المخصصة *'}</label>
                <select
                  value={rationId}
                  onChange={(e) => setRationId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {rations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {getRationDisplayName(r.name, isEn)} {r.calculationType === 'fixed_tonnage' ? (isEn ? '(by Tonnage)' : '(بالطن)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Assigned Mixer *' : 'المكسر المخصص *'}</label>
                <select
                  value={mixerId}
                  onChange={(e) => setMixerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {mixers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {getMixerDisplayName(m.name, isEn)} ({m.maxCapacityKg} {isEn ? 'kg' : 'كجم'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculation Type & Periodic Mixer Toggle */}
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-purple-950 block">
                      {isEn ? 'Periodic Tonnage Mixing (e.g. Starter Calves)' : 'خلط دوري بالطن (مثل الرضيع والفطام)'}
                    </label>
                    <span className="text-[11px] text-purple-800">
                      {isEn ? 'Batch mixed every few days or on-demand in set tons' : 'مكسر يُجهز كل يومين أو عند الحاجة بأطنان محددة'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPeriodicMixer}
                    onChange={(e) => {
                      setIsPeriodicMixer(e.target.checked);
                      if (e.target.checked) setCalculationType('fixed_tonnage');
                      else setCalculationType('per_head');
                    }}
                    className="w-5 h-5 accent-purple-700 cursor-pointer rounded"
                  />
                </div>

                {isPeriodicMixer && (
                  <div>
                    <label className="block text-[11px] font-bold text-purple-950 mb-1">
                      {isEn ? 'Default batch weight (kg):' : 'الوزن الافتراضي لكل دفعة خلط (كجم):'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="100"
                        min="500"
                        value={defaultTonnageKg}
                        onChange={(e) => setDefaultTonnageKg(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 focus:outline-purple-700"
                      />
                      <span className="text-xs font-bold text-purple-900 whitespace-nowrap">
                        = {((parseFloat(defaultTonnageKg) || 0) / 1000).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'Tons' : 'طن'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Notes' : 'ملاحظات'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Any notes regarding this category...' : 'أي معلومات حول هذه الفئة...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
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
                  {isEn ? 'Save Category' : 'حفظ الفئة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
