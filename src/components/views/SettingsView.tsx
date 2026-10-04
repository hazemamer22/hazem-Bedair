import React, { useState } from 'react';
import { FarmSettings, AppLanguage, AutoBackupConfig, BackupSnapshot, AutoBackupFrequency } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';
import { useLanguage } from '../../context/LanguageContext';
import { ALL_CURRENCIES, POPULAR_CURRENCIES, formatCurrencyLabel, findCurrency } from '../../data/currencies';
import {
  getAutoBackupConfig,
  saveAutoBackupConfig,
  getBackupSnapshots,
  createBackupSnapshot,
  restoreBackupSnapshot,
  deleteBackupSnapshot,
  downloadSnapshotAsFile,
} from '../../services/backupService';
import {
  Settings,
  Save,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  Package,
  Globe,
  Coins,
  CheckCircle2,
  ShieldCheck,
  HardDrive,
  History,
  Trash2,
  Clock,
} from 'lucide-react';

interface SettingsViewProps {
  settings: FarmSettings;
  setSettings: (settings: FarmSettings) => void;
  onResetDemo: (lang?: AppLanguage) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  onResetDemo,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const { language, setLanguage, isRtl, t } = useLanguage();

  const [farmName, setFarmName] = useState(settings.farmName);
  const [engineerName, setEngineerName] = useState(settings.engineerName);
  const [warehouseManagerName, setWarehouseManagerName] = useState(settings.warehouseManagerName);
  const [driverName, setDriverName] = useState(settings.driverName);

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(
    settings.language || language || 'ar'
  );
  const isEn = selectedLanguage === 'en';

  // Currency State
  const matchedCurr = findCurrency(settings.currency);
  const [currency, setCurrency] = useState<string>(settings.currency || 'ج.م');
  const [isCustomCurrency, setIsCustomCurrency] = useState<boolean>(!matchedCurr);
  const [customCurrencyText, setCustomCurrencyText] = useState<string>(
    !matchedCurr ? (settings.currency || '') : ''
  );

  const [hasConcentrateMixer, setHasConcentrateMixer] = useState<boolean>(
    settings.hasConcentrateMixer !== false
  );
  const [defaultBagWeightKg, setDefaultBagWeightKg] = useState<number>(
    settings.defaultBagWeightKg || 50
  );
  const [defaultMilkPricePerKg, setDefaultMilkPricePerKg] = useState<number>(
    settings.defaultMilkPricePerKg ?? 20.0
  );
  const [defaultMeatPricePerKg, setDefaultMeatPricePerKg] = useState<number>(
    settings.defaultMeatPricePerKg ?? 175.0
  );
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>(getAutoBackupConfig);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>(getBackupSnapshots);

  const handleToggleAutoBackup = (enabled: boolean) => {
    const updated: AutoBackupConfig = { ...autoBackupConfig, enabled };
    setAutoBackupConfig(updated);
    saveAutoBackupConfig(updated);
    showToast(
      isEn
        ? (enabled ? 'Automatic backup enabled.' : 'Automatic backup disabled.')
        : (enabled ? 'تم تفعيل النسخ الاحتياطي التلقائي.' : 'تم إيقاف النسخ الاحتياطي التلقائي.'),
      'info'
    );
  };

  const handleFrequencyChange = (frequency: AutoBackupFrequency) => {
    const updated: AutoBackupConfig = { ...autoBackupConfig, frequency };
    setAutoBackupConfig(updated);
    saveAutoBackupConfig(updated);
    showToast(
      isEn ? 'Backup schedule updated.' : 'تم تحديث جدولة النسخ الاحتياطي.',
      'success'
    );
  };

