import React, { useState } from 'react';
import { FarmSettings } from '../../types';
import { Settings, Save, RefreshCw, Download, Upload, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  settings: FarmSettings;
  setSettings: (settings: FarmSettings) => void;
  onResetDemo: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  onResetDemo,
}) => {
  const [farmName, setFarmName] = useState(settings.farmName);
  const [engineerName, setEngineerName] = useState(settings.engineerName);
  const [warehouseManagerName, setWarehouseManagerName] = useState(settings.warehouseManagerName);
  const [driverName, setDriverName] = useState(settings.driverName);
  const [currency, setCurrency] = useState(settings.currency);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FarmSettings = {
      farmName,
      engineerName,
      warehouseManagerName,
      driverName,
      currency,
    };
    setSettings(updated);
    alert('تم حفظ إعدادات النظام واسم المزرعة بنجاح!');
  };

  const handleExportBackup = () => {
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('farm_feed_')) {
          data[key] = localStorage.getItem(key);
        }
      }
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `نسخة_احتياطية_مزرعة_الماشية_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      alert('حدث خطأ أثناء تصدير النسخة الاحتياطية.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        Object.entries(data).forEach(([key, val]) => {
          if (typeof val === 'string') {
            localStorage.setItem(key, val);
          }
        });
        alert('تم استعادة النسخة الاحتياطية بنجاح! سيتم تحديث الصفحة الآن.');
        window.location.reload();
      } catch (err) {
        alert('ملف النسخة الاحتياطية غير صالح.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            إعدادات النظام والبيانات الأساسية للمزرعة
          </h3>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            النظام جاهز ومحفوظ
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المزرعة أو المشروع *</label>
            <input
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم مهندس التغذية المسؤول *</label>
              <input
                type="text"
                required
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم مسؤول المخزن *</label>
              <input
                type="text"
                required
                value={warehouseManagerName}
                onChange={(e) => setWarehouseManagerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">بيانات/اسم السائق أو المشغل *</label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العملة المستخدمة للتقارير *</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-left">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Demo Scenario & Backup Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          خيارات السيناريو التجريبي والنسخ الاحتياطي
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reload Demo */}
          <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl space-y-3">
            <div>
              <h5 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                إعادة السيناريو التجريبي المطلوب (300 رأس - 5 عنابر - 5 لفات)
              </h5>
              <p className="text-xs text-amber-900/80 mt-1">
                يعيد تحميل البيانات التجريبية المعتمدة للسيناريو المطلوب في الطلب مباشرة.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetDemo}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-all"
            >
              تحميل السيناريو التجريبي الآن
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div>
              <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-700" />
                النسخ الاحتياطي واستعادة البيانات
              </h5>
              <p className="text-xs text-slate-500 mt-1">
                حفظ نسخة من جميع الخامات، العنابر، والعلائق على جهازك، أو استعادتها.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> تصدير JSON
              </button>

              <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-600" /> استعادة ملف
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
