import {
  Barn,
  Ration,
  RationIngredient,
  MixBatch,
  DailyOperationPlan,
  AnimalCategory,
  RawMaterial,
  DailyBarnState,
  MilkProductionData,
  ConcentrateIngredientItem,
  ConcentratePremixOrder,
  ConcentrateBagStock,
  FarmSettings,
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
      refusalType: 'percent',
      refusalValue: 0,
    };
  }
  const savedState = dailyPlan?.dailyBarnStates?.[barn.id];
  return {
    barnId: barn.id,
    headCount: savedState?.headCount ?? barn.headCount ?? 0,
    feedingRatioPercent: savedState?.feedingRatioPercent ?? barn.feedingRatioPercent ?? 100,
    baseFeedKgPerHead: savedState?.baseFeedKgPerHead !== undefined ? savedState.baseFeedKgPerHead : barn.baseFeedKgPerHead,
    averageAgeDays: savedState?.averageAgeDays !== undefined ? savedState.averageAgeDays : barn.averageAgeDays,
    averageWeightKg: savedState?.averageWeightKg !== undefined ? savedState.averageWeightKg : barn.averageWeightKg,
    customDailyTotalKg: savedState?.customDailyTotalKg !== undefined ? savedState.customDailyTotalKg : barn.customDailyTotalKg,
    rationId: savedState?.rationId || barn.rationId,
    refusalType: savedState?.refusalType ?? barn.refusalType ?? 'percent',
    refusalValue: savedState?.refusalValue !== undefined ? savedState.refusalValue : (barn.refusalValue ?? 0),
    recycledRefusalAllocatedKg:
      savedState?.recycledRefusalAllocatedKg !== undefined
        ? savedState.recycledRefusalAllocatedKg
        : (barn.recycledRefusalAllocatedKg ?? 0),
    displayNumber: savedState?.displayNumber || barn.number,
    displayName: savedState?.displayName || barn.name,
  };
}

/**
 * Estimates starter dry feed intake (kg/head/day) for calves/weaners based on age and weight.
 * - Under 30 days: ~0.4 - 0.7 kg/head/day
 * - 30 - 60 days: ~0.8 - 1.8 kg/head/day
 * - 60 - 90 days: ~2.0 - 3.2 kg/head/day
 * - If weight is provided: roughly 2.2% - 2.5% of body weight as dry starter feed.
 */
export function estimateCalfStarterIntakeKgPerHead(ageDays?: number, weightKg?: number): number {
  if (weightKg && weightKg > 0) {
    // 2.3% of body weight
    const intakeByWeight = Math.round(weightKg * 0.023 * 100) / 100;
    return Math.max(0.3, intakeByWeight);
  }
  if (ageDays && ageDays > 0) {
    if (ageDays <= 20) return 0.4;
    if (ageDays <= 35) return 0.7;
    if (ageDays <= 50) return 1.2;
    if (ageDays <= 65) return 1.8;
    if (ageDays <= 80) return 2.5;
    return Math.min(4.0, Math.round((2.5 + (ageDays - 80) * 0.04) * 100) / 100);
  }
  return 1.5; // Standard default for calf starter
}

/**
 * Resolves the effective base feed kg per head for a barn.
 * If category is calf/weaner or fixed tonnage:
 * - If manual/custom baseFeedKgPerHead is explicitly set, use it.
 * - Or compute from age/weight if set.
 * - Otherwise for standard categories, reads the total ration weight.
 */
export function getBarnEffectiveBaseFeedPerHead(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn) return 0;
  const state = getBarnDailyState(barn, dailyPlan);
  const category = categories.find((c) => c.id === barn.categoryId);
  const catName = (category?.name || '').toLowerCase();
  const isCalfOrFixed =
    category?.calculationType === 'fixed_tonnage' ||
    category?.isPeriodicMixer ||
    catName.includes('رضيع') ||
    catName.includes('فطام') ||
    catName.includes('calf');

  if (isCalfOrFixed) {
    if (state.baseFeedKgPerHead && state.baseFeedKgPerHead > 0 && state.baseFeedKgPerHead < 50) {
      return state.baseFeedKgPerHead;
    }
    if (state.averageAgeDays || state.averageWeightKg) {
      return estimateCalfStarterIntakeKgPerHead(state.averageAgeDays, state.averageWeightKg);
    }
    return state.baseFeedKgPerHead && state.baseFeedKgPerHead < 20 ? state.baseFeedKgPerHead : 1.5;
  }

  // Normal categories: derive from attached ration
  const ration = getBarnRation(barn, categories, rations, dailyPlan);
  const rationTotal = calculateRationTotalKgPerHead(ration);
  if (rationTotal > 0) return rationTotal;

  return state.baseFeedKgPerHead || barn.baseFeedKgPerHead || 0;
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
 * Calculates the gross total daily feed demand in KG for a single barn (before deducting recycled refusal):
 * - If user explicitly specified customDailyTotalKg > 0 for this barn: uses it directly.
 * - Otherwise: Gross Demand = HeadCount * (EffectiveBaseFeedPerHead * (FeedingRatioPercent / 100))
 */
export function calculateBarnGrossDemandKg(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn || barn.status === 'فارغ') return 0;
  const state = getBarnDailyState(barn, dailyPlan);

  // If user entered a direct visual total estimate for the whole barn (e.g. 100 kg by eye)
  if (state.customDailyTotalKg !== undefined && state.customDailyTotalKg > 0) {
    const ratio = (state.feedingRatioPercent || 100) / 100;
    return Math.round(state.customDailyTotalKg * ratio * 100) / 100;
  }

  if (state.headCount <= 0) return 0;

  const basePerHead = getBarnEffectiveBaseFeedPerHead(barn, categories, rations, dailyPlan);
  if (basePerHead <= 0) return 0;

  const ratio = (state.feedingRatioPercent || 100) / 100;
  const actualFeedPerHead = basePerHead * ratio;
  return Math.round(state.headCount * actualFeedPerHead * 100) / 100;
}

/**
 * Gets the amount of recycled refusal allocated to a specific barn for the current day.
 */
export function calculateBarnRecycledRefusalKg(
  barn: Barn,
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn) return 0;
  const state = getBarnDailyState(barn, dailyPlan);
  return Math.max(0, Number(state.recycledRefusalAllocatedKg || barn.recycledRefusalAllocatedKg || 0));
}

/**
 * Calculates the net fresh feed demand in KG for a single barn:
 * If recycled refusal is allocated (e.g. for growing cattle):
 * Net Fresh Demand = Max(0, Gross Demand - Recycled Refusal Allocated)
 * Otherwise: Net Fresh Demand = Gross Demand
 */
export function calculateBarnDailyDemand(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  const grossDemand = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
  if (grossDemand <= 0) return 0;

  const recycledRefusal = calculateBarnRecycledRefusalKg(barn, dailyPlan);
  const netFresh = Math.max(0, grossDemand - recycledRefusal);
  return Math.round(netFresh * 100) / 100;
}

/**
 * Calculates total daily fresh feed demand in KG for all active barns in a specific animal category.
 */
