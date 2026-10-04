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
  { id: 'rm-1', code: 'RM001', name: 'ذرة صفراء مجروشة', unit: 'كجم', materialType: 'concentrate', price: 12.5, dryMatterPercent: 88, status: 'نشطة', notes: 'مصدر طاقة رئيسي', currentStockKg: 25000, minStockKg: 5000 },
  { id: 'rm-2', code: 'RM002', name: 'كسب صويا 46%', unit: 'كجم', materialType: 'concentrate', price: 24.0, dryMatterPercent: 89, status: 'نشطة', notes: 'بروتين عالي', currentStockKg: 15000, minStockKg: 3000 },
  { id: 'rm-3', code: 'RM003', name: 'فول صويا كامل الدهن (Full Fat)', unit: 'كجم', materialType: 'concentrate', price: 26.5, dryMatterPercent: 90, status: 'نشطة', notes: 'طاقة وبروتين', currentStockKg: 8000, minStockKg: 2000 },
  { id: 'rm-4', code: 'RM004', name: 'DDGS (مقطرات الذرة)', unit: 'كجم', materialType: 'concentrate', price: 18.0, dryMatterPercent: 90, status: 'نشطة', notes: 'ألياف وبروتين', currentStockKg: 9500, minStockKg: 2000 },
  { id: 'rm-5', code: 'RM005', name: 'جلوتوفيد', unit: 'كجم', materialType: 'concentrate', price: 15.0, dryMatterPercent: 88, status: 'نشطة', notes: 'علف طاقة مجفف', currentStockKg: 12000, minStockKg: 2500 },
  { id: 'rm-6', code: 'RM006', name: 'دريس حجازي ممتاز', unit: 'كجم', materialType: 'roughage', price: 9.0, dryMatterPercent: 88, status: 'نشطة', notes: 'ألياف حليبية ممتازة', currentStockKg: 20000, minStockKg: 4000 },
  { id: 'rm-7', code: 'RM007', name: 'تبن قمح ناعم', unit: 'كجم', materialType: 'roughage', price: 4.5, dryMatterPercent: 90, status: 'نشطة', notes: 'ملء كرش وشبع', currentStockKg: 18000, minStockKg: 3000 },
  { id: 'rm-8', code: 'RM008', name: 'سيلاج ذرة مع الحبوب', unit: 'كجم', materialType: 'roughage', price: 3.2, dryMatterPercent: 33, status: 'نشطة', notes: 'مادة خضراء مخمرة', currentStockKg: 85000, minStockKg: 15000 },
  { id: 'rm-9', code: 'RM009', name: 'مولاس سائب', unit: 'كجم', materialType: 'liquid', price: 8.0, dryMatterPercent: 75, status: 'نشطة', notes: 'مستساغ ومصدر طاقة سريع', currentStockKg: 6000, minStockKg: 1500 },
  { id: 'rm-10', code: 'RM010', name: 'بيكربونات صوديوم (منظم كرش)', unit: 'كجم', materialType: 'mineral', price: 22.0, dryMatterPercent: 99, status: 'نشطة', notes: 'منع تحمض الكرش', currentStockKg: 1200, minStockKg: 300 },
  { id: 'rm-11', code: 'RM011', name: 'مخلوط أملاح معدنية وفيتامينات', unit: 'كجم', materialType: 'mineral', price: 85.0, dryMatterPercent: 98, status: 'نشطة', notes: 'بريمكس متكامل', currentStockKg: 850, minStockKg: 200 },
  { id: 'rm-12', code: 'RM012', name: 'مضاد سموم وإضافات', unit: 'كجم', materialType: 'mineral', price: 110.0, dryMatterPercent: 98, status: 'نشطة', notes: 'حماية وإضافات نادرة', currentStockKg: 500, minStockKg: 100 },
];

export const initialMixers: Mixer[] = [
  { id: 'mix-1', name: 'مكسر الحلاب (TMR 1)', categoryId: 'cat-1', maxCapacityKg: 4000, notes: 'سعة 4 طن أفقية سريعة الخلط للأبقار الحلابة' },
  { id: 'mix-2', name: 'مكسر النامي والعجلات (TMR 2)', categoryId: 'cat-3', maxCapacityKg: 3000, notes: 'سعة 3 طن متخصصة للفئات النامية' },
  { id: 'mix-3', name: 'مكسر التسمين (TMR 3)', categoryId: 'cat-2', maxCapacityKg: 3500, notes: 'سعة 3.5 طن مجهزة لخلط أعلاف التسمين' },
  { id: 'mix-4', name: 'مكسر الرضيع والفطام (TMR 4)', categoryId: 'cat-6', maxCapacityKg: 2500, notes: 'مكسر خلطات العجول الرضيعة والفطام' },
];

