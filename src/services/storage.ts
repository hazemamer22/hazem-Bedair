import {
  RawMaterial,
  Ration,
  AnimalCategory,
  Barn,
  Mixer,
  MixBatch,
  BarnAllocation,
  DailyOperationPlan,
  FarmSettings,
} from '../types';
import {
  initialRawMaterials,
  initialRations,
  initialCategories,
  initialBarns,
  initialMixers,
  initialDailyPlan,
  initialSettings,
  getInitialDemoData,
} from '../data/initialData';
import { calculateBarnDailyDemand, doesBatchBelongToCategory } from '../utils/calculations';
import { generateId } from '../utils/idGenerator';

const KEYS = {
  RAW_MATERIALS: 'farm_feed_raw_materials_v2',
  RATIONS: 'farm_feed_rations_v2',
  CATEGORIES: 'farm_feed_categories_v2',
  BARNS: 'farm_feed_barns_v2',
  MIXERS: 'farm_feed_mixers_v2',
  DAILY_PLANS: 'farm_feed_daily_plans_v2', // Record<date, DailyOperationPlan>
  DEFAULT_BATCH_TEMPLATE: 'farm_feed_default_batches_template_v2', // MixBatch[]
  SETTINGS: 'farm_feed_settings_v2',
};

const memoryCache: Record<string, any> = {};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : defaultValue;
    memoryCache[key] = parsed;
    return parsed;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    memoryCache[key] = value;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('farm_storage_error', {
          detail: { key, error: err },
        })
      );
    }
  }
}

export function loadRawMaterials(): RawMaterial[] {
  const loaded = getItem<any>(KEYS.RAW_MATERIALS, initialRawMaterials);
  if (Array.isArray(loaded) && loaded.length > 0) return loaded;
  if (loaded && typeof loaded === 'object') {
    const vals = Array.isArray(loaded.rawMaterials) ? loaded.rawMaterials : Object.values(loaded);
    if (Array.isArray(vals) && vals.length > 0 && (vals[0] as any)?.name) {
      setItem(KEYS.RAW_MATERIALS, vals);
      return vals as RawMaterial[];
    }
  }
  return initialRawMaterials;
}

export function saveRawMaterials(items: RawMaterial[]): void {
  if (Array.isArray(items)) {
    setItem(KEYS.RAW_MATERIALS, items);
  }
}

export function loadRations(): Ration[] {
  const loaded = getItem<any>(KEYS.RATIONS, initialRations);
  if (Array.isArray(loaded) && loaded.length > 0) return loaded;
  if (loaded && typeof loaded === 'object') {
    const vals = Array.isArray(loaded.rations) ? loaded.rations : Object.values(loaded);
    if (Array.isArray(vals) && vals.length > 0 && (vals[0] as any)?.name) {
      setItem(KEYS.RATIONS, vals);
      return vals as Ration[];
    }
  }
  return initialRations;
}

export function saveRations(items: Ration[]): void {
  if (Array.isArray(items)) {
    setItem(KEYS.RATIONS, items);
  }
}

export function loadCategories(): AnimalCategory[] {
  const loaded = getItem<any>(KEYS.CATEGORIES, initialCategories);
  if (Array.isArray(loaded) && loaded.length > 0) return loaded;
  if (loaded && typeof loaded === 'object') {
    const vals = Array.isArray(loaded.categories) ? loaded.categories : Object.values(loaded);
    if (Array.isArray(vals) && vals.length > 0 && (vals[0] as any)?.name) {
      setItem(KEYS.CATEGORIES, vals);
      return vals as AnimalCategory[];
    }
  }
  return initialCategories;
}

export function saveCategories(items: AnimalCategory[]): void {
  if (Array.isArray(items)) {
    setItem(KEYS.CATEGORIES, items);
  }
}

export function loadBarns(): Barn[] {
  const loaded = getItem<any>(KEYS.BARNS, initialBarns);
  const arr: Barn[] = Array.isArray(loaded) && loaded.length > 0
    ? loaded
    : (loaded && typeof loaded === 'object' && Array.isArray(loaded.barns)
        ? loaded.barns
        : initialBarns);
  return [...arr].sort((a, b) => {
    const orderA = a.orderIndex !== undefined ? a.orderIndex : 9999;
    const orderB = b.orderIndex !== undefined ? b.orderIndex : 9999;
    return orderA - orderB;
  });
}

