import {
  Barn,
  Ration,
  MixBatch,
  DailyOperationPlan,
  AnimalCategory,
  RawMaterial,
  DailyBarnState,
} from '../types';

/**
 * Gets the date-specific operational state for a barn (headCount, feedingRatioPercent, display numbers).
 * Falls back to master Barn record if not explicitly customized for the specified plan date.
 */
export function getBarnDailyState(
  barn: Barn,
  dailyPlan?: DailyOperationPlan
): DailyBarnState {
  if (!barn) {
    return {
      barnId: '',
      headCount: 0,
      feedingRatioPercent: 100,
    };
  }
  const savedState = dailyPlan?.dailyBarnStates?.[barn.id];
  return {
    barnId: barn.id,
    headCount: savedState?.headCount ?? barn.headCount ?? 0,
    feedingRatioPercent: savedState?.feedingRatioPercent ?? barn.feedingRatioPercent ?? 100,
    rationId: savedState?.rationId || barn.rationId,
    displayNumber: savedState?.displayNumber || barn.number,
    displayName: savedState?.displayName || barn.name,
  };
}

/**
 * Resolves the assigned Ration for a given barn.
 * Order of precedence:
 * 1. Date snapshot override rationId
 * 2. Direct barn.rationId if set
 * 3. Category's default rationId
 */
export function getBarnRation(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): Ration | undefined {
  if (!barn) return undefined;
  const state = getBarnDailyState(barn, dailyPlan);
  if (state.rationId) {
    const direct = rations.find((r) => r.id === state.rationId);
    if (direct) return direct;
  }
  const category = categories.find((c) => c.id === barn.categoryId);
  if (category?.rationId) {
    return rations.find((r) => r.id === category.rationId);
  }
  return undefined;
}

/**
 * Calculates the total ration weight in kg per head per day:
 * Sum of all ingredient kg per head.
 * Absolute rule: No fixed constants.
 */
export function calculateRationTotalKgPerHead(ration?: Ration): number {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0) return 0;
  return ration.ingredients.reduce((sum, item) => sum + (Number(item.amountKgPerHead) || 0), 0);
}

/**
 * Calculates the total daily feed demand in KG for a single barn:
 * Source of daily feed amount per head = (TotalRationKgPerHead) * (FeedingRatioPercent / 100)
 * Demand = HeadCount * (TotalRationKgPerHead * (FeedingRatioPercent / 100))
 */
export function calculateBarnDailyDemand(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn || barn.status === 'فارغ') return 0;
  const state = getBarnDailyState(barn, dailyPlan);
  if (state.headCount <= 0) return 0;

  const ration = getBarnRation(barn, categories, rations, dailyPlan);
  const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
  if (totalRationKgPerHead <= 0) return 0;

  const ratio = (state.feedingRatioPercent || 100) / 100;
  const actualFeedPerHead = totalRationKgPerHead * ratio;
  return Math.round(state.headCount * actualFeedPerHead * 100) / 100;
}

/**
 * Calculates total daily feed demand in KG for a category across all its active barns.
 */
export function calculateCategoryTotalDemand(
  barns: Barn[],
  categoryId: string,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  return barns
    .filter((b) => b.categoryId === categoryId && b.status === 'نشط')
    .reduce((sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan), 0);
}

export interface CalculatedBatchIngredient {
  rawMaterialId: string;
  code?: string;
  name: string;
  unit: string;
  pricePerKg?: number;
  amountKgPerHead: number; // original ration kg/head
  requiredKg: number; // calculated for this batch
  actualKg?: number; // actual weight entered by mixer operator
  diffKg?: number; // actual - required
}

/**
 * Proportional calculation of ingredients for a mixer batch/run of a specific weight.
 * Ingredient Required Weight = (Ingredient kg/head / Total Ration kg/head) * Batch Target Weight
 */
export function calculateBatchIngredients(
  batchTargetWeightKg: number,
  ration: Ration | undefined,
  rawMaterials: RawMaterial[],
  actualWeights?: Record<string, number>
): CalculatedBatchIngredient[] {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0 || batchTargetWeightKg <= 0) {
    return [];
  }

  const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
  if (totalRationKgPerHead <= 0) return [];

  return ration.ingredients.map((ing) => {
    const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
    const proportion = ing.amountKgPerHead / totalRationKgPerHead;
    const requiredKg = Math.round(proportion * batchTargetWeightKg * 100) / 100;
    const actualKg = actualWeights?.[ing.rawMaterialId] !== undefined
      ? actualWeights[ing.rawMaterialId]
      : requiredKg;
    const diffKg = Math.round((actualKg - requiredKg) * 100) / 100;

    return {
      rawMaterialId: ing.rawMaterialId,
      code: rawMat?.code || 'RM',
      name: rawMat?.name || 'خامة غير معرّفة',
      unit: rawMat?.unit || 'كجم',
      pricePerKg: rawMat?.price || 0,
      amountKgPerHead: ing.amountKgPerHead,
      requiredKg,
      actualKg,
      diffKg,
    };
  });
}

/**
 * Sums up allocated KG for all barns in a single mixer batch.
 */
export function calculateBatchAllocatedKg(batch: MixBatch): number {
  if (!batch || !batch.allocations) return 0;
  return batch.allocations.reduce((sum, item) => sum + (Number(item.allocatedKg) || 0), 0);
}

/**
 * Calculates total allocated KG to a specific barn across ALL batches in today's daily plan.
 */