export const initialCategories: AnimalCategory[] = [
  { id: 'cat-1', name: 'حلاب', rationId: 'rat-1', mixerId: 'mix-1', calculationType: 'per_head', notes: 'أبقار الحلاب عالية ومتوسطة الإنتاج' },
  { id: 'cat-2', name: 'تسمين', rationId: 'rat-2', mixerId: 'mix-3', calculationType: 'per_head', notes: 'عجول التسمين المرحلة الأخيرة' },
  { id: 'cat-3', name: 'نامي', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'العجلات والقطعان النامية (تستقبل راجع الحلاب)' },
  { id: 'cat-4', name: 'جاف', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'الأبقار في فترة التجفيف' },
  { id: 'cat-5', name: 'عجلات', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'العجلات الملقحة' },
  { id: 'cat-6', name: 'رضيع وفطام', rationId: 'rat-4', mixerId: 'mix-4', calculationType: 'fixed_tonnage', isPeriodicMixer: true, defaultTonnageKg: 2000, notes: 'عجول رضيع وفطام - خلط دوري بالطن (يوم ويوم / عند الحاجة)' },
  { id: 'cat-7', name: 'انتظار ولادة', rationId: 'rat-1', mixerId: 'mix-1', calculationType: 'per_head', notes: 'فترة الانتقال قبل الولادة' },
];

export const initialBarns: Barn[] = [
  // فئة الحلاب (5 عنابر حسب الاختبارات الإجبارية)
  { id: 'barn-1', number: 'عنبر 1', name: 'عنبر الحلاب A', categoryId: 'cat-1', headCount: 70, baseFeedKgPerHead: 44.5, feedingRatioPercent: 110, status: 'نشط', orderIndex: 1, notes: 'إنتاج مرتفع - تغذية 110%' },
  { id: 'barn-2', number: 'عنبر 2', name: 'عنبر الحلاب B', categoryId: 'cat-1', headCount: 60, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 2, notes: 'إنتاج ممتاز - تغذية 100%' },
  { id: 'barn-3', number: 'عنبر 3', name: 'عنبر الحلاب C', categoryId: 'cat-1', headCount: 55, baseFeedKgPerHead: 44.5, feedingRatioPercent: 95, status: 'نشط', orderIndex: 3, notes: 'إنتاج متوسط - تغذية 95%' },
  { id: 'barn-4', number: 'عنبر 4', name: 'عنبر الحلاب D', categoryId: 'cat-1', headCount: 65, baseFeedKgPerHead: 44.5, feedingRatioPercent: 105, status: 'نشط', orderIndex: 4, notes: 'إنتاج مرتفع - تغذية 105%' },
  { id: 'barn-5', number: 'عنبر 5', name: 'عنبر الحلاب E', categoryId: 'cat-1', headCount: 50, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 5, notes: 'تغذية قياسية - 100%' },

  // فئة النامي (3 عنابر)
  { id: 'barn-6', number: 'عنبر 6', name: 'عنبر النامي 1', categoryId: 'cat-3', headCount: 40, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 6, notes: 'قطيع النامي A' },
  { id: 'barn-7', number: 'عنبر 7', name: 'عنبر النامي 2', categoryId: 'cat-3', headCount: 35, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 7, notes: 'قطيع النامي B' },
  { id: 'barn-8', number: 'عنبر 8', name: 'عنبر النامي 3', categoryId: 'cat-3', headCount: 45, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 8, notes: 'قطيع النامي C' },

  // فئة التسمين (3 عنابر)
  { id: 'barn-9', number: 'عنبر 9', name: 'عنبر التسمين 1', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 9, notes: 'دفعة التسمين الأولى (وزن 350 كجم)' },
  { id: 'barn-10', number: 'عنبر 10', name: 'عنبر التسمين 2', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 10, notes: 'دفعة التسمين الثانية (وزن 350 كجم)' },
  { id: 'barn-11', number: 'عنبر 11', name: 'عنبر التسمين 3', categoryId: 'cat-2', headCount: 60, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 11, notes: 'دفعة التسمين الثالثة (وزن 350 كجم)' },
];