export function saveBarns(items: Barn[]): void {
  if (Array.isArray(items)) {
    const ordered = items.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    setItem(KEYS.BARNS, ordered);
  }
}

export function loadMixers(): Mixer[] {
  const loaded = getItem<any>(KEYS.MIXERS, initialMixers);
  if (Array.isArray(loaded) && loaded.length > 0) return loaded;
  if (loaded && typeof loaded === 'object') {
    const vals = Array.isArray(loaded.mixers) ? loaded.mixers : Object.values(loaded);
    if (Array.isArray(vals) && vals.length > 0 && (vals[0] as any)?.name) {
      setItem(KEYS.MIXERS, vals);
      return vals as Mixer[];
    }
  }
  return initialMixers;
}

export function saveMixers(items: Mixer[]): void {
  if (Array.isArray(items)) {
    setItem(KEYS.MIXERS, items);
  }
}

export function loadSettings(): FarmSettings {
  const loaded = getItem<Partial<FarmSettings>>(KEYS.SETTINGS, initialSettings);
  return {
    ...initialSettings,
    ...(loaded || {}),
  };
}

export function saveSettings(settings: FarmSettings): void {
  setItem(KEYS.SETTINGS, settings);
}

export function saveMasterBatchTemplate(batches: MixBatch[]): void {
  const cleanTemplate: MixBatch[] = batches.map((b) => ({
    id: b.id,
    batchNumber: b.batchNumber,
    mixerId: b.mixerId,
    categoryId: b.categoryId,
    time: b.time,
    targetWeightKg: b.targetWeightKg,
    status: 'مخططة',
    allocations: (b.allocations || []).map((a) => ({
      barnId: a.barnId,
      allocatedPercent: a.allocatedPercent !== undefined ? a.allocatedPercent : 100,
      allocatedKg: a.allocatedKg || 0,
    })),
    notes: b.notes,
  }));
  setItem(KEYS.DEFAULT_BATCH_TEMPLATE, cleanTemplate);
}

export function loadMasterBatchTemplate(): MixBatch[] | null {
  return getItem<MixBatch[] | null>(KEYS.DEFAULT_BATCH_TEMPLATE, null);
}

export function cloneBatchesFromTemplate(
  sourceBatches: MixBatch[],
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  targetPlan?: DailyOperationPlan
): MixBatch[] {
  return sourceBatches.map((b, idx) => {
    const newAllocations: BarnAllocation[] = (b.allocations || []).map((alloc) => {
      const barn = barns.find((bn) => bn.id === alloc.barnId);
      const demand = barn ? calculateBarnDailyDemand(barn, categories, rations, targetPlan) : 0;
      const pct =
        alloc.allocatedPercent !== undefined
          ? Number(alloc.allocatedPercent)
          : demand > 0
          ? (alloc.allocatedKg / demand) * 100
          : 0;
      const newKg = Math.round(((demand * pct) / 100) * 1000) / 1000;
      return {
        barnId: alloc.barnId,
        allocatedPercent: Math.round(pct * 1000) / 1000,
        allocatedKg: newKg,
      };
    });

    const totalDerivedWeight = newAllocations.reduce((sum, a) => sum + a.allocatedKg, 0);

    return {
      id: generateId('batch'),
      batchNumber: b.batchNumber,
      mixerId: b.mixerId,
      categoryId: b.categoryId,
      time: b.time,
      targetWeightKg: totalDerivedWeight > 0 ? totalDerivedWeight : b.targetWeightKg,
      status: 'مخططة',
      allocations: newAllocations,
      notes: b.notes,
    };
  });
}

/**
 * Automatically sanitizes, fixes, and removes duplicates from mixer batches:
 * 1. Removes obsolete zero-weight / zero-head batches.
 * 2. Cures legacy 2016 kg Fattening batch (from 12.6 kg/head) by updating it to 2520 kg (15.75 kg/head).
 * 3. Removes duplicate batches for single-batch categories like Fattening (cat-2) and Grower (cat-3),
 *    consolidating them into a single clean batch covering 100% of the active barns.
 */