export function calculateBarnTotalAllocatedKgToday(barnId: string, dailyPlan: DailyOperationPlan): number {
  if (!dailyPlan || !dailyPlan.batches) return 0;
  let total = 0;
  dailyPlan.batches.forEach((batch) => {
    if (batch.allocations) {
      const barnAlloc = batch.allocations.find((a) => a.barnId === barnId);
      if (barnAlloc) {
        total += Number(barnAlloc.allocatedKg) || 0;
      }
    }
  });
  return Math.round(total * 100) / 100;
}

export interface BatchValidationResult {
  allocatedKg: number;
  targetWeightKg: number;
  differenceKg: number;
  status: 'exact' | 'under' | 'over';
  message: string;
  exceedsMixerCapacity: boolean;
  mixerCapacityOverKg: number;
}

/**
 * Validates batch allocation against target batch weight and mixer capacity.
 */
export function validateBatch(batch: MixBatch, maxCapacityKg?: number): BatchValidationResult {
  const allocatedKg = calculateBatchAllocatedKg(batch);
  const targetWeightKg = batch.targetWeightKg || 0;
  const diff = allocatedKg - targetWeightKg;

  let status: 'exact' | 'under' | 'over' = 'exact';
  let message = 'تم توزيع اللفة بالكامل';

  if (Math.abs(diff) <= 0.01) {
    status = 'exact';
    message = 'تم توزيع اللفة بالكامل (100%)';
  } else if (diff < 0) {
    status = 'under';
    message = `متبقي ${Math.abs(diff)} كجم من اللفة لم يتم توزيعه بعد`;
  } else {
    status = 'over';
    message = `خطأ: التوزيع يتجاوز وزن اللفة بـ ${diff} كجم`;
  }

  const exceedsMixerCapacity = Boolean(maxCapacityKg && targetWeightKg > maxCapacityKg);
  const mixerCapacityOverKg = exceedsMixerCapacity ? targetWeightKg - (maxCapacityKg || 0) : 0;

  return {
    allocatedKg,
    targetWeightKg,
    differenceKg: Math.round(diff * 100) / 100,
    status,
    message,
    exceedsMixerCapacity,
    mixerCapacityOverKg,
  };
}

export interface BarnDemandValidationResult {
  dailyDemandKg: number;
  totalAllocatedKg: number;
  differenceKg: number;
  status: 'exact' | 'under' | 'over';
  message: string;
  percentageFulfilled: number;
}

/**
 * Validates barn allocations today against the barn's required daily feed demand.
 */
export function validateBarnDemand(
  barn: Barn,
  totalAllocatedKgToday: number,
  categories: AnimalCategory[] = [],
  rations: Ration[] = []
): BarnDemandValidationResult {
  const dailyDemandKg = calculateBarnDailyDemand(barn, categories, rations);
  const diff = totalAllocatedKgToday - dailyDemandKg;
  const percentageFulfilled = dailyDemandKg > 0 ? Math.round((totalAllocatedKgToday / dailyDemandKg) * 100) : 0;

  let status: 'exact' | 'under' | 'over' = 'exact';
  let message = 'تم استكمال احتياج العنبر بالكامل';

  if (Math.abs(diff) <= 0.01) {
    status = 'exact';
    message = 'تم استكمال احتياج العنبر بالكامل';
  } else if (diff < 0) {
    status = 'under';
    message = `متبقي ${Math.abs(diff)} كجم لم يتم توزيعه للعنبر`;
  } else {
    status = 'over';
    message = `تحذير: تم تجاوز احتياج العنبر بـ ${diff} كجم`;
  }

  return {
    dailyDemandKg,
    totalAllocatedKg: totalAllocatedKgToday,
    differenceKg: Math.round(diff * 100) / 100,
    status,
    message,
    percentageFulfilled,
  };
}

export interface DailyWarehouseRequirementItem {
  rawMaterialId: string;
  code: string;
  name: string;
  unit: string;
  pricePerKg?: number;
  totalRequiredKgToday: number;
  totalCostToday: number;
}

/**
 * Aggregates required raw material quantities across all batches planned for a given day.
 */
export function calculateDailyWarehouseRequirements(
  dailyPlan: DailyOperationPlan,
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[]
): DailyWarehouseRequirementItem[] {
  const totalsMap: Record<string, number> = {};

  if (!dailyPlan || !dailyPlan.batches) return [];

  dailyPlan.batches.forEach((batch) => {
    // Find category & ration
    const cat = categories.find((c) => c.id === batch.categoryId);
    const ration = rations.find((r) => r.id === cat?.rationId);
    if (ration && batch.targetWeightKg > 0) {
      const calculated = calculateBatchIngredients(batch.targetWeightKg, ration, rawMaterials);
      calculated.forEach((item) => {
        totalsMap[item.rawMaterialId] = (totalsMap[item.rawMaterialId] || 0) + item.requiredKg;
      });
    }
  });

  return rawMaterials.map((rm) => {
    const totalRequiredKgToday = Math.round((totalsMap[rm.id] || 0) * 100) / 100;
    const totalCostToday = Math.round(totalRequiredKgToday * (rm.price || 0) * 100) / 100;
    return {
      rawMaterialId: rm.id,
      code: rm.code,
      name: rm.name,
      unit: rm.unit,
      pricePerKg: rm.price,
      totalRequiredKgToday,
      totalCostToday,
    };
  }).filter((item) => item.totalRequiredKgToday > 0 || item.pricePerKg);
}