export function calculateCategoryDailyDemandKg(
  categoryId: string,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  const catBarns = barns.filter((b) => b.categoryId === categoryId && b.status === 'نشط');
  const total = catBarns.reduce((sum, b) => {
    return sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Calculates the number of days a mixer batch of weight (batchWeightKg) will cover
 * for a category with daily consumption (dailyDemandKg).
 * e.g. 1000 kg batch / 200 kg daily = 5.0 days.
 */
export function calculatePeriodicCoverageDays(
  batchWeightKg: number,
  dailyDemandKg: number
): number {
  if (dailyDemandKg <= 0 || batchWeightKg <= 0) return 0;
  return Math.round((batchWeightKg / dailyDemandKg) * 10) / 10;
}

/**
 * Calculates the required mixer batch weight in KG to cover a given number of days.
 * e.g. 5 days * 200 kg daily = 1000 kg (1 ton).
 */
export function calculatePeriodicBatchWeightFromDays(
  durationDays: number,
  dailyDemandKg: number
): number {
  if (durationDays <= 0 || dailyDemandKg <= 0) return 0;
  return Math.round(durationDays * dailyDemandKg);
}

export interface RefusalRecyclingPoolStats {
  totalMilkingRefusalKg: number; // إجمالي راجع عنابر الحلاب المتاح اليوم
  totalAllocatedRecycledKg: number; // إجمالي الراجع الموزع والمحول لعنابر النامي والتسمين
  recycledToGrowingKg: number; // المحول لقطيع النامي
  recycledToFatteningKg: number; // المحول لقطيع التسمين
  recycledToOtherKg: number; // المحول لعنابر أو فئات أخرى
  remainingRefusalPoolKg: number; // المتبقي من الراجع غير الموزع
  utilizationPercent: number; // نسبة استغلال وتدوير الراجع %
  recycledByCategoryKg?: Record<string, number>; // تفصيل الراجع المحول لكل فئة حيوانية
}

/**
 * Calculates the available milking refusal pool and recycling allocations across all barns.
 */
export function calculateAvailableMilkingRefusalPool(
  barns: Barn[],
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): RefusalRecyclingPoolStats {
  const activeBarns = barns.filter((b) => b.status === 'نشط');

  // Milking barns
  const milkingBarns = activeBarns.filter((barn) => {
    const cat = categories.find((c) => c.id === barn.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (barn.name || '').toLowerCase();
    return (
      catName.includes('حلاب') ||
      catName.includes('حليب') ||
      catName.includes('milk') ||
      barnName.includes('حلاب') ||
      barnName.includes('حليب')
    );
  });

  const totalMilkingRefusalKg = milkingBarns.reduce((sum, b) => {
    return sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan);
  }, 0);

  // Recycled refusal allocated to specific categories
  let recycledToGrowingKg = 0;
  let recycledToFatteningKg = 0;
  let recycledToOtherKg = 0;
  const recycledByCategoryKg: Record<string, number> = {};

  activeBarns.forEach((b) => {
    const allocated = calculateBarnRecycledRefusalKg(b, dailyPlan);
    if (allocated <= 0) return;

    if (b.categoryId) {
      recycledByCategoryKg[b.categoryId] = Math.round(((recycledByCategoryKg[b.categoryId] || 0) + allocated) * 10) / 10;
    }

    const cat = categories.find((c) => c.id === b.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (b.name || '').toLowerCase();

    if (catName.includes('نامي') || barnName.includes('نامي') || catName.includes('growing')) {
      recycledToGrowingKg += allocated;
    } else if (catName.includes('تسمين') || barnName.includes('تسمين') || catName.includes('fattening')) {
      recycledToFatteningKg += allocated;
    } else {
      recycledToOtherKg += allocated;
    }
  });

  const totalAllocatedRecycledKg = Math.round((recycledToGrowingKg + recycledToFatteningKg + recycledToOtherKg) * 100) / 100;
  const remainingRefusalPoolKg = Math.max(0, Math.round((totalMilkingRefusalKg - totalAllocatedRecycledKg) * 100) / 100);
  const utilizationPercent = totalMilkingRefusalKg > 0
    ? Math.min(100, Math.round(((totalAllocatedRecycledKg / totalMilkingRefusalKg) * 100) * 10) / 10)
    : 0;

  return {
    totalMilkingRefusalKg: Math.round(totalMilkingRefusalKg * 100) / 100,
    totalAllocatedRecycledKg,
    recycledToGrowingKg: Math.round(recycledToGrowingKg * 100) / 100,
    recycledToFatteningKg: Math.round(recycledToFatteningKg * 100) / 100,
    recycledToOtherKg: Math.round(recycledToOtherKg * 100) / 100,
    remainingRefusalPoolKg,
    utilizationPercent,
    recycledByCategoryKg,
  };
}

/**
 * Calculates total daily feed demand in KG for a category:
 * - If category is fixed_tonnage or isPeriodicMixer:
 *   Returns the scheduled batch tonnage (or 0 if not mixed today).
 * - Otherwise:
 *   Sums up net daily demand across all active barns in the category.
 */
export function calculateCategoryTotalDemand(
  barns: Barn[],
  categoryId: string,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && (cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer)) {
    const periodicConfig = dailyPlan?.periodicBatchConfigs?.[categoryId];
    if (periodicConfig) {
      return periodicConfig.isMixedToday ? Math.max(0, periodicConfig.targetWeightKg) : 0;
    }
    return Math.max(0, cat.defaultTonnageKg || 1000);
  }

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
  rawMaterials: RawMaterial[] = [],
  actualWeights?: Record<string, number>
): CalculatedBatchIngredient[] {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0 || batchTargetWeightKg <= 0) {
    return [];
  }

  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
  if (totalRationKgPerHead <= 0) return [];

  return ration.ingredients.map((ing) => {
    const rawMat = safeMaterials.find((rm) => rm.id === ing.rawMaterialId);
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
 * If allocatedPercent is defined, derives the allocatedKg dynamically from barn's current daily demand.
 */
export function getDerivedAllocationKg(
  allocation: { barnId: string; allocatedKg?: number; allocatedPercent?: number },
  barn?: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!allocation) return 0;
  if (allocation.allocatedPercent !== undefined && barn) {
    const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    return Math.round(((demand * Number(allocation.allocatedPercent)) / 100) * 1000) / 1000;
  }
  return Number(allocation.allocatedKg) || 0;
}

/**
 * Calculates the exact allocated KG for a barn from a percentage:
 * allocatedKg = (barnDailyDemand * allocatedPercent) / 100
 */
export function calculateBarnAllocatedKgFromPercent(
  barn: Barn,
  allocatedPercent: number,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn) return 0;
  const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  const safePercent = Math.max(0, isNaN(allocatedPercent) ? 0 : allocatedPercent);
  return Math.round(((demand * safePercent) / 100) * 1000) / 1000;
}

/**
 * Calculates the allocated percentage from a weight in KG:
 * allocatedPercent = (allocatedKg / barnDailyDemand) * 100
 */
export function calculateBarnAllocatedPercentFromKg(
  barn: Barn,
  allocatedKg: number,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn) return 0;
  const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  if (demand <= 0) return 0;
  const safeKg = Math.max(0, isNaN(allocatedKg) ? 0 : allocatedKg);
  return Math.round(((safeKg / demand) * 100) * 1000) / 1000;
}

/**
 * Sums up allocated KG for all barns in a single mixer batch.
 */
export function calculateBatchAllocatedKg(
  batch: MixBatch,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!batch || !batch.allocations) return 0;
  return batch.allocations.reduce((sum, item) => {
    const barn = barns.find((b) => b.id === item.barnId);
    return sum + getDerivedAllocationKg(item, barn, categories, rations, dailyPlan);
  }, 0);
}

/**
 * Derives the total target weight of a batch by summing its allocations' derived weights.
 * Falls back to batch.targetWeightKg if no allocations exist.
 */
export function getBatchDerivedTargetWeightKg(
  batch: MixBatch,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!batch) return 0;

  // If category is configured for periodic / fixed tonnage (e.g. Calf/Weaner mixer 1 ton / 5 days),
  // the mixer batch size is the fixed/periodic prepared weight (batch.targetWeightKg).
  const cat = categories.find((c) => c.id === batch.categoryId);
  if (cat && (cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer)) {
    return batch.targetWeightKg > 0 ? batch.targetWeightKg : (cat.defaultTonnageKg || 1000);
  }

  if (!batch.allocations || batch.allocations.length === 0) {
    return batch.targetWeightKg || 0;
  }
  const totalAllocated = calculateBatchAllocatedKg(batch, barns, categories, rations, dailyPlan);
  return totalAllocated > 0 ? totalAllocated : batch.targetWeightKg;
}

/**
 * Checks whether a batch belongs to a specific category.
 * Matches by categoryId, category name in batchNumber/notes, or category's barns in allocations.
 */
export function doesBatchBelongToCategory(
  batch: MixBatch,
  category: AnimalCategory | undefined,
  barns: Barn[] = []
): boolean {
  if (!batch || !category) return false;

  // 1. Direct ID match
  if (batch.categoryId === category.id) return true;

  // 2. Match via barn allocations to barns belonging to this category
  if (batch.allocations && batch.allocations.length > 0) {
    const categoryBarnIds = new Set(
      barns.filter((b) => b.categoryId === category.id).map((b) => b.id)
    );
    if (batch.allocations.some((a) => categoryBarnIds.has(a.barnId))) {
      return true;
    }
  }

  // 3. Match via category name in batchNumber or notes (if categoryId is missing or needs healing)
  if (category.name) {
    const catName = category.name.trim();
    if (batch.batchNumber && batch.batchNumber.includes(catName)) return true;
    if (batch.notes && batch.notes.includes(catName)) return true;
  }

  return false;
}

/**
 * Calculates total allocated KG to a specific barn across ALL batches in today's daily plan.
 */
export function calculateBarnTotalAllocatedKgToday(
  barnId: string,
  dailyPlan: DailyOperationPlan,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = []
): number {
  if (!dailyPlan || !dailyPlan.batches) return 0;
  const barn = barns.find((b) => b.id === barnId);
  let total = 0;
  dailyPlan.batches.forEach((batch) => {
    if (batch.allocations) {
      const barnAlloc = batch.allocations.find((a) => a.barnId === barnId);
      if (barnAlloc) {
        total += getDerivedAllocationKg(barnAlloc, barn, categories, rations, dailyPlan);
      }
    }
  });
  return Math.round(total * 1000) / 1000;
}

/**
 * Calculates total allocated percentage to a specific barn across ALL batches in today's daily plan.
 */