  const handleCreateSnapshot = () => {
    const snap = createBackupSnapshot(isEn ? 'Manual Snapshot' : 'نقطة استعادة يدوية');
    if (snap) {
      setSnapshots(getBackupSnapshots());
      showToast(
        isEn
          ? `Backup snapshot created successfully (${snap.dataSizeKb} KB)`
          : `تم إنشاء نقطة استعادة جديدة بنجاح (${snap.dataSizeKb} ك.ب)`,
        'success'
      );
    } else {
      showToast(
        isEn ? 'Failed to create backup snapshot.' : 'فشل إنشاء نقطة الاستعادة.',
        'error'
      );
    }
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    showConfirm({
      title: isEn ? 'Confirm Snapshot Restore' : 'تأكيد استعادة نقطة النسخ الاحتياطي',
      message: isEn
        ? `Are you sure you want to restore snapshot from (${snap.dateFormatted})? Current unsaved work will be replaced and the application will reload.`
        : `هل أنت متأكد من استعادة النسخة المؤرخة في (${snap.dateFormatted})؟ سيتم استبدال البيانات الحالية ببيانات هذه النسخة وإعادة تشغيل التطبيق.`,
      isDanger: true,
      confirmText: isEn ? 'Yes, Restore Now' : 'نعم، استعادة الآن',
      cancelText: isEn ? 'Cancel' : 'إلغاء',
      onConfirm: () => {
        const success = restoreBackupSnapshot(snap.id);
        if (success) {
          window.location.reload();
        } else {
          showToast(isEn ? 'Failed to restore snapshot.' : 'تعذر استعادة النسخة.', 'error');
        }
      },
    });
  };

  const handleDeleteSnapshot = (snapId: string) => {
    deleteBackupSnapshot(snapId);
    setSnapshots(getBackupSnapshots());
    showToast(isEn ? 'Snapshot deleted.' : 'تم حذف نقطة الاستعادة.', 'info');
  };