export function sanitizeBatches(
  rawBatches: MixBatch[],
  barns: Barn[],
  categories: AnimalCategory[],
  rations: Ration[],
  plan?: DailyOperationPlan
): { batches: MixBatch[]; changed: boolean } {
  let changed = false;
  let batches = [...(rawBatches || [])];

  // 1. Remove empty/invalid batches
  const prevLen = batches.length;
  batches = batches.filter((b) => {
    if (!b) return false;
    if ((b.targetWeightKg || 0) <= 0 && (!b.allocations || b.allocations.length === 0)) {
      return false;
    }
    if (b.allocations && b.allocations.length > 0) {
      const assignedBarns = barns.filter((barn) => b.allocations?.some((a) => a.barnId === barn.id));
      if (assignedBarns.length > 0 && assignedBarns.every((barn) => barn.headCount === 0)) {
        return false;
      }
    }
    return true;
  });
  if (batches.length !== prevLen) {
    changed = true;
  }

  // 2. Dynamically sanitize and update batches per category based on actual user barns
  const sanitizedAllBatches: MixBatch[] = [];

  for (const cat of categories) {
    const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
    const catDemand = catBarns.reduce(
      (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, plan),
      0
    );

    let catBatches = batches.filter(
      (b) => b.categoryId === cat.id || doesBatchBelongToCategory(b, cat, barns)
    );

    // If duplicate batches exist, remove legacy 2016 kg batches and duplicates
    if (catBatches.length > 1) {
      const filtered2016 = catBatches.filter((b) => Math.abs((Number(b.targetWeightKg) || 0) - 2016) >= 5);
      if (filtered2016.length > 0) {
        catBatches = filtered2016;
        changed = true;
      }

      // Deduplicate batches by batchNumber or id if they are duplicates of a single batch
      const deduped: MixBatch[] = [];
      for (const b of catBatches) {
        if (!deduped.some((d) => d.id === b.id || (d.batchNumber === b.batchNumber && catBatches.length > catBarns.length))) {
          deduped.push(b);
        } else {
          changed = true;
        }
      }
      catBatches = deduped;
    }

    // Process allocations and weights dynamically for this category
    for (const b of catBatches) {
      b.categoryId = cat.id;

      // Filter allocations to only include active barns that belong to THIS category
      let validAllocations = (b.allocations || []).filter((a) =>
        catBarns.some((cb) => cb.id === a.barnId)
      );

      // If single batch for this category or allocations are missing, allocate 100% to all category barns
      if (catBatches.length === 1 || validAllocations.length === 0) {
        validAllocations = catBarns.map((barn) => {
          const demand = calculateBarnDailyDemand(barn, categories, rations, plan);
          return {
            barnId: barn.id,
            allocatedPercent: 100,
            allocatedKg: Math.round(demand * 1000) / 1000,
          };
        });
      } else {
        // If there are newly added barns in catBarns not present in this batch, check if they exist in other batches
        catBarns.forEach((barn) => {
          const existsInBatch = validAllocations.some((a) => a.barnId === barn.id);
          if (!existsInBatch) {
            // Check if this barn is allocated in any other batch in catBatches
            const allocatedElsewhere = catBatches.some((otherB) =>
              (otherB.allocations || []).some((oa) => oa.barnId === barn.id && (oa.allocatedPercent || 0) > 0)
            );
            if (!allocatedElsewhere) {
              // Automatically allocate 100% divided among batches or to the first batch
              const sharePercent = Math.round((100 / Math.max(1, catBatches.length)) * 10) / 10;
              const demand = calculateBarnDailyDemand(barn, categories, rations, plan);
              validAllocations.push({
                barnId: barn.id,
                allocatedPercent: sharePercent,
                allocatedKg: Math.round(((demand * sharePercent) / 100) * 1000) / 1000,
              });
              changed = true;
            }
          }
        });

        // Re-calculate allocatedKg from demand and percentage if not set or mismatched
        validAllocations = validAllocations.map((a) => {
          const barn = catBarns.find((cb) => cb.id === a.barnId);
          const demand = barn ? calculateBarnDailyDemand(barn, categories, rations, plan) : 0;
          const pct = a.allocatedPercent !== undefined ? a.allocatedPercent : 100;
          const expectedKg = Math.round(((demand * pct) / 100) * 1000) / 1000;
          const currentKg = Number(a.allocatedKg) || 0;
          const finalKg = Math.abs(currentKg - expectedKg) > 0.1 && expectedKg > 0 ? expectedKg : (currentKg || expectedKg);
          return {
            barnId: a.barnId,
            allocatedPercent: pct,
            allocatedKg: finalKg,
          };
        });
      }

      // Sort allocations strictly according to barn.orderIndex
      validAllocations.sort((a, b) => {
        const barnA = barns.find((bn) => bn.id === a.barnId);
        const barnB = barns.find((bn) => bn.id === b.barnId);
        const orderA = barnA?.orderIndex !== undefined ? barnA.orderIndex : 9999;
        const orderB = barnB?.orderIndex !== undefined ? barnB.orderIndex : 9999;
        return orderA - orderB;
      });

      const totalAllocatedWeight = validAllocations.reduce((sum, a) => sum + a.allocatedKg, 0);
      const currentTargetW = Number(b.targetWeightKg) || 0;
      const derivedTargetWeight = totalAllocatedWeight > 0
        ? (Math.abs(currentTargetW - totalAllocatedWeight) < 0.1 ? currentTargetW : totalAllocatedWeight)
        : (catDemand > 0 ? catDemand : currentTargetW);

      const weightDiff = Math.abs(currentTargetW - derivedTargetWeight);
      const lengthDiff = (b.allocations?.length || 0) !== validAllocations.length;
      const catDiff = b.categoryId !== cat.id;

      if (weightDiff > 0.1 || lengthDiff || catDiff) {
        changed = true;
      }

      sanitizedAllBatches.push({
        ...b,
        categoryId: cat.id,
        allocations: validAllocations,
        targetWeightKg: derivedTargetWeight,
      });
    }
  }

  // Include any other batches not associated with the known categories
  for (const b of batches) {
    if (!sanitizedAllBatches.some((sb) => sb.id === b.id)) {
      sanitizedAllBatches.push(b);
    }
  }

  batches = sanitizedAllBatches;

  // 4. Ensure no duplicate IDs
  const seen = new Set<string>();
  const finalBatches: MixBatch[] = [];
  batches.forEach((b) => {
    if (!seen.has(b.id)) {
      seen.add(b.id);
      finalBatches.push(b);
    } else {
      changed = true;
    }
  });

  return { batches: finalBatches, changed };
}

