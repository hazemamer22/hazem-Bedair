import React, { useState } from 'react';
import { RawMaterial, RawMaterialStatus, Ration } from '../../types';
import { Wheat, Plus, Edit, Trash2, Power, Search } from 'lucide-react';

interface RawMaterialsViewProps {
  rawMaterials: RawMaterial[];
  setRawMaterials: (items: RawMaterial[]) => void;
  rations?: Ration[];
}

export const RawMaterialsView: React.FC<RawMaterialsViewProps> = ({
  rawMaterials,
  setRawMaterials,
  rations = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);

  // Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('كجم');
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<RawMaterialStatus>('نشطة');
  const [notes, setNotes] = useState('');

  const filteredMaterials = rawMaterials.filter(
    (rm) =>
      rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setCode(`RM00${rawMaterials.length + 1}`);
    setName('');
    setUnit('كجم');
    setPrice(undefined);
    setStatus('نشطة');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RawMaterial) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setUnit(item.unit);
    setPrice(item.price);
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    const updated = rawMaterials.map((rm) =>
      rm.id === id
        ? { ...rm, status: (rm.status === 'نشطة' ? 'غير نشطة' : 'نشطة') as RawMaterialStatus }
        : rm
    );
    setRawMaterials(updated);
  };

  const handleDelete = (id: string) => {
    const item = rawMaterials.find((rm) => rm.id === id);
    const usedInRations = rations.filter((r) =>
      r.ingredients?.some((ing) => ing.rawMaterialId === id)
    );

    if (usedInRations.length > 0) {
      const rationNames = usedInRations.map((r) => r.name).join('، ');
      alert(
        `تنبيه: الخامة (${item?.name || ''}) مستخدمة حالياً داخل التركيبات العلفية التالية:\n[${rationNames}]\n\nيرجى إزالتها أو تعديل العليقة أولاً قبل حذف الخامة.`
      );
      return;
    }

    setRawMaterials(rawMaterials.filter((rm) => rm.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !unit) {
      alert('يرجى كتابة كود واسم الخامة ووحدة القياس');
      return;
    }

    if (editingItem) {
      const updated = rawMaterials.map((rm) =>
        rm.id === editingItem.id
          ? { ...rm, code, name, unit, price, status, notes }
          : rm
      );
      setRawMaterials(updated);
    } else {
      const newItem: RawMaterial = {
        id: `rm-${Date.now()}`,
        code,
        name,
        unit,
        price,
        status,
        notes,
      };
      setRawMaterials([...rawMaterials, newItem]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Wheat className="w-5 h-5 text-emerald-700" />
              قاعدة بيانات الخامات العلفية بالمزرعة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إضافة وتعديل وإيقاف خامات العليقة مثل الذرة، الصويا، السيلاج، الدريس والإضافات
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خامة جديدة</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">كود الخامة</th>
                <th className="py-3.5 px-4">اسم الخامة</th>
                <th className="py-3.5 px-4">وحدة القياس</th>
                <th className="py-3.5 px-4">السعر التقديري (جنية/وحدة)</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">ملاحظات</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد خامات مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 text-xs">{item.code}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">{item.name}</td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-700">{item.unit}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-900 text-xs">
                      {item.price ? `${item.price.toLocaleString('ar-EG')} جنية` : 'غير محدد'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'نشطة'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">{item.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(item.id)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                            item.status === 'نشطة'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={item.status === 'نشطة' ? 'إيقاف الخامة' : 'تفعيل الخامة'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingItem ? 'تعديل بيانا الخامة' : 'إضافة خامة جديدة'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-right">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كود الخامة *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="كجم، طن..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الخامة العلفية *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ذرة صفراء، صويا 46%..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر التقديري (اختياري)</label>
                  <input
                    type="number"
                    step="any"
                    value={price || ''}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RawMaterialStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    <option value="نشطة">نشطة</option>
                    <option value="غير نشطة">غير نشطة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات فنية حول هذه الخامة..."
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
                  حفظ الخامة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
