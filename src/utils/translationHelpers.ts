/**
 * Livestock & TMR Feeding Management System - Translation & Localization Helpers
 * Provides automatic, seamless translation for standard Arabic agronomic/veterinary terms,
 * categories, barn numbers, raw materials, mixers, rations, batches, and statuses when in English mode.
 */

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'حلاب': 'Lactating',
  'تسمين': 'Fattening',
  'نامي': 'Growing / Heifers',
  'جاف': 'Dry Cows',
  'عجلات': 'Heifers',
  'رضيع وفطام': 'Calves & Weaning',
  'انتظار ولادة': 'Close-Up / Transition',
  'عجول': 'Calves',
  'أبقار حلابة': 'Lactating Cows',
  'أبقار جافة': 'Dry Cows',
  'عجلات نامية': 'Growing Heifers',
  'عجول تسمين': 'Fattening Bulls',
};

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  'ذرة صفراء مجروشة': 'Cracked Yellow Corn',
  'كسب صويا 46%': 'Soybean Meal 46%',
  'كسب صويا 44%': 'Soybean Meal 44%',
  'فول صويا كامل الدهن (Full Fat)': 'Full Fat Soybean',
  'DDGS (مقطرات الذرة)': 'Corn DDGS',
  'جلوتوفيد': 'Corn Gluten Feed',
  'دريس حجازي ممتاز': 'Premium Alfalfa Hay',
  'دريس حجازي بالات': 'Alfalfa Hay Bales',
  'تبن قمح ناعم': 'Fine Wheat Straw',
  'سيلاج ذرة مع الحبوب': 'Corn Silage with Grain',
  'سيلاج ذرة مصري مميز': 'Premium Corn Silage',
  'مولاس سائب': 'Cane Molasses',
  'بيكربونات صوديوم (منظم كرش)': 'Sodium Bicarbonate (Buffer)',
  'مخلوط أملاح معدنية وفيتامينات': 'Mineral & Vitamin Premix',
  'بريمكس حلاب فيتامينات ومعادن': 'Dairy Vitamin & Mineral Premix',
  'مضاد سموم وإضافات': 'Toxin Binder & Micro-Additives',
  'حجر جيري (كالسيوم)': 'Limestone (Calcium Carbonate)',
  'ملح طعام': 'Feed Salt (NaCl)',
  'نخالة قمح (ردة)': 'Wheat Bran',
};

const MIXER_TRANSLATIONS: Record<string, string> = {
  'مكسر الحلاب (TMR 1)': 'Lactating Mixer (TMR 1)',
  'مكسر النامي والعجلات (TMR 2)': 'Growing & Heifers Mixer (TMR 2)',
  'مكسر التسمين (TMR 3)': 'Fattening Mixer (TMR 3)',
  'مكسر الرضيع والفطام (TMR 4)': 'Calves & Weaning Mixer (TMR 4)',
  'مكسر سيلاكو الإيطالي العملاق 1': 'Siloking Giant Italian Mixer 1',
  'مكسر كين السريع 2': 'Keenan Express Mixer 2',
  'خلاطة العلف المركز الرئيسية': 'Main Concentrate Premix Mixer',
};

const RATION_TRANSLATIONS: Record<string, string> = {
  'عليقة الحلاب العالية (High Yield)': 'High Yield Lactating Ration',
  'عليقة الألبان عالية الإنتاج TMR': 'High Production Dairy TMR',
  'عليقة التسمين (Finishing Diet)': 'Fattening Finishing Diet',
  'عليقة التسمين المكثف': 'Intensive Fattening Ration',
  'عليقة النامي والجاف': 'Growing & Dry Cows Ration',
  'عليقة الأبقار الجافة': 'Dry Cows Ration',
  'عليقة الرضيع والفطام (Starter)': 'Calves & Weaner Starter Ration',
};

const STATUS_TRANSLATIONS: Record<string, string> = {
  'نشط': 'Active',
  'صيانة': 'Maintenance',
  'فارغ': 'Empty',
  'نشطة': 'Active',
  'غير نشطة': 'Inactive',
  'مخططة': 'Planned',
  'مجدولة': 'Scheduled',
  'قيد التحضير': 'In Progress',
  'تم التحضير': 'Prepared',
  'تم التوزيع': 'Distributed',
};

const MATERIAL_TYPE_TRANSLATIONS: Record<string, { ar: string; en: string }> = {
  concentrate: { ar: 'علف مركز وحبوب', en: 'Concentrates & Grains' },
  roughage: { ar: 'أعلاف خشنة وسيلوجات', en: 'Roughages & Silage' },
  mineral: { ar: 'أملاح وإضافات', en: 'Minerals & Premix' },
  liquid: { ar: 'سوائل ومولاس', en: 'Liquids & Molasses' },
};

