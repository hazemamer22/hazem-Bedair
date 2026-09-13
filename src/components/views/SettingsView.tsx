import React, { useState } from 'react';
import { FarmSettings } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Settings,
  Save,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Package,
  Sliders,
} from 'lucide-react';

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
  const { showToast, showConfirm } = useFeedback();
  const [farmName, setFarmName] = useState(settings.farmName);
  const [engineerName, setEngineerName] = useState(settings.engineerName);
  const [warehouseManagerName, setWarehouseManagerName] = useState(settings.warehouseManagerName);
  const [driverName, setDriverName] = useState(settings.driverName);
  const [currency, setCurrency] = useState(settings.currency);
  const [hasConcentrateMixer, setHasConcentrateMixer] = useState<boolean>(
    settings.hasConcentrateMixer !== false
  );
  const [defaultBagWeightKg, setDefaultBagWeightKg] = useState<number>(
    settings.defaultBagWeightKg || 50
  );
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FarmSettings = {
      farmName,
      engineerName,
      warehouseManagerName,
      driverName,
      currency,
      hasConcentrateMixer,
      defaultBagWeightKg: Math.max(1, defaultBagWeightKg || 50),
    };
    setSettings(updated);
    showToast('تم حفظ إعدادات النظام ومواصفات خلاطة المزرعة بنجاح!', 'success');
  };

  const handleConfirmReset = () => {
    setShowConfirmResetModal(false);
    onResetDemo();
    showToast('تمت استعادة الإعدادات الافتراضية بنجاح.', 'info');
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
      showToast('تم تصدير النسخة الاحتياطية بنجاح!', 'success');
    } catch (err) {
      showToast('حدث خطأ أثناء تصدير النسخة الاحتياطية.', 'error');
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

        // Validate backup schema
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          showToast('ملف النسخة الاحتياطية غير صالح.', 'error');
          return;
        }

        const farmKeys = Object.keys(data).filter((k) => k.startsWith('farm_feed_'));
        if (farmKeys.length === 0) {
          showToast('الملف المختار لا يحتوي على بيانات خاصة بنظام المزرعة.', 'error');
          return;
        }

        showConfirm({
          title: 'تأكيد استعادة النسخة الاحتياطية',
          message: `هل أنت متأكد من استعادة النسخة الاحتياطية (${file.name})؟ سيتم استبدال كافة بيانات المزرعة الحالية ببيانات الملف وإعادة تشغيل التطبيق.`,
          isDanger: true,
          confirmText: 'نعم، استبدال واستعادة',
          cancelText: 'تراجع',
          onConfirm: () => {
            farmKeys.forEach((key) => {
              const val = data[key];
              if (typeof val === 'string') {
                localStorage.setItem(key, val);
              } else {
                localStorage.setItem(key, JSON.stringify(val));
              }
            });
            window.location.reload();
          },
        });
      } catch (err) {
        showToast('تعذر قراءة ملف النسخة الاحتياطية (تنسيق غير صالح).', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

          {/* Feed Concentrate Premix & Bagging Feature Toggle */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl text-white transition-colors ${
                    hasConcentrateMixer ? 'bg-amber-600' : 'bg-slate-400'
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    نظام خلاطة العلف المركز وتعبئة الشكاير بالمزرعة
                  </h4>
                  <p className="text-xs text-slate-500">
                    حدد ما إذا كانت المزرعة تعتمد على خلط وتعبئة شكاير مركز مسبقاً أو تعتمد على الخلط المباشر في مكسر الـ TMR
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full border self-start sm:self-auto ${
                  hasConcentrateMixer
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {hasConcentrateMixer ? 'مفعل بالمزرعة 📦' : 'غير مفعل (خلط مباشر فقط 🚜)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setHasConcentrateMixer(true)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  hasConcentrateMixer
                    ? 'bg-amber-50/80 border-amber-400 shadow-2xs ring-2 ring-amber-400/20'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    hasConcentrateMixer
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {hasConcentrateMixer && <span className="text-xs font-black">✓</span>}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    نعم - توجد خلاطة مركز وتعبئة شكاير
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    يُظهر تبويب الخلاطة والشكاير في القائمة، ويُجهز أوامر تشغيل عمال الخلاطة وأرصدة الشكاير وتجميعها بأوامر المكسر.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasConcentrateMixer(false)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  !hasConcentrateMixer
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                    !hasConcentrateMixer
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {!hasConcentrateMixer && <span className="text-xs font-black">✓</span>}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    لا - خلط مباشر في مكسر الـ TMR فقط
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    يُخفي تبويب وخيارات الخلاطة والشكاير تماماً لمنع أي تشتت، ويعرض أوامر المكسر بأسلوب الأوزان المباشرة لكل خامة.
                  </p>
                </div>
              </button>
            </div>

            {hasConcentrateMixer && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700">
                    وزن الشكارة الافتراضي المعتمد بالمزرعة:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={defaultBagWeightKg}
                      onChange={(e) =>
                        setDefaultBagWeightKg(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-emerald-950 text-center focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-600">كجم / شكارة</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold">أوزان شائعة:</span>
                  {[25, 40, 50].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDefaultBagWeightKg(w)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        defaultBagWeightKg === w
                          ? 'bg-amber-500 text-emerald-950 border-amber-500 font-black'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {w} كجم
                    </button>
                  ))}
                </div>
              </div>
            )}
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
          خيارات الصيانة المتقدمة والنسخ الاحتياطي
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reload Demo */}
          <div className="bg-amber-50/70 border border-amber-200/90 p-4 rounded-xl space-y-3">
            <div>
              <h5 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                استعادة السيناريو التجريبي الأساسي
              </h5>
              <p className="text-xs text-amber-900/80 mt-1">
                خاص بالاختبار وتدريب المشغلين (300 رأس - 5 عنابر - 5 لفات). يتطلب تأكيداً مسبقاً لحماية بيانات المزرعة الفعلية.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmResetModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط السيناريو التجريبي...</span>
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

      {/* Confirmation Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-950">تأكيد استعادة السيناريو التجريبي</h4>
                <p className="text-xs text-amber-800 mt-0.5">إجراء حساس يتطلب التحقق</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في إعادة تحميل البيانات التجريبية الافتراضية؟
              <br />
              <strong className="text-slate-900 font-bold">تنبيه:</strong> سيتم استبدال الخامات والعنابر والخطط اليومية الحالية ببيانات السيناريو القياسي (300 رأس).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 transition-all"
              >
                نعم، إعادة الضبط للسيناريو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