export const initialRations: Ration[] = [
  {
    id: 'rat-1',
    name: 'عليقة الحلاب العالية (High Yield)',
    code: 'RAT-MILK-01',
    notes: 'عليقة نموذجية للأبقار الحلابة (إجمالي 44.5 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 6.0, inConcentratePremix: true },   // ذرة
      { rawMaterialId: 'rm-2', amountKgPerHead: 2.5, inConcentratePremix: true },   // صويا 46%
      { rawMaterialId: 'rm-3', amountKgPerHead: 1.0, inConcentratePremix: true },   // فول فات
      { rawMaterialId: 'rm-5', amountKgPerHead: 1.0, inConcentratePremix: true },   // جلوتوفيد
      { rawMaterialId: 'rm-6', amountKgPerHead: 3.0, inConcentratePremix: false },  // دريس
      { rawMaterialId: 'rm-7', amountKgPerHead: 1.0, inConcentratePremix: false },  // تبن
      { rawMaterialId: 'rm-8', amountKgPerHead: 30.0, inConcentratePremix: false }, // سيلاج
    ],
  },
  {
    id: 'rat-2',
    name: 'عليقة التسمين المتكاملة (عجل 350 كجم - مركز 2.5% + سيلاج وتبن)',
    code: 'RAT-FAT-350',
    calculationType: 'per_head',
    notes: 'عليقة تسمين متوازنة: 8.75 كجم مركز (شكاير بالطن) + 6 كجم سيلاج + 1 كجم تبن (إجمالي 15.75 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 5.25, inConcentratePremix: true }, // ذرة صفراء (60% من المركز)
      { rawMaterialId: 'rm-2', amountKgPerHead: 1.75, inConcentratePremix: true }, // كسب صويا (20% من المركز)
      { rawMaterialId: 'rm-4', amountKgPerHead: 1.49, inConcentratePremix: true }, // DDGS وردة (17% من المركز)
      { rawMaterialId: 'rm-11', amountKgPerHead: 0.26, inConcentratePremix: true }, // أملاح وبريمكس (3% من المركز)
      { rawMaterialId: 'rm-8', amountKgPerHead: 6.0, inConcentratePremix: false }, // سيلاج ذرة (لودر مباشر)
      { rawMaterialId: 'rm-7', amountKgPerHead: 1.0, inConcentratePremix: false }, // تبن قمح (لودر مباشر)
    ],
  },
  {
    id: 'rat-3',
    name: 'عليقة النامي والعجلات',
    code: 'RAT-GROW-01',
    calculationType: 'per_head',
    notes: 'عليقة نمو هيكلي (إجمالي 22.5 كجم/رأس)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 3.0, inConcentratePremix: true },
      { rawMaterialId: 'rm-2', amountKgPerHead: 1.5, inConcentratePremix: true },
      { rawMaterialId: 'rm-6', amountKgPerHead: 4.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-7', amountKgPerHead: 2.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-8', amountKgPerHead: 12.0, inConcentratePremix: false },
    ],
  },
  {
    id: 'rat-4',
    name: 'خلطة بادئ وعجول رضيع وفطام (TMR بالطن)',
    code: 'RAT-CALF-01',
    calculationType: 'fixed_tonnage',
    notes: 'تركيبة خلطة بادئ مركزة مصممة لكل 1 طن (1000 كجم) خلط مكسر',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 380, inConcentratePremix: true }, // ذرة مجروشة
      { rawMaterialId: 'rm-2', amountKgPerHead: 260, inConcentratePremix: true }, // كسب صويا 46%
      { rawMaterialId: 'rm-3', amountKgPerHead: 60, inConcentratePremix: true },  // فول صويا كامل الدهن
      { rawMaterialId: 'rm-5', amountKgPerHead: 120, inConcentratePremix: true }, // جلوتوفيد
      { rawMaterialId: 'rm-6', amountKgPerHead: 120, inConcentratePremix: false }, // دريس ممتاز ناعم
      { rawMaterialId: 'rm-9', amountKgPerHead: 40, inConcentratePremix: false },  // مولاس
      { rawMaterialId: 'rm-11', amountKgPerHead: 20, inConcentratePremix: true }, // بريمكس وفيتامينات
    ],
  },
];

