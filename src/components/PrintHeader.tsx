import React from 'react';
import { FarmSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface PrintHeaderProps {
  documentTitle?: string;
  title?: string;
  documentSubtitle?: string;
  subtitle?: string;
  selectedDate?: string;
  settings?: FarmSettings;
  engineerName?: string;
  showOnScreen?: boolean;
  batchInfo?: {
    batchNumber: string;
    categoryName?: string;
    rationName?: string;
    mixerName?: string;
    time?: string;
    targetWeightKg?: number;
  };
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  documentTitle,
  title,
  documentSubtitle,
  subtitle,
  selectedDate,
  settings,
  engineerName: customEngineer,
  showOnScreen = false,
  batchInfo,
}) => {
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const defaultTitle = isEn ? 'Farm Operations & Feed Report' : 'تقرير تشغيل المزرعة';
  const actualTitle = documentTitle || title || defaultTitle;
  const actualSubtitle = documentSubtitle || subtitle;

  const validDate = selectedDate ? new Date(selectedDate) : new Date();
  const dateToUse = isNaN(validDate.getTime()) ? new Date() : validDate;
  const formattedDate = dateToUse.toLocaleDateString(isEn ? 'en-US' : 'ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateStr = dateToUse.toISOString().split('T')[0];

  const nowTimeStr = new Date().toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const farmName = settings?.farmName || (isEn ? 'Prime Livestock & Cattle Feedlot' : 'مزرعة الألبان والتسمين');
  const engineerName = customEngineer || settings?.engineerName || (isEn ? 'Nutrition & Operations Engineer' : 'مهندس التغذية والتشغيل');

  return (
    <div
      className={`${showOnScreen ? 'block' : 'hidden print:block'} mb-6 text-slate-900 border-b-2 border-slate-800 pb-4 ${
        isEn ? 'text-left' : 'text-right'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{farmName}</h1>
          <p className="text-sm font-bold text-slate-700 mt-1">
            {isEn ? 'Nutrition, Rations & Daily Operations Department' : 'قسم التغذية والعلائق والتشغيل اليومي'}
          </p>
        </div>
        <div className={`text-xs font-semibold text-slate-600 space-y-0.5 ${isEn ? 'text-right' : 'text-left'}`}>
          <div>{isEn ? 'Date:' : 'التاريخ:'} <span className="font-bold text-slate-900">{dateStr} ({formattedDate})</span></div>
          <div>{isEn ? 'Print Time:' : 'وقت الطباعة:'} <span className="font-bold text-slate-900">{nowTimeStr}</span></div>
          <div>{isEn ? 'Responsible Engineer:' : 'المهندس المسؤول:'} <span className="font-bold text-slate-900">{engineerName}</span></div>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="mt-4 bg-slate-100 border border-slate-300 py-2.5 px-4 text-center rounded-lg">
        <h2 className="text-xl font-bold text-slate-900">{actualTitle}</h2>
        {actualSubtitle && <p className="text-xs text-slate-600 mt-0.5">{actualSubtitle}</p>}
      </div>

      {/* Batch Metadata if available */}
      {batchInfo && (
        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-semibold text-slate-800">
          <div><span className="text-slate-500">{isEn ? 'Batch #:' : 'رقم اللفة:'}</span> {batchInfo.batchNumber}</div>
          <div><span className="text-slate-500">{isEn ? 'Category:' : 'الفئة الحيوانية:'}</span> {batchInfo.categoryName || (isEn ? 'Unassigned' : 'غير محدد')}</div>
          <div><span className="text-slate-500">{isEn ? 'Ration:' : 'العليقة:'}</span> {batchInfo.rationName || (isEn ? 'Unassigned' : 'غير محدد')}</div>
          <div><span className="text-slate-500">{isEn ? 'Mixer:' : 'المكسر:'}</span> {batchInfo.mixerName || (isEn ? 'Unassigned' : 'غير محدد')}</div>
          <div><span className="text-slate-500">{isEn ? 'Time:' : 'توقيت اللفة:'}</span> {batchInfo.time || (isEn ? 'Unassigned' : 'غير محدد')}</div>
          <div>
            <span className="text-slate-500">{isEn ? 'Target Weight:' : 'وزن اللفة المستهدف:'}</span>{' '}
            <span className="text-emerald-800 font-bold">
              {batchInfo.targetWeightKg?.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export interface SignatureItem {
  title: string;
  name?: string;
}

interface PrintSignaturesProps {
  settings?: FarmSettings;
  signatures?: SignatureItem[];
  showOnScreen?: boolean;
  engineerName?: string;
  warehouseManagerName?: string;
  driverName?: string;
}

export const PrintSignatures: React.FC<PrintSignaturesProps> = ({
  settings,
  signatures,
  showOnScreen = false,
  engineerName,
  warehouseManagerName,
  driverName,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const defaultEngineerTitle = isEn ? 'Nutrition Engineer Signature' : 'توقيع مهندس التغذية';
  const defaultWarehouseTitle = isEn ? 'Warehouse Supervisor Signature' : 'توقيع مسؤول المخزن';
  const defaultDriverTitle = isEn ? 'Driver / TMR Operator Signature' : 'توقيع السائق / الموزع';

  const finalEngineer = engineerName || settings?.engineerName || (isEn ? 'Nutrition Engineer' : 'مهندس التغذية والتشغيل');
  const finalWarehouse = warehouseManagerName || settings?.warehouseManagerName || (isEn ? 'Warehouse Manager' : 'أمين المخزن والمستودع');
  const finalDriver = driverName || settings?.driverName || (isEn ? 'TMR Feed Truck Driver' : 'سائق عربة التوزيع TMR');

  const items: SignatureItem[] =
    signatures && signatures.length > 0
      ? signatures
      : [
          { title: defaultEngineerTitle, name: finalEngineer },
          { title: defaultWarehouseTitle, name: finalWarehouse },
          { title: defaultDriverTitle, name: finalDriver },
        ];

  return (
    <div className={`${showOnScreen ? 'grid' : 'hidden print:grid'} grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-300 text-center text-xs font-bold text-slate-800 break-inside-avoid print:break-inside-avoid`}>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-8">
          <div>{item.title}</div>
          {item.name && <div className="text-slate-500 font-normal">({item.name})</div>}
          <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pt-4" />
        </div>
      ))}
    </div>
  );
};