export function getCategoryDisplayName(name: string | undefined, isEn: boolean): string {
  if (!name) return isEn ? 'Unassigned' : 'غير محدد';
  if (!isEn) return name;
  return CATEGORY_TRANSLATIONS[name.trim()] || name;
}

export function getBarnNumberDisplayName(number: string | undefined, isEn: boolean): string {
  if (!number) return isEn ? 'Pen' : 'عنبر';
  if (!isEn) return number;
  const trimmed = number.trim();
  if (trimmed.startsWith('عنبر')) {
    const suffix = trimmed.replace('عنبر', '').trim();
    return `Barn ${suffix}`;
  }
  return trimmed;
}

export function getBarnNameDisplayName(name: string | undefined, isEn: boolean): string {
  if (!name) return '';
  if (!isEn) return name;
  const trimmed = name.trim();
  // Check exact pattern e.g. عنبر الحلاب A -> Lactating Barn A
  if (trimmed.includes('الحلاب')) {
    return trimmed.replace('عنبر الحلاب', 'Lactating Barn').replace('الحلاب', 'Lactating');
  }
  if (trimmed.includes('النامي')) {
    return trimmed.replace('عنبر النامي', 'Growing Barn').replace('النامي', 'Growing');
  }
  if (trimmed.includes('التسمين')) {
    return trimmed.replace('عنبر التسمين', 'Fattening Barn').replace('التسمين', 'Fattening');
  }
  if (trimmed.includes('جاف') || trimmed.includes('الجاف')) {
    return trimmed.replace('عنبر الجاف', 'Dry Barn').replace('الجاف', 'Dry');
  }
  if (trimmed.startsWith('عنبر')) {
    return trimmed.replace('عنبر', 'Barn');
  }
  return trimmed;
}

export function getMaterialDisplayName(name: string | undefined, isEn: boolean): string {
  if (!name) return isEn ? 'Raw Material' : 'خامة علفية';
  if (!isEn) return name;
  return MATERIAL_TRANSLATIONS[name.trim()] || name;
}

export function getMaterialTypeDisplayName(type: string | undefined, isEn: boolean): string {
  if (!type) return isEn ? 'General' : 'عام';
  const match = MATERIAL_TYPE_TRANSLATIONS[type];
  if (match) {
    return isEn ? match.en : match.ar;
  }
  return type;
}

export function getMixerDisplayName(name: string | undefined, isEn: boolean): string {
  if (!name) return isEn ? 'TMR Mixer' : 'مكسر TMR';
  if (!isEn) return name;
  return MIXER_TRANSLATIONS[name.trim()] || name;
}

export function getRationDisplayName(name: string | undefined, isEn: boolean): string {
  if (!name) return isEn ? 'Ration' : 'عليقة';
  if (!isEn) return name;
  return RATION_TRANSLATIONS[name.trim()] || name;
}

export function getBatchNumberDisplayName(batchNumber: string | undefined, isEn: boolean): string {
  if (!batchNumber) return isEn ? 'Batch' : 'لفة';
  if (!isEn) return batchNumber;
  let result = batchNumber;
  if (result.startsWith('لفة')) {
    result = result.replace(/^لفة/, 'Batch');
  }
  for (const [arCat, enCat] of Object.entries(CATEGORY_TRANSLATIONS)) {
    if (result.includes(arCat)) {
      result = result.replace(arCat, enCat);
    }
  }
  return result;
}

export function getStatusDisplayName(status: string | undefined, isEn: boolean): string {
  if (!status) return isEn ? 'Active' : 'نشط';
  if (!isEn) return status;
  return STATUS_TRANSLATIONS[status.trim()] || status;
}

export function getUnitDisplayName(unit: string | undefined, isEn: boolean): string {
  if (!unit) return isEn ? 'kg' : 'كجم';
  if (!isEn) return unit;
  const trimmed = unit.trim();
  if (trimmed === 'كجم' || trimmed === 'كيلو' || trimmed === 'كجم/رأس' || trimmed === 'كجم/يوم') {
    if (trimmed === 'كجم/رأس') return 'kg/head';
    if (trimmed === 'كجم/يوم') return 'kg/day';
    return 'kg';
  }
  if (trimmed === 'طن') return 'ton';
  if (trimmed === 'جرام') return 'g';
  if (trimmed === 'شكارة') return 'bags';
  if (trimmed === 'رأس') return 'heads';
  if (trimmed === 'لفة') return 'batch';
  return unit;
}
