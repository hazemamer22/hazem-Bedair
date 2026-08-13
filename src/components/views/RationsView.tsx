import React, { useState } from 'react';
import { Ration, RationIngredient, RawMaterial } from '../../types';
import { calculateRationTotalKgPerHead } from '../../utils/calculations';
import { Scale, Plus, Edit, Trash2, Wheat, ChevronDown } from 'lucide-react';

interface RationsViewProps {
  rations: Ration[];
  setRations: (items: Ration[]) => void;
  rawMaterials: RawMaterial[];
}

interface FormIngredient {
  rawMaterialId: string;
  amountStr: string;
}

export const RationsView: React.FC<RationsViewProps> = ({
  rations,
  setRations,
  rawMaterials,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRation, setEditingRation] = useState<Ration | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<FormIngredient[]>([]);

  const handleOpenAdd = () => {
    setEditingRation(null);
    setName('');
    setCode(`RAT-00${rations.length + 1}`);
    setNotes('');
    // Start with default ingredients if materials exist
    const defaultIngs: FormIngredient[] = rawMaterials.slice(0, 3).map((rm) => ({
      rawMaterialId: rm.id,
      amountStr: '2',
    }));
    setIngredients(defaultIngs);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ration: Ration) => {
    setEditingRation(ration);
    setName(ration.name);
    setCode(ration.code || '');
    setNotes(ration.notes || '');
    setIngredients(
      ration.ingredients
        ? ration.ingredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            amountStr: ing.amountKgPerHead !== undefined && ing.amountKgPerHead !== null ? String(ing.amountKgPerHead) : '0',
          }))
        : []
    );
    setIsModalOpen(true);
  };

  const handleDeleteRation = (id: string) => {
    setRations(rations.filter((r) => r.id !== id));
  };

  const handleAddIngredient = () => {
    const activeMaterials = rawMaterials.filter((rm) => rm.status === 'نشطة');
    const firstMat = activeMaterials[0] || rawMaterials[0];
    if (!firstMat) {
      alert('يرجى إضافة خامات أولاً من صفحة "الخامات".');
      return;
    }
    setIngredients([
      ...ingredients,
      { rawMaterialId: firstMat.id, amountStr: '1' },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: 'rawMaterialId' | 'amountStr',
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setIngredients(updated);
  };

  const handleSaveRation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || ingredients.length === 0) {
      alert('يرجى إدخال اسم العليقة وإضافة خامة واحدة على الأقل');
      return;
    }

    const finalIngredients: RationIngredient[] = ingredients.map((ing) => {
      const numVal = parseFloat(ing.amountStr);
      return {
        rawMaterialId: ing.rawMaterialId,
        amountKgPerHead: isNaN(numVal) ? 0 : Math.max(0, numVal),
      };
    });

    if (editingRation) {
      const updated = rations.map((r) =>
        r.id === editingRation.id
          ? { ...r, name, code, notes, ingredients: finalIngredients }
          : r
      );
      setRations(updated);
    } else {
      const newRation: Ration = {
        id: `rat-${Date.now()}`,
        name,
        code,
        notes,
        ingredients: finalIngredients,
      };
      setRations([...rations, newRation]);
    }

    setIsModalOpen(false);
  };

  const tempTotalKgPerHead = ingredients.reduce((s, i) => {
    const val = parseFloat(i.amountStr);
    return s + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            تركيبات العلائق المتوازنة (بالكيلو جرام لكل رأس في اليوم)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد مقادير الخامات بالكيلو للرأس الواحدة باليوم لحساب احتياجات المكسر والعنابر نسبياً
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء عليقة جديدة</span>
        </button>
      </div>

      {/* Rations Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rations.map((ration) => {
          const totalKgPerHead = calculateRationTotalKgPerHead(ration);

          return (
            <div
              key={ration.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-500">{ration.code}</span>
                    <h4 className="font-black text-lg text-slate-900 mt-0.5">{ration.name}</h4>
                  </div>
                  <div className="text-left bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] text-emerald-800 font-bold block">إجمالي العليقة للرأس/يوم</span>
                    <span className="text-xl font-black text-emerald-950">
                      {totalKgPerHead.toLocaleString('ar-EG')} <span className="text-xs font-bold">كجم/رأس</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">{ration.notes || 'لا توجد ملاحظات إضافية'}</p>

                {/* Ingredient Table preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">الخامة العلفية</th>
                        <th className="py-2 px-3">الكمية (كجم/رأس/يوم)</th>
                        <th className="py-2 px-3">النسبة المئوية %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {ration.ingredients.map((ing) => {
                        const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                        const percent = totalKgPerHead > 0
                          ? Math.round((ing.amountKgPerHead / totalKgPerHead) * 1000) / 10
                          : 0;

                        return (
                          <tr key={ing.rawMaterialId} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{rawMat?.name || 'خامة'}</td>
                            <td className="py-2 px-3 font-extrabold text-emerald-900">
                              {ing.amountKgPerHead} كجم
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-bold">{percent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(ration)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> تعديل العليقة
                </button>
                <button
                  onClick={() => handleDeleteRation(ration.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Ration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingRation ? 'تعديل تركيبة العليقة' : 'إنشاء عليقة جديدة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveRation} className="space-y-4 text-right">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العليقة *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: عليقة الحلاب العالية..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود العليقة</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات العليقة</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مستهدف الإنتاج، المرحلة الفسيولوجية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              {/* Dynamic Ingredient Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-sm">مكونات الخامات (كجم / رأس / يوم):</span>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة خامة
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <select
                        value={ing.rawMaterialId}
                        onChange={(e) => handleIngredientChange(idx, 'rawMaterialId', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name} ({rm.unit})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ing.amountStr}
                          onChange={(e) => handleIngredientChange(idx, 'amountStr', e.target.value)}
                          placeholder="0"
                          className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-emerald-950 text-center text-xs focus:outline-emerald-600"
                        />
                        <span className="text-[11px] font-bold text-slate-500">كجم/رأس</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-emerald-900 text-emerald-50 rounded-xl flex items-center justify-between font-black text-xs">
                  <span>إجمالي وزن العليقة للرأس الواحدة باليوم:</span>
                  <span className="text-amber-300 text-sm">{(Math.round(tempTotalKgPerHead * 10000) / 10000)} كجم/رأس</span>
                </div>
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
                  حفظ العليقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