export function calculateBarnTotalAllocatedPercentToday(
  barnId: string,
  dailyPlan: DailyOperationPlan,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = []
): number {
  if (!dailyPlan || !dailyPlan.batches) return 0;
  const barn = barns.find((b) => b.id === barnId);
  const demand = barn ? calculateBarnDailyDemand(barn, categories, rations, dailyPlan) : 0;

  let totalPercent = 0;
  dailyPlan.batches.forEach((batch) => {
    if (batch.allocations) {
      const barnAlloc = batch.allocations.find((a) => a.barnId === barnId);
      if (barnAlloc) {
        if (barnAlloc.allocatedPercent !== undefined) {
          totalPercent += Number(barnAlloc.allocatedPercent) || 0;
        } else if (demand > 0) {
          totalPercent += ((Number(barnAlloc.allocatedKg) || 0) / demand) * 100;
        }
      }
    }
  });
  return Math.round(totalPercent * 1000) / 1000;
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
export function validateBatch(
  batch: MixBatch,
  maxCapacityKg?: number,
  barns: Barn[] = [],
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): BatchValidationResult {
  const allocatedKg = calculateBatchAllocatedKg(batch, barns, categories, rations, dailyPlan);
  const derivedWeight = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
  const targetWeightKg = derivedWeight > 0 ? derivedWeight : (batch.targetWeightKg || 0);
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
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): BarnDemandValidationResult {
  const dailyDemandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  const diff = Math.round((totalAllocatedKgToday - dailyDemandKg) * 1000) / 1000;
  const percentageFulfilled = dailyDemandKg > 0 ? Math.round((totalAllocatedKgToday / dailyDemandKg) * 100) : 0;

  let status: 'exact' | 'under' | 'over' = 'exact';
  let message = 'تم استكمال احتياج العنبر بالكامل';

  if (Math.abs(diff) <= 0.5) {
    status = 'exact';
    message = 'تم استكمال احتياج العنبر بالكامل (100%)';
  } else if (diff < 0) {
    status = 'under';
    message = `متبقي ${Math.abs(diff).toLocaleString()} كجم لم يتم توزيعه للعنبر`;
  } else {
    status = 'over';
    message = `تحذير: تم تجاوز احتياج العنبر بـ ${diff.toLocaleString()} كجم`;
  }

  return {
    dailyDemandKg,
    totalAllocatedKg: totalAllocatedKgToday,
    differenceKg: diff,
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

export interface WarehouseDailyLedgerItem {
  rawMaterialId: string;
  code: string;
  name: string;
  unit: string;
  pricePerKg?: number;
  currentMasterStockKg: number;
  minStockKg: number;
  
  // Ledger for selected date:
  openingStockKg: number;
  incomingKg: number;
  requiredDailyKg: number;
  issuedKg: number;
  wasteKg: number;
  availableKg: number; // opening + incoming
  closingStockKg: number; // available - issued - waste
  totalCostToday: number;
  
  // Coverage & Health:
  daysRemaining: number;
  stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'INACTIVE';
  isOpeningOverridden: boolean;
  isIssuedOverridden: boolean;
}

/**
 * Aggregates required raw material quantities across all batches planned for a given day.
 */
export function calculateDailyWarehouseRequirements(
  dailyPlan: DailyOperationPlan,
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  barns: Barn[] = []
): DailyWarehouseRequirementItem[] {
  const totalsMap: Record<string, number> = {};

  if (dailyPlan && dailyPlan.batches) {
    dailyPlan.batches.forEach((batch) => {
      // Find category & ration
      const cat = categories.find((c) => c.id === batch.categoryId);
      const ration = rations.find((r) => r.id === cat?.rationId);
      const effectiveWeight = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
      if (ration && effectiveWeight > 0) {
        const calculated = calculateBatchIngredients(effectiveWeight, ration, rawMaterials);
        calculated.forEach((item) => {
          totalsMap[item.rawMaterialId] = (totalsMap[item.rawMaterialId] || 0) + item.requiredKg;
        });
      }
    });
  }

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
  });
}

/**
 * Calculates a complete, chronological warehouse ledger for a given date,
 * carrying forward closing balances from previous days automatically.
 */
export function calculateChronologicalWarehouseLedger(
  targetDate: string,
  rawMaterials: RawMaterial[],
  categories: AnimalCategory[],
  rations: Ration[],
  barns: Barn[],
  allPlans: Record<string, DailyOperationPlan>,
  currentDailyPlan?: DailyOperationPlan
): WarehouseDailyLedgerItem[] {
  // Merge current plan into all plans map
  const mergedPlans = { ...allPlans };
  if (currentDailyPlan && currentDailyPlan.date) {
    mergedPlans[currentDailyPlan.date] = currentDailyPlan;
  }

  // Base stock map
  const runningStock: Record<string, number> = {};
  rawMaterials.forEach((rm) => {
    runningStock[rm.id] = rm.currentStockKg ?? 0;
  });

  // Get all past dates sorted chronologically
  const pastDates = Object.keys(mergedPlans)
    .filter((d) => d < targetDate)
    .sort();

  // Roll forward past days
  for (const date of pastDates) {
    const plan = mergedPlans[date];
    if (!plan) continue;

    const reqs = calculateDailyWarehouseRequirements(plan, categories, rations, rawMaterials, barns);
    const reqMap: Record<string, number> = {};
    reqs.forEach((r) => {
      reqMap[r.rawMaterialId] = r.totalRequiredKgToday;
    });

    rawMaterials.forEach((rm) => {
      const state = plan.warehouseState?.[rm.id];
      if (state?.openingStockKg !== undefined) {
        runningStock[rm.id] = state.openingStockKg;
      }
      const incoming = state?.incomingKg ?? 0;
      const waste = state?.wasteKg ?? 0;
      const issued = state?.manualIssuedKg !== undefined ? state.manualIssuedKg : (reqMap[rm.id] || 0);

      const netClosing = Math.max(0, (runningStock[rm.id] || 0) + incoming - issued - waste);
      runningStock[rm.id] = Math.round(netClosing * 100) / 100;
    });
  }

  // Target date plan & calculations
  const targetPlan = mergedPlans[targetDate] || currentDailyPlan || {
    date: targetDate,
    batches: [],
  };

  const targetReqs = calculateDailyWarehouseRequirements(targetPlan, categories, rations, rawMaterials, barns);
  const targetReqMap: Record<string, number> = {};
  targetReqs.forEach((r) => {
    targetReqMap[r.rawMaterialId] = r.totalRequiredKgToday;
  });

  return rawMaterials.map((rm) => {
    const state = targetPlan.warehouseState?.[rm.id];
    const isOpeningOverridden = state?.openingStockKg !== undefined;
    const isIssuedOverridden = state?.manualIssuedKg !== undefined;

    const openingStockKg = isOpeningOverridden ? state!.openingStockKg! : Math.round((runningStock[rm.id] || 0) * 100) / 100;
    const incomingKg = Math.round((state?.incomingKg ?? 0) * 100) / 100;
    const wasteKg = Math.round((state?.wasteKg ?? 0) * 100) / 100;
    const requiredDailyKg = targetReqMap[rm.id] || 0;
    const issuedKg = isIssuedOverridden ? state!.manualIssuedKg! : requiredDailyKg;

    const availableKg = Math.round((openingStockKg + incomingKg) * 100) / 100;
    const closingStockKg = Math.round(Math.max(0, availableKg - issuedKg - wasteKg) * 100) / 100;
    const totalCostToday = Math.round(issuedKg * (rm.price || 0) * 100) / 100;

    const daysRemaining = requiredDailyKg > 0
      ? Math.round((closingStockKg / requiredDailyKg) * 10) / 10
      : closingStockKg > 0 ? 999 : 0;

    const minStock = rm.minStockKg ?? 0;
    let stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'INACTIVE' = 'ADEQUATE';

    if (closingStockKg <= 0 && requiredDailyKg > 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (closingStockKg <= 0 && requiredDailyKg === 0) {
      stockStatus = 'INACTIVE';
    } else if (daysRemaining < 3 || (minStock > 0 && closingStockKg < minStock)) {
      stockStatus = 'CRITICAL';
    } else if (daysRemaining <= 7) {
      stockStatus = 'LOW';
    } else {
      stockStatus = 'ADEQUATE';
    }

    return {
      rawMaterialId: rm.id,
      code: rm.code,
      name: rm.name,
      unit: rm.unit,
      pricePerKg: rm.price,
      currentMasterStockKg: rm.currentStockKg ?? 0,
      minStockKg: minStock,
      openingStockKg,
      incomingKg,
      requiredDailyKg,
      issuedKg,
      wasteKg,
      availableKg,
      closingStockKg,
      totalCostToday,
      daysRemaining,
      stockStatus,
      isOpeningOverridden,
      isIssuedOverridden,
    };
  });
}

/**
 * Calculates raw material requirements based on the total daily demand of all active barns,
 * ensuring accuracy even if batches haven't been planned yet or to compare with planned batches.
 */
export function calculateTheoreticalRawMaterialRequirements(
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan
): DailyWarehouseRequirementItem[] {
  const totalsMap: Record<string, number> = {};

  const activeBarns = barns.filter((b) => b.status === 'نشط');

  activeBarns.forEach((barn) => {
    const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const ration = getBarnRation(barn, categories, rations, dailyPlan);
    if (ration && demandKg > 0) {
      const calculated = calculateBatchIngredients(demandKg, ration, rawMaterials);
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
  }).filter((item) => item.totalRequiredKgToday > 0);
}

export interface MilkProductionMetrics {
  totalMilkKg: number;
  milkingHeadCount: number;
  averageMilkPerHead: number; // متوسط إنتاج الرأس (كجم حليب)
  milkingFeedDemandKg: number; // إجمالي علف الحلاب المقرر بالوزن الطازج (As-Fed كجم)
  refusalPercent: number; // نسبة الراجع %
  refusalKg: number; // كمية الراجع (كجم طازج)
  actualFeedIntakeKg: number; // العلف المأكول الفعلي (As-Fed كجم)
  
  // Dry Matter metrics (المادة الجافة والمعيار العلمي NRC)
  rationDmPercent: number; // متوسط نسبة المادة الجافة للعليقة % (مثلاً 51%)
  totalDmDemandKg: number; // إجمالي المادة الجافة المقررة (كجم DM)
  actualDmiKg: number; // إجمالي المادة الجافة المأكولة الفعلية (DMI كجم)
  dmiPerHeadKg: number; // متوسط المادة الجافة المتناولة للرأس (كجم DMI / رأس / يوم)
  
  // Efficiency
  feedEfficiency: number; // الكفاءة العلفية على أساس المادة الجافة: كجم حليب / كجم مادة جافة (DMI) - Standard NRC
  feedEfficiencyAsFed: number; // الكفاءة على الوزن الرطب (للمقارنة الميدانية): كجم حليب / كجم علف طازج
  feedConversionRatio: number; // معامل التحويل DMI: كجم مادة جافة / كجم حليب
  efficiencyStatus: 'ممتازة' | 'جيدة' | 'متوسطة' | 'تحتاج مراجعة' | 'غير محدد';
}

/**
 * Gets the Dry Matter (DM %) for a raw material, falling back to standard feed database percentages.
 */
export function getRawMaterialDryMatterPercent(
  rawMat?: RawMaterial | null,
  nameHint?: string
): number {
  if (rawMat && typeof rawMat.dryMatterPercent === 'number' && rawMat.dryMatterPercent > 0) {
    return rawMat.dryMatterPercent;
  }
  const name = ((rawMat?.name || nameHint || '') + ' ' + (rawMat?.notes || '')).toLowerCase();
  if (name.includes('سيلاج') || name.includes('silage') || name.includes('برسيم خضر') || name.includes('رطب')) {
    return 33; // سيلاج ذرة رطب (33% DM)
  }
  if (name.includes('مولاس') || name.includes('molasses')) {
    return 75; // مولاس سائب (75% DM)
  }
  if (name.includes('بيكربونات') || name.includes('أملاح') || name.includes('بريمكس') || name.includes('فيتامين') || name.includes('مضاد سموم')) {
    return 98; // إضافات وأملاح جافة (98% DM)
  }
  if (name.includes('تبن') || name.includes('قش')) {
    return 90; // تبن قمح (90% DM)
  }
  if (name.includes('دريس')) {
    return 88; // دريس حجازي (88% DM)
  }
  if (name.includes('صويا') || name.includes('soya') || name.includes('soy')) {
    return 89; // كسب صويا (89% DM)
  }
  if (name.includes('ذرة') || name.includes('corn') || name.includes('جلوتوفيد') || name.includes('ddgs')) {
    return 88; // حبوب وأعلاف طاقة مجففة (88% DM)
  }
  return 88; // Default dry matter %
}

/**
 * Calculates ration Dry Matter percentage and total DM kg per head.
 */
export function calculateRationDmStats(
  ration: Ration | undefined,
  rawMaterials: RawMaterial[] = []
): { totalAsFedKgPerHead: number; totalDmKgPerHead: number; dmPercent: number } {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0) {
    return { totalAsFedKgPerHead: 0, totalDmKgPerHead: 0, dmPercent: 50 };
  }
  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  let totalAsFed = 0;
  let totalDm = 0;

  ration.ingredients.forEach((ing) => {
    const rawMat = safeMaterials.find((rm) => rm.id === ing.rawMaterialId);
    const amount = Number(ing.amountKgPerHead) || 0;
    const dmPercent = getRawMaterialDryMatterPercent(rawMat);
    totalAsFed += amount;
    totalDm += amount * (dmPercent / 100);
  });

  const dmPercent = totalAsFed > 0 ? (totalDm / totalAsFed) * 100 : 50;
  return {
    totalAsFedKgPerHead: Math.round(totalAsFed * 100) / 100,
    totalDmKgPerHead: Math.round(totalDm * 1000) / 1000,
    dmPercent: Math.round(dmPercent * 10) / 10,
  };
}

/**
 * Calculates a specific barn's daily Dry Matter demand in kg (الاحتياج اليومي بالمادة الجافة كجم DM).
 */
export function calculateBarnDmDemandKg(
  barn: Barn,
  categories: AnimalCategory[],
  rations: Ration[],
  dailyPlan?: DailyOperationPlan,
  rawMaterials: RawMaterial[] = []
): number {
  const netDemandAsFed = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  const ration = getBarnRation(barn, categories, rations, dailyPlan);
  const dmStats = calculateRationDmStats(ration, rawMaterials);
  const dmMultiplier = dmStats.dmPercent > 0 ? dmStats.dmPercent / 100 : 0.5;
  return Math.round(netDemandAsFed * dmMultiplier * 10) / 10;
}

/**
 * Calculates a specific barn's actual daily Dry Matter Intake (DMI كجم مادة جافة مأكولة فعلياً).
 */
export function calculateBarnActualDmiKg(
  barn: Barn,
  categories: AnimalCategory[],
  rations: Ration[],
  dailyPlan?: DailyOperationPlan,
  rawMaterials: RawMaterial[] = []
): number {
  const actualIntakeAsFed = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
  const ration = getBarnRation(barn, categories, rations, dailyPlan);
  const dmStats = calculateRationDmStats(ration, rawMaterials);
  const dmMultiplier = dmStats.dmPercent > 0 ? dmStats.dmPercent / 100 : 0.5;
  return Math.round(actualIntakeAsFed * dmMultiplier * 10) / 10;
}

/**
 * Calculates a specific barn's DMI per head (كجم مادة جافة متناولة للرأس الواحد باليوم).
 */
export function calculateBarnDmiPerHeadKg(
  barn: Barn,
  categories: AnimalCategory[],
  rations: Ration[],
  dailyPlan?: DailyOperationPlan,
  rawMaterials: RawMaterial[] = []
): number {
  const barnState = getBarnDailyState(barn, dailyPlan);
  const headCount = barnState.headCount || barn.headCount || 0;
  if (headCount <= 0) return 0;
  const actualDmi = calculateBarnActualDmiKg(barn, categories, rations, dailyPlan, rawMaterials);
  return Math.round((actualDmi / headCount) * 100) / 100;
}

/**
 * Calculates overall farm or filtered barns Dry Matter summary metrics.
 */
export function calculateFarmDmSummary(
  targetBarns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  dailyPlan?: DailyOperationPlan,
  rawMaterials: RawMaterial[] = []
): {
  totalDmDemandKg: number;
  totalActualDmiKg: number;
  averageDmPercent: number;
  averageDmiPerHeadKg: number;
} {
  let totalAsFedDemand = 0;
  let totalDmDemand = 0;
  let totalActualDmi = 0;
  let totalHeads = 0;

  targetBarns.forEach((barn) => {
    const barnState = getBarnDailyState(barn, dailyPlan);
    const headCount = barnState.headCount || barn.headCount || 0;
    totalHeads += headCount;

    const asFedDemand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const ration = getBarnRation(barn, categories, rations, dailyPlan);
    const dmStats = calculateRationDmStats(ration, rawMaterials);
    const dmRatio = dmStats.dmPercent > 0 ? dmStats.dmPercent / 100 : 0.5;

    totalAsFedDemand += asFedDemand;
    totalDmDemand += asFedDemand * dmRatio;

    const actualIntake = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);
    totalActualDmi += actualIntake * dmRatio;
  });

  const averageDmPercent =
    totalAsFedDemand > 0 ? Math.round((totalDmDemand / totalAsFedDemand) * 1000) / 10 : 0;
  const averageDmiPerHeadKg =
    totalHeads > 0 ? Math.round((totalActualDmi / totalHeads) * 100) / 100 : 0;

  return {
    totalDmDemandKg: Math.round(totalDmDemand * 10) / 10,
    totalActualDmiKg: Math.round(totalActualDmi * 10) / 10,
    averageDmPercent,
    averageDmiPerHeadKg,
  };
}

/**
 * Calculates milk production KPIs, average per cow, feed refusal, and NRC Feed Conversion Efficiency (on Dry Matter DMI basis).
 */
export function calculateMilkMetrics(
  milkData: MilkProductionData | undefined,
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  dailyPlan?: DailyOperationPlan,
  rawMaterials: RawMaterial[] = []
): MilkProductionMetrics {
  const sessions = milkData?.sessions || [];
  const totalMilkKg = sessions.reduce((sum, s) => sum + (Number(s.amountKg) || 0), 0);
  const refusalPercent = Math.max(0, Number(milkData?.refusalPercent) || 0);

  // Identify milking categories/barns (those whose category name includes "حلاب" or "حليب" or "milk" or has lactating tag)
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const milkingBarns = activeBarns.filter((barn) => {
    const cat = categories.find((c) => c.id === barn.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (barn.name || '').toLowerCase();
    return (
      catName.includes('حلاب') ||
      catName.includes('حليب') ||
      catName.includes('milk') ||
      barnName.includes('حلاب') ||
      barnName.includes('حليب')
    );
  });

  const targetBarns = milkingBarns.length > 0 ? milkingBarns : activeBarns;

  // Calculate auto-detected milking cows
  const autoMilkingHeads = targetBarns.reduce((sum, b) => {
    const state = getBarnDailyState(b, dailyPlan);
    return sum + (state.headCount || 0);
  }, 0);

  const milkingHeadCount = milkData?.milkingHeadCount && milkData.milkingHeadCount > 0
    ? milkData.milkingHeadCount
    : autoMilkingHeads;

  // Average milk per cow
  const averageMilkPerHead = milkingHeadCount > 0
    ? Math.round((totalMilkKg / milkingHeadCount) * 100) / 100
    : 0;

  // Milking feed demand in As-Fed and Dry Matter (DM)
  let milkingFeedDemandKg = 0;
  let totalDmDemandKg = 0;

  targetBarns.forEach((b) => {
    const demandAsFed = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
    milkingFeedDemandKg += demandAsFed;

    const ration = getBarnRation(b, categories, rations, dailyPlan);
    const dmStats = calculateRationDmStats(ration, rawMaterials);
    if (dmStats.dmPercent > 0) {
      totalDmDemandKg += demandAsFed * (dmStats.dmPercent / 100);
    } else {
      totalDmDemandKg += demandAsFed * 0.50; // Fallback ~50% DM
    }
  });

  milkingFeedDemandKg = Math.round(milkingFeedDemandKg * 100) / 100;
  totalDmDemandKg = Math.round(totalDmDemandKg * 100) / 100;

  const rationDmPercent = milkingFeedDemandKg > 0
    ? Math.round((totalDmDemandKg / milkingFeedDemandKg) * 1000) / 10
    : 50;

  // Calculate actual total refusal kg from target barns
  const barnsTotalRefusalKg = targetBarns.reduce((sum, b) => {
    return sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan);
  }, 0);

  // If barns have refusal recorded or overrides, use weighted refusal from barns
  let refusalKg = barnsTotalRefusalKg;
  let finalRefusalPercent = milkingFeedDemandKg > 0
    ? Math.round(((barnsTotalRefusalKg / milkingFeedDemandKg) * 100) * 10) / 10
    : 0;

  // If no barn refusal is recorded yet but a global manual refusalPercent is provided in milkData
  if (barnsTotalRefusalKg === 0 && milkData?.refusalPercent !== undefined && milkData.refusalPercent > 0) {
    finalRefusalPercent = Math.max(0, Number(milkData.refusalPercent));
    refusalKg = Math.round(((milkingFeedDemandKg * finalRefusalPercent) / 100) * 10) / 10;
  }

  // Refusal & Actual Intake (As-Fed)
  const actualFeedIntakeKg = Math.max(0, Math.round((milkingFeedDemandKg - refusalKg) * 100) / 100);

  // Actual Dry Matter Intake (DMI)
  const actualDmiKg = Math.max(0, Math.round(actualFeedIntakeKg * (rationDmPercent / 100) * 100) / 100);
  const dmiPerHeadKg = milkingHeadCount > 0
    ? Math.round((actualDmiKg / milkingHeadCount) * 100) / 100
    : 0;

  // NRC Feed Efficiency on Dry Matter (Milk kg / DMI kg)
  const feedEfficiency = actualDmiKg > 0
    ? Math.round((totalMilkKg / actualDmiKg) * 1000) / 1000
    : 0;

  // As-Fed conversion for field comparison (Milk kg / As-Fed Feed kg)
  const feedEfficiencyAsFed = actualFeedIntakeKg > 0
    ? Math.round((totalMilkKg / actualFeedIntakeKg) * 1000) / 1000
    : 0;

  // Feed Conversion Ratio on DMI (DMI kg / Milk kg)
  const feedConversionRatio = totalMilkKg > 0
    ? Math.round((actualDmiKg / totalMilkKg) * 1000) / 1000
    : 0;

  // Status benchmark based on NRC standards for Dairy Cattle Feed Efficiency (DM basis)
  let efficiencyStatus: MilkProductionMetrics['efficiencyStatus'] = 'غير محدد';
  if (feedEfficiency > 0) {
    if (feedEfficiency >= 1.55) {
      efficiencyStatus = 'ممتازة';
    } else if (feedEfficiency >= 1.40) {
      efficiencyStatus = 'جيدة';
    } else if (feedEfficiency >= 1.25) {
      efficiencyStatus = 'متوسطة';
    } else {
      efficiencyStatus = 'تحتاج مراجعة';
    }
  }

  return {
    totalMilkKg,
    milkingHeadCount,
    averageMilkPerHead,
    milkingFeedDemandKg,
    refusalPercent: finalRefusalPercent,
    refusalKg,
    actualFeedIntakeKg,
    rationDmPercent,
    totalDmDemandKg,
    actualDmiKg,
    dmiPerHeadKg,
    feedEfficiency,
    feedEfficiencyAsFed,
    feedConversionRatio,
    efficiencyStatus,
  };
}

/**
 * Calculates the feed refusal for a single barn in KG (based on barn-specific percent or fixed KG).
 */
export function calculateBarnRefusalKg(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  if (!barn || barn.status === 'فارغ') return 0;
  const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  if (demandKg <= 0) return 0;

  const state = getBarnDailyState(barn, dailyPlan);
  const type = state.refusalType || 'percent';
  const val = Number(state.refusalValue) || 0;

  if (type === 'kg') {
    return Math.min(demandKg, Math.max(0, val));
  }
  // Percent
  const safePercent = Math.max(0, Math.min(100, val));
  return Math.round(((demandKg * safePercent) / 100) * 100) / 100;
}

/**
 * Calculates the actual feed intake for a barn (Demand Kg - Refusal Kg).
 */
export function calculateBarnActualIntakeKg(
  barn: Barn,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  dailyPlan?: DailyOperationPlan
): number {
  const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
  const refusalKg = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
  return Math.max(0, Math.round((demandKg - refusalKg) * 100) / 100);
}

/**
 * Calculates the cost per KG of a ration based on raw material prices.
 */
export function calculateRationCostPerKg(
  ration?: Ration,
  rawMaterials: RawMaterial[] = []
): number {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0) return 0;
  const safeMaterials = Array.isArray(rawMaterials) ? rawMaterials : [];
  let totalCost = 0;
  let totalKg = 0;

  ration.ingredients.forEach((ing) => {
    const rawMat = safeMaterials.find((rm) => rm.id === ing.rawMaterialId);
    const amount = Number(ing.amountKgPerHead) || 0;
    const price = Number(rawMat?.price) || 0;
    totalKg += amount;
    totalCost += amount * price;
  });

  return totalKg > 0 ? Math.round((totalCost / totalKg) * 100) / 100 : 0;
}

