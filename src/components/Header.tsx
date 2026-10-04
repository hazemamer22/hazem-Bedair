import React from 'react';
import { Menu, Calendar, Printer, FileSpreadsheet, ChevronRight, ChevronLeft, PanelRightClose, PanelLeftClose, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  isSidebarOpen?: boolean;
  onPrint?: () => void;
  onOpenPrintPreview?: () => void;
  onExportExcel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedDate,
  setSelectedDate,
  onToggleSidebar,
  onOpenMobileMenu,
  isSidebarOpen = true,
  onPrint,
  onOpenPrintPreview,
  onExportExcel,
}) => {
  const { language, isRtl, t } = useLanguage();
  const isEn = language === 'en';
  const handleToggle = onToggleSidebar || onOpenMobileMenu || (() => {});
  const formattedDate = new Date(selectedDate).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
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
        {/* Toggle + View Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
              isSidebarOpen
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white shadow-xs scale-105'
            }`}
            title={
              language === 'en'
                ? isSidebarOpen ? 'Collapse sidebar (Ctrl + B)' : 'Expand sidebar (Ctrl + B)'
                : isSidebarOpen ? 'طي القائمة الجانبية (Ctrl + B)' : 'إظهار القائمة الجانبية (Ctrl + B)'
            }
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              isRtl ? <PanelRightClose className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Date Selector & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Date Stepper (Yesterday | Today | Tomorrow) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-800 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5 cursor-pointer"
              title={language === 'en' ? 'Previous day' : 'اليوم السابق'}
              aria-label="Previous day"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span className="hidden md:inline text-[11px]">{t('action.yesterday', 'أمس')}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isToday
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
              title={language === 'en' ? 'Return to today' : 'العودة لليوم الحالي'}
            >
              {t('action.today', 'اليوم')}
            </button>

            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-800 rounded-lg transition-all text-xs font-bold flex items-center gap-0.5 cursor-pointer"
              title={language === 'en' ? 'Next day' : 'اليوم التالي'}
              aria-label="Next day"
            >
              <span className="hidden md:inline text-[11px]">{t('action.tomorrow', 'غداً')}</span>
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                aria-label="Select plan date"
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
              title={isEn ? 'Export Excel Sheet (.xlsx)' : 'تصدير كشف إكسيل (Excel .xlsx)'}
              aria-label="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden md:inline">{t('action.exportExcel', 'تصدير إكسيل')}</span>
            </button>
          )}

          {/* Print Preview Button (معاينة قبل الطباعة) */}
          {onOpenPrintPreview && (
            <button
              onClick={onOpenPrintPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer border border-emerald-700/60"
              title={isEn ? 'A4 Paper Print Preview (Print View)' : 'معاينة الطباعة على الورق A4 قبل الطباعة (Print View)'}
              aria-label="Print Preview"
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">{t('action.printPreview', 'معاينة الطباعة')}</span>
            </button>
          )}

          {/* Quick Print Button */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Direct print current view' : 'طباعة الصفحة الحالية مباشرة'}
              aria-label="Direct Print"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('action.instantPrint', 'طباعة ورقية')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
