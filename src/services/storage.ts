import {
  RawMaterial,
  Ration,
  AnimalCategory,
  Barn,
  Mixer,
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
} from '../data/initialData';

const KEYS = {
  RAW_MATERIALS: 'farm_feed_raw_materials_v1',
  RATIONS: 'farm_feed_rations_v1',
  CATEGORIES: 'farm_feed_categories_v1',
  BARNS: 'farm_feed_barns_v1',
  MIXERS: 'farm_feed_mixers_v1',
  DAILY_PLANS: 'farm_feed_daily_plans_v1', // Record<date, DailyOperationPlan>
  SETTINGS: 'farm_feed_settings_v1',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export function loadRawMaterials(): RawMaterial[] {
  return getItem<RawMaterial[]>(KEYS.RAW_MATERIALS, initialRawMaterials);
}

export function saveRawMaterials(items: RawMaterial[]): void {
  setItem(KEYS.RAW_MATERIALS, items);
}

export function loadRations(): Ration[] {
  return getItem<Ration[]>(KEYS.RATIONS, initialRations);
}

export function saveRations(items: Ration[]): void {
  setItem(KEYS.RATIONS, items);
}

export function loadCategories(): AnimalCategory[] {
  return getItem<AnimalCategory[]>(KEYS.CATEGORIES, initialCategories);
}

export function saveCategories(items: AnimalCategory[]): void {
  setItem(KEYS.CATEGORIES, items);
}

export function loadBarns(): Barn[] {
  return getItem<Barn[]>(KEYS.BARNS, initialBarns);
}

export function saveBarns(items: Barn[]): void {
  setItem(KEYS.BARNS, items);
}

export function loadMixers(): Mixer[] {
  return getItem<Mixer[]>(KEYS.MIXERS, initialMixers);
}

export function saveMixers(items: Mixer[]): void {
  setItem(KEYS.MIXERS, items);
}

export function loadSettings(): FarmSettings {
  return getItem<FarmSettings>(KEYS.SETTINGS, initialSettings);
}

export function saveSettings(settings: FarmSettings): void {
  setItem(KEYS.SETTINGS, settings);
}

export function loadDailyPlan(dateStr: string): DailyOperationPlan {
  const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
  if (plans[dateStr]) {
    return plans[dateStr];
  }
  // If date matches initialDailyPlan date, return initialDailyPlan
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr === todayStr || dateStr === initialDailyPlan.date) {
    const plan = { ...initialDailyPlan, date: dateStr };
    saveDailyPlan(plan);
    return plan;
  }
  // Otherwise create clean new plan for this date
  const newPlan: DailyOperationPlan = {
    date: dateStr,
    batches: [],
    notes: `خطة التغذية اليومية لتاريخ ${dateStr}`,
  };
  return newPlan;
}

export function saveDailyPlan(plan: DailyOperationPlan): void {
  if (!plan || !plan.date) return;
  const plans = getItem<Record<string, DailyOperationPlan>>(KEYS.DAILY_PLANS, {});
  plans[plan.date] = plan;
  setItem(KEYS.DAILY_PLANS, plans);
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

export function resetAllDataToDemo(): void {
  setItem(KEYS.RAW_MATERIALS, initialRawMaterials);
  setItem(KEYS.RATIONS, initialRations);
  setItem(KEYS.CATEGORIES, initialCategories);
  setItem(KEYS.BARNS, initialBarns);
  setItem(KEYS.MIXERS, initialMixers);
  setItem(KEYS.SETTINGS, initialSettings);

  const todayStr = new Date().toISOString().split('T')[0];
  const initialPlanWithToday = { ...initialDailyPlan, date: todayStr };
  const plans: Record<string, DailyOperationPlan> = { [todayStr]: initialPlanWithToday };
  setItem(KEYS.DAILY_PLANS, plans);
}
