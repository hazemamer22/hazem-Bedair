import React from 'react';
import { ActiveTab } from '../types';
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
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  farmName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  farmName,
}) => {
  const menuItems: { id: ActiveTab; label: string; icon: React.ReactNode; group: 'ops' | 'data' | 'system' }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" />, group: 'ops' },
    { id: 'daily_plan', label: 'خطة التشغيل اليومية', icon: <CalendarDays className="w-5 h-5" />, group: 'ops' },
    { id: 'distributions', label: 'توزيع اللفات على العنابر', icon: <Layers className="w-5 h-5" />, group: 'ops' },
    { id: 'prep_orders', label: 'أوامر تحضير المكسر', icon: <ClipboardList className="w-5 h-5" />, group: 'ops' },
    { id: 'driver_sheet', label: 'كشف السائق والتوزيع', icon: <Truck className="w-5 h-5" />, group: 'ops' },
    { id: 'warehouse', label: 'احتياجات المخزن', icon: <Warehouse className="w-5 h-5" />, group: 'ops' },
    { id: 'reports', label: 'تقرير التغذية اليومي', icon: <FileSpreadsheet className="w-5 h-5" />, group: 'ops' },
    { id: 'history', label: 'السجل اليومي والأرشيف', icon: <History className="w-5 h-5" />, group: 'ops' },

    { id: 'raw_materials', label: 'قاعدة الخامات', icon: <Wheat className="w-5 h-5" />, group: 'data' },
    { id: 'rations', label: 'تركيبات العلائق', icon: <Scale className="w-5 h-5" />, group: 'data' },
    { id: 'categories', label: 'الفئات الحيوانية', icon: <Beef className="w-5 h-5" />, group: 'data' },
    { id: 'barns', label: 'العنابر والنواحي', icon: <Home className="w-5 h-5" />, group: 'data' },
    { id: 'mixers', label: 'المكسرات التفاعلية', icon: <MixerIcon className="w-5 h-5" />, group: 'data' },

    { id: 'settings', label: 'إعدادات النظام', icon: <Settings className="w-5 h-5" />, group: 'system' },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 bg-emerald-950 text-emerald-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 print:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
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
                {farmName || 'مزرعة الماشية'}
              </h1>
              <p className="text-xs text-amber-300/80 font-medium">نظام التغذية والعلائق</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 lg:hidden"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-emerald-800">
          {/* Operations group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-emerald-400/70 tracking-wider uppercase">
              التشغيل والإنتاج اليومي
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
              قواعد البيانات والمدخلات
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
              النظام والضبط
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
          <p className="font-semibold text-emerald-200">إدارة التغذية والمكسرات</p>
          <p className="mt-0.5 text-[11px]">نسخة العمليات الاحترافية - RTL</p>
        </div>
      </aside>
    </>
  );
};
