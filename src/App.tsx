/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  DailyOperationPlan,
  FarmSettings,
  RawMaterial,
  Ration,
  AnimalCategory,
  Barn,
  Mixer,
} from './types';
import {
  loadRawMaterials,
  saveRawMaterials,
  loadRations,
  saveRations,
  loadCategories,
  saveCategories,
  loadBarns,
  saveBarns,
  loadMixers,
  saveMixers,
  loadSettings,
  saveSettings,
  loadDailyPlan,
  saveDailyPlan,
  resetAllDataToDemo,
  sanitizeBatches,
  sanitizeAllStoredData,
} from './services/storage';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { DashboardView } from './components/views/DashboardView';
import { DailyPlanView } from './components/views/DailyPlanView';
import { FarmEconomicsView } from './components/views/FarmEconomicsView';
import { ConcentratePremixView } from './components/views/ConcentratePremixView';
import { BatchDistributionView } from './components/views/BatchDistributionView';
import { PreparationOrdersView } from './components/views/PreparationOrdersView';
import { DriverSheetView } from './components/views/DriverSheetView';
import { WarehouseView } from './components/views/WarehouseView';
import { NutritionReportView } from './components/views/NutritionReportView';
import { DailyLogView } from './components/views/DailyLogView';

import { RawMaterialsView } from './components/views/RawMaterialsView';
import { RationsView } from './components/views/RationsView';
import { CategoriesView } from './components/views/CategoriesView';
import { BarnsView } from './components/views/BarnsView';
import { MixersView } from './components/views/MixersView';
import { SettingsView } from './components/views/SettingsView';
import { DeveloperContactView } from './components/views/DeveloperContactView';
import {
  exportRawMaterialsToExcel,
  exportRationsToExcel,
  exportCategoriesToExcel,
  exportBarnsToExcel,
  exportMixersToExcel,
  exportDailyPlanToExcel,
  exportPreparationOrdersToExcel,
  exportDriverSheetToExcel,
  exportWarehouseToExcel,
  exportConcentratePremixToExcel,
  exportNutritionReportToExcel,
  exportFullFarmWorkbookToExcel,
  exportFarmEconomicsToExcel,
} from './utils/excelExport';
import { calculateWholeFarmEconomics } from './utils/calculations';
import { FeedbackProvider, notify } from './context/FeedbackContext';
import { useLanguage } from './context/LanguageContext';
import { PrintPreviewModal, ReportType } from './components/modals/PrintPreviewModal';
import { InitialSetupModal } from './components/modals/InitialSetupModal';
import { AppLanguage } from './types';
import { checkAndTriggerAutoBackup } from './services/backupService';

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'daily_plan',
  'farm_economics',
  'concentrate_premix',
  'distributions',
  'prep_orders',
  'driver_sheet',
  'warehouse',
  'reports',
  'history',
  'raw_materials',
  'rations',
  'categories',
  'barns',
  'mixers',
  'settings',
  'developer_contact',
];

function getInitialTab(): ActiveTab {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as ActiveTab;
    if (VALID_TABS.includes(hash)) return hash;
    const saved = localStorage.getItem('farm_feed_active_tab') as ActiveTab;
    if (saved && VALID_TABS.includes(saved)) return saved;
  }
  return 'dashboard';
}

