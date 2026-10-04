import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AppLanguage, FarmSettings } from '../../types';
import { ALL_CURRENCIES, formatCurrencyLabel } from '../../data/currencies';
import { CheckCircle2, Globe, Sparkles, Building2, User, Coins } from 'lucide-react';

interface InitialSetupModalProps {
  isOpen: boolean;
  onComplete: (lang: AppLanguage, custom: Partial<FarmSettings>) => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { language } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(language || 'ar');
  const [farmName, setFarmName] = useState(
    language === 'en'
      ? 'Prime Livestock & Cattle Feedlot'
      : 'مزرعة الخير والبركة للإنتاج الحيواني'
  );
  const [engineerName, setEngineerName] = useState(
    language === 'en' ? 'Eng. Ahmed Abdelaziz' : 'مهندس / أحمد عبد العزيز'
  );

  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(
    language === 'en' ? 'USD' : 'EGP'
  );
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);
  const [customCurrencyText, setCustomCurrencyText] = useState('');

  if (!isOpen) return null;

  const isEn = selectedLang === 'en';

  const handleLangChange = (lang: AppLanguage) => {
    setSelectedLang(lang);
    if (lang === 'en') {
      if (farmName === 'مزرعة الخير والبركة للإنتاج الحيواني') {
        setFarmName('Prime Livestock & Cattle Feedlot');
      }
      if (engineerName === 'مهندس / أحمد عبد العزيز') {
        setEngineerName('Eng. Ahmed Abdelaziz');
      }
      if (selectedCurrencyCode === 'EGP' && !isCustomCurrency) {
        setSelectedCurrencyCode('USD');
      }
    } else {
      if (farmName === 'Prime Livestock & Cattle Feedlot') {
        setFarmName('مزرعة الخير والبركة للإنتاج الحيواني');
      }
      if (engineerName === 'Eng. Ahmed Abdelaziz') {
        setEngineerName('مهندس / أحمد عبد العزيز');
      }
      if (selectedCurrencyCode === 'USD' && !isCustomCurrency) {
        setSelectedCurrencyCode('EGP');
      }
    }
  };

  const handleCurrencyChange = (val: string) => {
    if (val === 'CUSTOM') {
      setIsCustomCurrency(true);
    } else {
      setIsCustomCurrency(false);
      setSelectedCurrencyCode(val);
    }
  };

  const getEffectiveCurrencySymbol = (): string => {
    if (isCustomCurrency) {
      return customCurrencyText.trim() || (isEn ? 'USD' : 'ج.م');
    }
    const found = ALL_CURRENCIES.find((c) => c.code === selectedCurrencyCode);
    if (found) {
      return isEn ? found.symbolEn : found.symbolAr;
    }
    return isEn ? 'USD' : 'ج.م';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCurrency = getEffectiveCurrencySymbol();
    onComplete(selectedLang, {
      farmName: farmName.trim() || (isEn ? 'Livestock Farm' : 'مزرعة الماشية'),
      engineerName: engineerName.trim() || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية'),
      currency: finalCurrency,
      language: selectedLang,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-100 text-emerald-800 rounded-2xl shadow-inner mb-1">
            <Sparkles className="w-8 h-8 text-emerald-700 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isEn
              ? 'Welcome to Cattle Feeding & Ration Management'
              : 'مرحباً بك في نظام تغذية الماشية وإدارة العلائق والمكاسر'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {isEn
              ? 'Please configure your system language, currency, and farm details to initialize.'
              : 'يرجى تحديد لغة الواجهة والعملة وبيانات المزرعة لإتمام التثبيت والتهيئة الأولى للنظام.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SYSTEM PREFERENCES (Language & Currency in a compact 2-column card) */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? '1. System Preferences (Language & Currency)' : '1. تفضيلات النظام (اللغة والعملة)'}</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {isEn ? 'Step 1 of 2' : 'الخطوة 1 من 2'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Language Dropdown */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isEn ? 'System Language:' : 'لغة الواجهة:'}</span>
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => handleLangChange(e.target.value as AppLanguage)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 cursor-pointer shadow-2xs"
                >
                  <option value="ar">🇸🇦 العربية (Arabic - RTL)</option>
                  <option value="en">🇬🇧 English (LTR)</option>
                </select>
              </div>

              {/* Currency Dropdown */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isEn ? 'Reporting Currency:' : 'العملة المعتمدة:'}</span>
                </label>
                <select
                  value={isCustomCurrency ? 'CUSTOM' : selectedCurrencyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 cursor-pointer shadow-2xs"
                >
                  <optgroup label={isEn ? 'Arab & Regional Currencies' : 'العملات العربية والإقليمية'}>
                    {ALL_CURRENCIES.slice(0, 21).map((c) => (
                      <option key={c.code} value={c.code}>
                        {formatCurrencyLabel(c, selectedLang)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={isEn ? 'Global & International Currencies' : 'العملات الدولية والعالمية'}>
                    {ALL_CURRENCIES.slice(21).map((c) => (
                      <option key={c.code} value={c.code}>
                        {formatCurrencyLabel(c, selectedLang)}
                      </option>
                    ))}
                  </optgroup>
                  <option value="CUSTOM">
                    ✏️ {isEn ? 'Other Custom Currency...' : 'عملة مخصصة أخرى...'}
                  </option>
                </select>
              </div>
            </div>

            {/* Custom Currency Text Input (if selected) */}
            {isCustomCurrency && (
              <div className="pt-2 border-t border-purple-200/80 space-y-1">
                <label className="block text-[11px] font-black text-purple-950">
                  {isEn ? 'Enter custom currency symbol/code:' : 'اكتب رمز أو اسم العملة المخصصة:'}
                </label>
                <input
                  type="text"
                  required
                  value={customCurrencyText}
                  onChange={(e) => setCustomCurrencyText(e.target.value)}
                  placeholder={isEn ? 'e.g. $, USD, د.م...' : 'مثال: ج.م، ر.س، $...'}
                  className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 focus:outline-purple-600"
                />
              </div>
            )}
          </div>

          {/* FARM & PERSONNEL DATA */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>{isEn ? '2. Farm & Personnel Information' : '2. بيانات المزرعة والمسؤول'}</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {isEn ? 'Step 2 of 2' : 'الخطوة 2 من 2'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isEn ? 'Farm or Project Name *' : 'اسم المزرعة أو المشروع *'}</span>
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder={isEn ? 'e.g. Al-Amal Cattle Farm' : 'مثال: مزرعة الأمل للإنتاج الحيواني'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isEn ? 'Nutrition Engineer in Charge *' : 'اسم مهندس التغذية المسؤول *'}</span>
                </label>
                <input
                  type="text"
                  required
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  placeholder={isEn ? 'e.g. Eng. Mohamed Ali' : 'مثال: مهندس / محمد علي'}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>{isEn ? 'Complete Setup & Launch System' : 'إتمام التثبيت وبدء تشغيل النظام'}</span>
            </button>
          </div>

          {/* REASSURANCE NOTE */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
            <p className="text-[11px] font-semibold text-emerald-950">
              {isEn
                ? '💡 Note: You can change the language and currency anytime later directly from System Settings without losing any data.'
                : '💡 ملاحظة: يمكنك تغيير اللغة والعملة في أي وقت لاحقاً بكل سهولة من شاشة إعدادات النظام دون فقدان أي بيانات.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
