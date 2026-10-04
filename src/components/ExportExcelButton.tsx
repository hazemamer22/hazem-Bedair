import React, { useState } from 'react';
import { FileSpreadsheet, Download, Check } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';
import { useLanguage } from '../context/LanguageContext';

interface ExportExcelButtonProps {
  onExport: () => void;
  title?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  className?: string;
  disabled?: boolean;
}

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  onExport,
  title,
  label,
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const resolvedTitle = title || (isEn ? 'Export to Excel (.xlsx)' : 'تصدير كشف إكسيل (Excel .xlsx)');
  const resolvedLabel = label || (isEn ? 'Export to Excel' : 'تصدير إكسيل (Excel)');

  const { showToast } = useFeedback();
  const [isExported, setIsExported] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    try {
      onExport();
      setIsExported(true);
      showToast(
        isEn ? 'Excel file exported successfully.' : 'تم تصدير ملف الإكسيل بنجاح.',
        'success'
      );
      setTimeout(() => setIsExported(false), 2000);
    } catch (error) {
      console.error('Excel Export Error:', error);
      showToast(
        isEn
          ? 'Error exporting Excel file. Please try again.'
          : 'حدث خطأ أثناء تصدير ملف الإكسيل. يرجى المحاولة مرة أخرى.',
        'error'
      );
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md active:scale-98';
      case 'secondary':
        return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs active:scale-98';
      case 'outline':
        return 'border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 active:scale-98';
      case 'compact':
        return 'p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs';
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={resolvedTitle}
        className={`inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
      >
        {isExported ? (
          <Check className="w-4 h-4 text-emerald-600 animate-scale" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={resolvedTitle}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
    >
      {isExported ? (
        <>
          <Check className="w-4 h-4 text-white shrink-0 animate-bounce" />
          <span>{isEn ? 'Exported Successfully!' : 'تم التصدير بنجاح!'}</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{resolvedLabel}</span>
          <Download className="w-3.5 h-3.5 opacity-70 shrink-0" />
        </>
      )}
    </button>
  );
};