export const initialDailyPlan: DailyOperationPlan = {
  date: new Date().toISOString().split('T')[0],
  notes: 'خطة التغذية اليومية الشاملة لجميع الفئات والعنابر',
  milkProduction: {
    sessions: [
      { id: 'session-1', name: 'الحلبة الأولى (الصباحية)', amountKg: 4650, time: '05:00 ص' },
      { id: 'session-2', name: 'الحلبة الثانية (الظهر)', amountKg: 3800, time: '01:00 م' },
      { id: 'session-3', name: 'الحلبة الثالثة (المسائية)', amountKg: 4150, time: '09:00 م' },
    ],
    refusalPercent: 4.5,
  },
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
        { barnId: 'barn-1', allocatedKg: 2000, allocatedPercent: 58.3686 },
        { barnId: 'barn-2', allocatedKg: 1500, allocatedPercent: 56.1798 },
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
        { barnId: 'barn-1', allocatedKg: 1426.5, allocatedPercent: 41.6314 },
        { barnId: 'barn-2', allocatedKg: 1170, allocatedPercent: 43.8202 },
        { barnId: 'barn-3', allocatedKg: 903.5, allocatedPercent: 38.8581 },
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
        { barnId: 'barn-3', allocatedKg: 1421.625, allocatedPercent: 61.1419 },
        { barnId: 'barn-4', allocatedKg: 2078.375, allocatedPercent: 68.4323 },
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
        { barnId: 'barn-4', allocatedKg: 958.75, allocatedPercent: 31.5677 },
        { barnId: 'barn-5', allocatedKg: 2225, allocatedPercent: 100 },
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
        { barnId: 'barn-6', allocatedKg: 900, allocatedPercent: 100 },
        { barnId: 'barn-7', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-8', allocatedKg: 1012.5, allocatedPercent: 100 },
      ],
      notes: 'تغذية كامل عنابر النامي (6، 7، 8)',
    },

    // لفات فئة التسمين (160 رأس موزعة على عنابر 9، 10، 11)
    {
      id: 'batch-f1',
      batchNumber: 'لفة 1 (تسمين)',
      mixerId: 'mix-3',
      categoryId: 'cat-2',
      time: '09:30 ص',
      targetWeightKg: 2520,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-9', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-10', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-11', allocatedKg: 945.0, allocatedPercent: 100 },
      ],
      notes: 'تغذية كامل عنابر التسمين (9، 10، 11) - 160 رأس',
    },
  ],
  useConcentratePremixMode: true, // تفعيل نمط الشكاير والمركز المسبق بالمرونة المطلوبة
  premixBagWeightKg: 50, // وزن الشكارة القياسي (50 كجم)
  concentrateOrders: [
    {
      id: 'conc-ord-1',
      orderNumber: 'أمر خلط مركز #1 (حلاب)',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat-1',
      rationId: 'rat-1',
      batchWeightKg: 1000, // 1 طن
      bagWeightKg: 50,
      totalBags: 20, // 20 شكارة
      remainingLooseKg: 0,
      mixerName: 'خلاطة المركز الجاف الرئيسية (2 طن)',
      status: 'مكتمل ومعبأ',
      createdAt: '06:00 ص',
      notes: 'خلط دفعة 1 طن مركز حلاب عالي الإنتاج وتعبئتها في 20 شكارة زنة 50 كجم',
      ingredients: [
        { rawMaterialId: 'rm-1', name: 'ذرة صفراء مجروشة', code: 'RM001', unit: 'كجم', amountKgPerHead: 6.0, percentageInConcentrate: 57.14, requiredKg: 571.4, actualKg: 571.4, costPerKg: 12.5 },
        { rawMaterialId: 'rm-2', name: 'كسب صويا 46%', code: 'RM002', unit: 'كجم', amountKgPerHead: 2.5, percentageInConcentrate: 23.81, requiredKg: 238.1, actualKg: 238.1, costPerKg: 24.0 },
        { rawMaterialId: 'rm-3', name: 'فول صويا كامل الدهن (Full Fat)', code: 'RM003', unit: 'كجم', amountKgPerHead: 1.0, percentageInConcentrate: 9.52, requiredKg: 95.2, actualKg: 95.2, costPerKg: 26.5 },
        { rawMaterialId: 'rm-5', name: 'جلوتوفيد', code: 'RM005', unit: 'كجم', amountKgPerHead: 1.0, percentageInConcentrate: 9.52, requiredKg: 95.3, actualKg: 95.3, costPerKg: 15.0 },
      ],
      totalCost: 16800,
      costPerBag: 840,
    },
    {
      id: 'conc-ord-2',
      orderNumber: 'أمر خلط مركز #2 (تسمين 350 كجم)',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat-2',
      rationId: 'rat-2',
      batchWeightKg: 1000, // 1 طن
      bagWeightKg: 50,
      totalBags: 20, // 20 شكارة
      remainingLooseKg: 0,
      mixerName: 'خلاطة المركز الجاف الرئيسية (2 طن)',
      status: 'مكتمل ومعبأ',
      createdAt: '07:30 ص',
      notes: 'خلط دفعة 1 طن مركز تسمين (60% ذرة، 20% صويا، 17% ردة، 3% بريمكس) وتعبئتها في 20 شكارة',
      ingredients: [
        { rawMaterialId: 'rm-1', name: 'ذرة صفراء مجروشة', code: 'RM001', unit: 'كجم', amountKgPerHead: 5.25, percentageInConcentrate: 60.0, requiredKg: 600.0, actualKg: 600.0, costPerKg: 12.5 },
        { rawMaterialId: 'rm-2', name: 'كسب صويا 46%', code: 'RM002', unit: 'كجم', amountKgPerHead: 1.75, percentageInConcentrate: 20.0, requiredKg: 200.0, actualKg: 200.0, costPerKg: 24.0 },
        { rawMaterialId: 'rm-4', name: 'ردة قمح ناعمة / DDGS', code: 'RM004', unit: 'كجم', amountKgPerHead: 1.49, percentageInConcentrate: 17.0, requiredKg: 170.0, actualKg: 170.0, costPerKg: 11.5 },
        { rawMaterialId: 'rm-11', name: 'أملاح معدنية وفيتامينات (بريمكس)', code: 'RM011', unit: 'كجم', amountKgPerHead: 0.26, percentageInConcentrate: 3.0, requiredKg: 30.0, actualKg: 30.0, costPerKg: 45.0 },
      ],
      totalCost: 15605,
      costPerBag: 780.25,
    },
  ],
};

export const initialSettings: FarmSettings = {
  farmName: 'مزرعة الخير والبركة للإنتاج الحيواني',
  engineerName: 'مهندس / أحمد عبد العزيز',
  warehouseManagerName: 'أستاذ / محمود حسن',
  driverName: 'أسطول سائقي المكسر (المهندس محمد)',
  currency: 'ج.م',
  language: 'ar',
  hasConcentrateMixer: true, // افتراضياً ميزة الخلاطة مفعلة وقابلة للإلغاء في أي وقت بنقرة واحدة
  defaultBagWeightKg: 50,
  defaultMilkPricePerKg: 20.0,
  defaultMeatPricePerKg: 175.0,
};

// =========================================================================
// ENGLISH DEMO SCENARIO DATA (السيناريو التجريبي المترجم بالإنجليزية)
// =========================================================================

