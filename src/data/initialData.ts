import {
  RawMaterial,
  Ration,
  AnimalCategory,
  Barn,
  Mixer,
  MixBatch,
  DailyOperationPlan,
  FarmSettings,
} from '../types';

export const initialRawMaterials: RawMaterial[] = [
  { id: 'rm-1', code: 'RM001', name: 'ذرة صفراء مجروشة', unit: 'كجم', price: 12.5, status: 'نشطة', notes: 'مصدر طاقة رئيسي' },
  { id: 'rm-2', code: 'RM002', name: 'كسب صويا 46%', unit: 'كجم', price: 24.0, status: 'نشطة', notes: 'بروتين عالي' },
  { id: 'rm-3', code: 'RM003', name: 'فول صويا كامل الدهن (Full Fat)', unit: 'كجم', price: 26.5, status: 'نشطة', notes: 'طاقة وبروتين' },
  { id: 'rm-4', code: 'RM004', name: 'DDGS (مقطرات الذرة)', unit: 'كجم', price: 18.0, status: 'نشطة', notes: 'ألياف وبروتين' },
  { id: 'rm-5', code: 'RM005', name: 'جلوتوفيد', unit: 'كجم', price: 15.0, status: 'نشطة', notes: 'علف طاقة مجفف' },
  { id: 'rm-6', code: 'RM006', name: 'دريس حجازي ممتاز', unit: 'كجم', price: 9.0, status: 'نشطة', notes: 'ألياف حليبية ممتازة' },
  { id: 'rm-7', code: 'RM007', name: 'تبن قمح ناعم', unit: 'كجم', price: 4.5, status: 'نشطة', notes: 'ملء كرش وشبع' },
  { id: 'rm-8', code: 'RM008', name: 'سيلاج ذرة مع الحبوب', unit: 'كجم', price: 3.2, status: 'نشطة', notes: 'مادة خضراء مخمرة' },
  { id: 'rm-9', code: 'RM009', name: 'مولاس سائب', unit: 'كجم', price: 8.0, status: 'نشطة', notes: 'مستساغ ومصدر طاقة سريع' },
  { id: 'rm-10', code: 'RM010', name: 'بيكربونات صوديوم (منظم كرش)', unit: 'كجم', price: 22.0, status: 'نشطة', notes: 'منع تحمض الكرش' },
  { id: 'rm-11', code: 'RM011', name: 'مخلوط أملاح معدنية وفيتامينات', unit: 'كجم', price: 85.0, status: 'نشطة', notes: 'بريمكس متكامل' },
  { id: 'rm-12', code: 'RM012', name: 'مضاد سموم وإضافات', unit: 'كجم', price: 110.0, status: 'نشطة', notes: 'حماية وإضافات نادرة' },
];

export const initialMixers: Mixer[] = [
  { id: 'mix-1', name: 'مكسر الحلاب (TMR 1)', categoryId: 'cat-1', maxCapacityKg: 4000, notes: 'سعة 4 طن أفقية سريعة الخلط للأبقار الحلابة' },
  { id: 'mix-2', name: 'مكسر النامي والعجلات (TMR 2)', categoryId: 'cat-3', maxCapacityKg: 3000, notes: 'سعة 3 طن متخصصة للفئات النامية' },
  { id: 'mix-3', name: 'مكسر التسمين (TMR 3)', categoryId: 'cat-2', maxCapacityKg: 3500, notes: 'سعة 3.5 طن مجهزة لخلط أعلاف التسمين' },
];

export const initialCategories: AnimalCategory[] = [
  { id: 'cat-1', name: 'حلاب', rationId: 'rat-1', mixerId: 'mix-1', notes: 'أبقار الحلاب عالية ومتوسطة الإنتاج' },
  { id: 'cat-2', name: 'تسمين', rationId: 'rat-2', mixerId: 'mix-3', notes: 'عجول التسمين المرحلة الأخيرة' },
  { id: 'cat-3', name: 'نامي', rationId: 'rat-3', mixerId: 'mix-2', notes: 'العجلات والقطعان النامية' },
  { id: 'cat-4', name: 'جاف', rationId: 'rat-3', mixerId: 'mix-2', notes: 'الأبقار في فترة التجفيف' },
  { id: 'cat-5', name: 'عجلات', rationId: 'rat-3', mixerId: 'mix-2', notes: 'العجلات الملقحة' },
  { id: 'cat-6', name: 'عجول', rationId: 'rat-2', mixerId: 'mix-3', notes: 'عجول رضيعة وفطام' },
  { id: 'cat-7', name: 'انتظار ولادة', rationId: 'rat-1', mixerId: 'mix-1', notes: 'فترة الانتقال قبل الولادة' },
];

