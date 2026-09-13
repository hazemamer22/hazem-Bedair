import React from 'react';
import { Menu, Calendar, Printer, FileSpreadsheet, ChevronRight, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenMobileMenu: () => void;
  onPrint?: () => void;
  onExportExcel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedDate,
  setSelectedDate,
  onOpenMobileMenu,
  onPrint,
  onExportExcel,
}) => {
  const formattedDate = new Date(selectedDate).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 shadow-xs print:hidden">
      <div className="flex items-center justify-between gap-4">
        {/* Right side: Mobile Menu + View Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
            title="القائمة"
            aria-label="فتح القائمة الجانبية"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Left side: Date Selector & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Date Stepper (Yesterday | Today | Tomorrow) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-800 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5 cursor-pointer"
              title="اليوم السابق"
              aria-label="اليوم السابق"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">أمس</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isToday
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
              title="العودة لليوم الحالي"
            >
              اليوم
            </button>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-800 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5 cursor-pointer"
              title="اليوم التالي"
              aria-label="اليوم التالي"
            >
              <span className="hidden md:inline text-[11px]">غداً</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1.5 bg-emerald-50/90 text-emerald-900 border border-emerald-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-950 focus:outline-hidden cursor-pointer"
                aria-label="تحديد تاريخ الخطة"
              />
              <span className="hidden xl:inline text-[11px] text-emerald-700/90 font-medium">
                ({formattedDate})
              </span>
            </div>
          </div>

          {/* Quick Excel Export Button in Header */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="تصدير كشف إكسيل (Excel .xlsx)"
              aria-label="تصدير ملف إكسيل"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden md:inline">تصدير إكسيل</span>
            </button>
          )}

          {/* Quick Print Button */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="طباعة الصفحة الحالية"
              aria-label="طباعة الصفحة"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">طباعة ورقية</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