export interface DairyFinancialMetrics {
  milkPricePerKg: number;
  totalMilkKg: number;
  milkingHeadCount: number;
  averageMilkPerHead: number;
  totalMilkRevenue: number;
  totalMilkingFeedCost: number;
  feedCostPerCowPerDay: number;
  milkRevenuePerCowPerDay: number;
  iofcPerCowPerDay: number; // Income Over Feed Cost (العائد فوق تكلفة العلف لكل رأس)
  totalIofcPerDay: number; // إجمالي الأرباح فوق تكلفة العلف لقطيع الحلاب
  feedCostPercentOfRevenue: number; // نسبة تكلفة العلف من دخل الحليب %
  costPerKgFeedAsFed: number; // متوسط تكلفة كيلو العلف الطازج
  costPerKgMilkFeedCost: number; // تكلفة العلف لإنتاج كيلو اللبن الواحد
}

/**
 * Calculates Income Over Feed Cost (IOFC) and Dairy financial efficiency.
 */
export function calculateDairyFinancials(
  milkData: MilkProductionData | undefined,
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan,
  defaultMilkPrice: number = 20.0
): DairyFinancialMetrics {
  const milkPrice = milkData?.milkPricePerKg && milkData.milkPricePerKg > 0
    ? milkData.milkPricePerKg
    : defaultMilkPrice;

  const sessions = milkData?.sessions || [];
  const totalMilkKg = sessions.reduce((sum, s) => sum + (Number(s.amountKg) || 0), 0);

  // Active milking barns
  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const milkingBarns = activeBarns.filter((barn) => {
    const cat = categories.find((c) => c.id === barn.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (barn.name || '').toLowerCase();
    return (
      catName.includes('حلاب') ||
      catName.includes('حليب') ||
      catName.includes('milk') ||
      barnName.includes('حلاب') ||
      barnName.includes('حليب')
    );
  });
  const targetBarns = milkingBarns.length > 0 ? milkingBarns : activeBarns;

  let totalMilkingHeads = 0;
  let totalMilkingFeedDemandKg = 0;
  let totalMilkingFeedCost = 0;

  targetBarns.forEach((barn) => {
    const state = getBarnDailyState(barn, dailyPlan);
    const heads = state.headCount || 0;
    const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const ration = getBarnRation(barn, categories, rations, dailyPlan);
    const costPerKg = calculateRationCostPerKg(ration, rawMaterials);

    totalMilkingHeads += heads;
    totalMilkingFeedDemandKg += demandKg;
    totalMilkingFeedCost += demandKg * costPerKg;
  });

  const milkingHeadCount = milkData?.milkingHeadCount && milkData.milkingHeadCount > 0
    ? milkData.milkingHeadCount
    : totalMilkingHeads;

  const totalMilkRevenue = Math.round(totalMilkKg * milkPrice * 100) / 100;
  totalMilkingFeedCost = Math.round(totalMilkingFeedCost * 100) / 100;

  const averageMilkPerHead = milkingHeadCount > 0
    ? Math.round((totalMilkKg / milkingHeadCount) * 100) / 100
    : 0;

  const milkRevenuePerCowPerDay = Math.round(averageMilkPerHead * milkPrice * 100) / 100;
  const feedCostPerCowPerDay = milkingHeadCount > 0
    ? Math.round((totalMilkingFeedCost / milkingHeadCount) * 100) / 100
    : 0;

  const iofcPerCowPerDay = Math.round((milkRevenuePerCowPerDay - feedCostPerCowPerDay) * 100) / 100;
  const totalIofcPerDay = Math.round((totalMilkRevenue - totalMilkingFeedCost) * 100) / 100;

  const feedCostPercentOfRevenue = totalMilkRevenue > 0
    ? Math.round((totalMilkingFeedCost / totalMilkRevenue) * 1000) / 10
    : 0;

  const costPerKgFeedAsFed = totalMilkingFeedDemandKg > 0
    ? Math.round((totalMilkingFeedCost / totalMilkingFeedDemandKg) * 100) / 100
    : 0;

  const costPerKgMilkFeedCost = totalMilkKg > 0
    ? Math.round((totalMilkingFeedCost / totalMilkKg) * 100) / 100
    : 0;

  return {
    milkPricePerKg: milkPrice,
    totalMilkKg,
    milkingHeadCount,
    averageMilkPerHead,
    totalMilkRevenue,
    totalMilkingFeedCost,
    feedCostPerCowPerDay,
    milkRevenuePerCowPerDay,
    iofcPerCowPerDay,
    totalIofcPerDay,
    feedCostPercentOfRevenue,
    costPerKgFeedAsFed,
    costPerKgMilkFeedCost,
  };
}

export interface FatteningFinancialMetrics {
  totalFatteningHeads: number;
  totalDailyDemandKg: number;
  totalDailyFeedCost: number;
  feedCostPerHeadPerDay: number;
  costPerKgFeedAsFed: number;
  assumedAdgKg: number; // معدل النمو اليومي (كجم/رأس/يوم)
  feedCostPerKgGain: number; // تكلفة كجم الزيادة الوزنية من العلف
}

/**
 * Calculates Fattening Feed Cost per kg gain (Feed Conversion Cost).
 */
export function calculateFatteningFinancials(
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan,
  defaultAdg: number = 1.5
): FatteningFinancialMetrics {
  const adg = dailyPlan?.fatteningAdgKg && dailyPlan.fatteningAdgKg > 0
    ? dailyPlan.fatteningAdgKg
    : defaultAdg;

  const activeBarns = barns.filter((b) => b.status === 'نشط');
  const fatteningBarns = activeBarns.filter((barn) => {
    const cat = categories.find((c) => c.id === barn.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const barnName = (barn.name || '').toLowerCase();
    return (
      catName.includes('تسمين') ||
      catName.includes('عجول') ||
      catName.includes('beef') ||
      catName.includes('fatten') ||
      barnName.includes('تسمين')
    );
  });

  let totalFatteningHeads = 0;
  let totalDailyDemandKg = 0;
  let totalDailyFeedCost = 0;

  fatteningBarns.forEach((barn) => {
    const state = getBarnDailyState(barn, dailyPlan);
    const heads = state.headCount || 0;
    const demandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const ration = getBarnRation(barn, categories, rations, dailyPlan);
    const costPerKg = calculateRationCostPerKg(ration, rawMaterials);

    totalFatteningHeads += heads;
    totalDailyDemandKg += demandKg;
    totalDailyFeedCost += demandKg * costPerKg;
  });

  totalDailyFeedCost = Math.round(totalDailyFeedCost * 100) / 100;
  const feedCostPerHeadPerDay = totalFatteningHeads > 0
    ? Math.round((totalDailyFeedCost / totalFatteningHeads) * 100) / 100
    : 0;

  const costPerKgFeedAsFed = totalDailyDemandKg > 0
    ? Math.round((totalDailyFeedCost / totalDailyDemandKg) * 100) / 100
    : 0;

  const feedCostPerKgGain = adg > 0
    ? Math.round((feedCostPerHeadPerDay / adg) * 100) / 100
    : 0;

  return {
    totalFatteningHeads,
    totalDailyDemandKg,
    totalDailyFeedCost,
    feedCostPerHeadPerDay,
    costPerKgFeedAsFed,
    assumedAdgKg: adg,
    feedCostPerKgGain,
  };
}

export interface LowStockAlertItem {
  rawMaterialId: string;
  code: string;
  name: string;
  unit: string;
  currentStockKg: number;
  minStockKg: number;
  dailyRequiredKg: number;
  daysRemaining: number;
  isCritical: boolean; // True if remaining days < 2 OR currentStock <= minStock
}

/**
 * Checks for critical low stock raw materials in the warehouse.
 */
export function checkLowStockMaterials(
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan,
  categories: AnimalCategory[] = [],
  rations: Ration[] = [],
  barns: Barn[] = []
): LowStockAlertItem[] {
  const dailyRequirements = calculateDailyWarehouseRequirements(
    dailyPlan,
    categories,
    rations,
    rawMaterials,
    barns
  );

  const alerts: LowStockAlertItem[] = [];

  rawMaterials.forEach((rm) => {
    if (rm.status !== 'نشطة') return;
    const req = dailyRequirements.find((r) => r.rawMaterialId === rm.id);
    const dailyKg = req?.totalRequiredKgToday || 0;
    const currentStock = Number(rm.currentStockKg) || 0;
    const minStock = Number(rm.minStockKg) || 0;

    const daysRemaining = dailyKg > 0 ? Math.round((currentStock / dailyKg) * 10) / 10 : 999;
    const isCritical = (currentStock <= minStock && minStock > 0) || (dailyKg > 0 && daysRemaining < 2.5);

    if (isCritical) {
      alerts.push({
        rawMaterialId: rm.id,
        code: rm.code,
        name: rm.name,
        unit: rm.unit,
        currentStockKg: currentStock,
        minStockKg: minStock,
        dailyRequiredKg: dailyKg,
        daysRemaining: daysRemaining === 999 ? 0 : daysRemaining,
        isCritical: true,
      });
    }
  });

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Checks whether a raw material belongs to the dry concentrate mix (خامات العلف المركز والأملاح/البريمكس)
 * versus bulky roughages (السيلاج، الدريس، التبن) or bulk liquids.
 */
export function isConcentrateMaterial(rm?: RawMaterial): boolean {
  if (!rm) return false;
  if (rm.materialType === 'concentrate' || rm.materialType === 'mineral') return true;
  if (rm.materialType === 'roughage' || rm.materialType === 'liquid') return false;

  const lowerName = (rm.name || '').toLowerCase();
  // Exclude roughages / forages / bulk liquids
  if (
    lowerName.includes('سيلاج') ||
    lowerName.includes('دريس') ||
    lowerName.includes('تبن') ||
    lowerName.includes('قش') ||
    lowerName.includes('برسيم') ||
    lowerName.includes('حشيش') ||
    lowerName.includes('silage') ||
    lowerName.includes('hay') ||
    lowerName.includes('straw') ||
    lowerName.includes('مولاس') ||
    lowerName.includes('ماء') ||
    lowerName.includes('سائل')
  ) {
    return false;
  }

  // Common concentrates
  if (
    lowerName.includes('ذرة') ||
    lowerName.includes('صويا') ||
    lowerName.includes('كسب') ||
    lowerName.includes('جلوتوفيد') ||
    lowerName.includes('ddgs') ||
    lowerName.includes('نخالة') ||
    lowerName.includes('ردة') ||
    lowerName.includes('بيكربونات') ||
    lowerName.includes('أملاح') ||
    lowerName.includes('بريمكس') ||
    lowerName.includes('فيتامين') ||
    lowerName.includes('سموم') ||
    lowerName.includes('خميرة') ||
    lowerName.includes('مركز') ||
    lowerName.includes('حبوب')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether a specific ration ingredient is designated to be mixed in the concentrate pre-mix mixer (and bagged).
 * Priority:
 * 1. If explicit user preference is defined in the ration ingredient (`inConcentratePremix === true / false`), respect it!
 * 2. Otherwise, fall back to default classification based on raw material type (`isConcentrateMaterial(rm)`).
 */
export function isIngredientInConcentratePremix(
  ingredient?: RationIngredient,
  rawMaterial?: RawMaterial
): boolean {
  if (ingredient && typeof ingredient.inConcentratePremix === 'boolean') {
    return ingredient.inConcentratePremix;
  }
  return isConcentrateMaterial(rawMaterial);
}

/**
 * Splits a ration into Concentrate vs Roughage/Liquid parts.
 */
export function getConcentrateAndRoughageBreakdown(
  ration: Ration | undefined,
  rawMaterials: RawMaterial[]
) {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0) {
    return {
      concentrateIngredients: [],
      roughageIngredients: [],
      concentrateTotalKgPerHead: 0,
      roughageTotalKgPerHead: 0,
      totalKgPerHead: 0,
      concentrateRatioPercent: 0,
    };
  }

  const concentrateIngredients: Array<{
    rawMaterialId: string;
    rawMaterial: RawMaterial | undefined;
    amountKgPerHead: number;
    shareInConcentratePercent: number;
  }> = [];

  const roughageIngredients: Array<{
    rawMaterialId: string;
    rawMaterial: RawMaterial | undefined;
    amountKgPerHead: number;
  }> = [];

  let concentrateTotal = 0;
  let roughageTotal = 0;

  ration.ingredients.forEach((ing) => {
    const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
    if (isIngredientInConcentratePremix(ing, rm)) {
      concentrateTotal += ing.amountKgPerHead;
    } else {
      roughageTotal += ing.amountKgPerHead;
    }
  });

  const totalKg = concentrateTotal + roughageTotal;

  ration.ingredients.forEach((ing) => {
    const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
    if (isIngredientInConcentratePremix(ing, rm)) {
      const share = concentrateTotal > 0 ? (ing.amountKgPerHead / concentrateTotal) * 100 : 0;
      concentrateIngredients.push({
        rawMaterialId: ing.rawMaterialId,
        rawMaterial: rm,
        amountKgPerHead: ing.amountKgPerHead,
        shareInConcentratePercent: Math.round(share * 100) / 100,
      });
    } else {
      roughageIngredients.push({
        rawMaterialId: ing.rawMaterialId,
        rawMaterial: rm,
        amountKgPerHead: ing.amountKgPerHead,
      });
    }
  });

  return {
    concentrateIngredients,
    roughageIngredients,
    concentrateTotalKgPerHead: Math.round(concentrateTotal * 100) / 100,
    roughageTotalKgPerHead: Math.round(roughageTotal * 100) / 100,
    totalKgPerHead: Math.round(totalKg * 100) / 100,
    concentrateRatioPercent: totalKg > 0 ? Math.round((concentrateTotal / totalKg) * 1000) / 10 : 0,
  };
}

export interface ConcentrateBatchFormula {
  items: ConcentrateIngredientItem[];
  targetBatchKg: number;
  bagWeightKg: number;
  totalBags: number;
  remainingLooseKg: number;
  totalCost: number;
  costPerBag: number;
  costPerKg: number;
}

/**
 * Computes exact ingredient quantities, bags count, and cost to produce a specific tonnage/weight of concentrate premix.
 * targetBatchKg e.g. 500 (0.5 ton), 1000 (1 ton), 1500 (1.5 ton), 2000 (2 tons).
 */
export function calculateConcentrateBatchFormula(
  ration: Ration | undefined,
  rawMaterials: RawMaterial[],
  targetBatchKg: number,
  bagWeightKg: number = 50
): ConcentrateBatchFormula {
  const safeTargetKg = Math.max(0, targetBatchKg);
  const safeBagWeight = Math.max(1, bagWeightKg || 50);

  const breakdown = getConcentrateAndRoughageBreakdown(ration, rawMaterials);
  const totalConcPerHead = breakdown.concentrateTotalKgPerHead;

  let totalCost = 0;

  const items: ConcentrateIngredientItem[] = breakdown.concentrateIngredients.map((item) => {
    const rawMat = item.rawMaterial;
    const proportion = totalConcPerHead > 0 ? item.amountKgPerHead / totalConcPerHead : 0;
    const requiredKg = Math.round(proportion * safeTargetKg * 10) / 10;
    const cost = requiredKg * (rawMat?.price || 0);
    totalCost += cost;

    return {
      rawMaterialId: item.rawMaterialId,
      name: rawMat?.name || 'خامة مركزة',
      code: rawMat?.code || 'RM',
      unit: rawMat?.unit || 'كجم',
      amountKgPerHead: item.amountKgPerHead,
      percentageInConcentrate: item.shareInConcentratePercent,
      requiredKg,
      actualKg: requiredKg,
      costPerKg: rawMat?.price || 0,
    };
  });

  const totalBags = Math.floor(safeTargetKg / safeBagWeight);
  const remainingLooseKg = Math.round((safeTargetKg % safeBagWeight) * 10) / 10;
  const costPerBag = totalBags > 0 ? Math.round((totalCost / (safeTargetKg / safeBagWeight)) * 10) / 10 : 0;
  const costPerKg = safeTargetKg > 0 ? Math.round((totalCost / safeTargetKg) * 100) / 100 : 0;

  return {
    items,
    targetBatchKg: safeTargetKg,
    bagWeightKg: safeBagWeight,
    totalBags,
    remainingLooseKg,
    totalCost: Math.round(totalCost * 10) / 10,
    costPerBag,
    costPerKg,
  };
}

/**
 * Calculates daily concentrate demand (kg and bags) for an animal category based on active barns.
 */
export function calculateCategoryDailyConcentrateDemand(
  category: AnimalCategory,
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan,
  bagWeightKg: number = 50
): {
  totalGrossFeedKg: number;
  concentrateKg: number;
  roughageKg: number;
  concentrateRatioPercent: number;
  totalBagsNeeded: number;
  looseKgNeeded: number;
} {
  const safeBagWeight = Math.max(1, bagWeightKg || 50);
  const ration = rations.find((r) => r.id === category.rationId);
  const breakdown = getConcentrateAndRoughageBreakdown(ration, rawMaterials);

  // Sum gross demand of all active barns for this category
  const categoryBarns = barns.filter(
    (b) => b.categoryId === category.id && b.status === 'نشط' && b.headCount > 0
  );

  let totalGrossFeedKg = 0;
  categoryBarns.forEach((barn) => {
    totalGrossFeedKg += calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
  });

  const concRatio = breakdown.totalKgPerHead > 0
    ? breakdown.concentrateTotalKgPerHead / breakdown.totalKgPerHead
    : 0;

  const concentrateKg = Math.round(totalGrossFeedKg * concRatio * 10) / 10;
  const roughageKg = Math.round((totalGrossFeedKg - concentrateKg) * 10) / 10;
  const totalBagsNeeded = Math.floor(concentrateKg / safeBagWeight);
  const looseKgNeeded = Math.round((concentrateKg % safeBagWeight) * 10) / 10;

  return {
    totalGrossFeedKg: Math.round(totalGrossFeedKg * 10) / 10,
    concentrateKg,
    roughageKg,
    concentrateRatioPercent: breakdown.concentrateRatioPercent,
    totalBagsNeeded,
    looseKgNeeded,
  };
}

/**
 * Calculates Concentrate Pre-Mix Stock (Available Bags, Consumed Bags, Net Balance)
 */
export function calculateConcentrateStock(
  categoryId: string,
  categories: AnimalCategory[],
  dailyPlan: DailyOperationPlan,
  barns: Barn[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  bagWeightKg: number = 50
): ConcentrateBagStock & {
  producedBagsToday: number;
  consumedBagsToday: number;
  consumedKgToday: number;
  producedKgToday: number;
  coverageRatioPercent: number;
} {
  const safeBagWeight = Math.max(1, bagWeightKg || dailyPlan.premixBagWeightKg || 50);
  const cat = categories.find((c) => c.id === categoryId);
  const catName = cat?.name || 'فئة غير معرّفة';

  // Total produced from completed concentrateOrders
  const categoryOrders = (dailyPlan.concentrateOrders || []).filter(
    (o) => o.categoryId === categoryId && (o.status === 'مكتمل ومعبأ' || !o.status)
  );

  let producedKgToday = 0;
  let producedBagsToday = 0;
  categoryOrders.forEach((order) => {
    producedKgToday += order.batchWeightKg || 0;
    producedBagsToday += order.totalBags || Math.floor((order.batchWeightKg || 0) / safeBagWeight);
  });

  // Demand needed for batches executed or planned today
  const demand = cat
    ? calculateCategoryDailyConcentrateDemand(
        cat,
        barns,
        categories,
        rations,
        rawMaterials,
        dailyPlan,
        safeBagWeight
      )
    : { concentrateKg: 0, totalBagsNeeded: 0 };

  const consumedKgToday = demand.concentrateKg;
  const consumedBagsToday = demand.totalBagsNeeded;

  const netKg = Math.max(0, producedKgToday - consumedKgToday);
  const totalBagsInStock = Math.floor(netKg / safeBagWeight);
  const looseKgInStock = Math.round((netKg % safeBagWeight) * 10) / 10;

  const coverageRatioPercent =
    consumedKgToday > 0 ? Math.round((producedKgToday / consumedKgToday) * 100) : 100;

  return {
    categoryId,
    categoryName: `مركز ${catName} جاهز (شكاير ${safeBagWeight} كجم)`,
    bagWeightKg: safeBagWeight,
    totalBagsInStock,
    looseKgInStock,
    totalKgInStock: Math.round(netKg * 10) / 10,
    producedBagsToday,
    consumedBagsToday,
    consumedKgToday,
    producedKgToday,
    coverageRatioPercent,
  };
}

/**
 * Calculates batch ingredients with optional Pre-Mix Concentrate bundling.
 * If usePremixMode is true:
 *   Bundles all dry concentrates into 1 line: "مركز مسبق الخلط (شكاير)"
 *   Followed by individual roughage lines.
 */
export interface ConsolidatedBatchIngredientItem extends CalculatedBatchIngredient {
  isPremixConcentrate?: boolean;
  bagsCount?: number;
  bagWeightKg?: number;
  looseKg?: number;
  subIngredients?: Array<{
    name: string;
    code?: string;
    sharePercent: number;
    requiredKg: number;
    amountKgPerHead: number;
  }>;
}

export function calculateConsolidatedBatchIngredients(
  batchTargetWeightKg: number,
  ration: Ration | undefined,
  rawMaterials: RawMaterial[],
  usePremixMode: boolean = false,
  bagWeightKg: number = 50,
  actualWeights?: Record<string, number>
): ConsolidatedBatchIngredientItem[] {
  if (!ration || !ration.ingredients || ration.ingredients.length === 0 || batchTargetWeightKg <= 0) {
    return [];
  }

  const standardItems = calculateBatchIngredients(batchTargetWeightKg, ration, rawMaterials, actualWeights);

  if (!usePremixMode) {
    return standardItems;
  }

  const breakdown = getConcentrateAndRoughageBreakdown(ration, rawMaterials);
  if (breakdown.concentrateIngredients.length <= 1) {
    // If only 0 or 1 concentrate, no bundling needed
    return standardItems;
  }

  const safeBagWeight = Math.max(1, bagWeightKg || 50);

  // Separate concentrate items from roughage items
  const concentrateSubItems: Array<{
    name: string;
    code: string;
    sharePercent: number;
    requiredKg: number;
    amountKgPerHead: number;
  }> = [];

  let totalConcentrateRequiredKg = 0;
  let totalConcentrateAmountPerHead = 0;
  const roughageItems: ConsolidatedBatchIngredientItem[] = [];

  standardItems.forEach((item) => {
    const rawMat = rawMaterials.find((rm) => rm.id === item.rawMaterialId);
    const rationIng = ration.ingredients.find((ri) => ri.rawMaterialId === item.rawMaterialId);
    if (isIngredientInConcentratePremix(rationIng, rawMat)) {
      totalConcentrateRequiredKg += item.requiredKg;
      totalConcentrateAmountPerHead += item.amountKgPerHead;
      const share = breakdown.concentrateTotalKgPerHead > 0
        ? (item.amountKgPerHead / breakdown.concentrateTotalKgPerHead) * 100
        : 0;
      concentrateSubItems.push({
        name: item.name,
        code: item.code,
        sharePercent: Math.round(share * 10) / 10,
        requiredKg: item.requiredKg,
        amountKgPerHead: item.amountKgPerHead,
      });
    } else {
      roughageItems.push(item);
    }
  });

  totalConcentrateRequiredKg = Math.round(totalConcentrateRequiredKg * 10) / 10;
  totalConcentrateAmountPerHead = Math.round(totalConcentrateAmountPerHead * 100) / 100;

  const bagsCount = Math.floor(totalConcentrateRequiredKg / safeBagWeight);
  const looseKg = Math.round((totalConcentrateRequiredKg % safeBagWeight) * 10) / 10;

  const actualConcentrateKg = actualWeights?.['PREMIX_CONCENTRATE'] !== undefined
    ? actualWeights['PREMIX_CONCENTRATE']
    : totalConcentrateRequiredKg;

  const premixRow: ConsolidatedBatchIngredientItem = {
    rawMaterialId: 'PREMIX_CONCENTRATE',
    code: 'CONC-BAGS',
    name: `علف مركز جاهز مسبق الخلط (موزون في شكاير ${safeBagWeight} كجم)`,
    unit: 'كجم',
    amountKgPerHead: totalConcentrateAmountPerHead,
    requiredKg: totalConcentrateRequiredKg,
    actualKg: actualConcentrateKg,
    diffKg: Math.round((actualConcentrateKg - totalConcentrateRequiredKg) * 10) / 10,
    isPremixConcentrate: true,
    bagsCount,
    bagWeightKg: safeBagWeight,
    looseKg,
    subIngredients: concentrateSubItems,
  };

  return [premixRow, ...roughageItems];
}

export interface CategoryEconomicsItem {
  categoryId: string;
  categoryName: string;
  categoryType: 'milking' | 'fattening' | 'dry' | 'heifer' | 'calf' | 'other';
  barnCount: number;
  barnNames: string[];
  totalHeads: number;
  dailyDemandKg: number;
  dailyDemandTons: number;
  rationId?: string;
  rationName: string;
  rationCostPerKg: number; // تكلفة كيلو العليقة (ج.م/كجم)
  totalDailyFeedCost: number; // إجمالي تكلفة العلف اليومية للفئة (ج.م)
  feedCostPerHeadPerDay: number; // تكلفة العلف للرأس/يوم (ج.م)
  feedCostSharePercent: number; // حصة الفئة من إجمالي تكلفة علف المزرعة %
  // Financial Returns
  isRevenueGenerating: boolean;
  revenueTypeLabel: string;
  dailyRevenue: number; // إيراد الفئة اليومي (ج.م)
  revenuePerHeadPerDay: number; // إيراد الرأس باليوم (ج.م)
  netMarginOverFeed: number; // العائد فوق تكلفة العلف للفئة (IOFC / MOFC) (ج.م)
  netMarginPerHeadPerDay: number; // صافي العائد للرأس/يوم (ج.م)
  feedCostPercentOfRevenue: number; // نسبة تكلفة العلف من الإيراد % (للفئات الإنتاجية)
  // Milking specific
  milkTotalKg?: number;
  milkAveragePerHead?: number;
  milkPricePerKg?: number;
  feedCostPerKgMilk?: number;
  // Fattening specific
  adgKg?: number;
  liveMeatPricePerKg?: number;
  totalDailyGainKg?: number;
  feedCostPerKgGain?: number;
}

export interface WholeFarmEconomicsSummary {
  totalFarmHeads: number;
  activeBarnsCount: number;
  totalFarmDemandKg: number;
  totalFarmDemandTons: number;
  totalFarmDailyFeedCost: number; // إجمالي تكلفة علف كل الفئات بلا استثناء
  averageFeedCostPerHead: number; // متوسط تكلفة علف الرأس على مستوى كل المزرعة
  // Revenues
  totalMilkRevenue: number;
  totalMeatGainRevenue: number;
  totalFarmDailyRevenue: number; // إجمالي الإيرادات اليومية المقدرة
  averageRevenuePerHead: number;
  // Whole Farm Net Margins
  wholeFarmNetMarginOverFeed: number; // صافي المزرعة اليومي بعد تغذية الكل = إجمالي الإيرادات - إجمالي علف كل القطعان
  wholeFarmNetMarginPerHead: number; // صافي الربح اليومي لكل رأس بالمزرعة
  wholeFarmFeedCostPercentOfRevenue: number; // نسبة العلف الشامل من إجمالي الدخل %
  // Dairy IOFC isolated
  dairyOnlyFeedCost: number;
  dairyOnlyRevenue: number;
  dairyOnlyIofc: number;
  dairyTotalHeads: number;
  dairyAverageIofcPerHead: number;
  // Fattening MOFC isolated
  fatteningOnlyFeedCost: number;
  fatteningOnlyRevenue: number;
  fatteningOnlyMofc: number;
  fatteningTotalHeads: number;
  fatteningAverageMofcPerHead: number;
  // Non-producing / investment herd cost (dry, heifers, calves, etc.)
  nonProducingFeedCost: number; // تكلفة تغذية القطيع غير المدر (استثمار ورعاية)
  nonProducingHeads: number;
  nonProducingFeedSharePercent: number;
  // Simulation parameters used
  milkPricePerKg: number;
  liveMeatPricePerKg: number;
  fatteningAdgKg: number;
  // Breakdown list
  categoriesBreakdown: CategoryEconomicsItem[];
}

/**
 * Categorizes an animal category into standard operational types.
 */
export function detectCategoryType(categoryName: string): CategoryEconomicsItem['categoryType'] {
  const name = categoryName.toLowerCase();
  if (name.includes('حلاب') || name.includes('حليب') || name.includes('milk')) return 'milking';
  if (name.includes('تسمين') || name.includes('عجول') || name.includes('beef') || name.includes('fatten')) return 'fattening';
  if (name.includes('جاف') || name.includes('dry')) return 'dry';
  if (name.includes('عشار') || name.includes('نامي') || name.includes('بكير') || name.includes('heifer')) return 'heifer';
  if (name.includes('رضيع') || name.includes('فطام') || name.includes('calf') || name.includes('wean')) return 'calf';
  return 'other';
}

/**
 * Calculates Comprehensive Whole-Farm Economics and Category-by-Category Cost & Margin Analysis.
 */
export function calculateWholeFarmEconomics(
  categories: AnimalCategory[],
  barns: Barn[],
  rations: Ration[],
  rawMaterials: RawMaterial[],
  dailyPlan?: DailyOperationPlan,
  customParams?: {
    milkPricePerKg?: number;
    liveMeatPricePerKg?: number;
    fatteningAdgKg?: number;
  },
  settings?: FarmSettings
): WholeFarmEconomicsSummary {
  const activeBarns = barns.filter((b) => b.status === 'نشط');

  // Parameters
  const milkPrice = customParams?.milkPricePerKg !== undefined
    ? customParams.milkPricePerKg
    : dailyPlan?.milkProduction?.milkPricePerKg ?? settings?.defaultMilkPricePerKg ?? 20.0;

  const meatPrice = customParams?.liveMeatPricePerKg !== undefined
    ? customParams.liveMeatPricePerKg
    : dailyPlan?.fatteningMeatPricePerKg ?? settings?.defaultMeatPricePerKg ?? 175.0;

  const fatteningAdg = customParams?.fatteningAdgKg !== undefined
    ? customParams.fatteningAdgKg
    : dailyPlan?.fatteningAdgKg ?? 1.5;

  // Total milk produced today
  const milkSessions = dailyPlan?.milkProduction?.sessions || [];
  const totalMilkKg = milkSessions.reduce((sum, s) => sum + (Number(s.amountKg) || 0), 0);

  // First pass: Calculate feed costs and heads per category
  let totalFarmDemandKg = 0;
  let totalFarmDailyFeedCost = 0;
  let totalFarmHeads = 0;

  // Count total milking heads across all milking categories to apportion milk if necessary
  let totalMilkingHeadsInFarm = 0;
  categories.forEach((cat) => {
    if (detectCategoryType(cat.name) === 'milking') {
      const catBarns = activeBarns.filter((b) => b.categoryId === cat.id);
      const heads = catBarns.reduce((s, b) => s + (getBarnDailyState(b, dailyPlan).headCount || 0), 0);
      totalMilkingHeadsInFarm += heads;
    }
  });

  const categoryItems: CategoryEconomicsItem[] = categories.map((category) => {
    const catType = detectCategoryType(category.name);
    const catBarns = activeBarns.filter((b) => b.categoryId === category.id);
    const barnNames = catBarns.map((b) => {
      const bState = getBarnDailyState(b, dailyPlan);
      return bState.displayNumber || b.number || b.name;
    });

    const heads = catBarns.reduce((s, b) => s + (getBarnDailyState(b, dailyPlan).headCount || 0), 0);
    totalFarmHeads += heads;

    // Daily demand & feed cost for this category
    let catDemandKg = 0;
    let catFeedCost = 0;

    catBarns.forEach((barn) => {
      const bDemand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
      const bRation = getBarnRation(barn, categories, rations, dailyPlan);
      const bCostPerKg = calculateRationCostPerKg(bRation, rawMaterials);
      catDemandKg += bDemand;
      catFeedCost += bDemand * bCostPerKg;
    });

    catDemandKg = Math.round(catDemandKg * 10) / 10;
    catFeedCost = Math.round(catFeedCost * 100) / 100;
    totalFarmDemandKg += catDemandKg;
    totalFarmDailyFeedCost += catFeedCost;

    const defaultRation = rations.find((r) => r.id === category.rationId);
    const defaultRationCost = defaultRation ? calculateRationCostPerKg(defaultRation, rawMaterials) : 0;
    const avgRationCostPerKg = catDemandKg > 0
      ? Math.round((catFeedCost / catDemandKg) * 100) / 100
      : defaultRationCost;

    const feedCostPerHead = heads > 0 ? Math.round((catFeedCost / heads) * 100) / 100 : 0;

    // Revenues & margins by category type
    let isRevenueGenerating = false;
    let revenueTypeLabel = 'تكلفة رعاية واستثمار مستقبلي';
    let dailyRevenue = 0;
    let netMarginOverFeed = -catFeedCost;
    let milkTotalKgCat: number | undefined;
    let milkAvgHead: number | undefined;
    let feedCostPerKgMilk: number | undefined;
    let adgCat: number | undefined;
    let totalDailyGainKg: number | undefined;
    let feedCostPerKgGain: number | undefined;

    if (catType === 'milking') {
      isRevenueGenerating = true;
      revenueTypeLabel = 'عائد إنتاج الحليب';
      // If multiple milking categories, apportion milk by heads
      const share = totalMilkingHeadsInFarm > 0 ? heads / totalMilkingHeadsInFarm : 1;
      milkTotalKgCat = Math.round(totalMilkKg * share * 10) / 10;
      dailyRevenue = Math.round(milkTotalKgCat * milkPrice * 100) / 100;
      netMarginOverFeed = Math.round((dailyRevenue - catFeedCost) * 100) / 100;
      milkAvgHead = heads > 0 ? Math.round((milkTotalKgCat / heads) * 100) / 100 : 0;
      feedCostPerKgMilk = milkTotalKgCat > 0 ? Math.round((catFeedCost / milkTotalKgCat) * 100) / 100 : 0;
    } else if (catType === 'fattening') {
      isRevenueGenerating = true;
      revenueTypeLabel = 'عائد التحويل والنمو الوزني';
      adgCat = fatteningAdg;
      totalDailyGainKg = Math.round(heads * fatteningAdg * 10) / 10;
      dailyRevenue = Math.round(totalDailyGainKg * meatPrice * 100) / 100;
      netMarginOverFeed = Math.round((dailyRevenue - catFeedCost) * 100) / 100;
      feedCostPerKgGain = fatteningAdg > 0 && heads > 0
        ? Math.round((feedCostPerHead / fatteningAdg) * 100) / 100
        : 0;
    }

    const revenuePerHead = heads > 0 ? Math.round((dailyRevenue / heads) * 100) / 100 : 0;
    const netMarginPerHead = heads > 0 ? Math.round((netMarginOverFeed / heads) * 100) / 100 : 0;
    const feedCostPercentOfRevenue = dailyRevenue > 0
      ? Math.round((catFeedCost / dailyRevenue) * 1000) / 10
      : 0;

    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryType: catType,
      barnCount: catBarns.length,
      barnNames,
      totalHeads: heads,
      dailyDemandKg: catDemandKg,
      dailyDemandTons: Math.round((catDemandKg / 1000) * 100) / 100,
      rationId: category.rationId,
      rationName: defaultRation?.name || 'غير محددة',
      rationCostPerKg: avgRationCostPerKg,
      totalDailyFeedCost: catFeedCost,
      feedCostPerHeadPerDay: feedCostPerHead,
      feedCostSharePercent: 0, // Calculated below
      isRevenueGenerating,
      revenueTypeLabel,
      dailyRevenue,
      revenuePerHeadPerDay: revenuePerHead,
      netMarginOverFeed,
      netMarginPerHeadPerDay: netMarginPerHead,
      feedCostPercentOfRevenue,
      milkTotalKg: milkTotalKgCat,
      milkAveragePerHead: milkAvgHead,
      milkPricePerKg: catType === 'milking' ? milkPrice : undefined,
      feedCostPerKgMilk,
      adgKg: adgCat,
      liveMeatPricePerKg: catType === 'fattening' ? meatPrice : undefined,
      totalDailyGainKg,
      feedCostPerKgGain,
    };
  });

  // Calculate share of total feed cost for each category
  categoryItems.forEach((item) => {
    item.feedCostSharePercent = totalFarmDailyFeedCost > 0
      ? Math.round((item.totalDailyFeedCost / totalFarmDailyFeedCost) * 1000) / 10
      : 0;
  });

  // Aggregate Farm Revenues & Groups
  let totalMilkRevenue = 0;
  let totalMeatGainRevenue = 0;

  let dairyOnlyFeedCost = 0;
  let dairyOnlyRevenue = 0;
  let dairyTotalHeads = 0;

  let fatteningOnlyFeedCost = 0;
  let fatteningOnlyRevenue = 0;
  let fatteningTotalHeads = 0;

  let nonProducingFeedCost = 0;
  let nonProducingHeads = 0;

  categoryItems.forEach((item) => {
    if (item.categoryType === 'milking') {
      dairyOnlyFeedCost += item.totalDailyFeedCost;
      dairyOnlyRevenue += item.dailyRevenue;
      dairyTotalHeads += item.totalHeads;
      totalMilkRevenue += item.dailyRevenue;
    } else if (item.categoryType === 'fattening') {
      fatteningOnlyFeedCost += item.totalDailyFeedCost;
      fatteningOnlyRevenue += item.dailyRevenue;
      fatteningTotalHeads += item.totalHeads;
      totalMeatGainRevenue += item.dailyRevenue;
    } else {
      nonProducingFeedCost += item.totalDailyFeedCost;
      nonProducingHeads += item.totalHeads;
    }
  });

  totalMilkRevenue = Math.round(totalMilkRevenue * 100) / 100;
  totalMeatGainRevenue = Math.round(totalMeatGainRevenue * 100) / 100;
  const totalFarmDailyRevenue = Math.round((totalMilkRevenue + totalMeatGainRevenue) * 100) / 100;

  totalFarmDailyFeedCost = Math.round(totalFarmDailyFeedCost * 100) / 100;
  const wholeFarmNetMarginOverFeed = Math.round((totalFarmDailyRevenue - totalFarmDailyFeedCost) * 100) / 100;

  const averageFeedCostPerHead = totalFarmHeads > 0
    ? Math.round((totalFarmDailyFeedCost / totalFarmHeads) * 100) / 100
    : 0;

  const averageRevenuePerHead = totalFarmHeads > 0
    ? Math.round((totalFarmDailyRevenue / totalFarmHeads) * 100) / 100
    : 0;

  const wholeFarmNetMarginPerHead = totalFarmHeads > 0
    ? Math.round((wholeFarmNetMarginOverFeed / totalFarmHeads) * 100) / 100
    : 0;

  const wholeFarmFeedCostPercentOfRevenue = totalFarmDailyRevenue > 0
    ? Math.round((totalFarmDailyFeedCost / totalFarmDailyRevenue) * 1000) / 10
    : 0;

  const dairyOnlyIofc = Math.round((dairyOnlyRevenue - dairyOnlyFeedCost) * 100) / 100;
  const dairyAverageIofcPerHead = dairyTotalHeads > 0
    ? Math.round((dairyOnlyIofc / dairyTotalHeads) * 100) / 100
    : 0;

  const fatteningOnlyMofc = Math.round((fatteningOnlyRevenue - fatteningOnlyFeedCost) * 100) / 100;
  const fatteningAverageMofcPerHead = fatteningTotalHeads > 0
    ? Math.round((fatteningOnlyMofc / fatteningTotalHeads) * 100) / 100
    : 0;

  const nonProducingFeedSharePercent = totalFarmDailyFeedCost > 0
    ? Math.round((nonProducingFeedCost / totalFarmDailyFeedCost) * 1000) / 10
    : 0;

  return {
    totalFarmHeads,
    activeBarnsCount: activeBarns.length,
    totalFarmDemandKg: Math.round(totalFarmDemandKg * 10) / 10,
    totalFarmDemandTons: Math.round((totalFarmDemandKg / 1000) * 100) / 100,
    totalFarmDailyFeedCost,
    averageFeedCostPerHead,
    totalMilkRevenue,
    totalMeatGainRevenue,
    totalFarmDailyRevenue,
    averageRevenuePerHead,
    wholeFarmNetMarginOverFeed,
    wholeFarmNetMarginPerHead,
    wholeFarmFeedCostPercentOfRevenue,
    dairyOnlyFeedCost: Math.round(dairyOnlyFeedCost * 100) / 100,
    dairyOnlyRevenue: Math.round(dairyOnlyRevenue * 100) / 100,
    dairyOnlyIofc,
    dairyTotalHeads,
    dairyAverageIofcPerHead,
    fatteningOnlyFeedCost: Math.round(fatteningOnlyFeedCost * 100) / 100,
    fatteningOnlyRevenue: Math.round(fatteningOnlyRevenue * 100) / 100,
    fatteningOnlyMofc,
    fatteningTotalHeads,
    fatteningAverageMofcPerHead,
    nonProducingFeedCost: Math.round(nonProducingFeedCost * 100) / 100,
    nonProducingHeads,
    nonProducingFeedSharePercent,
    milkPricePerKg: milkPrice,
    liveMeatPricePerKg: meatPrice,
    fatteningAdgKg: fatteningAdg,
    categoriesBreakdown: categoryItems,
  };
}

