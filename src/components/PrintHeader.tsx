import React from 'react';
import { FarmSettings } from '../types';

interface PrintHeaderProps {
  documentTitle: string;
  documentSubtitle?: string;
  selectedDate: string;
  settings: FarmSettings;
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
  documentSubtitle,
  selectedDate,
  settings,
  batchInfo,
}) => {
  const formattedDate = new Date(selectedDate).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const nowTimeStr = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="hidden print:block mb-6 text-slate-900 border-b-2 border-slate-800 pb-4">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{settings.farmName}</h1>
          <p className="text-sm font-bold text-slate-700 mt-1">قسم التغذية والعلائق والتشغيل اليومي</p>
        </div>
        <div className="text-left text-xs font-semibold text-slate-600 space-y-0.5">
          <div>التاريخ: <span className="font-bold text-slate-900">{selectedDate} ({formattedDate})</span></div>
          <div>وقت الطباعة: <span className="font-bold text-slate-900">{nowTimeStr}</span></div>
          <div>المهندس المسؤول: <span className="font-bold text-slate-900">{settings.engineerName}</span></div>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="mt-4 bg-slate-100 border border-slate-300 py-2.5 px-4 text-center rounded-lg">
        <h2 className="text-xl font-bold text-slate-900">{documentTitle}</h2>
        {documentSubtitle && <p className="text-xs text-slate-600 mt-0.5">{documentSubtitle}</p>}
      </div>

      {/* Batch Metadata if available */}
      {batchInfo && (
        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-semibold text-slate-800">
          <div><span className="text-slate-500">رقم اللفة:</span> {batchInfo.batchNumber}</div>
          <div><span className="text-slate-500">الفئة الحيوانية:</span> {batchInfo.categoryName || 'غير محدد'}</div>
          <div><span className="text-slate-500">العليقة:</span> {batchInfo.rationName || 'غير محدد'}</div>
          <div><span className="text-slate-500">المكسر:</span> {batchInfo.mixerName || 'غير محدد'}</div>
          <div><span className="text-slate-500">توقيت اللفة:</span> {batchInfo.time || 'غير محدد'}</div>
          <div><span className="text-slate-500">وزن اللفة المستهدف:</span> <span className="text-emerald-800 font-bold">{batchInfo.targetWeightKg?.toLocaleString('ar-EG')} كجم</span></div>
        </div>
      )}
    </div>
  );
};

export const PrintSignatures: React.FC<{ settings: FarmSettings }> = ({ settings }) => {
  return (
    <div className="hidden print:grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-300 text-center text-xs font-bold text-slate-800">
      <div className="space-y-8">
        <div>توقيع مهندس التغذية</div>
        <div className="text-slate-500 font-normal">({settings.engineerName})</div>
        <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pt-4" />
      </div>
      <div className="space-y-8">
        <div>توقيع مسؤول المخزن</div>
        <div className="text-slate-500 font-normal">({settings.warehouseManagerName})</div>
        <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pt-4" />
      </div>
      <div className="space-y-8">
        <div>توقيع السائق / الموزع</div>
        <div className="text-slate-500 font-normal">({settings.driverName})</div>
        <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pt-4" />
      </div>
    </div>
  );
};
