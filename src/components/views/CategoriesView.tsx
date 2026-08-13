import React, { useState } from 'react';
import { AnimalCategory, Ration, Mixer } from '../../types';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AnimalCategory | null>(null);

  const [name, setName] = useState('');
  const [rationId, setRationId] = useState('');
  const [mixerId, setMixerId] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setRationId(rations[0]?.id || '');
    setMixerId(mixers[0]?.id || '');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: AnimalCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setRationId(cat.rationId);
    setMixerId(cat.mixerId);
    setNotes(cat.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rationId || !mixerId) {
      alert('يرجى ملء اسم الفئة واختيار العليقة والمكسر المخصص.');
      return;
    }

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id ? { ...c, name, rationId, mixerId, notes } : c
      );
      setCategories(updated);
    } else {
      const newCat: AnimalCategory = {
        id: `cat-${Date.now()}`,
        name,
        rationId,
        mixerId,
        notes,
      };
      setCategories([...categories, newCat]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Beef className="w-5 h-5 text-emerald-700" />
            الفئات الحيوانية بالمزرعة
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ربط كل فئة حيوانية (حلاب، تسمين، نامي...) بالعليقة المخصصة والمكسر المسؤول
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فئة حيوانية جديدة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const ration = rations.find((r) => r.id === cat.rationId);
          const mixer = mixers.find((m) => m.id === cat.mixerId);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xl text-slate-900">{cat.name}</h4>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    فئة نشطة
                  </span>
                </div>

                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">العليقة المرتبطة:</span>
                    <span className="font-bold text-slate-900">{ration?.name || 'غير محددة'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">المكسر المخصص:</span>
                    <span className="font-bold text-emerald-900">{mixer?.name || 'غير محدد'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                  {cat.notes || 'لا توجد ملاحظات'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> تعديل
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingCategory ? 'تعديل الفئة الحيوانية' : 'إضافة فئة حيوانية جديدة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الفئة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: حلاب، نامي، تسمين، جاف..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العليقة المخصصة *</label>
                <select
                  value={rationId}
                  onChange={(e) => setRationId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {rations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المكسر المخصص *</label>
                <select
                  value={mixerId}
                  onChange={(e) => setMixerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {mixers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.maxCapacityKg} كجم)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي معلومات حول هذه الفئة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  حفظ الفئة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
