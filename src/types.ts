export type RawMaterialStatus = 'نشطة' | 'غير نشطة';

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  unit: string; // e.g. "كجم", "طن", "جرام"
  price?: number; // optional price per kg
  status: RawMaterialStatus;
  notes?: string;
  currentStockKg?: number; // Current stock in warehouse in kg
  minStockKg?: number; // Safe minimum stock threshold
}

export interface RationIngredient {
  rawMaterialId: string;
  amountKgPerHead: number; // e.g., 5.0 kg/head/day
}

export interface Ration {
  id: string;
  name: string;
  code?: string;
  notes?: string;
  ingredients: RationIngredient[]; // List of ingredients with kg/head/day
}

export interface AnimalCategory {
  id: string;
  name: string; // e.g., "حلاب", "نامي", "تسمين", "جاف", "عجلات", "عجول", "انتظار ولادة"
  rationId: string; // Attached ration
  mixerId: string; // Attached mixer
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
  status: 'نشط' | 'صيانة' | 'فارغ';
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
  rationId?: string;
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
  refusalPercent: number; // نسبة الراجع من الحلاب % (e.g., 5%)
  milkingHeadCount?: number; // عدد أبقار الحلاب (اختياري للتعديل اليدوي، أو يُحسب تلقائياً)
  notes?: string;
}

export interface DailyOperationPlan {
  date: string; // YYYY-MM-DD
  batches: MixBatch[];
  dailyBarnStates?: Record<string, DailyBarnState>; // barnId -> snapshot state for date
  milkProduction?: MilkProductionData;
  notes?: string;
}

export interface FarmSettings {
  farmName: string;
  engineerName: string;
  warehouseManagerName: string;
  driverName: string;
  currency: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'daily_plan'
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
  | 'settings';