export default function App() {
  const { language, setLanguage, isRtl, t } = useLanguage();
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('farm_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('farm_sidebar_open', String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      localStorage.setItem('farm_sidebar_open', 'false');
    }
  };

  // Keyboard shortcut: Ctrl + B or Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
      localStorage.setItem('farm_feed_active_tab', tab);
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveTab;
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem('farm_feed_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Core Data States
  const [rawMaterials, setRawMaterialsState] = useState<RawMaterial[]>(() => {
    const loaded = loadRawMaterials();
    return Array.isArray(loaded) ? loaded : [];
  });
  const [rations, setRationsState] = useState<Ration[]>(() => {
    const loaded = loadRations();
    return Array.isArray(loaded) ? loaded : [];
  });
  const [categories, setCategoriesState] = useState<AnimalCategory[]>(() => {
    const loaded = loadCategories();
    return Array.isArray(loaded) ? loaded : [];
  });
  const [barns, setBarnsState] = useState<Barn[]>(() => {
    const loaded = loadBarns();
    return Array.isArray(loaded) ? loaded : [];
  });
  const [mixers, setMixersState] = useState<Mixer[]>(() => {
    const loaded = loadMixers();
    return Array.isArray(loaded) ? loaded : [];
  });
  const [settings, setSettingsState] = useState<FarmSettings>(loadSettings);

  // Daily Operation Plan State for the selectedDate
  const [dailyPlan, setDailyPlanState] = useState<DailyOperationPlan>(() => {
    sanitizeAllStoredData();
    const raw = loadDailyPlan(selectedDate);
    const { batches } = sanitizeBatches(raw.batches || [], loadBarns(), loadCategories(), loadRations(), raw);
    return { ...raw, batches };
  });

  // Selected batch ID for Preparation Orders
  const [selectedBatchForOrder, setSelectedBatchForOrder] = useState<string | undefined>(undefined);

  // When selectedDate changes, load that date's plan
  useEffect(() => {
    sanitizeAllStoredData();
    const plan = loadDailyPlan(selectedDate);
    const { batches: cleaned, changed } = sanitizeBatches(
      plan.batches || [],
      barns,
      categories,
      rations,
      plan
    );
    if (changed) {
      const updatedPlan = { ...plan, batches: cleaned };
      setDailyPlanState(updatedPlan);
      saveDailyPlan(updatedPlan);
    } else {
      setDailyPlanState(plan);
    }
  }, [selectedDate, barns, categories, rations]);

  // If user disabled concentrate mixer and current tab is concentrate_premix, fallback to daily plan
  useEffect(() => {
    if (settings.hasConcentrateMixer === false && activeTab === 'concentrate_premix') {
      setActiveTab('daily_plan');
    }
  }, [settings.hasConcentrateMixer, activeTab]);

  // Sync settings language with LanguageContext
  useEffect(() => {
    if (settings.language && settings.language !== language) {
      setLanguage(settings.language);
    }
  }, [settings.language]);

  // Automatic Backup Periodic Trigger
  useEffect(() => {
    try {
      const res = checkAndTriggerAutoBackup();
      if (res.ran && res.snapshot) {
        notify(
          language === 'en'
            ? `Automatic backup saved (${res.snapshot.dataSizeKb} KB)`
            : `تم حفظ نسخة احتياطية تلقائية للنظام (${res.snapshot.dataSizeKb} ك.ب)`,
          'info'
        );
      }
    } catch (e) {
      console.error('Auto backup check error:', e);
    }
  }, [language]);

  // Setters with persistent storage
  const updateRawMaterials = (items: typeof rawMaterials) => {
    const safe = Array.isArray(items) ? items : [];
    setRawMaterialsState(safe);
    saveRawMaterials(safe);
  };

  const updateRations = (items: typeof rations) => {
    const safe = Array.isArray(items) ? items : [];
    setRationsState(safe);
    saveRations(safe);
  };

  const updateCategories = (items: typeof categories) => {
    const safe = Array.isArray(items) ? items : [];
    setCategoriesState(safe);
    saveCategories(safe);
  };

  const updateBarns = (items: typeof barns) => {
    const safe = Array.isArray(items) ? items : [];
    setBarnsState(safe);
    saveBarns(safe);
  };

  const updateMixers = (items: typeof mixers) => {
    const safe = Array.isArray(items) ? items : [];
    setMixersState(safe);
    saveMixers(safe);
  };

  const updateSettings = (newSettings: FarmSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
    if (newSettings.language && newSettings.language !== language) {
      setLanguage(newSettings.language);
    }

    // Sync today's active dailyPlan with new default prices if it was relying on default prices or unset
    const prevDefaultMilk = settings.defaultMilkPricePerKg ?? 20.0;
    const currentPlanMilk = dailyPlan.milkProduction?.milkPricePerKg;
    const prevDefaultMeat = settings.defaultMeatPricePerKg ?? 175.0;
    const currentPlanMeat = dailyPlan.fatteningMeatPricePerKg;

    const shouldUpdateMilk = currentPlanMilk === undefined || currentPlanMilk === prevDefaultMilk;
    const shouldUpdateMeat = currentPlanMeat === undefined || currentPlanMeat === prevDefaultMeat;

    if (shouldUpdateMilk || shouldUpdateMeat) {
      const updatedPlan: DailyOperationPlan = {
        ...dailyPlan,
        fatteningMeatPricePerKg: shouldUpdateMeat
          ? newSettings.defaultMeatPricePerKg
          : currentPlanMeat,
        milkProduction: {
          sessions: dailyPlan.milkProduction?.sessions || [],
          refusalPercent: dailyPlan.milkProduction?.refusalPercent ?? 5,
          milkPricePerKg: shouldUpdateMilk
            ? newSettings.defaultMilkPricePerKg
            : currentPlanMilk,
          milkingHeadCount: dailyPlan.milkProduction?.milkingHeadCount,
          notes: dailyPlan.milkProduction?.notes,
        },
      };
      setDailyPlanState(updatedPlan);
      saveDailyPlan(updatedPlan);
    }
  };

  const updateDailyPlan = (plan: DailyOperationPlan) => {
    setDailyPlanState(plan);
    saveDailyPlan(plan);
  };

  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const installed = localStorage.getItem('farm_feed_installed');
      return installed !== 'true';
    }
    return false;
  });

  const handleCompleteInitialSetup = (lang: AppLanguage, custom: Partial<FarmSettings>) => {
    localStorage.setItem('farm_feed_installed', 'true');
    resetAllDataToDemo(lang, custom);
    setLanguage(lang);
    setSettingsState(loadSettings());
    setRawMaterialsState(loadRawMaterials());
    setRationsState(loadRations());
    setCategoriesState(loadCategories());
    setBarnsState(loadBarns());
    setMixersState(loadMixers());
    setDailyPlanState(loadDailyPlan(selectedDate));
    setIsInitialSetupOpen(false);
    notify(
      lang === 'en'
        ? 'System setup completed successfully!'
        : 'تم إتمام تهيئة النظام وتثبيت البيانات بنجاح!',
      'success'
    );
  };

  const handleResetDemoScenario = (overrideLanguage?: AppLanguage) => {
    const targetLang = overrideLanguage || settings.language || language || 'ar';
    resetAllDataToDemo(targetLang);
    setRawMaterialsState(loadRawMaterials());
    setRationsState(loadRations());
    setCategoriesState(loadCategories());
    setBarnsState(loadBarns());
    setMixersState(loadMixers());
    setSettingsState(loadSettings());
    setDailyPlanState(loadDailyPlan(selectedDate));
    if (targetLang !== language) {
      setLanguage(targetLang);
    }
    notify(
      targetLang === 'en'
        ? 'Demo scenario reset successfully in English!'
        : 'تمت إعادة تحميل السيناريو التجريبي بنجاح!',
      'success'
    );
  };

  // Print Preview Mode State & Handlers
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [previewReportType, setPreviewReportType] = useState<ReportType>('prep_orders');
  const [previewBatchId, setPreviewBatchId] = useState<string | undefined>(undefined);
  const [previewPremixCategory, setPreviewPremixCategory] = useState<string | undefined>(undefined);
  const [previewPremixWeight, setPreviewPremixWeight] = useState<number | undefined>(undefined);
  const [previewPlanOverride, setPreviewPlanOverride] = useState<DailyOperationPlan | undefined>(undefined);

  const handleOpenPrintPreview = (
    customType?: ReportType,
    customBatchId?: string,
    customPremixCatId?: string,
    customPremixWeight?: number,
    customPlan?: DailyOperationPlan
  ) => {
    if (customPlan) {
      setPreviewPlanOverride(customPlan);
    } else {
      setPreviewPlanOverride(undefined);
    }
    if (customBatchId) {
      setSelectedBatchForOrder(customBatchId);
      setPreviewBatchId(customBatchId);
    } else {
      setPreviewBatchId(selectedBatchForOrder || 'ALL');
    }
    if (customPremixCatId) {
      setPreviewPremixCategory(customPremixCatId);
    }
    if (customPremixWeight) {
      setPreviewPremixWeight(customPremixWeight);
    }
    if (customType) {
      setPreviewReportType(customType);
    } else {
      switch (activeTab) {
        case 'prep_orders':
          setPreviewReportType('prep_orders');
          break;
        case 'driver_sheet':
          setPreviewReportType('driver_sheet');
          break;
        case 'reports':
          setPreviewReportType('nutrition_report');
          break;
        case 'warehouse':
          setPreviewReportType('warehouse');
          break;
        case 'concentrate_premix':
          setPreviewReportType('concentrate_premix');
          break;
        case 'farm_economics':
          setPreviewReportType('farm_economics');
          break;
        case 'daily_plan':
          setPreviewReportType('daily_plan');
          break;
        case 'history':
          setPreviewReportType('daily_log');
          break;
        default:
          setPreviewReportType('prep_orders');
      }
    }
    setIsPrintPreviewOpen(true);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).electronAPI?.print) {
        (window as any).electronAPI.print();
      } else {
        window.print();
      }
    }
  };

  // Helper titles
  const getTabTitle = (tab: ActiveTab, lang: string = 'ar'): { title: string; subtitle: string } => {
    if (lang === 'en') {
      switch (tab) {
        case 'dashboard':
          return { title: 'Dashboard - Feeding Overview', subtitle: 'Real-time overview of daily farm feeding demands, mixer batches, and herd alerts' };
        case 'daily_plan':
          return { title: 'Daily Operation Plan - Mixer Batches', subtitle: 'Plan and coordinate mixer batch weights, sequence, and feeding timings' };
        case 'farm_economics':
          return {
            title: 'Farm Economics & IOFC',
            subtitle: 'Category feed cost, gross herd revenue, and daily feeding profitability indicators',
          };
        case 'concentrate_premix':
          return {
            title: 'Concentrate Mixer & Bagging',
            subtitle: 'Pre-mix concentrate batches (0.5t, 1t, 2t) and bag allocations for mixers',
          };
        case 'distributions':
          return { title: 'Barn Batch Allocations & Verification', subtitle: 'Assign mixed feed from each batch to target barns with cross-validation' };
        case 'prep_orders':
          return { title: 'Mixer Preparation & Loading Orders', subtitle: 'Accurate proportioning of raw ingredients per batch and mixer loading records' };
        case 'driver_sheet':
          return { title: 'Driver Feeding Sheet', subtitle: 'Discharge and distribution schedule for TMR mixer driver and tractor operator' };
        case 'warehouse':
          return { title: 'Warehouse Daily Requirements', subtitle: 'Consolidated raw ingredient withdrawal ledger from the central feed store' };
        case 'reports':
          return { title: 'Comprehensive Nutrition Report', subtitle: 'Technical nutritionist report tracking herd feed intake and rates' };
        case 'history':
          return { title: 'Daily Log & Historical Archives', subtitle: 'Review historical daily plans, records, and past execution logs' };
        case 'raw_materials':
          return { title: 'Raw Materials Database', subtitle: 'Manage feed ingredients, dry matter %, prices, and inventory status' };
        case 'rations':
          return { title: 'Ration Formulations (kg/head)', subtitle: 'Define ingredient proportions per head per day as fed and dry matter' };
        case 'categories':
          return { title: 'Animal Categories', subtitle: 'Manage animal groups, linked rations, target production, and assigned mixers' };
        case 'barns':
          return { title: 'Barns & Pens', subtitle: 'Manage head counts, baseline feeding kg, and intake percentage adjustments' };
        case 'mixers':
          return { title: 'TMR Feed Mixers', subtitle: 'Manage mixer wagons, physical capacity limits, and operational status' };
        case 'settings':
          return { title: 'System Settings & Maintenance', subtitle: 'Configure project info, language, currency, and data backups' };
        case 'developer_contact':
          return { title: 'Developer & Contact', subtitle: 'Ownership certificate, technical engineering by Eng. Hazem Amer' };
        default:
          return { title: 'Livestock Feeding System', subtitle: 'Integrated feed and ration management software' };
      }
    }

    switch (tab) {
      case 'dashboard':
        return { title: 'الرئيسية - لوحة متابعة التغذية', subtitle: 'نظرة عامة على الاحتياجات اليومية وتوزيع المكسر بالمزرعة' };
      case 'daily_plan':
        return { title: 'خطة التشغيل اليومية - لفات المكسر', subtitle: 'تخطيط وتنسيق أوزان وتوقيتات لفات المكسر لليوم' };
      case 'farm_economics':
        return {
          title: 'اقتصاديات المزرعة و IOFC',
          subtitle: 'تحليل تكلفة كل فئة والعائد بعد تغذية الكل ومؤشرات ربحية التغذية اليومية',
        };
      case 'concentrate_premix':
        return {
          title: 'خلاطة العلف المركز وتعبئة الشكاير',
          subtitle: 'خلط وتعبئة دفعات المركز (0.5 طن، 1 طن، 2 طن) وسحب الشكاير للمكسرات',
        };
      case 'distributions':
        return { title: 'توزيع اللفات على العنابر مع التحقق', subtitle: 'تخصيص كمية العلف بكل لفة على العنابر المستهدفة' };
      case 'prep_orders':
        return { title: 'أوامر تحضير المكسر', subtitle: 'حساب نسبي دقيق لأوزان الخامات المطلوبة للفة مع الأوزان الفعلية' };
      case 'driver_sheet':
        return { title: 'كشف السائق والتوزيع', subtitle: 'بيانات تفريغ العلف المخصصة لسائق عربة المكسر' };
      case 'warehouse':
        return { title: 'احتياجات المخزن اليومية', subtitle: 'تجميع إجمالي الخامات المطلوبة لصرفها من المخزن الرئيسي' };
      case 'reports':
        return { title: 'تقرير التغذية اليومي الشامل', subtitle: 'تقرير المهندس الفني لمتابعة نسب تغذية العنابر والقطعان' };
      case 'history':
        return { title: 'السجل اليومي والأرشيف', subtitle: 'الرجوع ومراجعة بيانات وأخطاء السجلات بالأيام السابقة' };
      case 'raw_materials':
        return { title: 'قاعدة الخامات العلفية', subtitle: 'إدارة خامات العليقة، الأسعار، والحالة' };
      case 'rations':
        return { title: 'تركيبات العلائق (كجم/رأس)', subtitle: 'تحديد مقادير الخامات بالكيلو جرام للرأس في اليوم' };
      case 'categories':
        return { title: 'الفئات الحيوانية', subtitle: 'إدارة وتخصيص الفئات، العلائق المرتبطة والمكسر' };
      case 'barns':
        return { title: 'عنابر ونواحي المزرعة', subtitle: 'إدارة أعداد الرؤوس، الكمية الأساسية ونسبة التغذية المئوية' };
      case 'mixers':
        return { title: 'مكسرات العلف (TMR)', subtitle: 'إدارة الخلاطات والسعة القصوى بالوزن' };
      case 'settings':
        return { title: 'إعدادات النظام والنسخ الاحتياطي', subtitle: 'ضبط بيانات المزرعة، التصدير، وتحميل السيناريو التجريبي' };
      case 'developer_contact':
        return { title: 'المطور والتواصل', subtitle: 'شهادة إثبات الملكية وتطوير النظام وقنوات التواصل المباشر مع المهندس حازم عامر' };
      default:
        return { title: 'إدارة تغذية المزرعة', subtitle: 'نظام إدارة وتخطيط الأعلاف المتكامل' };
    }
  };

  const currentTabMeta = getTabTitle(activeTab, language) || {
    title: language === 'en' ? 'Livestock Feeding System' : 'إدارة تغذية المزرعة',
    subtitle: language === 'en' ? 'Integrated feed and ration management software' : 'نظام إدارة وتخطيط الأعلاف المتكامل',
  };

  const handleExportActiveTabToExcel = () => {
    switch (activeTab) {
      case 'dashboard':
        exportFullFarmWorkbookToExcel({
          dailyPlan,
          rawMaterials,
          rations,
          categories,
          barns,
          mixers,
          settings,
        });
        break;
      case 'farm_economics': {
        const summary = calculateWholeFarmEconomics(
          categories,
          barns,
          rations,
          rawMaterials,
          dailyPlan,
          {
            milkPricePerKg: dailyPlan.milkProduction?.milkPricePerKg ?? settings.defaultMilkPricePerKg ?? 20.0,
            liveMeatPricePerKg: dailyPlan.fatteningMeatPricePerKg ?? settings.defaultMeatPricePerKg ?? 175.0,
            fatteningAdgKg: dailyPlan.fatteningAdgKg ?? 1.5,
          }
        );
        exportFarmEconomicsToExcel(summary, settings.farmName, dailyPlan.date, settings.currency);
        break;
      }
      case 'daily_plan':
      case 'distributions':
        exportDailyPlanToExcel(dailyPlan, categories, mixers, rations, barns);
        break;
      case 'concentrate_premix':
        exportConcentratePremixToExcel(dailyPlan, rations, rawMaterials, categories);
        break;
      case 'prep_orders':
        exportPreparationOrdersToExcel(dailyPlan, mixers, categories, rations, rawMaterials, settings);
        break;
      case 'driver_sheet':
        exportDriverSheetToExcel(dailyPlan, mixers, barns, categories, rations);
        break;
      case 'warehouse':
        exportWarehouseToExcel(dailyPlan, rawMaterials, categories, rations, barns);
        break;
      case 'reports':
        exportNutritionReportToExcel(dailyPlan, categories, barns, mixers, rations, rawMaterials, settings);
        break;
      case 'history':
        exportDailyPlanToExcel(dailyPlan, categories, mixers, rations, barns);
        break;
      case 'raw_materials':
        exportRawMaterialsToExcel(rawMaterials);
        break;
      case 'rations':
        exportRationsToExcel(rations, rawMaterials);
        break;
      case 'categories':
        exportCategoriesToExcel(categories, rations, mixers, barns);
        break;
      case 'barns':
        exportBarnsToExcel(barns, categories, rations);
        break;
      case 'mixers':
        exportMixersToExcel(mixers);
        break;
      case 'settings':
        exportFullFarmWorkbookToExcel({
          dailyPlan,
          rawMaterials,
          rations,
          categories,
          barns,
          mixers,
          settings,
        });
        break;
      default:
        exportFullFarmWorkbookToExcel({
          dailyPlan,
          rawMaterials,
          rations,
          categories,
          barns,
          mixers,
          settings,
        });
    }
  };

  return (
    <FeedbackProvider>
      <div className={`min-h-screen bg-slate-100/90 font-sans text-slate-900 antialiased flex ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          farmName={settings.farmName}
          hasConcentrateMixer={settings.hasConcentrateMixer !== false}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 min-w-0 flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${
            isSidebarOpen
              ? isRtl
                ? 'lg:mr-72 lg:ml-0'
                : 'lg:ml-72 lg:mr-0'
              : 'lg:mr-0 lg:ml-0'
          }`}
        >
          <Header
            title={currentTabMeta.title}
            subtitle={currentTabMeta.subtitle}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
            onPrint={handlePrint}
            onOpenPrintPreview={() => handleOpenPrintPreview()}
            onExportExcel={handleExportActiveTabToExcel}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                barns={barns}
                mixers={mixers}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                setActiveTab={setActiveTab}
                onSelectBatchForOrder={(bId) => setSelectedBatchForOrder(bId)}
              />
            )}

            {activeTab === 'daily_plan' && (
              <DailyPlanView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                mixers={mixers}
                barns={barns}
                setBarns={updateBarns}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                onPrint={handlePrint}
                onOpenPrintPreview={() => handleOpenPrintPreview('prep_orders')}
              />
            )}

            {activeTab === 'farm_economics' && (
              <FarmEconomicsView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                barns={barns}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                setActiveTab={setActiveTab}
                onPrint={handlePrint}
                onOpenPrintPreview={() => handleOpenPrintPreview('farm_economics')}
              />
            )}

            {activeTab === 'concentrate_premix' && (
              <ConcentratePremixView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                rations={rations}
                setRations={updateRations}
                rawMaterials={rawMaterials}
                settings={settings}
                barns={barns}
                setActiveTab={setActiveTab}
                onPrint={handlePrint}
                onOpenPrintPreview={(catId, weightKg) =>
                  handleOpenPrintPreview('concentrate_premix', undefined, catId, weightKg)
                }
              />
            )}

            {activeTab === 'distributions' && (
              <BatchDistributionView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                barns={barns}
                setBarns={updateBarns}
                mixers={mixers}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
              />
            )}

            {activeTab === 'prep_orders' && (
              <PreparationOrdersView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                mixers={mixers}
                settings={settings}
                barns={barns}
                initialBatchId={selectedBatchForOrder}
                setActiveTab={setActiveTab}
                onPrint={handlePrint}
                onOpenPrintPreview={(bId) =>
                  handleOpenPrintPreview('prep_orders', bId || selectedBatchForOrder)
                }
              />
            )}

            {activeTab === 'driver_sheet' && (
              <DriverSheetView
                dailyPlan={dailyPlan}
                categories={categories}
                barns={barns}
                setBarns={updateBarns}
                mixers={mixers}
                rations={rations}
                settings={settings}
                onPrint={handlePrint}
                onOpenPrintPreview={() => handleOpenPrintPreview('driver_sheet')}
              />
            )}

            {activeTab === 'warehouse' && (
              <WarehouseView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                rations={rations}
                rawMaterials={rawMaterials}
                setRawMaterials={updateRawMaterials}
                settings={settings}
                barns={barns}
                onPrint={handlePrint}
                onOpenPrintPreview={() => handleOpenPrintPreview('warehouse')}
              />
            )}

            {activeTab === 'reports' && (
              <NutritionReportView
                dailyPlan={dailyPlan}
                setDailyPlan={updateDailyPlan}
                categories={categories}
                barns={barns}
                mixers={mixers}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                onPrint={handlePrint}
                onOpenPrintPreview={() => handleOpenPrintPreview('nutrition_report')}
              />
            )}

            {activeTab === 'history' && (
              <DailyLogView
                currentDate={selectedDate}
                setCurrentDate={setSelectedDate}
                categories={categories}
                barns={barns}
                mixers={mixers}
                rations={rations}
                rawMaterials={rawMaterials}
                settings={settings}
                onPrint={handlePrint}
                onOpenPrintPreview={(plan) =>
                  handleOpenPrintPreview('daily_log', undefined, undefined, undefined, plan)
                }
              />
            )}

            {activeTab === 'raw_materials' && (
              <RawMaterialsView
                rawMaterials={rawMaterials}
                setRawMaterials={updateRawMaterials}
                rations={rations}
                settings={settings}
              />
            )}

            {activeTab === 'rations' && (
              <RationsView
                rations={rations}
                setRations={updateRations}
                rawMaterials={rawMaterials}
                hasConcentrateMixer={settings.hasConcentrateMixer !== false}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesView
                categories={categories}
                setCategories={updateCategories}
                rations={rations}
                mixers={mixers}
              />
            )}

            {activeTab === 'barns' && (
              <BarnsView
                barns={barns}
                setBarns={updateBarns}
                categories={categories}
                rations={rations}
              />
            )}

            {activeTab === 'mixers' && (
              <MixersView
                mixers={mixers}
                setMixers={updateMixers}
                categories={categories}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                setSettings={updateSettings}
                onResetDemo={handleResetDemoScenario}
              />
            )}

            {activeTab === 'developer_contact' && (
              <DeveloperContactView />
            )}
          </main>
        </div>

        {/* Global Print Preview Modal (معاينة وطباعة التقارير الرسمية) */}
        <PrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => setIsPrintPreviewOpen(false)}
          defaultReportType={previewReportType}
          dailyPlan={dailyPlan}
          categories={categories}
          barns={barns}
          mixers={mixers}
          rations={rations}
          rawMaterials={rawMaterials}
          settings={settings}
          initialBatchId={previewBatchId || selectedBatchForOrder || 'ALL'}
          initialPremixCategoryId={previewPremixCategory}
          initialPremixWeightKg={previewPremixWeight}
          planOverride={previewPlanOverride}
        />
        {/* Initial Setup Wizard for First-Time Run */}
        <InitialSetupModal
          isOpen={isInitialSetupOpen}
          onComplete={handleCompleteInitialSetup}
        />
      </div>
    </FeedbackProvider>
  );
}
