import React, { useState } from 'react';
import { Mixer, AnimalCategory } from '../../types';
import { Bot as MixerIcon, Plus, Edit, Trash2 } from 'lucide-react';

interface MixersViewProps {
  mixers: Mixer[];
  setMixers: (items: Mixer[]) => void;
  categories: AnimalCategory[];
}

export const MixersView: React.FC<MixersViewProps> = ({
  mixers,
  setMixers,
  categories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMixer, setEditingMixer] = useState<Mixer | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [maxCapacityKg, setMaxCapacityKg] = useState<number>(3000);
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingMixer(null);
    setName(`مكسر TMR ${mixers.length + 1}`);
    setCategoryId(categories[0]?.id || '');
    setMaxCapacityKg(3000);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mixer: Mixer) => {
    setEditingMixer(mixer);
    setName(mixer.name);
    setCategoryId(mixer.categoryId);
    setMaxCapacityKg(mixer.maxCapacityKg);
    setNotes(mixer.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteMixer = (id: string) => {
    setMixers(mixers.filter((m) => m.id !== id));
  };

  const handleSaveMixer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || maxCapacityKg <= 0) {
      alert('يرجى كتابة اسم المكسر وتحديد السعة القصوى بالكيلو.');
      return;
    }

    if (editingMixer) {
      const updated = mixers.map((m) =>
        m.id === editingMixer.id ? { ...m, name, categoryId, maxCapacityKg, notes } : m
      );
      setMixers(updated);
    } else {
      const newMixer: Mixer = {
        id: `mix-${Date.now()}`,
        name,
        categoryId,
        maxCapacityKg,
        notes,
      };
      setMixers([...mixers, newMixer]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <MixerIcon className="w-5 h-5 text-emerald-700" />
            خلاطات ومكسرات العلف بالمزرعة (TMR Feed Mixers)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            إضافة وتعديل مكسرات العلف، تحديد السعة القصوى بالكيلو والتحكم بالسعة التشغيلية
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مكسر جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mixers.map((mixer) => {
          const cat = categories.find((c) => c.id === mixer.categoryId);

          return (
            <div
              key={mixer.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-black text-lg text-slate-900">{mixer.name}</h4>
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    مكسر جاهز
                  </span>
                </div>

                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">الفئة التابعة:</span>
                    <span className="font-bold text-slate-900">{cat?.name || 'عام'}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-slate-900">
                    <span className="text-slate-500 font-bold">السعة القصوى للخلطة:</span>
                    <span className="font-black text-emerald-900 text-sm">
                      {mixer.maxCapacityKg.toLocaleString('ar-EG')} كجم ({(mixer.maxCapacityKg / 1000).toFixed(1)} طن)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                  {mixer.notes || 'لا توجد ملاحظات ميكانيكية'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(mixer)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> تعديل
                </button>
                <button
                  onClick={() => handleDeleteMixer(mixer.id)}
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
                {editingMixer ? 'تعديل بيانات المكسر' : 'إضافة مكسر جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveMixer} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم/رقم المكسر *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مكسر الحلاب (TMR 1)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الفئة الرئيسية للخدمة</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السعة القصوى للمكسر (كجم) *</label>
                <input
                  type="number"
                  min={500}
                  step={100}
                  required
                  value={maxCapacityKg}
                  onChange={(e) => setMaxCapacityKg(Number(e.target.value))}
                  placeholder="3000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التشغيل والصيانة</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات حول الوزن، السكين، السرعة..."
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
                  حفظ المكسر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