export const initialRawMaterialsEn: RawMaterial[] = [
  { id: 'rm-1', code: 'RM001', name: 'Ground Yellow Corn', unit: 'kg', materialType: 'concentrate', price: 12.5, dryMatterPercent: 88, status: 'نشطة', notes: 'Primary energy source', currentStockKg: 25000, minStockKg: 5000 },
  { id: 'rm-2', code: 'RM002', name: 'Soybean Meal 46%', unit: 'kg', materialType: 'concentrate', price: 24.0, dryMatterPercent: 89, status: 'نشطة', notes: 'High-quality bypass protein', currentStockKg: 15000, minStockKg: 3000 },
  { id: 'rm-3', code: 'RM003', name: 'Full-Fat Extruded Soy', unit: 'kg', materialType: 'concentrate', price: 26.5, dryMatterPercent: 90, status: 'نشطة', notes: 'Dense energy & fat', currentStockKg: 8000, minStockKg: 2000 },
  { id: 'rm-4', code: 'RM004', name: 'Corn DDGS', unit: 'kg', materialType: 'concentrate', price: 18.0, dryMatterPercent: 90, status: 'نشطة', notes: 'Fiber & digestible protein', currentStockKg: 9500, minStockKg: 2000 },
  { id: 'rm-5', code: 'RM005', name: 'Corn Gluten Feed', unit: 'kg', materialType: 'concentrate', price: 15.0, dryMatterPercent: 88, status: 'نشطة', notes: 'Medium protein energy feed', currentStockKg: 12000, minStockKg: 2500 },
  { id: 'rm-6', code: 'RM006', name: 'Premium Alfalfa Hay', unit: 'kg', materialType: 'roughage', price: 9.0, dryMatterPercent: 88, status: 'نشطة', notes: 'Premium lactating dairy fiber', currentStockKg: 20000, minStockKg: 4000 },
  { id: 'rm-7', code: 'RM007', name: 'Fine Wheat Straw', unit: 'kg', materialType: 'roughage', price: 4.5, dryMatterPercent: 90, status: 'نشطة', notes: 'Rumen scratch & fill', currentStockKg: 18000, minStockKg: 3000 },
  { id: 'rm-8', code: 'RM008', name: 'Corn Silage (Grain-rich)', unit: 'kg', materialType: 'roughage', price: 3.2, dryMatterPercent: 33, status: 'نشطة', notes: 'Fermented green forage base', currentStockKg: 85000, minStockKg: 15000 },
  { id: 'rm-9', code: 'RM009', name: 'Bulk Molasses', unit: 'kg', materialType: 'liquid', price: 8.0, dryMatterPercent: 75, status: 'نشطة', notes: 'Palatability & quick sugar', currentStockKg: 6000, minStockKg: 1500 },
  { id: 'rm-10', code: 'RM010', name: 'Sodium Bicarbonate Buffer', unit: 'kg', materialType: 'mineral', price: 22.0, dryMatterPercent: 99, status: 'نشطة', notes: 'Rumen acidosis prevention', currentStockKg: 1200, minStockKg: 300 },
  { id: 'rm-11', code: 'RM011', name: 'Mineral & Vitamin Premix', unit: 'kg', materialType: 'mineral', price: 85.0, dryMatterPercent: 98, status: 'نشطة', notes: 'Complete trace minerals', currentStockKg: 850, minStockKg: 200 },
  { id: 'rm-12', code: 'RM012', name: 'Toxin Binder & Additives', unit: 'kg', materialType: 'mineral', price: 110.0, dryMatterPercent: 98, status: 'نشطة', notes: 'Gut shield & organic minerals', currentStockKg: 500, minStockKg: 100 },
];

export const initialMixersEn: Mixer[] = [
  { id: 'mix-1', name: 'Milking Herd Mixer (TMR 1)', categoryId: 'cat-1', maxCapacityKg: 4000, notes: '4-ton high-speed vertical wagon for lactating cows' },
  { id: 'mix-2', name: 'Heifers & Growing Mixer (TMR 2)', categoryId: 'cat-3', maxCapacityKg: 3000, notes: '3-ton wagon dedicated to growing stock & dry cows' },
  { id: 'mix-3', name: 'Fattening Herd Mixer (TMR 3)', categoryId: 'cat-2', maxCapacityKg: 3500, notes: '3.5-ton reinforced wagon for beef cattle' },
  { id: 'mix-4', name: 'Calf Starter Batch Mixer (TMR 4)', categoryId: 'cat-6', maxCapacityKg: 2500, notes: 'Stationary batch mixer for starter concentrates' },
];

export const initialCategoriesEn: AnimalCategory[] = [
  { id: 'cat-1', name: 'Lactating Cows', rationId: 'rat-1', mixerId: 'mix-1', calculationType: 'per_head', notes: 'High & medium-yield dairy cows' },
  { id: 'cat-2', name: 'Fattening Bulls', rationId: 'rat-2', mixerId: 'mix-3', calculationType: 'per_head', notes: 'Finishing beef cattle (350-450 kg)' },
  { id: 'cat-3', name: 'Growing Heifers', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'Young replacement stock (accepts milk refusals)' },
  { id: 'cat-4', name: 'Dry Cows', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'Far-off & close-up dry period cows' },
  { id: 'cat-5', name: 'Bred Heifers', rationId: 'rat-3', mixerId: 'mix-2', calculationType: 'per_head', notes: 'Confirmed pregnant replacement stock' },
  { id: 'cat-6', name: 'Calves & Weaners', rationId: 'rat-4', mixerId: 'mix-4', calculationType: 'fixed_tonnage', isPeriodicMixer: true, defaultTonnageKg: 2000, notes: 'Calves starter ration - batch mixing by tonnage' },
  { id: 'cat-7', name: 'Transition / Fresh', rationId: 'rat-1', mixerId: 'mix-1', calculationType: 'per_head', notes: 'Maternity & fresh cows transition' },
];

