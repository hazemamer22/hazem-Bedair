import React, { useState, useMemo } from 'react';
import {
  DailyOperationPlan,
  MixBatch,
  AnimalCategory,
  Mixer,
  Barn,
  BarnAllocation,
  Ration,
  RawMaterial,
} from '../../types';
import {
  calculateCategoryTotalDemand,
  calculateRationTotalKgPerHead,
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  calculateBarnDailyDemand,
  calculateCategoryDailyDemandKg,
  calculatePeriodicCoverageDays,
  calculatePeriodicBatchWeightFromDays,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateAvailableMilkingRefusalPool,
  getBarnRation,
  getBarnDailyState,
  getBatchDerivedTargetWeightKg,
} from '../../utils/calculations';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Scale,
  Calendar,
  Percent,
  Beef,
  Wheat,
  ListFilter,
  Calculator,
  Zap,
  Sparkles,
  RefreshCw,
  Sliders,
  Layers,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportDailyPlanToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { sanitizeBatches, saveDailyPlan } from '../../services/storage';

interface DailyPlanViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  mixers: Mixer[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  rations: Ration[];
  rawMaterials: RawMaterial[];
}

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  mixers,
  barns,
  setBarns,
  rations,
  rawMaterials,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const [activeSubTab, setActiveSubTab] = useState<'program' | 'batches'>('program');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedRefusalTargetCategory, setSelectedRefusalTargetCategory] = useState<string>('all_eligible');
  const [selectedDate, setSelectedDate] = useState<string>(
    dailyPlan.date || new Date().toISOString().split('T')[0]
  );

  // Non-milking categories eligible to receive recycled refusal
  const nonMilkingCategories = useMemo(() => {
    return categories.filter((c) => {
      const name = (c.name || '').toLowerCase();
      return !name.includes('حلاب') && !name.includes('حليب') && !name.includes('milk');
    });
  }, [categories]);

  // Modal state for Batches
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<MixBatch | null>(null);

  // Form states for Batch
  const [batchNumber, setBatchNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mixerId, setMixerId] = useState('');
  const [time, setTime] = useState('06:00 ص');
  const [targetWeightKg, setTargetWeightKg] = useState<number>(3000);
  const [status, setStatus] = useState<MixBatch['status']>('مخططة');
  const [notes, setNotes] = useState('');

  const batches = dailyPlan.batches || [];

  // Update feeding ratio inline in the table
  const handleFeedingRatioChange = (barnId: string, newRatio: number) => {
    const clampedRatio = Math.max(1, Math.min(200, isNaN(newRatio) ? 100 : newRatio));
    const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, feedingRatioPercent: clampedRatio } : b));
    if (setBarns) {
      setBarns(updatedBarns);
    }

    const currentBarn = barns.find((b) => b.id === barnId);
    const prevDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
      barnId,
      headCount: currentBarn?.headCount || 0,
      feedingRatioPercent: currentBarn?.feedingRatioPercent || 100,
      rationId: currentBarn?.rationId,
    };

    const nextDailyPlan: DailyOperationPlan = {
      ...dailyPlan,
      dailyBarnStates: {
        ...(dailyPlan.dailyBarnStates || {}),
        [barnId]: {
          ...prevDailyBarnState,
          feedingRatioPercent: clampedRatio,
        },
      },
    };

    // Recalculate batch allocatedKg for allocations with allocatedPercent
    const updatedBatches = (dailyPlan.batches || []).map((b) => {
      if (!b.allocations || b.allocations.length === 0) return b;
      let changed = false;
      const newAllocs = b.allocations.map((a) => {
        if (a.allocatedPercent !== undefined) {
          const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextDailyPlan) : 0;
          const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
          if (newAllocatedKg !== a.allocatedKg) {
            changed = true;
          }
          return { ...a, allocatedKg: newAllocatedKg };
        }
        return a;
      });

      if (changed) {
        const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
        return {
          ...b,
          allocations: newAllocs,
          targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg,
        };
      }
      return b;
    });

    setDailyPlan({
      ...nextDailyPlan,
      batches: updatedBatches,
    });
  };

  // Generic barn direct update handler
  const handleBarnUpdate = (barnId: string, updates: Partial<Barn>) => {
    const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, ...updates } : b));
    if (setBarns) {
      setBarns(updatedBarns);
    }

    const currentBarn = barns.find((b) => b.id === barnId);
    const prevDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
      barnId,
      headCount: currentBarn?.headCount || 0,
      feedingRatioPercent: currentBarn?.feedingRatioPercent || 100,
      rationId: currentBarn?.rationId,
      recycledRefusalAllocatedKg: currentBarn?.recycledRefusalAllocatedKg || 0,
    };

    const nextDailyPlan: DailyOperationPlan = {
      ...dailyPlan,
      dailyBarnStates: {
        ...(dailyPlan.dailyBarnStates || {}),
        [barnId]: {
          ...prevDailyBarnState,
          headCount: updates.headCount !== undefined ? updates.headCount : prevDailyBarnState.headCount,
          feedingRatioPercent:
            updates.feedingRatioPercent !== undefined
              ? updates.feedingRatioPercent
              : prevDailyBarnState.feedingRatioPercent,
          baseFeedKgPerHead:
            updates.baseFeedKgPerHead !== undefined
              ? updates.baseFeedKgPerHead
              : prevDailyBarnState.baseFeedKgPerHead,
          averageAgeDays:
            updates.averageAgeDays !== undefined
              ? updates.averageAgeDays
              : prevDailyBarnState.averageAgeDays,
          averageWeightKg:
            updates.averageWeightKg !== undefined
              ? updates.averageWeightKg
              : prevDailyBarnState.averageWeightKg,
          customDailyTotalKg:
            updates.customDailyTotalKg !== undefined
              ? updates.customDailyTotalKg
              : prevDailyBarnState.customDailyTotalKg,
          refusalType: updates.refusalType !== undefined ? updates.refusalType : prevDailyBarnState.refusalType,
          refusalValue: updates.refusalValue !== undefined ? updates.refusalValue : prevDailyBarnState.refusalValue,
          recycledRefusalAllocatedKg:
            updates.recycledRefusalAllocatedKg !== undefined
              ? updates.recycledRefusalAllocatedKg
              : prevDailyBarnState.recycledRefusalAllocatedKg,
          rationId: updates.rationId !== undefined ? updates.rationId : prevDailyBarnState.rationId,
          displayName: updates.name !== undefined ? updates.name : prevDailyBarnState.displayName,
          displayNumber: updates.number !== undefined ? updates.number : prevDailyBarnState.displayNumber,
        },
      },
    };

    // Recalculate batch allocatedKg for allocations with allocatedPercent
    const updatedBatches = (dailyPlan.batches || []).map((b) => {
      if (!b.allocations || b.allocations.length === 0) return b;
      let changed = false;
      const newAllocs = b.allocations.map((a) => {
        if (a.allocatedPercent !== undefined) {
          const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextDailyPlan) : 0;
          const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
          if (newAllocatedKg !== a.allocatedKg) {
            changed = true;
          }
          return { ...a, allocatedKg: newAllocatedKg };
        }
        return a;
      });

      if (changed) {
        const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
        return {
          ...b,
          allocations: newAllocs,
          targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg,
        };
      }
      return b;
    });

    setDailyPlan({
      ...nextDailyPlan,
      batches: updatedBatches,
    });
  };

  // Recycled Refusal allocation update for a specific barn
  const handleRecycledRefusalChange = (barnId: string, kg: number) => {
    const clampedKg = Math.max(0, isNaN(kg) ? 0 : kg);
    handleBarnUpdate(barnId, { recycledRefusalAllocatedKg: clampedKg });
  };

  // Auto-distribute available milking refusal to selected category or categories
  const handleAutoDistributeMilkingRefusal = (targetScope: string = 'all_eligible') => {
    const pool = calculateAvailableMilkingRefusalPool(barns, categories, rations, dailyPlan);

    if (targetScope === 'clear') {
      const nextDailyBarnStates = { ...(dailyPlan.dailyBarnStates || {}) };
      const updatedBarns = barns.map((b) => {
        if (nextDailyBarnStates[b.id]) {
          nextDailyBarnStates[b.id] = {
            ...nextDailyBarnStates[b.id],
            recycledRefusalAllocatedKg: 0,
          };
        }
        return { ...b, recycledRefusalAllocatedKg: 0 };
      });
      if (setBarns) setBarns(updatedBarns);

      const nextPlan: DailyOperationPlan = {
        ...dailyPlan,
        dailyBarnStates: nextDailyBarnStates,
      };

      // Recalculate batch allocatedKg
      const updatedBatches = (dailyPlan.batches || []).map((b) => {
        if (!b.allocations || b.allocations.length === 0) return b;
        let changed = false;
        const newAllocs = b.allocations.map((a) => {
          if (a.allocatedPercent !== undefined) {
            const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
            const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextPlan) : 0;
            const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
            if (newAllocatedKg !== a.allocatedKg) changed = true;
            return { ...a, allocatedKg: newAllocatedKg };
          }
          return a;
        });
        if (changed) {
          const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
          return { ...b, allocations: newAllocs, targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg };
        }
        return b;
      });

      setDailyPlan({ ...nextPlan, batches: updatedBatches });
      showToast('تم تصفير جميع كميات الراجع المحولة لجميع العنابر بنجاح.', 'info');
      return;
    }

    if (pool.totalMilkingRefusalKg <= 0) {
      showToast('لا يوجد راجع متاح من قطيع الحلاب اليوم لتوزيعه (يرجى تسجيل نسبة أو وزن راجع لعنابر الحلاب أولاً).', 'warning');
      return;
    }

    // Filter barns based on scope
    const targetBarns = barns.filter((b) => {
      if (b.status !== 'نشط') return false;
      const cat = categories.find((c) => c.id === b.categoryId);
      const catName = (cat?.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const isMilking = catName.includes('حلاب') || catName.includes('حليب') || bName.includes('حلاب');
      if (isMilking) return false;

      if (targetScope === 'all_eligible' || targetScope === 'all') {
        return true;
      }
      if (targetScope === 'growing_fattening') {
        return (
          catName.includes('نامي') ||
          bName.includes('نامي') ||
          catName.includes('growing') ||
          catName.includes('تسمين') ||
          bName.includes('تسمين') ||
          catName.includes('fattening')
        );
      }
      if (targetScope === 'growing') {
        return catName.includes('نامي') || bName.includes('نامي') || catName.includes('growing');
      }
      if (targetScope === 'fattening') {
        return catName.includes('تسمين') || bName.includes('تسمين') || catName.includes('fattening');
      }
      // Target specific category ID
      return b.categoryId === targetScope;
    });

    if (targetBarns.length === 0) {
      const selectedCat = categories.find((c) => c.id === targetScope);
      const scopeLabel = selectedCat ? `فئة ${selectedCat.name}` : 'الفئة المختارة';
      showToast(`لم يتم العثور على عنابر نشطة في ${scopeLabel} لاستقبال الراجع.`, 'warning');
      return;
    }

    const totalTargetGrossDemand = targetBarns.reduce(
      (sum, b) => sum + calculateBarnGrossDemandKg(b, categories, rations, dailyPlan),
      0
    );

    const nextDailyBarnStates = { ...(dailyPlan.dailyBarnStates || {}) };
    const updatedBarns = [...barns];
    const totalToDistribute = pool.totalMilkingRefusalKg;

    // Reset previous allocations for other barns that are not in targetBarns
    barns.forEach((b) => {
      const isTarget = targetBarns.some((tb) => tb.id === b.id);
      if (!isTarget && nextDailyBarnStates[b.id]?.recycledRefusalAllocatedKg) {
        nextDailyBarnStates[b.id] = {
          ...nextDailyBarnStates[b.id],
          recycledRefusalAllocatedKg: 0,
        };
        const bIdx = updatedBarns.findIndex((ub) => ub.id === b.id);
        if (bIdx >= 0) updatedBarns[bIdx] = { ...updatedBarns[bIdx], recycledRefusalAllocatedKg: 0 };
      }
    });

    targetBarns.forEach((barn) => {
      const grossDemand = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
      const share = totalTargetGrossDemand > 0 ? grossDemand / totalTargetGrossDemand : 1 / targetBarns.length;
      const allocatedKg = Math.min(grossDemand, Math.round(totalToDistribute * share * 10) / 10);

      const prev = nextDailyBarnStates[barn.id] || {
        barnId: barn.id,
        headCount: barn.headCount,
        feedingRatioPercent: barn.feedingRatioPercent,
        rationId: barn.rationId,
      };
      nextDailyBarnStates[barn.id] = {
        ...prev,
        recycledRefusalAllocatedKg: allocatedKg,
      };

      const bIdx = updatedBarns.findIndex((b) => b.id === barn.id);
      if (bIdx >= 0) {
        updatedBarns[bIdx] = {
          ...updatedBarns[bIdx],
          recycledRefusalAllocatedKg: allocatedKg,
        };
      }
    });

    if (setBarns) {
      setBarns(updatedBarns);
    }

    const nextPlan: DailyOperationPlan = {
      ...dailyPlan,
      dailyBarnStates: nextDailyBarnStates,
    };

    // Recalculate batch allocatedKg
    const updatedBatches = (dailyPlan.batches || []).map((b) => {
      if (!b.allocations || b.allocations.length === 0) return b;
      let changed = false;
      const newAllocs = b.allocations.map((a) => {
        if (a.allocatedPercent !== undefined) {
          const barnObj = updatedBarns.find((bn) => bn.id === a.barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, nextPlan) : 0;
          const newAllocatedKg = Math.round(((demand * a.allocatedPercent) / 100) * 1000) / 1000;
          if (newAllocatedKg !== a.allocatedKg) changed = true;
          return { ...a, allocatedKg: newAllocatedKg };
        }
        return a;
      });
      if (changed) {
        const totalWeight = newAllocs.reduce((s, a) => s + a.allocatedKg, 0);
        return { ...b, allocations: newAllocs, targetWeightKg: totalWeight > 0 ? totalWeight : b.targetWeightKg };
      }
      return b;
    });

    setDailyPlan({
      ...nextPlan,
      batches: updatedBatches,
    });

    const selectedCat = categories.find((c) => c.id === targetScope);
    const scopeLabel = selectedCat
      ? `فئة ${selectedCat.name}`
      : targetScope === 'growing_fattening'
      ? 'فئات النامي والتسمين معاً'
      : 'جميع الفئات المؤهلة';
    showToast(`تم بنجاح توزيع ${totalToDistribute.toLocaleString()} كجم من راجع الحلاب على ${scopeLabel} (${targetBarns.length} عنبر)!`, 'success');
  };

  // Periodic mixer daily toggle (e.g. Calf / Weaner mixed today vs skipped)
  const handlePeriodicMixerToggle = (catId: string, isMixedToday: boolean) => {
    const cat = categories.find((c) => c.id === catId);
    const currentConfig = dailyPlan.periodicBatchConfigs?.[catId] || {
      isMixedToday: true,
      targetWeightKg: cat?.defaultTonnageKg || 1000,
    };

    setDailyPlan({
      ...dailyPlan,
      periodicBatchConfigs: {
        ...(dailyPlan.periodicBatchConfigs || {}),
        [catId]: {
          ...currentConfig,
          isMixedToday,
        },
      },
    });
  };

  // Periodic mixer tonnage override (e.g. 1 ton, 2 tons, etc.)
  const handlePeriodicTonnageChange = (catId: string, targetWeightKg: number) => {
    const cat = categories.find((c) => c.id === catId);
    const currentConfig = dailyPlan.periodicBatchConfigs?.[catId] || {
      isMixedToday: true,
      targetWeightKg: cat?.defaultTonnageKg || 1000,
    };

    setDailyPlan({
      ...dailyPlan,
      periodicBatchConfigs: {
        ...(dailyPlan.periodicBatchConfigs || {}),
        [catId]: {
          ...currentConfig,
          targetWeightKg: Math.max(0, targetWeightKg),
        },
      },
    });
  };

  // Batch modal handlers
  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    const nextNum = batches.length + 1;
    setBatchNumber(`لفة ${nextNum}`);
    const defaultCat = categories[0]?.id || '';
    setCategoryId(defaultCat);
    const matchedCategory = categories.find((c) => c.id === defaultCat);
    setMixerId(matchedCategory?.mixerId || mixers[0]?.id || '');
    setTime('06:00 ص');
    setTargetWeightKg(3000);
    setStatus('مخططة');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditBatch = (batch: MixBatch) => {
    setEditingBatch(batch);
    setBatchNumber(batch.batchNumber);
    setCategoryId(batch.categoryId);
    setMixerId(batch.mixerId);
    setTime(batch.time);
    setTargetWeightKg(batch.targetWeightKg);
    setStatus(batch.status);
    setNotes(batch.notes || '');
    setIsModalOpen(true);
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const selectedCat = categories.find((c) => c.id === catId);
    if (selectedCat && selectedCat.mixerId) {
      setMixerId(selectedCat.mixerId);
    }
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber || !categoryId || !mixerId || targetWeightKg <= 0) {
      showToast('يرجى ملء جميع الحقول المطلوبة ووزن اللفة بشكل صحيح', 'warning');
      return;
    }

    let updatedBatches: MixBatch[];
    if (editingBatch) {
      updatedBatches = batches.map((b) =>
        b.id === editingBatch.id
          ? {
              ...b,
              batchNumber,
              categoryId,
              mixerId,
              time,
              targetWeightKg,
              status,
              notes,
            }
          : b
      );
      showToast('تم تحديث بيانات اللفة بنجاح.', 'success');
    } else {
      const newBatch: MixBatch = {
        id: generateId('batch'),
        batchNumber,
        categoryId,
        mixerId,
        time,
        targetWeightKg,
        status,
        allocations: [],
        notes,
      };
      updatedBatches = [...batches, newBatch];
      showToast('تمت إضافة اللفة الجديدة بنجاح.', 'success');
    }

    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setIsModalOpen(false);
  };

  const handleDeleteBatch = (batchId: string, batchLabel?: string) => {
    showConfirm({
      title: 'حذف لفة خلط',
      message: `هل أنت متأكد من حذف اللفة ${batchLabel ? `(${batchLabel})` : ''}؟`,
      isDanger: true,
      confirmText: 'حذف',
      onConfirm: () => {
        const updated = batches.filter((b) => b.id !== batchId);
        setDailyPlan({ ...dailyPlan, batches: updated });
        showToast('تم حذف اللفة بنجاح.', 'info');
      },
    });
  };

  const handleAutoGenerateCategoryBatch = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const catBarns = barns.filter((b) => b.categoryId === catId && b.status === 'نشط');

    // If Periodic / Fixed Tonnage Category (e.g. Calf/Weaner mixer)
    if (cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer) {
      const periodicConfig = dailyPlan.periodicBatchConfigs?.[catId];
      const isMixedToday = periodicConfig ? periodicConfig.isMixedToday : true;
      if (!isMixedToday) {
        showToast(`فئة ${cat.name} غير مجدولة للخلط اليوم (يوم ويوم / كل يومين).`, 'info');
        return;
      }
      const fixedWeightKg = periodicConfig?.targetWeightKg || cat.defaultTonnageKg || 1000;

      const totalHeadsInCat = catBarns.reduce((sum, b) => {
        const bState = getBarnDailyState(b, dailyPlan);
        return sum + (bState.headCount || 0);
      }, 0);

      const allocations: BarnAllocation[] = catBarns.map((barn) => {
        const bState = getBarnDailyState(barn, dailyPlan);
        const share =
          totalHeadsInCat > 0 ? (bState.headCount || 0) / totalHeadsInCat : 1 / Math.max(1, catBarns.length);
        const allocatedKg = Math.round(fixedWeightKg * share * 10) / 10;
        return {
          barnId: barn.id,
          allocatedKg,
          allocatedPercent: Math.round(share * 100 * 10) / 10,
        };
      });

      const catBatches = batches.filter((b) => b.categoryId === catId);
      const nextNum = catBatches.length + 1;
      const newBatch: MixBatch = {
        id: generateId('batch'),
        batchNumber: `لفة ${nextNum} (${cat.name})`,
        categoryId: cat.id,
        mixerId: cat.mixerId || mixers[0]?.id || '',
        time: '08:30 ص',
        targetWeightKg: fixedWeightKg,
        status: 'تم التحضير',
        allocations,
        notes: `تحضير مكسر بالطن (${fixedWeightKg.toLocaleString()} كجم)`,
      };

      const updatedBatches = [...batches, newBatch];
      setDailyPlan({
        ...dailyPlan,
        batches: updatedBatches,
      });
      showToast(`تم بنجاح توليد (${newBatch.batchNumber}) بوزن ${fixedWeightKg.toLocaleString()} كجم!`, 'success');
      return;
    }

    // Standard Category (Per-Head demand after deducting recycled refusal)
    if (catBarns.length === 0) {
      showToast('لا توجد عنابر نشطة مسجلة في هذه الفئة!', 'warning');
      return;
    }

    // Calculate unallocated kg for each barn in this category
    const allocations: BarnAllocation[] = [];
    let totalBatchWeight = 0;

    catBarns.forEach((barn) => {
      const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
      // Find how much is already allocated to this barn across existing batches
      const allocatedKgAlready = batches
        .filter((b) => b.categoryId === catId)
        .reduce((sum, b) => {
          const alloc = b.allocations?.find((a) => a.barnId === barn.id);
          return sum + (alloc ? alloc.allocatedKg : 0);
        }, 0);

      const remainingDemand = Math.max(0, demand - allocatedKgAlready);
      if (remainingDemand > 0.01) {
        const remainingPercent = demand > 0 ? (remainingDemand / demand) * 100 : 100;
        allocations.push({
          barnId: barn.id,
          allocatedKg: Math.round(remainingDemand * 1000) / 1000,
          allocatedPercent: Math.round(remainingPercent * 1000) / 1000,
        });
        totalBatchWeight += remainingDemand;
      }
    });

    if (totalBatchWeight <= 0) {
      showToast('جميع عنابر هذه الفئة مغطاة وموزعة بالكامل بالفعل!', 'info');
      return;
    }

    const catBatches = batches.filter((b) => b.categoryId === catId);

    // If category demand fits in a single mixer run and a batch already exists, update/deduplicate instead of creating an unnecessary second batch
    const catMixer = mixers.find((m) => m.id === cat.mixerId);
    const mixerCapacity = catMixer?.capacityKg || 5000;
    const totalCatDemand = catBarns.reduce(
      (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
      0
    );
    const canFitInSingleBatch = totalCatDemand <= mixerCapacity;

    if (canFitInSingleBatch && catBatches.length >= 1) {
      const existingBatch = catBatches[0];
      const fullAllocations: BarnAllocation[] = catBarns.map((barn) => {
        const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
        return {
          barnId: barn.id,
          allocatedKg: Math.round(demand * 1000) / 1000,
          allocatedPercent: 100,
        };
      });
      const fullWeight = fullAllocations.reduce((sum, a) => sum + a.allocatedKg, 0);
      const updatedBatches = batches
        .filter((b) => b.categoryId !== catId || b.id === existingBatch.id)
        .map((b) => {
          if (b.id === existingBatch.id) {
            return {
              ...b,
              targetWeightKg: fullWeight,
              allocations: fullAllocations,
              notes: `تغطية كامل احتياج قطيع ${cat.name} (${Math.round(fullWeight).toLocaleString()} كجم) - بنسبة 100%`,
            };
          }
          return b;
        });

      const updatedPlan = { ...dailyPlan, batches: updatedBatches };
      setDailyPlan(updatedPlan);
      saveDailyPlan(updatedPlan);
      showToast(`تم بنجاح تحديث (${existingBatch.batchNumber}) بوزن ${Math.round(fullWeight).toLocaleString()} كجم وتغطية الفئة بنسبة 100%!`, 'success');
      return;
    }

    const nextNum = catBatches.length + 1;
    const newBatch: MixBatch = {
      id: generateId('batch'),
      batchNumber: `لفة ${nextNum} (${cat.name})`,
      categoryId: cat.id,
      mixerId: cat.mixerId || mixers[0]?.id || '',
      time: '09:30 ص',
      targetWeightKg: Math.round(totalBatchWeight * 1000) / 1000,
      status: 'تم التحضير',
      allocations,
      notes: `تغطية احتياج قطيع ${cat.name} (${Math.round(totalBatchWeight)} كجم)`,
    };

    const updatedBatches = [...batches, newBatch];
    const updatedPlan = { ...dailyPlan, batches: updatedBatches };
    setDailyPlan(updatedPlan);
    saveDailyPlan(updatedPlan);
    showToast(`تم بنجاح توليد (${newBatch.batchNumber}) بوزن ${Math.round(totalBatchWeight).toLocaleString()} كجم وتوزيعها على العنابر بنسبة 100%!`, 'success');
  };

  // Clean and synchronize all batches: removes duplicates and corrects old weights
  const handleCleanAndSyncBatches = () => {
    const { batches: cleaned } = sanitizeBatches(
      dailyPlan.batches || [],
      barns,
      categories,
      rations,
      dailyPlan
    );
    const updatedPlan = {
      ...dailyPlan,
      batches: cleaned,
    };
    setDailyPlan(updatedPlan);
    saveDailyPlan(updatedPlan);
    showToast('تم بنجاح حذف اللفات المكررة ومزامنة وتحديث أوزان اللفات مع الاحتياج الفعلي للعنابر بنسبة 100%!', 'success');
  };

  // Filtered barns
  const filteredBarns = barns.filter((b) => {
    if (selectedCategoryFilter === 'all') return true;
    return b.categoryId === selectedCategoryFilter;
  });

  // Calculate totals
  const totalHeads = filteredBarns.reduce((sum, b) => {
    const bState = getBarnDailyState(b, dailyPlan);
    return sum + (bState.headCount || 0);
  }, 0);

  const totalGrossDemandKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnGrossDemandKg(b, categories, rations, dailyPlan),
    0
  );

  const totalRecycledRefusalAllocatedKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnRecycledRefusalKg(b, dailyPlan),
    0
  );

  const totalDailyDemandKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
    0
  );

  const totalRefusalKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnRefusalKg(b, categories, rations, dailyPlan),
    0
  );

  const totalActualIntakeKg = filteredBarns.reduce(
    (sum, b) => sum + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan),
    0
  );

  const overallRefusalPercent = totalDailyDemandKg > 0
    ? Math.round(((totalRefusalKg / totalDailyDemandKg) * 100) * 10) / 10
    : 0;

  // Milking specific refusal percentage (to clarify farm weighted vs milking %):
  const milkingBarnsOnly = barns.filter((b) => {
    if (b.status !== 'نشط') return false;
    const cat = categories.find((c) => c.id === b.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    return catName.includes('حلاب') || catName.includes('حليب') || bName.includes('حلاب');
  });
  const milkingDemandKg = milkingBarnsOnly.reduce((s, b) => s + calculateBarnDailyDemand(b, categories, rations, dailyPlan), 0);
  const milkingRefusalTotalKg = milkingBarnsOnly.reduce((s, b) => s + calculateBarnRefusalKg(b, categories, rations, dailyPlan), 0);
  const milkingRefusalPercent = milkingDemandKg > 0 ? Math.round(((milkingRefusalTotalKg / milkingDemandKg) * 100) * 10) / 10 : 0;

  // Refusal Recycling Pool Stats across the entire farm
  const refusalPoolStats = calculateAvailableMilkingRefusalPool(barns, categories, rations, dailyPlan);

  // Periodic Categories (like Calf / Weaner)
  const periodicCategories = categories.filter(
    (c) => c.calculationType === 'fixed_tonnage' || c.isPeriodicMixer
  );

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-700" />
            برنامج التغذية اليومي وخطة المكسرات
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            جدول التغذية التفصيلي للعنابر، تعديل النسبة %، تدوير راجع الحلاب، ومكسر الرضيع والفطام بالطن
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>التاريخ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDailyPlan({ ...dailyPlan, date: e.target.value });
              }}
              className="bg-transparent font-bold focus:outline-none text-slate-900"
            />
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('program')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'program'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 جدول التغذية اليومي
            </button>
            <button
              onClick={() => setActiveSubTab('batches')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'batches'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚜 خطة لفات المكسر
            </button>
          </div>

          <ExportExcelButton
            onExport={() => exportDailyPlanToExcel(dailyPlan, categories, mixers, rations, barns)}
            label="تصدير الخطة للإكسيل"
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* TAB 1: برنامج التغذية اليومي وحساب الاحتياجات */}
      {activeSubTab === 'program' && (
        <div className="space-y-6">
          {/* Smart Refusal Recycling & Periodic Mixer Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CARD 1: حوض راجع قطيع الحلاب وتدويره للفئات المختلفة */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-300/80 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">تدوير وتوزيع راجع قطيع الحلاب</h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      يتم سحب راجع الحلاب وخصمه من كمية العلف الطازج المطلوب لأي فئة حيوانية تختارها
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Category Dropdown Selector */}
                  <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">توزيع على:</span>
                    <select
                      value={selectedRefusalTargetCategory}
                      onChange={(e) => setSelectedRefusalTargetCategory(e.target.value)}
                      className="text-xs font-black text-amber-950 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all_eligible">جميع الفئات المؤهلة (غير الحلاب)</option>
                      <option value="growing_fattening">فئات النامي والتسمين معاً</option>
                      {nonMilkingCategories.map((c) => {
                        const cBarns = barns.filter((b) => b.categoryId === c.id && b.status === 'نشط');
                        return (
                          <option key={c.id} value={c.id}>
                            فئة {c.name} ({cBarns.length} عنبر)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoDistributeMilkingRefusal(selectedRefusalTargetCategory)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                    title="توزيع راجع الحلاب على الفئة المحددة"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                    <span>توزيع الراجع</span>
                  </button>

                  {refusalPoolStats.totalAllocatedRecycledKg > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAutoDistributeMilkingRefusal('clear')}
                      className="px-2.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                      title="تصفير الراجع المحول لجميع العنابر"
                    >
                      تصفير
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Breakdown: المتاح | إجمالي المحول | الفائض غير المحول */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white/90 rounded-xl p-3 border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 block">راجع الحلاب المتاح</span>
                  <span className="text-base font-black text-amber-900">
                    {refusalPoolStats.totalMilkingRefusalKg.toLocaleString()} كجم
                  </span>
                </div>
                <div className="bg-white/90 rounded-xl p-3 border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 block">إجمالي الراجع المحول</span>
                    {refusalPoolStats.utilizationPercent > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {refusalPoolStats.utilizationPercent}%
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-emerald-800">
                    {refusalPoolStats.totalAllocatedRecycledKg.toLocaleString()} كجم
                  </span>
                </div>
                <div className="bg-white/90 rounded-xl p-3 border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 block">الفائض غير المحول</span>
                  <span className="text-base font-black text-slate-700">
                    {refusalPoolStats.remainingRefusalPoolKg.toLocaleString()} كجم
                  </span>
                </div>
              </div>

              {/* Dynamic per-category badges if any recycled */}
              {refusalPoolStats.totalAllocatedRecycledKg > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  <span className="text-[11px] font-bold text-slate-600">التوزيع الحالي حسب الفئات:</span>
                  {categories.map((cat) => {
                    const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                    const catAllocated = catBarns.reduce((sum, b) => sum + calculateBarnRecycledRefusalKg(b, dailyPlan), 0);
                    if (catAllocated <= 0) return null;
                    return (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 shadow-2xs"
                      >
                        <span className="text-slate-600">{cat.name}:</span>
                        <strong className="text-emerald-700">{catAllocated.toLocaleString()} كجم</strong>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CARD 2: مكسرات الرضيع والفطام والمركزات الدورية (بالطن وأيام التغطية) */}
            <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent rounded-2xl border border-blue-300/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">مكسر الرضيع والفطام (خلطة دورية بالطن وأيام التغطية)</h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      يُخلط المكسر بالطن (مثلاً 1 طن يكفي 5 أيام) لتغذية العنابر يومياً وسحب الخامات دفعة واحدة
                    </p>
                  </div>
                </div>
              </div>

              {periodicCategories.length === 0 ? (
                <div className="text-xs text-slate-500 bg-white/70 p-3 rounded-xl border border-slate-200 text-center">
                  لا توجد فئات معينة بنظام الطن أو المكسر الدوري. يمكنك تفعيل خيار "خلط دوري بالطن" من تبويب "الفئات الحيوانية".
                </div>
              ) : (
                <div className="space-y-4">
                  {periodicCategories.map((pCat) => {
                    const config = dailyPlan.periodicBatchConfigs?.[pCat.id];
                    const isMixed = config ? config.isMixedToday : true;
                    const catDailyDemand = calculateCategoryDailyDemandKg(pCat.id, barns, categories, rations, dailyPlan);
                    const weightKg = config ? config.targetWeightKg : pCat.defaultTonnageKg || 1000;
                    const durationDays = catDailyDemand > 0
                      ? calculatePeriodicCoverageDays(weightKg, catDailyDemand)
                      : (config?.durationDays || 5);

                    const catBarns = barns.filter((b) => b.categoryId === pCat.id && b.status === 'نشط');
                    const totalCatHeads = catBarns.reduce((sum, b) => {
                      const bState = getBarnDailyState(b, dailyPlan);
                      return sum + (bState.headCount || 0);
                    }, 0);

                    return (
                      <div
                        key={pCat.id}
                        className="bg-white/95 rounded-xl p-4 border border-blue-200 space-y-3 shadow-2xs"
                      >
                        {/* Header: Toggle Mixing & Category Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePeriodicMixerToggle(pCat.id, !isMixed)}
                              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                isMixed
                                  ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {isMixed ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>يتم تشغيل المكسر والخلط اليوم</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  <span>لا يخلط اليوم (تغذية من رصيد سابق)</span>
                                </>
                              )}
                            </button>
                            <span className="font-black text-slate-900 text-sm">{pCat.name}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2.5 py-1 rounded-lg">
                              القطيع: <strong>{totalCatHeads} رأس</strong> في <strong>{catBarns.length} عنبر</strong>
                            </span>
                            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg">
                              الاستهلاك اليومي: <strong>{catDailyDemand.toLocaleString()} كجم/يوم</strong>
                            </span>
                          </div>
                        </div>

                        {/* Interactive Coverage & Duration Engine */}
                        {isMixed ? (
                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200/80">
                              {/* 1. Set by Tonnage / Weight */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 block">
                                  ⚖️ وزن لفة المكسر المطلوبة (كجم / طن):
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 shadow-2xs flex-1">
                                    <input
                                      type="number"
                                      min={50}
                                      step={50}
                                      value={weightKg}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        handlePeriodicTonnageChange(pCat.id, val);
                                      }}
                                      className="w-full text-center font-black text-blue-950 bg-transparent focus:outline-none text-sm"
                                    />
                                    <span className="font-extrabold text-blue-900 text-xs">كجم</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {[500, 1000, 1500, 2000, 3000].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handlePeriodicTonnageChange(pCat.id, preset)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        weightKg === preset
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100'
                                      }`}
                                    >
                                      {preset >= 1000 ? `${preset / 1000} طن` : `${preset}ك`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 2. Set by Duration / Coverage Days */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 block">
                                  📅 عدد الأيام المطلوب أن تكفيها الخلطة:
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 shadow-2xs flex-1">
                                    <input
                                      type="number"
                                      min={1}
                                      max={60}
                                      step={0.5}
                                      value={durationDays}
                                      onChange={(e) => {
                                        const days = Number(e.target.value);
                                        const calculatedKg = catDailyDemand > 0
                                          ? calculatePeriodicBatchWeightFromDays(days, catDailyDemand)
                                          : days * 200;
                                        handlePeriodicTonnageChange(pCat.id, calculatedKg);
                                      }}
                                      className="w-full text-center font-black text-purple-950 bg-transparent focus:outline-none text-sm"
                                    />
                                    <span className="font-extrabold text-purple-900 text-xs">أيام</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {[2, 3, 5, 7, 10, 14].map((days) => (
                                    <button
                                      key={days}
                                      type="button"
                                      onClick={() => {
                                        const calculatedKg = catDailyDemand > 0
                                          ? calculatePeriodicBatchWeightFromDays(days, catDailyDemand)
                                          : days * 200;
                                        handlePeriodicTonnageChange(pCat.id, calculatedKg);
                                      }}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        Math.abs(durationDays - days) < 0.2
                                          ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                                      }`}
                                    >
                                      {days === 7 ? 'أسبوع (7 أيام)' : `${days} أيام`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Intelligent Summary & Generation Action */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                              <div className="text-xs text-emerald-950 space-y-0.5">
                                <div className="font-black flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                                  <span>
                                    خلطة <strong>{weightKg.toLocaleString()} كجم ({weightKg / 1000} طن)</strong> ستكفي قطيع {pCat.name} لمدة{' '}
                                    <strong className="text-emerald-800 underline decoration-2 font-black">{durationDays} يوم</strong>
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-800">
                                  يتم سحب خامات الـ {weightKg.toLocaleString()} كجم كاملة للمكسر اليوم من المخزن، ويتم تغذية العنابر بمقررها اليومي ({catDailyDemand.toLocaleString()} كجم/يوم).
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAutoGenerateCategoryBatch(pCat.id)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
                              >
                                <Zap className="w-4 h-4 text-amber-300" />
                                <span>تجهيز لفة المكسر ({weightKg.toLocaleString()} كجم)</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  لا يلزم تشغيل المكسر لـ {pCat.name} اليوم
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  تتغذى العنابر اليوم من رصيد الخلطة السابقة المحضرة، ويظهر مقرر التغذية اليومي ({catDailyDemand.toLocaleString()} كجم) في جدول العنابر بالأسفل.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePeriodicMixerToggle(pCat.id, true)}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              تشغيل المكسر اليوم
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ListFilter className="w-5 h-5 text-emerald-700" />
              <span className="text-xs font-extrabold text-slate-800">تصفية حسب الفئة الحيوانية:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              >
                <option value="all">جميع الفئات الحيوانية ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                العنابر: <strong className="text-slate-900">{filteredBarns.length}</strong>
              </span>
              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                الرؤوس: <strong className="text-emerald-800">{totalHeads.toLocaleString()} رأس</strong>
              </span>
              <span className="text-slate-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                صافي الطازج المطلوب TMR: <strong className="text-emerald-900">{totalDailyDemandKg.toLocaleString()} كجم</strong>
              </span>
              <span className="text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                الراجع: <strong className="text-amber-800">{overallRefusalPercent}%</strong> ({totalRefusalKg.toLocaleString()} كجم)
                {selectedCategoryFilter === 'all' && milkingRefusalPercent > 0 && milkingRefusalPercent !== overallRefusalPercent && (
                  <span className="text-[10px] text-amber-700 mr-1.5 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded">
                    قطيع الحلاب: {milkingRefusalPercent}%
                  </span>
                )}
              </span>
              <span className="text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                المأكول الفعلي: <strong className="text-blue-950">{totalActualIntakeKg.toLocaleString()} كجم</strong>
              </span>
            </div>
          </div>

          {/* Interactive Barns Feeding Table (Requirement 7 & 8) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  جدول التغذية اليومي وحساب احتياج العنابر
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  صافي الطازج المطلوب TMR = (الاحتياج الإجمالي - راجع الحلاب المحول). تعديل النسبة % يحدّث المقررات فورياً.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/90 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-3">رقم واسم العنبر</th>
                    <th className="py-3.5 px-3">الفئة الحيوانية</th>
                    <th className="py-3.5 px-3">العليقة المعينّة</th>
                    <th className="py-3.5 px-3 text-center">عدد الرؤوس</th>
                    <th className="py-3.5 px-3 text-center">العليقة (كجم/رأس)</th>
                    <th className="py-3.5 px-3 text-center">نسبة التغذية %</th>
                    <th className="py-3.5 px-3 text-slate-900 text-center">الاحتياج الإجمالي</th>
                    <th className="py-3.5 px-3 text-amber-900 bg-amber-50/70 text-center">راجع حلاب محول (كجم)</th>
                    <th className="py-3.5 px-3 text-emerald-950 bg-emerald-50/80 font-black">صافي الطازج TMR</th>
                    <th className="py-3.5 px-3 text-amber-950 bg-amber-50/40 text-center">راجع الطوالة</th>
                    <th className="py-3.5 px-3 text-blue-950 bg-blue-50/70">المأكول الفعلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {filteredBarns.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                        لا توجد عنابر مسجلة في هذه الفئة.
                      </td>
                    </tr>
                  ) : (
                    filteredBarns.map((barn) => {
                      const barnState = getBarnDailyState(barn, dailyPlan);
                      const category = categories.find((c) => c.id === barn.categoryId);
                      const ration = getBarnRation(barn, categories, rations, dailyPlan);
                      const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
                      const grossDemandKg = calculateBarnGrossDemandKg(barn, categories, rations, dailyPlan);
                      const recycledRefusalKg = calculateBarnRecycledRefusalKg(barn, dailyPlan);
                      const netDemandKg = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                      const barnRefusalKg = calculateBarnRefusalKg(barn, categories, rations, dailyPlan);
                      const barnIntakeKg = calculateBarnActualIntakeKg(barn, categories, rations, dailyPlan);

                      const catName = (category?.name || '').toLowerCase();
                      const bName = (barn.name || '').toLowerCase();
                      const isMilking =
                        catName.includes('حلاب') ||
                        catName.includes('حليب') ||
                        catName.includes('milk') ||
                        bName.includes('حلاب');
                      const canReceiveRefusal = !isMilking || recycledRefusalKg > 0;

                      return (
                        <tr key={barn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={barnState.displayNumber || barn.number}
                                onChange={(e) => handleBarnUpdate(barn.id, { number: e.target.value })}
                                className="w-24 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs focus:bg-white focus:outline-emerald-600"
                                placeholder="رقم العنبر"
                                title="تعديل رقم العنبر"
                              />
                              <input
                                type="text"
                                value={barnState.displayName || barn.name || ''}
                                onChange={(e) => handleBarnUpdate(barn.id, { name: e.target.value })}
                                className="w-28 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:bg-white focus:outline-emerald-600"
                                placeholder="اسم العنبر"
                                title="تعديل اسم العنبر"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded-md text-[11px] border border-slate-200">
                              {category?.name || 'غير محدد'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-bold text-emerald-900 max-w-[120px] truncate">
                            {ration?.name || 'لا توجد عليقة'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl px-1.5 py-0.5">
                              <input
                                type="number"
                                min={1}
                                value={barnState.headCount}
                                onChange={(e) => handleBarnUpdate(barn.id, { headCount: Math.max(1, Number(e.target.value)) })}
                                className="w-14 text-center font-black text-emerald-950 bg-transparent focus:outline-none text-xs"
                                title="تعديل عدد الرؤوس"
                              />
                              <span className="font-bold text-emerald-800 text-[10px]">رأس</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {totalRationKgPerHead} كجم
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-xl px-1.5 py-0.5">
                              <input
                                type="number"
                                min={10}
                                max={200}
                                step="any"
                                value={barnState.feedingRatioPercent || 100}
                                onChange={(e) => handleFeedingRatioChange(barn.id, Number(e.target.value))}
                                className="w-14 text-center font-extrabold text-amber-900 bg-transparent focus:outline-none text-xs"
                              />
                              <span className="font-extrabold text-amber-800 text-[10px]">%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">
                            {grossDemandKg.toLocaleString()} كجم
                          </td>
                          <td className="py-3 px-3 text-center bg-amber-50/50">
                            {canReceiveRefusal ? (
                              <div className="inline-flex items-center gap-1 bg-white hover:bg-amber-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-400 border border-amber-300 rounded-lg px-2 py-1 transition-all shadow-2xs">
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={
                                    barnState.recycledRefusalAllocatedKg === 0 ||
                                    barnState.recycledRefusalAllocatedKg === undefined
                                      ? ''
                                      : barnState.recycledRefusalAllocatedKg
                                  }
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleRecycledRefusalChange(barn.id, val === '' ? 0 : Number(val));
                                  }}
                                  className="w-16 text-center font-black text-amber-950 bg-transparent focus:outline-none text-xs"
                                  title="اكتب كمية راجع الحلاب المحولة لهذا العنبر بالكيلوجرام (تخصم تلقائياً من خامات المكسر)"
                                />
                                <span className="font-black text-amber-900 text-[10px]">كجم</span>
                              </div>
                            ) : (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
                                title="عنابر الحلاب هي مصدر إنتاج الراجع وليست مستقبلاً له"
                              >
                                مصدر الراجع
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-black text-emerald-950 text-sm bg-emerald-50/50">
                            {netDemandKg.toLocaleString()} كجم
                          </td>
                          <td className="py-3 px-2 text-center bg-amber-50/20">
                            <div className="inline-flex flex-col items-center gap-1 bg-white border border-amber-300 rounded-xl p-1.5 shadow-2xs">
                              {/* Segmented Switch */}
                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (barnState.refusalType === 'percent' || !barnState.refusalType) return;
                                    const currentKg = Number(barnState.refusalValue) || 0;
                                    const newPct = netDemandKg > 0 ? Math.round(((currentKg / netDemandKg) * 100) * 10) / 10 : 0;
                                    handleBarnUpdate(barn.id, {
                                      refusalType: 'percent',
                                      refusalValue: newPct,
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-all cursor-pointer ${
                                    (barnState.refusalType || 'percent') === 'percent'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="إدخال كنسبة مئوية"
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (barnState.refusalType === 'kg') return;
                                    const currentPct = Number(barnState.refusalValue) || 0;
                                    const newKg = Math.round(((netDemandKg * currentPct) / 100) * 10) / 10;
                                    handleBarnUpdate(barn.id, {
                                      refusalType: 'kg',
                                      refusalValue: newKg,
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-all cursor-pointer ${
                                    barnState.refusalType === 'kg'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="إدخال كوزن كجم"
                                >
                                  كجم
                                </button>
                              </div>

                              {/* Numeric Input with Unit */}
                              <div className="flex items-center justify-center gap-1 bg-amber-50/60 border border-amber-200 rounded-md px-1.5 py-0.5">
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  value={barnState.refusalValue !== undefined ? barnState.refusalValue : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    handleBarnUpdate(barn.id, {
                                      refusalValue: isNaN(val) ? 0 : Math.max(0, val),
                                      refusalType: barnState.refusalType || 'percent',
                                    });
                                  }}
                                  className="w-14 text-center font-black text-amber-950 bg-transparent focus:outline-none text-xs"
                                />
                                <span className="font-extrabold text-amber-900 text-[10px] shrink-0">
                                  {barnState.refusalType === 'kg' ? 'كجم' : '%'}
                                </span>
                              </div>

                              {/* Equivalent Subtext */}
                              <div className="text-[9px] font-bold text-slate-500 whitespace-nowrap">
                                {barnState.refusalType === 'kg' ? (
                                  <span>
                                    يعادل: <strong className="text-amber-800">{netDemandKg > 0 ? ((barnRefusalKg / netDemandKg) * 100).toFixed(1) : 0}%</strong>
                                  </span>
                                ) : (
                                  <span>
                                    الوزن: <strong className="text-amber-800">{barnRefusalKg.toLocaleString()} كجم</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-black text-blue-950 text-sm bg-blue-50/40">
                            {barnIntakeKg.toLocaleString()} كجم
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-emerald-950 text-white font-bold text-xs">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-3 text-right">الإجمالي اليومي العام:</td>
                    <td className="py-3.5 px-3 text-center font-extrabold text-amber-300">{totalHeads.toLocaleString()} رأس</td>
                    <td colSpan={2} className="py-3.5 px-3"></td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-300">
                      {totalGrossDemandKg.toLocaleString()} كجم
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-300">
                      محول: {totalRecycledRefusalAllocatedKg.toLocaleString()} كجم
                    </td>
                    <td className="py-3.5 px-3 font-black text-amber-300 text-sm">
                      {totalDailyDemandKg.toLocaleString()} كجم
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-200">
                      راجع: {filteredBarns.reduce((s, b) => s + calculateBarnRefusalKg(b, categories, rations, dailyPlan), 0).toLocaleString()} كجم
                    </td>
                    <td className="py-3.5 px-3 font-black text-emerald-300 text-sm">
                      مأكول: {filteredBarns.reduce((s, b) => s + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan), 0).toLocaleString()} كجم
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Raw Material Breakdown per Category (Requirement 9 & 10) */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Wheat className="w-5 h-5 text-emerald-700" />
              حساب احتياج كل خامة لكل فئة وعنبر (مجموع الاحتياجات التفصيلي)
            </h3>

            {categories
              .filter((cat) => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
              .map((cat) => {
                const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                const isPeriodicOrFixed = cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer;
                const periodicConfig = dailyPlan.periodicBatchConfigs?.[cat.id];
                const isMixedToday = periodicConfig ? periodicConfig.isMixedToday : true;

                if (catBarns.length === 0 && !isPeriodicOrFixed) return null;

                const ration = rations.find((r) => r.id === cat.rationId);
                const totalDemandCat = calculateCategoryTotalDemand(catBarns, cat.id, categories, rations, dailyPlan);
                const totalRationKg = calculateRationTotalKgPerHead(ration);

                return (
                  <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                        <h4 className="font-black text-slate-900 text-base">فئة: {cat.name}</h4>
                        <span className="text-xs text-slate-500 font-bold">
                          ({catBarns.length} عنابر | عليقة: {ration?.name || '—'})
                        </span>
                        {isPeriodicOrFixed && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            isMixedToday ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isMixedToday ? '⚡ نظام الطن / مكسر دوري (يتم الخلط اليوم)' : '⏸ دوري (مؤجل اليوم)'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
                        إجمالي احتياج الفئة: {totalDemandCat.toLocaleString()} كجم
                      </div>
                    </div>

                    {totalDemandCat <= 0 && isPeriodicOrFixed && !isMixedToday ? (
                      <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                        هذه الفئة محددة كـ "لا يخلط اليوم" (يوم ويوم / كل يومين). لا توجد خامات مسحوبة لليوم.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">اسم الخامة</th>
                              <th className="py-2.5 px-3 text-center">الكمية للرأس (كجم)</th>
                              <th className="py-2.5 px-3 text-center">النسبة بالعليقة %</th>
                              <th className="py-2.5 px-3 text-left font-extrabold text-slate-900">إجمالي الكمية للفئة بالكامل (كجم)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {ration?.ingredients.map((ing, ingIdx) => {
                              const rawMat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                              const proportionPercent = totalRationKg > 0 ? Math.round((ing.amountKgPerHead / totalRationKg) * 1000) / 10 : 0;
                              
                              // Calculate ingredient weight based on category demand
                              const catIngredientKg = isPeriodicOrFixed
                                ? (totalRationKg > 0 ? (ing.amountKgPerHead / totalRationKg) * totalDemandCat : 0)
                                : catBarns.reduce((sum, b) => {
                                    const barnNetDemand = calculateBarnDailyDemand(b, categories, rations, dailyPlan);
                                    return sum + (totalRationKg > 0 ? (ing.amountKgPerHead / totalRationKg) * barnNetDemand : 0);
                                  }, 0);

                              return (
                                <tr key={`${cat.id}-${ing.rawMaterialId || 'ing'}-${ingIdx}`} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 font-bold text-slate-900">{rawMat?.name || 'خامة'}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-slate-700">{ing.amountKgPerHead} كجم</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-emerald-800">{proportionPercent}%</td>
                                  <td className="py-2.5 px-3 text-left font-black text-emerald-900 text-sm">
                                    {Math.round(catIngredientKg * 10) / 10} كجم
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: خطة المكسرات واللفات اليومية (Requirement 11 & 12) */}
      {activeSubTab === 'batches' && (
        <div className="space-y-6">
          {/* Category demand summary cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-700" />
                تخطيط أوزان وعدد لفات المكسر حسب احتياج كل فئة
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanAndSyncBatches}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="إزالة أي لفات مكررة وضبط ومزامنة أوزان اللفات مع الاحتياج الفعلي للعنابر فورياً"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إصلاح ومزامنة اللفات (حذف التكرار)</span>
                </button>
                <button
                  onClick={handleOpenAddBatch}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة لفة مكسر جديدة</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories
                .filter((cat) => {
                  const demandKg = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
                  const catBatches = batches.filter((b) => b.categoryId === cat.id);
                  return demandKg > 0 || catBatches.length > 0;
                })
                .map((cat) => {
                const demandKg = calculateCategoryTotalDemand(barns, cat.id, categories, rations, dailyPlan);
                const catBatches = batches.filter((b) => b.categoryId === cat.id);
                const plannedKg = catBatches.reduce((sum, b) => {
                  const eff = getBatchDerivedTargetWeightKg(b, barns, categories, rations, dailyPlan);
                  return sum + (eff > 0 ? eff : b.targetWeightKg);
                }, 0);
                const diffKg = Math.round((plannedKg - demandKg) * 100) / 100;
                const mixer = mixers.find((m) => m.id === cat.mixerId);
                const isPeriodicOrFixed = cat.calculationType === 'fixed_tonnage' || cat.isPeriodicMixer;

                return (
                  <div key={cat.id} className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm">{cat.name}</span>
                        {isPeriodicOrFixed && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                            بالطن
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-bold">{mixer?.name || 'مكسر'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>الاحتياج اليومي للفئة:</span>
                      <span className="font-bold text-slate-900">{demandKg.toLocaleString()} كجم</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>إجمالي أوزان اللفات:</span>
                      <span className="font-bold text-emerald-800">{plannedKg.toLocaleString()} كجم ({catBatches.length} لفات)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 text-xs flex flex-col gap-2">
                      {Math.abs(diffKg) <= 0.01 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> الأوزان متطابقة تمامًا مع الاحتياج!
                        </span>
                      ) : diffKg < 0 ? (
                        <>
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> متبقي {Math.abs(diffKg)} كجم يحتاج لفات إضافية
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateCategoryBatch(cat.id)}
                            className="w-full py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <Zap className="w-3 h-3 text-amber-200" />
                            <span>توليد لفة تلقائية لـ {cat.name} ({Math.abs(diffKg)} كجم)</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> زيادة في أوزان اللفات المخططة بـ {diffKg} كجم
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batches Table Grouped by Category */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">جدول لفات المكسر المعتمدة ليوم ({selectedDate})</h3>
                <p className="text-xs text-slate-500 mt-0.5">اللفات مرتبة ومجمعة حسب الأقسام (الحلاب، النامي، ...)</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                إجمالي اللفات: {batches.length}
              </span>
            </div>

            {/* Category Quick Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryId('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  !categoryId
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                جميع الأقسام ({batches.length})
              </button>
              {categories
                .filter((cat) => batches.some((b) => b.categoryId === cat.id))
                .map((cat) => {
                  const count = batches.filter((b) => b.categoryId === cat.id).length;
                  const isSel = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(isSel ? '' : cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-emerald-900 text-white border-emerald-950 shadow-xs ring-2 ring-emerald-500/30'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>قسم {cat.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        isSel ? 'bg-emerald-800 text-amber-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>

            {batches.some((b) => Math.abs(b.targetWeightKg - 2016) < 1) && (
              <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="font-black text-amber-900 text-xs">رصد لفات مسجلة بوزن غير محدث:</h5>
                    <p className="text-[11px] text-amber-800 font-medium">
                      يوجد لفة مسجلة بوزن قديم يحتاج إلى مزامنة مع الاحتياج الفعلي للعنابر.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCleanAndSyncBatches}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>تحديث ومزامنة الأوزان الآن</span>
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100/80 text-slate-600 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">رقم اللفة</th>
                    <th className="py-3.5 px-4">التوقيت</th>
                    <th className="py-3.5 px-4">الفئة الحيوانية</th>
                    <th className="py-3.5 px-4">المكسر المستخدم</th>
                    <th className="py-3.5 px-4">وزن اللفة المستهدف</th>
                    <th className="py-3.5 px-4">حالة اللفة</th>
                    <th className="py-3.5 px-4">ملاحظات</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        لا توجد لفات مكسر مضافة. انقر فوق زر "إضافة لفة مكسر جديدة" للبدء.
                      </td>
                    </tr>
                  ) : (
                    [...batches]
                      .filter((b) => !categoryId || b.categoryId === categoryId)
                      .sort((a, b) => {
                        const catIndexA = categories.findIndex((c) => c.id === a.categoryId);
                        const catIndexB = categories.findIndex((c) => c.id === b.categoryId);
                        if (catIndexA !== catIndexB) return catIndexA - catIndexB;
                        return a.batchNumber.localeCompare(b.batchNumber, 'ar');
                      })
                      .map((batch) => {
                        const category = categories.find((c) => c.id === batch.categoryId);
                        const mixer = mixers.find((m) => m.id === batch.mixerId);

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-4 font-black text-emerald-900 text-base">{batch.batchNumber}</td>
                            <td className="py-4 px-4 font-bold text-slate-700">
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> {batch.time}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-200/80">
                                {category?.name || 'غير محدد'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600 font-semibold">{mixer?.name || 'غير محدد'}</td>
                            <td className="py-4 px-4 font-extrabold text-slate-900 text-base">
                              {(() => {
                                const eff = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
                                return (eff > 0 ? eff : batch.targetWeightKg).toLocaleString();
                              })()} كجم
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                  batch.status === 'تم التوزيع'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : batch.status === 'تم التحضير'
                                    ? 'bg-blue-100 text-blue-800'
                                    : batch.status === 'قيد التحضير'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {batch.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">
                              {batch.notes || '—'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditBatch(batch)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="تعديل"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBatch ? 'تعديل بيانات لفة المكسر' : 'إضافة لفة مكسر جديدة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم/اسم اللفة *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="مثال: لفة 1، لفة الظهر..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفئة الحيوانية *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المكسر المخصص *</label>
                  <select
                    value={mixerId}
                    onChange={(e) => setMixerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {mixers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.maxCapacityKg}كجم)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">توقيت اللفة *</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="06:00 ص"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وزن اللفة المستهدف (كجم) *</label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة اللفة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MixBatch['status'])}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  <option value="مخططة">مخططة</option>
                  <option value="قيد التحضير">قيد التحضير</option>
                  <option value="تم التحضير">تم التحضير</option>
                  <option value="تم التوزيع">تم التوزيع</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التشغيل</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي توجيهات خاصة للسائق أو عامل المكسر..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  حفظ اللفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

