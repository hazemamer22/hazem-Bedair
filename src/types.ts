export type RawMaterialStatus = 'نشطة' | 'غير نشطة';
export type RawMaterialType = 'concentrate' | 'roughage' | 'mineral' | 'liquid';

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  unit: string; // e.g. "كجم", "طن", "جرام"
  materialType?: RawMaterialType; // نوع الخامة (مركز جاف، مادة خشنة/رطبة، أملاح وإضافات، سائل)
  price?: number; // optional price per kg
  dryMatterPercent?: number; // نسبة المادة الجافة % (مثال: 88% للذرة، 33% للسيلاج)
  status: RawMaterialStatus;
  notes?: string;
  currentStockKg?: number; // Current stock in warehouse in kg
  minStockKg?: number; // Safe minimum stock threshold
}

export interface RationIngredient {
  rawMaterialId: string;
  amountKgPerHead: number; // e.g., 5.0 kg/head/day
  inConcentratePremix?: boolean; // هل تدخل الخامة في خلاطة المركز المسبق وتعبأ في شكاير؟ (true: بالخلاطة والشكاير، false: تحميل مباشر بمكسر TMR)
}

export interface Ration {
  id: string;
  name: string;
  code?: string;
  calculationType?: 'per_head' | 'fixed_tonnage'; // 'per_head' (كجم/رأس) or 'fixed_tonnage' (تركيبة بالطن 1000 كجم)
  notes?: string;
  ingredients: RationIngredient[]; // List of ingredients with kg/head/day or kg/ton
}

export interface AnimalCategory {
  id: string;
  name: string; // e.g., "حلاب", "نامي", "تسمين", "جاف", "عجلات", "عجول", "انتظار ولادة", "رضيع وفطام"
  rationId: string; // Attached ration
  mixerId: string; // Attached mixer
  calculationType?: 'per_head' | 'fixed_tonnage'; // نوع حساب الفئة
  isPeriodicMixer?: boolean; // هل المكسر يعمل بشكل دوري (يوم ويوم / عند الطلب)
  defaultTonnageKg?: number; // الوزن المعتاد للخلطة (مثلاً 1000 أو 2000 كجم)
  notes?: string;
}

export interface Barn {
  id: string;
  number: string; // e.g., "عنبر 1"
  name?: string; // e.g., "عنبر الحلاب الرئيسي"
  categoryId: string; // Attached Animal Category
  rationId?: string; // Optional direct Ration override
  headCount: number; // e.g., 70
  baseFeedKgPerHead: number; // e.g., 50 kg/head/day
  feedingRatioPercent: number; // e.g., 110 (%)
  averageAgeDays?: number; // متوسط العمر بالأيام (للرواضع والفطام، مثلاً 30 أو 70 يوم)
  averageWeightKg?: number; // متوسط وزن الرأس بالكيلو (مثلاً 50 أو 90 كجم)
  customDailyTotalKg?: number; // تقدير يدوي مباشر لكمية العنبر بالكامل (كجم)
  refusalType?: 'percent' | 'kg'; // نوع الراجع (نسبة % أو وزن بالكيلو)
  refusalValue?: number; // قيمة الراجع للعنبر (مثال 5% أو 150 كجم)
  recycledRefusalAllocatedKg?: number; // كمية راجع الحلاب المحولة والمخصصة لهذا العنبر
  status: 'نشط' | 'صيانة' | 'فارغ';
  orderIndex?: number; // ترتيب ظهور العنبر في القوائم والشاشات
  notes?: string;
}

export interface Mixer {
  id: string;
  name: string; // e.g., "مكسر الحلاب (TMR 1)"
  categoryId: string; // Primary category served
  maxCapacityKg: number; // Max capacity in kg, e.g. 3000
  notes?: string;
}

export interface BarnAllocation {
  barnId: string;
  allocatedKg: number; // Allocated weight for this barn in this batch
  allocatedPercent?: number; // Percentage of barn's total daily demand
}

export interface ActualIngredientWeight {
  rawMaterialId: string;
  actualKg: number;
}

export interface MixBatch {
  id: string;
  batchNumber: string; // e.g., "لفة 1"
  mixerId: string;
  categoryId: string;
  rationId?: string; // Single ration associated with this batch
  time: string; // e.g., "06:00 ص"
  targetWeightKg: number; // Planned weight for this batch (الوزن المخطط)
  status: 'مخططة' | 'قيد التحضير' | 'تم التحضير' | 'تم التوزيع';
  allocations: BarnAllocation[]; // Distribution to barns
  passingOrder?: number; // Order of passing for driver
  actualIngredientWeights?: Record<string, number>; // rawMaterialId -> actualKg loaded
  notes?: string;
}

export interface DailyBarnState {
  barnId: string;
  headCount: number;
  feedingRatioPercent: number;
  baseFeedKgPerHead?: number;
  averageAgeDays?: number;
  averageWeightKg?: number;
  customDailyTotalKg?: number;
  rationId?: string;
  refusalType?: 'percent' | 'kg';
  refusalValue?: number;
  recycledRefusalAllocatedKg?: number; // كمية راجع الحلاب المحولة والمخصصة للعنبر في هذا اليوم
  displayNumber?: string;
  displayName?: string;
}

export interface MilkSession {
  id: string;
  name: string; // e.g., "الحلبة الأولى (صباحية)", "الحلبة الثانية (مسائية)", "الحلبة الثالثة"
  amountKg: number; // in kg / Liters
  time?: string;
}

export interface MilkProductionData {
  sessions: MilkSession[];
  refusalPercent: number; // نسبة الراجع الإجمالية للحلاب % (e.g., 5%)
  milkPricePerKg?: number; // سعر بيع كيلو اللبن (e.g., 20 EGP)
  milkingHeadCount?: number; // عدد أبقار الحلاب (اختياري للتعديل اليدوي، أو يُحسب تلقائياً)
  notes?: string;
}