export const initialBarnsEn: Barn[] = [
  { id: 'barn-1', number: 'Barn 1', name: 'High Yield Pen A', categoryId: 'cat-1', headCount: 70, baseFeedKgPerHead: 44.5, feedingRatioPercent: 110, status: 'نشط', orderIndex: 1, notes: 'High producers - 110% allocation' },
  { id: 'barn-2', number: 'Barn 2', name: 'High Yield Pen B', categoryId: 'cat-1', headCount: 60, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 2, notes: 'Peak lactating - 100% standard' },
  { id: 'barn-3', number: 'Barn 3', name: 'Mid Lactation Pen C', categoryId: 'cat-1', headCount: 55, baseFeedKgPerHead: 44.5, feedingRatioPercent: 95, status: 'نشط', orderIndex: 3, notes: 'Mid lactation - 95% feed intake' },
  { id: 'barn-4', number: 'Barn 4', name: 'High Yield Pen D', categoryId: 'cat-1', headCount: 65, baseFeedKgPerHead: 44.5, feedingRatioPercent: 105, status: 'نشط', orderIndex: 4, notes: 'Fresh high cows - 105% allocation' },
  { id: 'barn-5', number: 'Barn 5', name: 'Standard Pen E', categoryId: 'cat-1', headCount: 50, baseFeedKgPerHead: 44.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 5, notes: 'Standard baseline - 100%' },

  { id: 'barn-6', number: 'Barn 6', name: 'Growing Heifers 1', categoryId: 'cat-3', headCount: 40, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 6, notes: 'Young heifers group A' },
  { id: 'barn-7', number: 'Barn 7', name: 'Growing Heifers 2', categoryId: 'cat-3', headCount: 35, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 7, notes: 'Young heifers group B' },
  { id: 'barn-8', number: 'Barn 8', name: 'Growing Heifers 3', categoryId: 'cat-3', headCount: 45, baseFeedKgPerHead: 22.5, feedingRatioPercent: 100, status: 'نشط', orderIndex: 8, notes: 'Young heifers group C' },

  { id: 'barn-9', number: 'Barn 9', name: 'Beef Feedlot Pen 1', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 9, notes: 'Fattening batch 1 (350 kg)' },
  { id: 'barn-10', number: 'Barn 10', name: 'Beef Feedlot Pen 2', categoryId: 'cat-2', headCount: 50, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 10, notes: 'Fattening batch 2 (350 kg)' },
  { id: 'barn-11', number: 'Barn 11', name: 'Beef Feedlot Pen 3', categoryId: 'cat-2', headCount: 60, baseFeedKgPerHead: 15.75, feedingRatioPercent: 100, status: 'نشط', orderIndex: 11, notes: 'Fattening batch 3 (350 kg)' },
];

export const initialRationsEn: Ration[] = [
  {
    id: 'rat-1',
    name: 'High Yield Lactating TMR',
    code: 'RAT-MILK-01',
    notes: 'Standard high-producing lactating cow ration (44.5 kg/head as-fed)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 6.0, inConcentratePremix: true },
      { rawMaterialId: 'rm-2', amountKgPerHead: 2.5, inConcentratePremix: true },
      { rawMaterialId: 'rm-3', amountKgPerHead: 1.0, inConcentratePremix: true },
      { rawMaterialId: 'rm-5', amountKgPerHead: 1.0, inConcentratePremix: true },
      { rawMaterialId: 'rm-6', amountKgPerHead: 3.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-7', amountKgPerHead: 1.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-8', amountKgPerHead: 30.0, inConcentratePremix: false },
    ],
  },
  {
    id: 'rat-2',
    name: 'Integrated Beef Fattening Ration (350kg Bull)',
    code: 'RAT-FAT-350',
    calculationType: 'per_head',
    notes: 'Balanced beef finisher: 8.75 kg concentrate + 6 kg silage + 1 kg straw (15.75 kg/head)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 5.25, inConcentratePremix: true },
      { rawMaterialId: 'rm-2', amountKgPerHead: 1.75, inConcentratePremix: true },
      { rawMaterialId: 'rm-4', amountKgPerHead: 1.49, inConcentratePremix: true },
      { rawMaterialId: 'rm-11', amountKgPerHead: 0.26, inConcentratePremix: true },
      { rawMaterialId: 'rm-8', amountKgPerHead: 6.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-7', amountKgPerHead: 1.0, inConcentratePremix: false },
    ],
  },
  {
    id: 'rat-3',
    name: 'Growing Heifers & Dry Cow TMR',
    code: 'RAT-GROW-01',
    calculationType: 'per_head',
    notes: 'Skeletal development & maintenance ration (22.5 kg/head as-fed)',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 3.0, inConcentratePremix: true },
      { rawMaterialId: 'rm-2', amountKgPerHead: 1.5, inConcentratePremix: true },
      { rawMaterialId: 'rm-6', amountKgPerHead: 4.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-7', amountKgPerHead: 2.0, inConcentratePremix: false },
      { rawMaterialId: 'rm-8', amountKgPerHead: 12.0, inConcentratePremix: false },
    ],
  },
  {
    id: 'rat-4',
    name: 'Calf Starter TMR Pellet/Meal Mix',
    code: 'RAT-CALF-01',
    calculationType: 'fixed_tonnage',
    notes: 'Concentrated calf starter formulation per 1 ton (1000 kg) mixer batch',
    ingredients: [
      { rawMaterialId: 'rm-1', amountKgPerHead: 380, inConcentratePremix: true },
      { rawMaterialId: 'rm-2', amountKgPerHead: 260, inConcentratePremix: true },
      { rawMaterialId: 'rm-3', amountKgPerHead: 60, inConcentratePremix: true },
      { rawMaterialId: 'rm-5', amountKgPerHead: 120, inConcentratePremix: true },
      { rawMaterialId: 'rm-6', amountKgPerHead: 120, inConcentratePremix: false },
      { rawMaterialId: 'rm-9', amountKgPerHead: 40, inConcentratePremix: false },
      { rawMaterialId: 'rm-11', amountKgPerHead: 20, inConcentratePremix: true },
    ],
  },
];

