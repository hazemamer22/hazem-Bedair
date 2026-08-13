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
} from './services/storage';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

import { DashboardView } from './components/views/DashboardView';
import { DailyPlanView } from './components/views/DailyPlanView';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [dailyPlan, setDailyPlanState] = useState<DailyOperationPlan>(() =>
    loadDailyPlan(selectedDate)
  );

  // Selected batch ID for Preparation Orders
  const [selectedBatchForOrder, setSelectedBatchForOrder] = useState<string | undefined>(undefined);

  // When selectedDate changes, load that date's plan
  useEffect(() => {
    const plan = loadDailyPlan(selectedDate);
    setDailyPlanState(plan);
  }, [selectedDate]);

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
    alert('تمت إعادة تحميل السيناريو التجريبي المعرف مسبقاً بنجاح!');
  };

  // Helper titles
  const getTabTitle = (tab: ActiveTab): { title: string; subtitle: string } => {
    switch (tab) {
      case 'dashboard':
        return { title: 'الرئيسية - لوحة متابعة التغذية', subtitle: 'نظرة عامة على الاحتياجات اليومية وتوزيع المكسر بالمزرعة' };
      case 'daily_plan':
        return { title: 'خطة التشغيل اليومية - لفات المكسر', subtitle: 'تخطيط وتنسيق أوزان وتوقيتات لفات المكسر لليوم' };
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

  return (
    <div className="min-h-screen bg-slate-100/90 font-sans text-slate-900 antialiased dir-rtl flex" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        farmName={settings.farmName}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:mr-72 min-w-0 flex flex-col min-h-screen">
        <Header
          title={currentTabMeta.title}
          subtitle={currentTabMeta.subtitle}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          onPrint={() => window.print()}
          onResetDemo={handleResetDemoScenario}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              dailyPlan={dailyPlan}
              categories={categories}
              barns={barns}
              mixers={mixers}
              rations={rations}
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

          {activeTab === 'distributions' && (
            <BatchDistributionView
              dailyPlan={dailyPlan}
              setDailyPlan={updateDailyPlan}
              categories={categories}
              barns={barns}
              setBarns={updateBarns}
              mixers={mixers}
              rations={rations}
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
              initialBatchId={selectedBatchForOrder}
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
            />
          )}

          {activeTab === 'warehouse' && (
            <WarehouseView
              dailyPlan={dailyPlan}
              categories={categories}
              rations={rations}
              rawMaterials={rawMaterials}
              settings={settings}
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
              settings={settings}
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
  );
}
