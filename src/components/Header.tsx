import React from 'react';
import { Menu, Calendar, Printer, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenMobileMenu: () => void;
  onPrint?: () => void;
  onResetDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedDate,
  setSelectedDate,
  onOpenMobileMenu,
  onPrint,
  onResetDemo,
}) => {
  const formattedDate = new Date(selectedDate).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs print:hidden">
      <div className="flex items-center justify-between gap-4">
        {/* Right side: Mobile Menu + View Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
            title="القائمة"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Left side: Date Selector & Quick Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-950 focus:outline-hidden cursor-pointer"
              />
              <span className="hidden xl:inline text-[11px] text-emerald-700/90 font-medium">
                ({formattedDate})
              </span>
            </div>
          </div>

          {/* Quick Print Button */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
              title="طباعة الصفحة الحالية"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">طباعة ورقية</span>
            </button>
          )}

          {/* Quick Reset Demo Button */}
          {onResetDemo && (
            <button
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-semibold shadow-2xs transition-all"
              title="إعادة تحميل السيناريو التجريبي"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden md:inline">إعادة السيناريو التجريبي</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