export function loadDailyPlan(dateStr: string): DailyOperationPlan {
  const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
  const barns = getItem<Barn[]>(KEYS.BARNS, initialBarns);
  const categories = getItem<AnimalCategory[]>(KEYS.CATEGORIES, initialCategories);
  const rations = getItem<Ration[]>(KEYS.RATIONS, initialRations);

  if (plans[dateStr]) {
    const plan = plans[dateStr];
    const { batches: cleanedBatches, changed } = sanitizeBatches(
      plan.batches || [],
      barns,
      categories,
      rations,
      plan
    );

    if (changed) {
      plan.batches = cleanedBatches;
      saveDailyPlan(plan);
    }

    return {
      ...plan,
      batches: cleanedBatches,
    };
  }

  // If plan for dateStr doesn't exist, find the best source template to carry over user's custom batch allocations
  const existingPlanDates = Object.keys(plans)
    .filter((d) => plans[d] && plans[d].batches && plans[d].batches.length > 0)
    .sort()
    .reverse();

  // Find most recent prior plan or any latest plan
  const priorDate = existingPlanDates.find((d) => d < dateStr) || existingPlanDates[0];
  let templateBatches: MixBatch[] = [];
  let sourceMilk = undefined;

  if (priorDate && plans[priorDate]) {
    templateBatches = plans[priorDate].batches || [];
    sourceMilk = plans[priorDate].milkProduction;
  } else {
    const savedTemplate = loadMasterBatchTemplate();
    if (savedTemplate && savedTemplate.length > 0) {
      const { batches: sanitizedTemplate, changed: templateChanged } = sanitizeBatches(
        savedTemplate,
        barns,
        categories,
        rations
      );
      if (templateChanged) {
        saveMasterBatchTemplate(sanitizedTemplate);
      }
      templateBatches = sanitizedTemplate;
    } else {
      templateBatches = initialDailyPlan.batches || [];
      sourceMilk = initialDailyPlan.milkProduction;
    }
  }

  // Create new plan with carried-over batch distribution percentages
  const newPlanBatches = cloneBatchesFromTemplate(templateBatches, barns, categories, rations);
  const { batches: finalizedBatches } = sanitizeBatches(newPlanBatches, barns, categories, rations);

  const newPlan: DailyOperationPlan = {
    date: dateStr,
    batches: finalizedBatches,
    notes: `خطة التغذية اليومية لتاريخ ${dateStr}`,
    milkProduction: sourceMilk
      ? {
          sessions: sourceMilk.sessions.map((s) => ({ ...s, amountKg: 0 })),
          refusalPercent: sourceMilk.refusalPercent || 4.5,
        }
      : undefined,
  };

  // Save the new plan so it's persisted for this date
  saveDailyPlan(newPlan);
  return newPlan;
}

