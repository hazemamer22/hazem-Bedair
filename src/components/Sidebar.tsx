import React from 'react';
import { ActiveTab } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  CalendarDays,
  Truck,
  ClipboardList,
  FileSpreadsheet,
  Warehouse,
  FileText,
  History,
  Wheat,
  Scale,
  Beef,
  Home,
  Bot as MixerIcon,
  Settings,
  X,
  Layers,
  Package,
  UserCheck,
  PanelRightClose,
  PanelLeftClose,
  Coins,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  farmName: string;
  hasConcentrateMixer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  farmName,
  hasConcentrateMixer = true,
}) => {
  const { language, isRtl, t } = useLanguage();

  const menuItems: { id: ActiveTab; label: string; icon: React.ReactNode; group: 'ops' | 'data' | 'system' }[] = [
    { id: 'dashboard', label: t('nav.dashboard', 'الرئيسية'), icon: <LayoutDashboard className="w-5 h-5" />, group: 'ops' },
    { id: 'daily_plan', label: t('nav.daily_plan', 'خطة التشغيل اليومية'), icon: <CalendarDays className="w-5 h-5" />, group: 'ops' },
    { id: 'farm_economics', label: t('nav.farm_economics', 'اقتصاديات المزرعة و IOFC'), icon: <Coins className="w-5 h-5" />, group: 'ops' },
    ...(hasConcentrateMixer
      ? [{ id: 'concentrate_premix' as ActiveTab, label: t('nav.concentrate_premix', 'خلاطة المركز والشكاير'), icon: <Package className="w-5 h-5" />, group: 'ops' as const }]
      : []),
    { id: 'distributions', label: t('nav.distributions', 'توزيع اللفات على العنابر'), icon: <Layers className="w-5 h-5" />, group: 'ops' },
    { id: 'prep_orders', label: t('nav.prep_orders', 'أوامر تحضير المكسر'), icon: <ClipboardList className="w-5 h-5" />, group: 'ops' },
    { id: 'driver_sheet', label: t('nav.driver_sheet', 'كشف السائق والتوزيع'), icon: <Truck className="w-5 h-5" />, group: 'ops' },
    { id: 'warehouse', label: t('nav.warehouse', 'احتياجات المخزن'), icon: <Warehouse className="w-5 h-5" />, group: 'ops' },
    { id: 'reports', label: t('nav.reports', 'تقرير التغذية اليومي'), icon: <FileSpreadsheet className="w-5 h-5" />, group: 'ops' },
    { id: 'history', label: t('nav.history', 'السجل اليومي والأرشيف'), icon: <History className="w-5 h-5" />, group: 'ops' },

    { id: 'raw_materials', label: t('nav.raw_materials', 'قاعدة الخامات'), icon: <Wheat className="w-5 h-5" />, group: 'data' },
    { id: 'rations', label: t('nav.rations', 'تركيبات العلائق'), icon: <Scale className="w-5 h-5" />, group: 'data' },
    { id: 'categories', label: t('nav.categories', 'الفئات الحيوانية'), icon: <Beef className="w-5 h-5" />, group: 'data' },
    { id: 'barns', label: t('nav.barns', 'العنابر والنواحي'), icon: <Home className="w-5 h-5" />, group: 'data' },
    { id: 'mixers', label: t('nav.mixers', 'المكسرات التفاعلية'), icon: <MixerIcon className="w-5 h-5" />, group: 'data' },

    { id: 'settings', label: t('nav.settings', 'إعدادات النظام'), icon: <Settings className="w-5 h-5" />, group: 'system' },
    { id: 'developer_contact', label: t('nav.developer_contact', 'المطور والتواصل'), icon: <UserCheck className="w-5 h-5" />, group: 'system' },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity print:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-72 bg-emerald-950 text-emerald-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
          isRtl ? 'right-0' : 'left-0'
        } ${
          isOpen
            ? 'translate-x-0'
            : isRtl
            ? 'translate-x-full'
            : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-800/60 flex items-center justify-between bg-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xl shadow-inner">
              🐄
            </div>
            <div>
              <h1 className="font-bold text-base text-emerald-100 leading-snug truncate max-w-[170px]">
                {farmName || (language === 'en' ? 'Livestock Farm' : 'مزرعة الماشية')}
              </h1>
              <p className="text-xs text-amber-300/80 font-medium">
                {language === 'en' ? 'Feed & Ration System' : 'نظام التغذية والعلائق'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition-all cursor-pointer"
            title={language === 'en' ? 'Close sidebar (Ctrl + B)' : 'طي القائمة الجانبية (Ctrl + B)'}
            aria-label="Toggle sidebar"
          >
            {isRtl ? <PanelRightClose className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-emerald-800">
          {/* Operations group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-emerald-400/70 tracking-wider uppercase">
              {t('group.operations', 'التشغيل والإنتاج اليومي')}
            </div>
            <div className="space-y-1">
              {menuItems
                .filter((item) => item.group === 'ops')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-amber-500 text-emerald-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-emerald-200/90 hover:bg-emerald-900/70 hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-emerald-950' : 'text-emerald-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Master data group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-emerald-400/70 tracking-wider uppercase">
              {t('group.data', 'قواعد البيانات والمدخلات')}
            </div>
            <div className="space-y-1">
              {menuItems
                .filter((item) => item.group === 'data')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-amber-500 text-emerald-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-emerald-200/90 hover:bg-emerald-900/70 hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-emerald-950' : 'text-emerald-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* System group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-emerald-400/70 tracking-wider uppercase">
              {t('group.system', 'النظام والضبط')}
            </div>
            <div className="space-y-1">
              {menuItems
                .filter((item) => item.group === 'system')
                .map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                        isActive
                          ? 'bg-amber-500 text-emerald-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-emerald-200/90 hover:bg-emerald-900/70 hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-emerald-950' : 'text-emerald-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-emerald-900 bg-emerald-950/80 text-xs text-emerald-300/70 text-center">
          <p className="font-semibold text-emerald-200">
            {language === 'en' ? 'Feed & TMR Mixer Management' : 'إدارة التغذية والمكاسر'}
          </p>
          <p className="mt-0.5 text-[11px]">
            {language === 'en' ? 'Professional Operations Edition' : 'نسخة العمليات الاحترافية'}
          </p>
        </div>
      </aside>
    </>
  );
};