  const handleLanguageSelect = (lang: AppLanguage) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
    if (!isCustomCurrency) {
      const found = ALL_CURRENCIES.find((c) => c.symbolAr === currency || c.symbolEn === currency || c.code === currency || c.symbol === currency);
      if (found) {
        setCurrency(lang === 'en' ? found.symbolEn : found.symbolAr);
      }
    }
  };

  const handleQuickCurrencySelect = (code: string) => {
    const found = ALL_CURRENCIES.find((c) => c.code === code);
    if (found) {
      const sym = selectedLanguage === 'en' ? found.symbolEn : found.symbolAr;
      setCurrency(sym);
      setIsCustomCurrency(false);
      setCustomCurrencyText('');
    }
  };

  const handleCurrencyDropdownChange = (value: string) => {
    if (value === 'CUSTOM') {
      setIsCustomCurrency(true);
    } else {
      setIsCustomCurrency(false);
      const found = ALL_CURRENCIES.find((c) => c.code === value);
      if (found) {
        const sym = selectedLanguage === 'en' ? found.symbolEn : found.symbolAr;
        setCurrency(sym);
      } else {
        setCurrency(value);
      }
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCurrency = isCustomCurrency
      ? customCurrencyText.trim() || currency || 'ج.م'
      : currency || 'ج.م';

    const updated: FarmSettings = {
      farmName,
      engineerName,
      warehouseManagerName,
      driverName,
      currency: finalCurrency,
      language: selectedLanguage,
      hasConcentrateMixer,
      defaultBagWeightKg: Math.max(1, defaultBagWeightKg || 50),
      defaultMilkPricePerKg: Math.max(0, defaultMilkPricePerKg || 0),
      defaultMeatPricePerKg: Math.max(0, defaultMeatPricePerKg || 0),
    };
    setSettings(updated);
    setLanguage(selectedLanguage);
    showToast(t('settings.saveSuccess', 'تم حفظ إعدادات النظام وتحديث العملة واللغة بنجاح!'), 'success');
  };

  const handleConfirmReset = () => {
    setShowConfirmResetModal(false);
    onResetDemo(selectedLanguage);
    showToast(
      selectedLanguage === 'en'
        ? 'Demo scenario restored successfully in English!'
        : 'تمت استعادة السيناريو التجريبي بنجاح!',
      'info'
    );
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
      a.download = isEn
        ? `cattle_farm_backup_${new Date().toISOString().split('T')[0]}.json`
        : `نسخة_احتياطية_مزرعة_الماشية_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showToast(isEn ? 'Backup exported successfully!' : 'تم تصدير النسخة الاحتياطية بنجاح!', 'success');
    } catch (err) {
      showToast(isEn ? 'Error occurred while exporting backup.' : 'حدث خطأ أثناء تصدير النسخة الاحتياطية.', 'error');
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
          showToast(isEn ? 'Invalid backup file.' : 'ملف النسخة الاحتياطية غير صالح.', 'error');
          return;
        }

        const farmKeys = Object.keys(data).filter((k) => k.startsWith('farm_feed_'));
        if (farmKeys.length === 0) {
          showToast(
            isEn
              ? 'The selected file does not contain valid farm system backup data.'
              : 'الملف المختار لا يحتوي على بيانات خاصة بنظام المزرعة.',
            'error'
          );
          return;
        }

        showConfirm({
          title: isEn ? 'Confirm Backup Restore' : 'تأكيد استعادة النسخة الاحتياطية',
          message: isEn
            ? `Are you sure you want to restore backup file (${file.name})? All current farm data will be replaced and the application will reload.`
            : `هل أنت متأكد من استعادة النسخة الاحتياطية (${file.name})؟ سيتم استبدال كافة بيانات المزرعة الحالية ببيانات الملف وإعادة تشغيل التطبيق.`,
          isDanger: true,
          confirmText: isEn ? 'Yes, Replace & Restore' : 'نعم، استبدال واستعادة',
          cancelText: isEn ? 'Cancel' : 'تراجع',
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
        showToast(
          isEn
            ? 'Failed to read backup file (invalid format or corrupted data).'
            : 'تعذر قراءة ملف النسخة الاحتياطية (تنسيق غير صالح).',
          'error'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeMatchedCurrency = findCurrency(currency);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t('settings.title', 'إعدادات النظام والبيانات الأساسية للمزرعة')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedLanguage === 'en'
                  ? 'Manage farm master data, languages, currencies, and technical parameters'
                  : 'إدارة وتخصيص بيانات المزرعة، اللغات والعملات، وضوابط التشغيل الفني'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {t('settings.statusReady', 'النظام جاهز ومحفوظ')}
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* SYSTEM PREFERENCES: LANGUAGE & CURRENCY (Unified Compact Card) */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {selectedLanguage === 'en' ? 'System Preferences' : 'تفضيلات لغة وعملة النظام'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedLanguage === 'en'
                      ? 'Configure display interface language and financial calculation currency'
                      : 'تحديد لغة واجهة النظام وعملة التقارير والحسابات المالية'}
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs">
                  <span>{selectedLanguage === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-700 font-black">{currency}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Language Dropdown */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{selectedLanguage === 'en' ? 'Interface Language (اللغة):' : 'لغة واجهة النظام:'}</span>
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageSelect(e.target.value as AppLanguage)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 cursor-pointer transition-colors shadow-2xs"
                >
                  <option value="ar">🇸🇦 العربية (Arabic - RTL)</option>
                  <option value="en">🇬🇧 English (LTR)</option>
                </select>
                <span className="text-[11px] text-slate-400 block">
                  {selectedLanguage === 'en' ? 'Applies instantly across all screens & menus' : 'يتم التطبيق فورياً على كافة الشاشات والقوائم'}
                </span>
              </div>

              {/* Currency Dropdown */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedLanguage === 'en' ? 'System Currency (العملة):' : 'العملة المعتمدة للتقارير:'}</span>
                </label>
                <select
                  value={isCustomCurrency ? 'CUSTOM' : activeMatchedCurrency?.code || currency}
                  onChange={(e) => handleCurrencyDropdownChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 cursor-pointer transition-colors shadow-2xs"
                >
                  <optgroup label={selectedLanguage === 'en' ? 'Arab & Regional Currencies' : 'العملات العربية والإقليمية'}>
                    {ALL_CURRENCIES.slice(0, 21).map((c) => (
                      <option key={c.code} value={c.code}>
                        {formatCurrencyLabel(c, selectedLanguage)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={selectedLanguage === 'en' ? 'Global & International Currencies' : 'العملات الدولية والعالمية'}>
                    {ALL_CURRENCIES.slice(21).map((c) => (
                      <option key={c.code} value={c.code}>
                        {formatCurrencyLabel(c, selectedLanguage)}
                      </option>
                    ))}
                  </optgroup>
                  <option value="CUSTOM">
                    ✏️ {selectedLanguage === 'en' ? 'Custom Currency (Manual)...' : 'عملة مخصصة أخرى (يدوي)...'}
                  </option>
                </select>
                <span className="text-[11px] text-slate-400 block">
                  {selectedLanguage === 'en' ? 'Used in rations, milk & IOFC indicators' : 'تُستخدم في تكاليف العلائق وحسابات الـ IOFC'}
                </span>
              </div>
            </div>

            {/* Custom Currency Text Input (if selected) */}
            {isCustomCurrency && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-xs font-black text-purple-950">
                  {t('settings.customCurrency', 'اكتب رمز أو اسم العملة المخصصة يدويًا:')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={customCurrencyText}
                    onChange={(e) => setCustomCurrencyText(e.target.value)}
                    placeholder={t('settings.customCurrencyPlaceholder', 'اكتب رمز أو اسم العملة (مثال: ج.م، ر.س، $)...')}
                    className="flex-1 px-3.5 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 focus:outline-purple-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCurrencyText.trim()) {
                        setCurrency(customCurrencyText.trim());
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    {selectedLanguage === 'en' ? 'Apply' : 'تطبيق'}
                  </button>
                </div>
                <span className="text-[10px] text-purple-700 block">
                  {selectedLanguage === 'en'
                    ? 'Will be used in all costs, revenues, IOFC indicators, and printed reports.'
                    : 'سيتم تطبيق هذا الرمز في كافة حسابات التكاليف، الإيرادات، ومؤشرات الـ IOFC والطباعة.'}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 3: FARM & PERSONNEL MASTER DATA */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('settings.farmName', 'اسم المزرعة أو المشروع *')}
              </label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('settings.engineerName', 'اسم مهندس التغذية المسؤول *')}
                </label>
                <input
                  type="text"
                  required
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('settings.warehouseManager', 'اسم مسؤول المخزن *')}
                </label>
                <input
                  type="text"
                  required
                  value={warehouseManagerName}
                  onChange={(e) => setWarehouseManagerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('settings.driverName', 'بيانات/اسم السائق أو المشغل *')}
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: CONCENTRATE MIXER & BAGGING SYSTEM */}
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
                    {t('settings.premixSystem', 'نظام خلاطة العلف المركز وتعبئة الشكاير بالمزرعة')}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {t(
                      'settings.premixSystemDesc',
                      'حدد ما إذا كانت المزرعة تعتمد على خلط وتعبئة شكاير مركز مسبقاً أو تعتمد على الخلط المباشر في مكسر الـ TMR'
                    )}
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
                {hasConcentrateMixer
                  ? t('settings.premixActive', 'مفعل بالمزرعة 📦')
                  : t('settings.premixInactive', 'غير مفعل (خلط مباشر فقط 🚜)')}
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
                  <div className="font-extrabold text-slate-900 text-xs">
                    {selectedLanguage === 'en'
                      ? 'Yes, farm has concentrate mixer & bagging'
                      : 'نعم، يوجد خلاطة مركز وتعبئة شكاير'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedLanguage === 'en'
                      ? 'Enables pre-mix bagging orders and bags withdrawal.'
                      : 'تفعيل شاشات أوامر خلط المركز وأمر تعبئة الشكاير وخصمها.'}
                  </div>
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
                  <div className="font-extrabold text-slate-900 text-xs">
                    {selectedLanguage === 'en'
                      ? 'No concentrate mixer (direct TMR mixing only)'
                      : 'لا توجد خلاطة مركز (خلط مباشر بالمكسر فقط)'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedLanguage === 'en'
                      ? 'All ingredients loaded raw directly into the mixer wagon.'
                      : 'إلغاء شاشة المركز المسبق واقتصار الأوامر على خامات المكسر اليومية.'}
                  </div>
                </div>
              </button>
            </div>

            {hasConcentrateMixer && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700">
                    {t('settings.bagWeightLabel', 'وزن الشكارة الافتراضي المعتمد بالمزرعة:')}
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
                    <span className="text-xs font-bold text-slate-600">{t('term.kg', 'كجم')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold">
                    {selectedLanguage === 'en' ? 'Common:' : 'أوزان شائعة:'}
                  </span>
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
                      {w} {t('term.kg', 'كجم')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: DEFAULT ECONOMIC & SELLING PRICES */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                {t('settings.economicPrices', 'الأسعار الافتراضية لحسابات الـ IOFC والجدوى الاقتصادية')}
              </h4>
              <p className="text-xs text-slate-500">
                {t(
                  'settings.economicPricesDesc',
                  'الأسعار التقديرية المعتمدة لحساب عوائد بيع الحليب واللحم القائم في تقارير المزرعة'
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('settings.milkPrice', 'سعر بيع كيلو الحليب الافتراضي')} ({currency})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={defaultMilkPricePerKg}
                  onChange={(e) => setDefaultMilkPricePerKg(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('settings.meatPrice', 'سعر بيع كيلو اللحم القائم للتسمين الافتراضي')} ({currency})
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={defaultMeatPricePerKg}
                  onChange={(e) => setDefaultMeatPricePerKg(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{t('action.save', 'حفظ الإعدادات')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION: AUTOMATED BACKUP & ROLLING RECOVERY SNAPSHOTS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">
                {isEn ? 'Automatic Backup & Rolling Snapshots' : 'النسخ الاحتياطي التلقائي ونقاط الاستعادة'}
              </h4>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'The system automatically captures scheduled snapshots to protect against data loss.'
                  : 'يقوم النظام تلقائياً بأخذ لقطات حماية دورية لكافة بيانات المزرعة لمنع أي فقدان للبيانات.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <History className="w-4 h-4 text-emerald-200" />
              <span>{isEn ? 'Create Snapshot Now' : 'أخذ نقطة استعادة فورية الآن'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs">
          {/* Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
            <div>
              <span className="font-bold text-slate-800 block">
                {isEn ? 'Auto-Backup Status' : 'حالة النسخ التلقائي'}
              </span>
              <span className="text-[10px] text-slate-500">
                {autoBackupConfig.enabled
                  ? isEn ? 'Active & Scheduled' : 'مفعل ويعمل دورياً'
                  : isEn ? 'Currently Inactive' : 'معطل حالياً'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleAutoBackup(!autoBackupConfig.enabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                autoBackupConfig.enabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoBackupConfig.enabled
                    ? isRtl ? '-translate-x-5' : 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Schedule Frequency */}
          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
            <label className="font-bold text-slate-800 flex items-center gap-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{isEn ? 'Backup Schedule:' : 'دورية النسخ:'}</span>
            </label>
            <select
              value={autoBackupConfig.frequency}
              disabled={!autoBackupConfig.enabled}
              onChange={(e) => handleFrequencyChange(e.target.value as AutoBackupFrequency)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 focus:outline-emerald-600 disabled:opacity-50 cursor-pointer"
            >
              <option value="daily">{isEn ? 'Daily on launch (Recommended)' : 'يومياً عند فتح النظام (مستحسن)'}</option>
              <option value="every_12_hours">{isEn ? 'Every 12 Hours' : 'كل 12 ساعة'}</option>
              <option value="weekly">{isEn ? 'Weekly' : 'أسبوعياً'}</option>
            </select>
          </div>

          {/* Rolling Capacity & Info */}
          <div className="flex flex-col justify-center bg-white p-2.5 rounded-lg border border-slate-200/80">
            <span className="font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>{isEn ? 'Rolling Snapshots Kept:' : 'الحد الأقصى للنسخ:'}</span>
              <span className="text-emerald-700 font-black">{snapshots.length} / {autoBackupConfig.maxSnapshots || 7}</span>
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {autoBackupConfig.lastBackupTimestamp
                ? isEn
                  ? `Last backup: ${new Date(autoBackupConfig.lastBackupTimestamp).toLocaleDateString()} ${new Date(autoBackupConfig.lastBackupTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `آخر نسخ: ${new Date(autoBackupConfig.lastBackupTimestamp).toLocaleDateString('ar-EG')} ${new Date(autoBackupConfig.lastBackupTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : isEn ? 'No backups run yet' : 'لم يتم النسخ بعد'}
            </span>
          </div>
        </div>

        {/* Snapshots History List */}
        <div className="space-y-2">
          <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEn ? 'Available Recovery Snapshots History:' : 'سجل نقاط الاستعادة المحفوظة تلقائياً:'}</span>
          </h5>

          {snapshots.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
              <HardDrive className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                {isEn ? 'No backup snapshots available yet.' : 'لا توجد نقاط استعادة محفوظة بعد.'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Click "Create Snapshot Now" above or wait for the automatic scheduled backup.'
                  : 'اضغط "أخذ نقطة استعادة فورية الآن" أعلاه أو انتظر الموعد التلقائي المجدول.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 transition-colors shadow-2xs text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        📅 {snap.dateFormatted}
                      </span>
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200/80">
                        {snap.label || (isEn ? 'Auto Snapshot' : 'نسخة تلقائية')}
                      </span>
                      <span className="text-slate-500 font-medium text-[11px]">
                        💾 {snap.dataSizeKb} KB
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold flex-wrap">
                      <span>{snap.summary.barnsCount} {isEn ? 'pens' : 'عنبر'}</span>
                      <span>•</span>
                      <span>{snap.summary.rawMaterialsCount} {isEn ? 'materials' : 'خامة'}</span>
                      <span>•</span>
                      <span>{snap.summary.rationsCount} {isEn ? 'rations' : 'عليقة'}</span>
                      <span>•</span>
                      <span>{snap.summary.mixersCount} {isEn ? 'mixers' : 'مكسر'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title={isEn ? 'Restore this snapshot state' : 'استعادة حالة النظام من هذه النسخة'}
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-700" />
                      <span>{isEn ? 'Restore' : 'استعادة'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSnapshotAsFile(snap, isEn)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title={isEn ? 'Download .json file to PC' : 'تنزيل ملف .json على الكمبيوتر'}
                    >
                      <Download className="w-3 h-3 text-slate-600" />
                      <span>{isEn ? 'Export' : 'تنزيل'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={isEn ? 'Delete this snapshot' : 'حذف هذه النسخة'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: DEMO SCENARIO & MANUAL BACKUP */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <h4 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          {t('settings.maintenance', 'خيارات الصيانة المتقدمة والنسخ الاحتياطي اليدوي')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reload Demo */}
          <div className="bg-amber-50/70 border border-amber-200/90 p-4 rounded-xl space-y-3">
            <div>
              <h5 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                {t('settings.resetDemo', 'استعادة السيناريو التجريبي الأساسي')}
              </h5>
              <p className="text-xs text-amber-900/80 mt-1">
                {t(
                  'settings.resetDemoDesc',
                  'خاص بالاختبار وتدريب المشغلين (300 رأس - 5 عنابر - 5 لفات). يتطلب تأكيداً مسبقاً لحماية بيانات المزرعة الفعلية.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmResetModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('settings.resetDemoBtn', 'إعادة ضبط السيناريو التجريبي...')}</span>
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div>
              <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-700" />
                {t('settings.backupRestore', 'النسخ الاحتياطي اليدوي واستيراد الملفات')}
              </h5>
              <p className="text-xs text-slate-500 mt-1">
                {t(
                  'settings.backupRestoreDesc',
                  'حفظ ملف JSON شامل لجميع البيانات على القرص الصلب، أو استيراد ملف سابق.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> {t('settings.exportJson', 'تصدير JSON')}
              </button>

              <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-600" /> {t('settings.importFile', 'استعادة ملف')}
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-extrabold text-base text-slate-900">
                {selectedLanguage === 'en' ? 'Confirm Demo Reset' : 'تأكيد إعادة ضبط السيناريو التجريبي'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedLanguage === 'en'
                ? 'Are you sure you want to reload the demo scenario? All current changes will be overwritten with the baseline model.'
                : 'هل أنت متأكد من إعادة تحميل السيناريو التجريبي؟ سيتم مسح أي تعديلات غير محفوظة واستبدال البيانات بنموذج المزرعة القياسي.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('action.cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('action.confirm', 'تأكيد واستعادة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
