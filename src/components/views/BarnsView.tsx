import React, { useState } from 'react';
import { Barn, AnimalCategory } from '../../types';
import { calculateBarnDailyDemand } from '../../utils/calculations';
import { Home, Plus, Edit, Trash2, Scale } from 'lucide-react';

interface BarnsViewProps {
  barns: Barn[];
  setBarns: (items: Barn[]) => void;
  categories: AnimalCategory[];
}

export const BarnsView: React.FC<BarnsViewProps> = ({
  barns,
  setBarns,
  categories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarn, setEditingBarn] = useState<Barn | null>(null);

  // Form
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [headCount, setHeadCount] = useState<number>(50);
  const [baseFeedKgPerHead, setBaseFeedKgPerHead] = useState<number>(50);
  const [feedingRatioPercent, setFeedingRatioPercent] = useState<number>(100);
  const [status, setStatus] = useState<Barn['status']>('نشط');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingBarn(null);
    setNumber(`عنبر ${barns.length + 1}`);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setHeadCount(50);
    setBaseFeedKgPerHead(50);
    setFeedingRatioPercent(100);
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
    setStatus(barn.status);
    setNotes(barn.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteBarn = (id: string) => {
    setBarns(barns.filter((b) => b.id !== id));
  };

  const handleSaveBarn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !categoryId || headCount <= 0 || baseFeedKgPerHead <= 0) {
      alert('يرجى كتابة رقم العنبر واختيار الفئة وإدخال عدد الرؤوس والكمية الأساسية.');
      return;
    }

    if (editingBarn) {
      const updated = barns.map((b) =>
        b.id === editingBarn.id
          ? {
              ...b,
              number,
              name,
              categoryId,
              headCount,
              baseFeedKgPerHead,
              feedingRatioPercent,
              status,
              notes,
            }
          : b
      );
      setBarns(updated);
    } else {
      const newBarn: Barn = {
        id: `barn-${Date.now()}`,
        number,
        name,
        categoryId,
        headCount,
        baseFeedKgPerHead,
        feedingRatioPercent,
        status,
        notes,
      };
      setBarns([...barns, newBarn]);
    }

    setIsModalOpen(false);
  };

  const currentCalculatedDemand = Math.round(
    headCount * baseFeedKgPerHead * (feedingRatioPercent / 100) * 100
  ) / 100;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-700" />
            عنابر ونواحي المزرعة
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد أعداد الرؤوس، الكمية الأساسية، ونسبة التغذية المئوية % لحساب إجمالي العلف المطلوب تلقائيًا
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عنبر جديد</span>
        </button>
      </div>

      {/* Barns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">رقم / اسم العنبر</th>
                <th className="py-3.5 px-4">الفئة الحيوانية</th>
                <th className="py-3.5 px-4">عدد الرؤوس</th>
                <th className="py-3.5 px-4">الكمية الأساسية (كجم/رأس)</th>
                <th className="py-3.5 px-4">نسبة التغذية %</th>
                <th className="py-3.5 px-4 text-emerald-900 bg-emerald-50">إجمالي العلف اليومي (كجم)</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {barns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد عنابر مضافة.
                  </td>
                </tr>
              ) : (
                barns.map((barn) => {
                  const category = categories.find((c) => c.id === barn.categoryId);
                  const dailyDemandKg = calculateBarnDailyDemand(barn);

                  return (
                    <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 text-base">
                        {barn.number} {barn.name && <span className="text-xs font-semibold text-slate-500">({barn.name})</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs border border-emerald-200">
                          {category?.name || 'عام'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{barn.headCount} رأس</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{barn.baseFeedKgPerHead} كجم</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md font-bold text-xs text-slate-800">
                          {barn.feedingRatioPercent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-950 bg-emerald-50/70 text-base">
                        {dailyDemandKg.toLocaleString('ar-EG')} كجم
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
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarn(barn.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBarn ? 'تعديل بيانات العنبر' : 'إضافة عنبر جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
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
                    placeholder="حلاب عالي A..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الفئة الحيوانية التابع لها *</label>
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">عدد الرؤوس *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={headCount}
                    onChange={(e) => setHeadCount(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الأساسي (كجم/رأس) *</label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    required
                    value={baseFeedKgPerHead}
                    onChange={(e) => setBaseFeedKgPerHead(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نسبة التغذية % *</label>
                  <input
                    type="number"
                    step={5}
                    min={10}
                    required
                    value={feedingRatioPercent}
                    onChange={(e) => setFeedingRatioPercent(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 text-center"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-900 text-emerald-50 rounded-xl flex items-center justify-between font-black text-xs">
                <span>إجمالي الاحتياج اليومي التلقائي:</span>
                <span className="text-amber-300 text-sm">{currentCalculatedDemand.toLocaleString('ar-EG')} كجم/يوم</span>
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
                  placeholder="ملاحظات حول موقع العنبر أو حالته..."
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