export interface WarehouseTransaction {
  id: string;
  rawMaterialId: string;
  date: string; // YYYY-MM-DD
  type: 'INCOMING' | 'WASTE' | 'ADJUSTMENT';
  quantityKg: number;
  supplierName?: string;
  invoiceNumber?: string;
  vehicleNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface DailyWarehouseItemState {
  rawMaterialId: string;
  openingStockKg?: number; // Manual override for opening stock if needed
  incomingKg?: number; // Total incoming on this day
  manualIssuedKg?: number; // Actual issued if different from calculated requirements
  wasteKg?: number; // Loss/spoilage on this day
  notes?: string;
}

export interface PeriodicBatchCategoryConfig {
  isMixedToday: boolean;
  targetWeightKg: number;
  durationDays?: number;
  batchMode?: 'by_weight' | 'by_duration';
  notes?: string;
}

export interface ConcentrateIngredientItem {
  rawMaterialId: string;
  name?: string;
  code?: string;
  unit?: string;
  amountKgPerHead?: number;
  percentageInConcentrate: number; // نسبة الخامة من إجمالي المركز %
  requiredKg: number; // الوزن المطلوب للدفعة كجم
  actualKg?: number; // الوزن الفعلي المحمل كجم
  costPerKg?: number;
}

export interface ConcentratePremixOrder {
  id: string;
  orderNumber: string; // e.g. "أمر خلط مركز #1"
  date: string; // YYYY-MM-DD
  categoryId: string; // Target category (e.g., 'cat-1' حلاب, 'cat-2' تسمين)
  rationId: string; // Attached ration
  batchWeightKg: number; // e.g., 500 (نصف طن), 1000 (1 طن), 2000 (2 طن)
  bagWeightKg: number; // e.g., 50 kg
  totalBags: number; // Math.floor(batchWeightKg / bagWeightKg)
  remainingLooseKg: number; // batchWeightKg % bagWeightKg
  ingredients: ConcentrateIngredientItem[];
  status: 'مكتمل ومعبأ' | 'قيد الخلط والتعبئة' | 'Completed & Bagged' | 'Mixing & Bagging in Progress';
  mixerName?: string;
  totalCost?: number;
  costPerBag?: number;
  createdAt: string;
  notes?: string;
}

export interface ConcentrateBagStock {
  categoryId: string;
  categoryName: string;
  bagWeightKg: number;
  totalBagsInStock: number;
  looseKgInStock: number;
  totalKgInStock: number;
}

export interface DailyOperationPlan {
  date: string; // YYYY-MM-DD
  batches: MixBatch[];
  dailyBarnStates?: Record<string, DailyBarnState>; // barnId -> snapshot state for date
  milkProduction?: MilkProductionData;
  periodicBatchConfigs?: Record<string, PeriodicBatchCategoryConfig>; // categoryId -> periodic batch configuration
  warehouseState?: Record<string, DailyWarehouseItemState>; // rawMaterialId -> daily state
  warehouseTransactions?: WarehouseTransaction[];
  fatteningAdgKg?: number; // معدل الزيادة اليومية المتوقعة للتسمين كجم/رأس/يوم (مثال: 1.5)
  fatteningMeatPricePerKg?: number; // سعر بيع كيلو اللحم القائم للتسمين (مثال: 175 ج.م)
  concentrateOrders?: ConcentratePremixOrder[]; // أوامر تشغيل خلاطة المركز وتعبئة الشكاير
  useConcentratePremixMode?: boolean; // تفعيل نمط الشكاير والمركز المسبق في أوامر تحضير المكسر
  premixBagWeightKg?: number; // وزن الشكارة المعتمد (افتراضياً 50 كجم)
  isClosed?: boolean; // هل تم إغلاق وترحيل اليوم
  closedAt?: string;
  notes?: string;
}

export type AppLanguage = 'ar' | 'en';

export type AutoBackupFrequency = 'daily' | 'every_12_hours' | 'weekly';

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: AutoBackupFrequency;
  maxSnapshots?: number;
  lastBackupTimestamp?: string;
  autoDownloadFile?: boolean;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  dateFormatted: string;
  label?: string;
  dataSizeKb: number;
  summary: {
    barnsCount: number;
    rawMaterialsCount: number;
    rationsCount: number;
    categoriesCount: number;
    mixersCount: number;
  };
  data: Record<string, any>;
}

export interface FarmSettings {
  farmName: string;
  engineerName: string;
  warehouseManagerName: string;
  driverName: string;
  currency: string;
  language?: AppLanguage;
  hasConcentrateMixer?: boolean; // هل يوجد خلاطة مركز وتعبئة شكاير بالمزرعة؟ (true: مفعل، false: ملغي والخلط مباشر فقط)
  defaultBagWeightKg?: number; // وزن الشكارة الافتراضي (مثال: 50 كجم، 25 كجم...)
  defaultMilkPricePerKg?: number; // سعر كيلو الحليب الافتراضي
  defaultMeatPricePerKg?: number; // سعر كيلو اللحم القائم الافتراضي للتسمين
  autoBackup?: AutoBackupConfig;
}

export type ActiveTab =
  | 'dashboard'
  | 'daily_plan'
  | 'farm_economics'
  | 'concentrate_premix'
  | 'distributions'
  | 'prep_orders'
  | 'driver_sheet'
  | 'warehouse'
  | 'reports'
  | 'history'
  | 'raw_materials'
  | 'rations'
  | 'categories'
  | 'barns'
  | 'mixers'
  | 'settings'
  | 'developer_contact';