export const initialDailyPlanEn: DailyOperationPlan = {
  date: new Date().toISOString().split('T')[0],
  notes: 'Comprehensive daily feeding plan for all categories and barns',
  milkProduction: {
    sessions: [
      { id: 'session-1', name: 'Morning Milking', amountKg: 4650, time: '05:00 AM' },
      { id: 'session-2', name: 'Midday Milking', amountKg: 3800, time: '01:00 PM' },
      { id: 'session-3', name: 'Evening Milking', amountKg: 4150, time: '09:00 PM' },
    ],
    refusalPercent: 4.5,
  },
  batches: [
    {
      id: 'batch-1',
      batchNumber: 'Batch 1 (Dairy)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '06:00 AM',
      targetWeightKg: 3500,
      status: 'تم التوزيع',
      allocations: [
        { barnId: 'barn-1', allocatedKg: 2000, allocatedPercent: 58.3686 },
        { barnId: 'barn-2', allocatedKg: 1500, allocatedPercent: 56.1798 },
      ],
      notes: 'First morning drop - Barn 1 & Barn 2',
    },
    {
      id: 'batch-2',
      batchNumber: 'Batch 2 (Dairy)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '08:30 AM',
      targetWeightKg: 3500,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-3', allocatedKg: 1400, allocatedPercent: 57.7777 },
        { barnId: 'barn-4', allocatedKg: 2100, allocatedPercent: 68.9655 },
      ],
      notes: 'Second morning drop - Barn 3 & Barn 4',
    },
    {
      id: 'batch-3',
      batchNumber: 'Batch 3 (Dairy)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '11:00 AM',
      targetWeightKg: 3500,
      status: 'قيد التحضير',
      allocations: [
        { barnId: 'barn-5', allocatedKg: 2225, allocatedPercent: 100 },
        { barnId: 'barn-4', allocatedKg: 945, allocatedPercent: 31.0345 },
        { barnId: 'barn-1', allocatedKg: 330, allocatedPercent: 9.635 },
      ],
      notes: 'Barn 5 completion & top-up',
    },
    {
      id: 'batch-4',
      batchNumber: 'Batch 4 (Dairy)',
      mixerId: 'mix-1',
      categoryId: 'cat-1',
      time: '02:00 PM',
      targetWeightKg: 3500,
      status: 'قيد التحضير',
      allocations: [
        { barnId: 'barn-2', allocatedKg: 1170, allocatedPercent: 43.8202 },
        { barnId: 'barn-3', allocatedKg: 1025, allocatedPercent: 42.2223 },
        { barnId: 'barn-1', allocatedKg: 1095, allocatedPercent: 31.9964 },
      ],
      notes: 'Afternoon feeding cycle',
    },
    {
      id: 'batch-g1',
      batchNumber: 'Batch 1 (Growing)',
      mixerId: 'mix-2',
      categoryId: 'cat-3',
      time: '07:30 AM',
      targetWeightKg: 2700,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-6', allocatedKg: 900, allocatedPercent: 100 },
        { barnId: 'barn-7', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-8', allocatedKg: 1012.5, allocatedPercent: 100 },
      ],
      notes: 'Full feeding for growing pens (6, 7, 8)',
    },
    {
      id: 'batch-f1',
      batchNumber: 'Batch 1 (Beef)',
      mixerId: 'mix-3',
      categoryId: 'cat-2',
      time: '09:30 AM',
      targetWeightKg: 2520,
      status: 'تم التحضير',
      allocations: [
        { barnId: 'barn-9', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-10', allocatedKg: 787.5, allocatedPercent: 100 },
        { barnId: 'barn-11', allocatedKg: 945.0, allocatedPercent: 100 },
      ],
      notes: 'Full feeding for beef fattening pens (9, 10, 11) - 160 head',
    },
  ],
  useConcentratePremixMode: true,
  premixBagWeightKg: 50,
  concentrateOrders: [
    {
      id: 'conc-ord-1',
      orderNumber: 'Concentrate Batch Order #1 (Dairy)',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat-1',
      rationId: 'rat-1',
      batchWeightKg: 1000,
      bagWeightKg: 50,
      totalBags: 20,
      remainingLooseKg: 0,
      mixerName: 'Main Dry Concentrate Mixer (2 Ton)',
      status: 'Completed & Bagged',
      createdAt: '06:00 AM',
      notes: '1-ton high-yield dairy concentrate batch bagged in twenty 50kg bags',
      ingredients: [
        { rawMaterialId: 'rm-1', name: 'Ground Yellow Corn', code: 'RM001', unit: 'kg', amountKgPerHead: 6.0, percentageInConcentrate: 57.14, requiredKg: 571.4, actualKg: 571.4, costPerKg: 12.5 },
        { rawMaterialId: 'rm-2', name: 'Soybean Meal 46%', code: 'RM002', unit: 'kg', amountKgPerHead: 2.5, percentageInConcentrate: 23.81, requiredKg: 238.1, actualKg: 238.1, costPerKg: 24.0 },
        { rawMaterialId: 'rm-3', name: 'Full-Fat Extruded Soy', code: 'RM003', unit: 'kg', amountKgPerHead: 1.0, percentageInConcentrate: 9.52, requiredKg: 95.2, actualKg: 95.2, costPerKg: 26.5 },
        { rawMaterialId: 'rm-5', name: 'Corn Gluten Feed', code: 'RM005', unit: 'kg', amountKgPerHead: 1.0, percentageInConcentrate: 9.52, requiredKg: 95.3, actualKg: 95.3, costPerKg: 15.0 },
      ],
      totalCost: 16800,
      costPerBag: 840,
    },
    {
      id: 'conc-ord-2',
      orderNumber: 'Concentrate Batch Order #2 (Beef 350kg)',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'cat-2',
      rationId: 'rat-2',
      batchWeightKg: 1000,
      bagWeightKg: 50,
      totalBags: 20,
      remainingLooseKg: 0,
      mixerName: 'Main Dry Concentrate Mixer (2 Ton)',
      status: 'Completed & Bagged',
      createdAt: '07:30 AM',
      notes: '1-ton beef concentrate (60% corn, 20% soy, 17% bran, 3% premix) bagged in 20 bags',
      ingredients: [
        { rawMaterialId: 'rm-1', name: 'Ground Yellow Corn', code: 'RM001', unit: 'kg', amountKgPerHead: 5.25, percentageInConcentrate: 60.0, requiredKg: 600.0, actualKg: 600.0, costPerKg: 12.5 },
        { rawMaterialId: 'rm-2', name: 'Soybean Meal 46%', code: 'RM002', unit: 'kg', amountKgPerHead: 1.75, percentageInConcentrate: 20.0, requiredKg: 200.0, actualKg: 200.0, costPerKg: 24.0 },
        { rawMaterialId: 'rm-4', name: 'Corn DDGS', code: 'RM004', unit: 'kg', amountKgPerHead: 1.49, percentageInConcentrate: 17.0, requiredKg: 170.0, actualKg: 170.0, costPerKg: 11.5 },
        { rawMaterialId: 'rm-11', name: 'Mineral & Vitamin Premix', code: 'RM011', unit: 'kg', amountKgPerHead: 0.26, percentageInConcentrate: 3.0, requiredKg: 30.0, actualKg: 30.0, costPerKg: 45.0 },
      ],
      totalCost: 15605,
      costPerBag: 780.25,
    },
  ],
};

export const initialSettingsEn: FarmSettings = {
  farmName: 'Prime Livestock & Cattle Feedlot',
  engineerName: 'Eng. Ahmed Abdelaziz',
  warehouseManagerName: 'Mahmoud Hassan',
  driverName: 'Mixer Fleet Operators (Mohamed)',
  currency: 'USD',
  language: 'en',
  hasConcentrateMixer: true,
  defaultBagWeightKg: 50,
  defaultMilkPricePerKg: 0.65,
  defaultMeatPricePerKg: 4.5,
};

export function getInitialDemoData(lang: 'ar' | 'en' = 'ar') {
  if (lang === 'en') {
    return {
      rawMaterials: initialRawMaterialsEn,
      mixers: initialMixersEn,
      categories: initialCategoriesEn,
      barns: initialBarnsEn,
      rations: initialRationsEn,
      dailyPlan: initialDailyPlanEn,
      settings: initialSettingsEn,
    };
  }
  return {
    rawMaterials: initialRawMaterials,
    mixers: initialMixers,
    categories: initialCategories,
    barns: initialBarns,
    rations: initialRations,
    dailyPlan: initialDailyPlan,
    settings: initialSettings,
  };
}
