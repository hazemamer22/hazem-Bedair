/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, DailyOperationPlan, FarmSettings } from './types';
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
} from './utils/excelExport';
import { FeedbackProvider, notify } from './context/FeedbackContext';

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'daily_plan',
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
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [rawMaterials, setRawMaterialsState] = useState(loadRawMaterials);
  const [rations, setRationsState] = useState(loadRations);
  const [categories, setCategoriesState] = useState(loadCategories);
  const [barns, setBarnsState] = useState(loadBarns);
  const [mixers, setMixersState] = useState(loadMixers);
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

  // Setters with persistent storage
  const updateRawMaterials = (items: typeof rawMaterials) => {
    setRawMaterialsState(items);
    saveRawMaterials(items);
  };

  const updateRations = (items: typeof rations) => {
    setRationsState(items);
    saveRations(items);
  };

  const updateCategories = (items: typeof categories) => {
    setCategoriesState(items);
    saveCategories(items);
  };

  const updateBarns = (items: typeof barns) => {
    setBarnsState(items);
    saveBarns(items);
  };

  const updateMixers = (items: typeof mixers) => {
    setMixersState(items);
    saveMixers(items);
  };

  const updateSettings = (newSettings: FarmSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  };

  const updateDailyPlan = (plan: DailyOperationPlan) => {
    setDailyPlanState(plan);
    saveDailyPlan(plan);
  };

  const handleResetDemoScenario = () => {
    resetAllDataToDemo();
    setRawMaterialsState(loadRawMaterials());
    setRationsState(loadRations());
    setCategoriesState(loadCategories());
    setBarnsState(loadBarns());
    setMixersState(loadMixers());
    setSettingsState(loadSettings());
    setDailyPlanState(loadDailyPlan(selectedDate));
    notify('تمت إعادة تحميل السيناريو التجريبي بنجاح!', 'success');
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
  const getTabTitle = (tab: ActiveTab): { title: string; subtitle: string } => {
    switch (tab) {
      case 'dashboard':
        return { title: 'الرئيسية - لوحة متابعة التغذية', subtitle: 'نظرة عامة على الاحتياجات اليومية وتوزيع المكسر بالمزرعة' };
      case 'daily_plan':
        return { title: 'خطة التشغيل اليومية - لفات المكسر', subtitle: 'تخطيط وتنسيق أوزان وتوقيتات لفات المكسر لليوم' };
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
    }
  };

  const currentTabMeta = getTabTitle(activeTab);

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
      <div className="min-h-screen bg-slate-100/90 font-sans text-slate-900 antialiased dir-rtl flex" dir="rtl">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          farmName={settings.farmName}
          hasConcentrateMixer={settings.hasConcentrateMixer !== false}
        />

        {/* Main Content Area */}
        <div className="flex-1 lg:mr-72 min-w-0 flex flex-col min-h-screen">
          <Header
            title={currentTabMeta.title}
            subtitle={currentTabMeta.subtitle}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenMobileMenu={() => setIsSidebarOpen(true)}
            onPrint={handlePrint}
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
              />
            )}

            {activeTab === 'raw_materials' && (
              <RawMaterialsView
                rawMaterials={rawMaterials}
                setRawMaterials={updateRawMaterials}
                rations={rations}
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
          </main>
        </div>
      </div>
    </FeedbackProvider>
  );
}