export const initialBarns: Barn[] = [
  // فئة الحلاب (5 عنابر حسب الاختبارات الإجبارية)
  { id: 'barn-1', number: 'عنبر 1', name: 'عنبر الحلاب A', categoryId: 'cat-1', headCount: 70, baseFeedKgPerHead: 44.5, feedingRatioPercent: 110, status: 'نشط', notes: 'إنتاج مرتفع - تغذية 110%' },
  { id: 'barn-2', number: 'عنبر 2', name: 'عنبر الحلاب B', categoryId: 'cat-1', headCount: 60, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', notes: 'إنتاج ممتاز - تغذية 100%' },
  { id: 'barn-3', number: 'عنبر 3', name: 'عنبر الحلاب C', categoryId: 'cat-1', headCount: 55, baseFeedKgPerHead: 44.5, feedingRatioPercent: 95, status: 'نشط', notes: 'إنتاج متوسط - تغذية 95%' },
  { id: 'barn-4', number: 'عنبر 4', name: 'عنبر الحلاب D', categoryId: 'cat-1', headCount: 65, baseFeedKgPerHead: 44.5, feedingRatioPercent: 105, status: 'نشط', notes: 'إنتاج مرتفع - تغذية 105%' },
  { id: 'barn-5', number: 'عنبر 5', name: 'عنبر الحلاب E', categoryId: 'cat-1', headCount: 50, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', notes: 'تغذية قياسية - 100%' },

  // فئة النامي (3 عنابر)
  { id: 'barn-6', number: 'عنبر 6', name: 'عنبر النامي 1', categoryId: 'cat-3', headCount: 40, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', notes: 'قطيع النامي A' },
  { id: 'barn-7', number: 'عنبر 7', name: 'عنبر النامي 2', categoryId: 'cat-3', headCount: 35, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', notes: 'قطيع النامي B' },
  { id: 'barn-8', number: 'عنبر 8', name: 'عنبر النامي 3', categoryId: 'cat-3', headCount: 45, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', notes: 'قطيع النامي C' },

  // فئة التسمين (3 عنابر)
  { id: 'barn-9', number: 'عنبر 9', name: 'عنبر التسمين 1', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 12.6, feedingRatioPercent: 100, status: 'نشط', notes: 'دفعة التسمين الأولى' },
  { id: 'barn-10', number: 'عنبر 10', name: 'عنبر التسمين 2', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 12.6, feedingRatioPercent: 100, status: 'نشط', notes: 'دفعة التسمين الثانية' },
  { id: 'barn-11', number: 'عنبر 11', name: 'عنبر التسمين 3', categoryId: 'cat-2', headCount: 60, baseFeedKgPerHead: 12.6, feedingRatioPercent: 100, status: 'نشط', notes: 'دفعة التسمين الثالثة' },
];

export const initialRations: Ration[] = [
  {
    id: 'rat-1',
    name: 'عليقة الحلاب العالية (High Yield)',
    code: 'RAT-MILK-01',
    notes: 'عليقة نموذجية للأبقار الحلابة (إجمالي 44.5 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 6.0 },   // ذرة
      { rawMaterialId: 'rm-2', amountKgPerHead: 2.5 },   // صويا 46%
      { rawMaterialId: 'rm-3', amountKgPerHead: 1.0 },   // فول فات
      { rawMaterialId: 'rm-5', amountKgPerHead: 1.0 },   // جلوتوفيد
      { rawMaterialId: 'rm-6', amountKgPerHead: 3.0 },   // دريس
      { rawMaterialId: 'rm-7', amountKgPerHead: 1.0 },   // تبن
      { rawMaterialId: 'rm-8', amountKgPerHead: 30.0 },  // سيلاج
    ],
  },
  {
    id: 'rat-2',
    name: 'عليقة العجول التسمين',
    code: 'RAT-FAT-01',
    notes: 'معدل نمو مرتفع (إجمالي 12.6 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 6.0 },
      { rawMaterialId: 'rm-2', amountKgPerHead: 2.0 },
      { rawMaterialId: 'rm-4', amountKgPerHead: 1.5 },
      { rawMaterialId: 'rm-7', amountKgPerHead: 2.5 },
      { rawMaterialId: 'rm-9', amountKgPerHead: 0.5 },
      { rawMaterialId: 'rm-11', amountKgPerHead: 0.1 },
    ],
  },
  {
    id: 'rat-3',
    name: 'عليقة النامي والعجلات',
    code: 'RAT-GROW-01',
    notes: 'عليقة نمو هيكلي (إجمالي 22.5 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 3.0 },
      { rawMaterialId: 'rm-2', amountKgPerHead: 1.5 },
      { rawMaterialId: 'rm-6', amountKgPerHead: 4.0 },
      { rawMaterialId: 'rm-7', amountKgPerHead: 2.0 },
      { rawMaterialId: 'rm-8', amountKgPerHead: 12.0 },
    ],
  },
];

export const initialDailyPlan: DailyOperationPlan = {
  date: new Date().toISOString().split('T')[0],
  notes: 'خطة التغذية اليومية الشاملة لجميع الفئات والعنابر',
  batches: [
    // لفات فئة الحلاب
    {
      id: 'batch-1',
      batchNumber: 'لفة 1 (حلاب)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '06:00 ص',
      targetWeightKg: 3500,
      status: 'تم التوزيع',
      allocations: [
        { barnId: 'barn-1', allocatedKg: 2000 },
        { barnId: 'barn-2', allocatedKg: 1500 },
      ],
      notes: 'الوجبة الأولى - عنبر 1 وعنبر 2',
    },
    {
      id: 'batch-2',
      batchNumber: 'لفة 2 (حلاب)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '08:30 ص',
      targetWeightKg: 3500,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-1', allocatedKg: 1426.5 },
        { barnId: 'barn-2', allocatedKg: 1170 },
        { barnId: 'barn-3', allocatedKg: 903.5 },
      ],
      notes: 'استكمال عنبر 1 و2 وبداية عنبر 3',
    },
    {
      id: 'batch-3',
      batchNumber: 'لفة 3 (حلاب)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '11:00 ص',
      targetWeightKg: 3500,
      status: 'قيد التحضير',
      allocations: [
        { barnId: 'barn-3', allocatedKg: 1421.625 },
        { barnId: 'barn-4', allocatedKg: 2078.375 },
      ],
      notes: 'استكمال عنبر 3 وبداية عنبر 4',
    },
    {
      id: 'batch-4',
      batchNumber: 'لفة 4 (حلاب)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '02:00 م',
      targetWeightKg: 3183.75,
      status: 'مخططة',
      allocations: [
        { barnId: 'barn-4', allocatedKg: 958.75 },
        { barnId: 'barn-5', allocatedKg: 2225 },
      ],
      notes: 'استكمال عنبر 4 وتغذية عنبر 5 بالكامل',
    },

    // لفات فئة النامي
    {
      id: 'batch-n1',
      batchNumber: 'لفة 1 (نامي)',
      mixerId: 'mix-2',
      categoryId: 'cat-3',
      time: '07:30 ص',
      targetWeightKg: 2700,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-6', allocatedKg: 900 },
        { barnId: 'barn-7', allocatedKg: 787.5 },
        { barnId: 'barn-8', allocatedKg: 1012.5 },
      ],
      notes: 'تغذية كامل عنابر النامي (6، 7، 8)',
    },

    // لفات فئة التسمين
    {
      id: 'batch-t1',
      batchNumber: 'لفة 1 (تسمين)',
      mixerId: 'mix-3',
      categoryId: 'cat-2',
      time: '09:00 ص',
      targetWeightKg: 2016,
      status: 'مخططة',
      allocations: [
        { barnId: 'barn-9', allocatedKg: 630 },
        { barnId: 'barn-10', allocatedKg: 630 },
        { barnId: 'barn-11', allocatedKg: 756 },
      ],
      notes: 'تغذية كامل عنابر التسمين (9، 10، 11)',
    },
  ],
};

export const initialSettings: FarmSettings = {
  farmName: 'مزرعة الخير والبركة للإنتاج الحيواني',
  engineerName: 'مهندس / أحمد عبد العزيز',
  warehouseManagerName: 'أستاذ / محمود حسن',
  driverName: 'أسطول سائقي المكسر (المهندس محمد)',
  currency: 'جنية مصري',
};
