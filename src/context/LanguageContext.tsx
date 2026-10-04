import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppLanguage } from '../types';

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isRtl: boolean;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<AppLanguage, Record<string, string>> = {
  ar: {
    // App Branding & Navigation
    'app.title': 'نظام تغذية الماشية والعلائق',
    'app.subtitle': 'برنامج إدارة خلطات الأعلاف والمكسرات المتكامل',
    'nav.dashboard': 'الرئيسية',
    'nav.daily_plan': 'خطة التشغيل واللفات',
    'nav.farm_economics': 'اقتصاديات المزرعة و IOFC',
    'nav.concentrate_premix': 'خلاطة المركز والشكاير',
    'nav.distributions': 'توزيع اللفات على العنابر',
    'nav.prep_orders': 'أوامر تحضير المكسر',
    'nav.driver_sheet': 'كشف السائق والتوزيع',
    'nav.warehouse': 'مخزن الخامات والاحتياجات',
    'nav.reports': 'تقرير التغذية اليومي',
    'nav.history': 'السجل اليومي والأرشيف',
    'nav.raw_materials': 'قاعدة الخامات العلفية',
    'nav.rations': 'تركيبات العلائق',
    'nav.categories': 'الفئات الحيوانية',
    'nav.barns': 'العنابر والقطعان',
    'nav.mixers': 'مكسرات العلف TMR',
    'nav.settings': 'إعدادات النظام',
    'nav.developer_contact': 'المطور والتواصل',

    // Section Titles
    'group.operations': 'العمليات والتشغيل اليومي',
    'group.data': 'البيانات وقواعد التغذية',
    'group.system': 'النظام والمطور',

    // Common Actions
    'action.save': 'حفظ',
    'action.cancel': 'إلغاء',
    'action.confirm': 'تأكيد',
    'action.delete': 'حذف',
    'action.edit': 'تعديل',
    'action.add': 'إضافة',
    'action.print': 'طباعة',
    'action.printPreview': 'معاينة الطباعة A4',
    'action.instantPrint': 'طباعة فورية',
    'action.exportExcel': 'تصدير إكسيل',
    'action.close': 'إغلاق',
    'action.refresh': 'تحديث',
    'action.search': 'بحث...',
    'action.filter': 'تصفية',
    'action.all': 'الكل',
    'action.today': 'اليوم',
    'action.yesterday': 'أمس',
    'action.tomorrow': 'غداً',

    // Core Agronomy & Veterinary Terms
    'term.ration': 'العليقة',
    'term.dryMatter': 'المادة الجافة (DM)',
    'term.refusal': 'راجع الحلاب',
    'term.recycledRefusal': 'تدوير راجع الحلاب',
    'term.roughage': 'مادة مالئة وخشنة',
    'term.concentrate': 'علف مركز وحبوب',
    'term.mineral': 'أملاح وإضافات',
    'term.liquid': 'سوائل ومولاس',
    'term.heads': 'رأس',
    'term.batch': 'لفة مكسر',
    'term.mixer': 'مكسر',
    'term.barn': 'عنبر',
    'term.targetWeight': 'الوزن المستهدف',
    'term.actualWeight': 'الوزن الفعلي',
    'term.diff': 'الفرق',
    'term.kg': 'كجم',
    'term.ton': 'طن',
    'term.kgPerHead': 'كجم/رأس',
    'term.milk': 'الحليب',
    'term.meat': 'اللحم',
    'term.iofc': 'العائد فوق تكلفة العلف (IOFC)',
    'term.revenue': 'الإيراد',
    'term.cost': 'التكلفة',
    'term.status': 'الحالة',
    'term.notes': 'ملاحظات',
    'term.active': 'نشط',
    'term.inactive': 'غير نشط',
    'term.empty': 'فارغ',
    'term.maintenance': 'صيانة',
    'term.planned': 'مخططة',
    'term.inProgress': 'قيد التحضير',
    'term.prepared': 'تم التحضير',
    'term.distributed': 'تم التوزيع',
    'term.lactating': 'حلاب',
    'term.fattening': 'تسمين',
    'term.growing': 'نامي',
    'term.dry': 'جاف',
    'term.heifers': 'عجلات',
    'term.calves': 'رضيع وفطام',
    'term.transition': 'انتظار ولادة',
    'term.bags': 'شكارة',
    'term.bag': 'شكارة',

    // Settings View Specific
    'settings.title': 'إعدادات النظام والبيانات الأساسية للمزرعة',
    'settings.statusReady': 'النظام جاهز ومحفوظ',
    'settings.farmName': 'اسم المزرعة أو المشروع *',
    'settings.engineerName': 'اسم مهندس التغذية المسؤول *',
    'settings.warehouseManager': 'اسم مسؤول المخزن *',
    'settings.driverName': 'بيانات/اسم السائق أو المشغل *',
    'settings.languageSection': 'لغة واجهة النظام (System Language)',
    'settings.languageHint': 'اختر لغة النظام المفضلة؛ يتم تطبيق التغيير فورياً على كافة الواجهات والاتجاهات.',
    'settings.langAr': 'العربية (Arabic)',
    'settings.langEn': 'English (الإنجليزية)',
    'settings.currencySection': 'العملة المعتمدة للتقارير والحسابات (System Currency)',
    'settings.currencyHint': 'اختر العملة المستخدمة لحساب تكاليف الأعلاف والإيرادات في كافة الشاشات والتقارير والطباعة.',
    'settings.selectCurrency': 'اختر العملة من القائمة الشاملة:',
    'settings.customCurrency': 'عملة مخصصة أخرى:',
    'settings.customCurrencyPlaceholder': 'اكتب رمز أو اسم العملة (مثال: ج.م، ر.س، $)...',
    'settings.premixSystem': 'نظام خلاطة العلف المركز وتعبئة الشكاير بالمزرعة',
    'settings.premixSystemDesc': 'حدد ما إذا كانت المزرعة تعتمد على خلط وتعبئة شكاير مركز مسبقاً أو تعتمد على الخلط المباشر في مكسر الـ TMR',
    'settings.premixActive': 'مفعل بالمزرعة (سحب شكاير مركز جاهزة 📦)',
    'settings.premixInactive': 'غير مفعل (خلط مباشر لجميع الخامات بالمكسر 🚜)',
    'settings.bagWeightLabel': 'وزن الشكارة الافتراضي المعتمد بالمزرعة:',
    'settings.economicPrices': 'الأسعار الافتراضية لحسابات الـ IOFC والجدوى الاقتصادية',
    'settings.economicPricesDesc': 'الأسعار التقديرية المعتمدة لحساب عوائد بيع الحليب واللحم القائم في تقارير المزرعة',
    'settings.milkPrice': 'سعر بيع كيلو الحليب الافتراضي',
    'settings.meatPrice': 'سعر بيع كيلو اللحم القائم للتسمين الافتراضي',
    'settings.saveSuccess': 'تم حفظ إعدادات النظام وتحديث العملة واللغة بنجاح!',
    'settings.maintenance': 'خيارات الصيانة المتقدمة والنسخ الاحتياطي',
    'settings.resetDemo': 'استعادة السيناريو التجريبي الأساسي',
    'settings.resetDemoDesc': 'خاص بالاختبار وتدريب المشغلين (300 رأس - 5 عنابر - 5 لفات). يتطلب تأكيداً مسبقاً لحماية بيانات المزرعة الفعلية.',
    'settings.resetDemoBtn': 'إعادة ضبط السيناريو التجريبي...',
    'settings.backupRestore': 'النسخ الاحتياطي واستعادة البيانات',
    'settings.backupRestoreDesc': 'حفظ نسخة من جميع الخامات، العنابر، والعلائق على جهازك، أو استعادتها.',
    'settings.exportJson': 'تصدير نسخة JSON',
    'settings.importFile': 'استعادة ملف نسخة احتياطية',
  },
  en: {
    // App Branding & Navigation
    'app.title': 'Livestock Feeding & Ration Management',
    'app.subtitle': 'Integrated TMR Feed Mixers & Dairy Herd System',
    'nav.dashboard': 'Dashboard',
    'nav.daily_plan': 'Daily Operations & Batches',
    'nav.farm_economics': 'Farm Economics & IOFC',
    'nav.concentrate_premix': 'Concentrate Mixer & Bags',
    'nav.distributions': 'Barn Batch Allocations',
    'nav.prep_orders': 'Mixer Preparation Orders',
    'nav.driver_sheet': 'Driver Feeding Sheet',
    'nav.warehouse': 'Feed Warehouse & Ledger',
    'nav.reports': 'Daily Nutrition Report',
    'nav.history': 'Daily Log & Archives',
    'nav.raw_materials': 'Raw Materials Database',
    'nav.rations': 'Ration Formulations',
    'nav.categories': 'Animal Categories',
    'nav.barns': 'Barns & Pens',
    'nav.mixers': 'TMR Feed Mixers',
    'nav.settings': 'System Settings',
    'nav.developer_contact': 'Developer & Contact',

    // Section Titles
    'group.operations': 'Operations & Daily Feeding',
    'group.data': 'Feeding Data & Standards',
    'group.system': 'System & Support',

    // Common Actions
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.add': 'Add New',
    'action.print': 'Print',
    'action.printPreview': 'Print Preview A4',
    'action.instantPrint': 'Quick Print',
    'action.exportExcel': 'Export Excel',
    'action.close': 'Close',
    'action.refresh': 'Refresh',
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.all': 'All',
    'action.today': 'Today',
    'action.yesterday': 'Yesterday',
    'action.tomorrow': 'Tomorrow',

    // Core Agronomy & Veterinary Terms
    'term.ration': 'Ration',
    'term.dryMatter': 'Dry Matter (DM)',
    'term.refusal': 'Milking Refusal',
    'term.recycledRefusal': 'Recycled Refusal',
    'term.roughage': 'Roughage & Forage',
    'term.concentrate': 'Concentrate & Grains',
    'term.mineral': 'Minerals & Premix',
    'term.liquid': 'Liquids & Molasses',
    'term.heads': 'heads',
    'term.batch': 'Mixer Batch',
    'term.mixer': 'TMR Mixer',
    'term.barn': 'Barn / Pen',
    'term.targetWeight': 'Target Weight',
    'term.actualWeight': 'Actual Weight',
    'term.diff': 'Variance',
    'term.kg': 'kg',
    'term.ton': 'ton',
    'term.kgPerHead': 'kg/head',
    'term.milk': 'Milk',
    'term.meat': 'Meat',
    'term.iofc': 'Income Over Feed Cost (IOFC)',
    'term.revenue': 'Revenue',
    'term.cost': 'Feed Cost',
    'term.status': 'Status',
    'term.notes': 'Notes',
    'term.active': 'Active',
    'term.inactive': 'Inactive',
    'term.empty': 'Empty',
    'term.maintenance': 'Maintenance',
    'term.planned': 'Planned',
    'term.inProgress': 'In Progress',
    'term.prepared': 'Prepared',
    'term.distributed': 'Distributed',
    'term.lactating': 'Lactating',
    'term.fattening': 'Fattening',
    'term.growing': 'Growing',
    'term.dry': 'Dry Cows',
    'term.heifers': 'Heifers',
    'term.calves': 'Calves & Weaning',
    'term.transition': 'Close-Up / Transition',
    'term.bags': 'bags',
    'term.bag': 'bag',

    // Settings View Specific
    'settings.title': 'System Settings & Farm Master Data',
    'settings.statusReady': 'System Ready & Saved',
    'settings.farmName': 'Farm or Project Name *',
    'settings.engineerName': 'Nutrition Engineer in Charge *',
    'settings.warehouseManager': 'Warehouse Manager *',
    'settings.driverName': 'TMR Mixer Driver / Operator *',
    'settings.languageSection': 'System Language',
    'settings.languageHint': 'Select your preferred language. The layout, labels, and text direction update immediately.',
    'settings.langAr': 'العربية (Arabic)',
    'settings.langEn': 'English (الإنجليزية)',
    'settings.currencySection': 'System Currency for Financial Reports & Calculations',
    'settings.currencyHint': 'Select the currency used for feed costs, revenues, IOFC indicators, and printout sheets.',
    'settings.selectCurrency': 'Select currency from comprehensive catalog:',
    'settings.customCurrency': 'Or Enter Custom Currency:',
    'settings.customCurrencyPlaceholder': 'e.g., USD, EUR, EGP, SAR, $...',
    'settings.premixSystem': 'Farm Concentrate Mixer & Bagging System',
    'settings.premixSystemDesc': 'Specify whether your farm mixes and bags concentrates in advance, or loads all raw ingredients directly into the TMR mixer wagon.',
    'settings.premixActive': 'Enabled on Farm (Withdraw pre-bagged concentrates 📦)',
    'settings.premixInactive': 'Disabled (Direct loader mixing of all raw materials 🚜)',
    'settings.bagWeightLabel': 'Default Approved Bag Weight on Farm:',
    'settings.economicPrices': 'Default Prices for IOFC & Economic Feasibility',
    'settings.economicPricesDesc': 'Baseline prices used to calculate milk output and fattening liveweight gain revenues.',
    'settings.milkPrice': 'Default Milk Selling Price per kg',
    'settings.meatPrice': 'Default Live Meat Selling Price per kg',
    'settings.saveSuccess': 'System settings, currency, and language updated successfully!',
    'settings.maintenance': 'Advanced Maintenance, Backup & Restore',
    'settings.resetDemo': 'Restore Baseline Demo Scenario',
    'settings.resetDemoDesc': 'For testing and operator training (300 heads - 5 barns - 5 batches). Requires confirmation to protect real farm data.',
    'settings.resetDemoBtn': 'Reset Demo Scenario...',
    'settings.backupRestore': 'Backup & Data Restoration',
    'settings.backupRestoreDesc': 'Download a complete JSON backup of all barns, rations, raw materials, and plans, or restore a previous file.',
    'settings.exportJson': 'Export JSON Backup',
    'settings.importFile': 'Restore Backup File',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  isRtl: true,
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{
  children: ReactNode;
  initialLanguage?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}> = ({ children, initialLanguage = 'ar', onLanguageChange }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('farm_system_language') as AppLanguage;
      if (saved === 'ar' || saved === 'en') return saved;
    }
    return initialLanguage || 'ar';
  });

  const setLanguage = (newLang: AppLanguage) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('farm_system_language', newLang);
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    }
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
      if (typeof window !== 'undefined') {
        localStorage.setItem('farm_system_language', initialLanguage);
        document.documentElement.dir = initialLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = initialLanguage;
      }
    }
  }, [initialLanguage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const isRtl = language === 'ar';

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const arDict = translations['ar'];
    if (arDict && arDict[key]) {
      return arDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRtl, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}

export * from '../utils/translationHelpers';