export function loadAllDailyPlans(): Record<string, DailyOperationPlan> {
  return getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
}

export function saveAllDailyPlans(plans: Record<string, DailyOperationPlan>): void {
  setItem(KEYS.DAILY_PLANS, plans);
}

export function saveDailyPlan(plan: DailyOperationPlan): void {
  if (!plan || !plan.date) return;
  const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
  plans[plan.date] = plan;
  setItem(KEYS.DAILY_PLANS, plans);

  // Also update master template if plan has valid batches
  if (plan.batches && plan.batches.length > 0) {
    saveMasterBatchTemplate(plan.batches);
  }
}

export function getAllPlanDates(): string[] {
  const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
  const keys = Object.keys(plans);
  const todayStr = new Date().toISOString().split('T')[0];
  if (!keys.includes(todayStr)) {
    keys.push(todayStr);
  }
  return keys.sort().reverse();
}

export function resetAllDataToDemo(language: 'ar' | 'en' = 'ar', customSettings?: Partial<FarmSettings>): void {
  const demo = getInitialDemoData(language);
  const finalSettings: FarmSettings = {
    ...demo.settings,
    ...(customSettings || {}),
    language,
  };

  setItem(KEYS.RAW_MATERIALS, demo.rawMaterials);
  setItem(KEYS.RATIONS, demo.rations);
  setItem(KEYS.CATEGORIES, demo.categories);
  setItem(KEYS.BARNS, demo.barns);
  setItem(KEYS.MIXERS, demo.mixers);
  setItem(KEYS.SETTINGS, finalSettings);

  const todayStr = new Date().toISOString().split('T')[0];
  const initialPlanWithToday = { ...demo.dailyPlan, date: todayStr };
  const plans: Record<string, DailyOperationPlan> = { [todayStr]: initialPlanWithToday };
  setItem(KEYS.DAILY_PLANS, plans);
}

export function sanitizeAllStoredData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
    const barns = getItem<Barn[]>(KEYS.BARNS, initialBarns);
    const categories = getItem<AnimalCategory[]>(KEYS.CATEGORIES, initialCategories);
    const rations = getItem<Ration[]>(KEYS.RATIONS, initialRations);

    let changed = false;
    Object.keys(plans).forEach((dateKey) => {
      const p = plans[dateKey];
      if (p && p.batches) {
        const { batches: cleaned, changed: pChanged } = sanitizeBatches(p.batches, barns, categories, rations, p);
        if (pChanged) {
          plans[dateKey] = { ...p, batches: cleaned };
          changed = true;
        }
      }
    });

    if (changed) {
      setItem(KEYS.DAILY_PLANS, plans);
    }

    const template = loadMasterBatchTemplate();
    if (template && template.length > 0) {
      const { batches: cleanedTemplate, changed: templateChanged } = sanitizeBatches(template, barns, categories, rations);
      if (templateChanged) {
        saveMasterBatchTemplate(cleanedTemplate);
        changed = true;
      }
    }

    return changed;
  } catch {
    return false;
  }
}

// Automatically sanitize on load in browser environment
if (typeof window !== 'undefined') {
  try {
    sanitizeAllStoredData();
  } catch {
    // Ignore initial storage errors
  }
}
