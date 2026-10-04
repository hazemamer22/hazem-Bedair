import React, { useState, useMemo } from 'react';
import {
  useLanguage,
  getCategoryDisplayName,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getMaterialDisplayName,
  getMixerDisplayName,
  getRationDisplayName,
  getBatchNumberDisplayName,
  getStatusDisplayName,
  getUnitDisplayName,
} from '../../context/LanguageContext';
import {
  DailyOperationPlan,
  MixBatch,
  AnimalCategory,
  Mixer,
  Barn,
  BarnAllocation,
  Ration,
  RawMaterial,
  FarmSettings,
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
  calculateRationDmStats,
  calculateBarnDmDemandKg,
  calculateBarnActualDmiKg,
  calculateBarnDmiPerHeadKg,
  calculateFarmDmSummary,
  getRawMaterialDryMatterPercent,
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
  ArrowUp,
  ArrowDown,
  Printer,
  Eye,
} from 'lucide-react';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportDailyPlanToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import { sanitizeBatches, saveDailyPlan, saveBarns } from '../../services/storage';
import { PrintHeader, PrintSignatures } from '../PrintHeader';

interface DailyPlanViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  mixers: Mixer[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  rations: Ration[];
  rawMaterials: RawMaterial[];
  settings?: FarmSettings;
  onPrint?: () => void;
  onOpenPrintPreview?: () => void;
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
  settings,
  onPrint,
  onOpenPrintPreview,
}) => {
  const { showToast, showConfirm } = useFeedback();
  const { language, isRtl, t } = useLanguage();
  const isEn = language === 'en';
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
      showToast(
        isEn
          ? 'All recycled refusal allocations have been reset to zero successfully.'
          : 'تم تصفير جميع كميات الراجع المحولة لجميع العنابر بنجاح.',
        'info'
      );
      return;
    }

    if (pool.totalMilkingRefusalKg <= 0) {
      showToast(
        isEn
          ? 'No refusal available from lactating herd today to distribute. (Please enter refusal % or weight for lactating barns first).'
          : 'لا يوجد راجع متاح من قطيع الحلاب اليوم لتوزيعه (يرجى تسجيل نسبة أو وزن راجع لعنابر الحلاب أولاً).',
        'warning'
      );
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
      const scopeLabel = selectedCat
        ? (isEn ? `Category ${selectedCat.name}` : `فئة ${selectedCat.name}`)
        : (isEn ? 'the selected category' : 'الفئة المختارة');
      showToast(
        isEn
          ? `No active barns found in ${scopeLabel} to receive refusal.`
          : `لم يتم العثور على عنابر نشطة في ${scopeLabel} لاستقبال الراجع.`,
        'warning'
      );
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
      ? (isEn ? `Category ${selectedCat.name}` : `فئة ${selectedCat.name}`)
      : targetScope === 'growing_fattening'
      ? (isEn ? 'Growing & Fattening Categories' : 'فئات النامي والتسمين معاً')
      : (isEn ? 'All Eligible Categories' : 'جميع الفئات المؤهلة');
    showToast(
      isEn
        ? `Successfully distributed ${totalToDistribute.toLocaleString()} kg of lactating refusal to ${scopeLabel} (${targetBarns.length} barns)!`
        : `تم بنجاح توزيع ${totalToDistribute.toLocaleString()} كجم من راجع الحلاب على ${scopeLabel} (${targetBarns.length} عنبر)!`,
      'success'
    );
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
    setBatchNumber(isEn ? `Batch ${nextNum}` : `لفة ${nextNum}`);
    const defaultCat = categories[0]?.id || '';
    setCategoryId(defaultCat);
    const matchedCategory = categories.find((c) => c.id === defaultCat);
    setMixerId(matchedCategory?.mixerId || mixers[0]?.id || '');
    setTime(isEn ? '06:00 AM' : '06:00 ص');
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
      showToast(
        isEn
          ? 'Please fill in all required fields and specify batch weight properly'
          : 'يرجى ملء جميع الحقول المطلوبة ووزن اللفة بشكل صحيح',
        'warning'
      );
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
      showToast(
        isEn ? 'Mix batch updated successfully.' : 'تم تحديث بيانات اللفة بنجاح.',
        'success'
      );
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
      showToast(
        isEn ? 'New mix batch added successfully.' : 'تمت إضافة اللفة الجديدة بنجاح.',
        'success'
      );
    }

    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setIsModalOpen(false);
  };

  const handleDeleteBatch = (batchId: string, batchLabel?: string) => {
    showConfirm({
      title: isEn ? 'Delete Mix Batch' : 'حذف لفة خلط',
      message: isEn
        ? `Are you sure you want to delete batch ${batchLabel ? `(${batchLabel})` : ''}?`
        : `هل أنت متأكد من حذف اللفة ${batchLabel ? `(${batchLabel})` : ''}؟`,
      isDanger: true,
      confirmText: isEn ? 'Delete' : 'حذف',
      onConfirm: () => {
        const updated = batches.filter((b) => b.id !== batchId);
        setDailyPlan({ ...dailyPlan, batches: updated });
        showToast(isEn ? 'Mix batch deleted successfully.' : 'تم حذف اللفة بنجاح.', 'info');
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
        showToast(
          isEn
            ? `Category ${cat.name} is not scheduled for mixing today (alternate days).`
            : `فئة ${cat.name} غير مجدولة للخلط اليوم (يوم ويوم / كل يومين).`,
          'info'
        );
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
      const catDisplayName = getCategoryDisplayName(cat.name, isEn);
      const newBatch: MixBatch = {
        id: generateId('batch'),
        batchNumber: isEn ? `Batch ${nextNum} (${catDisplayName})` : `لفة ${nextNum} (${cat.name})`,
        categoryId: cat.id,
        mixerId: cat.mixerId || mixers[0]?.id || '',
        time: isEn ? '08:30 AM' : '08:30 ص',
        targetWeightKg: fixedWeightKg,
        status: 'تم التحضير',
        allocations,
        notes: isEn
          ? `Mixer preparation in tons (${fixedWeightKg.toLocaleString()} kg)`
          : `تحضير مكسر بالطن (${fixedWeightKg.toLocaleString()} كجم)`,
      };

      const updatedBatches = [...batches, newBatch];
      setDailyPlan({
        ...dailyPlan,
        batches: updatedBatches,
      });
      showToast(
        isEn
          ? `Successfully generated (${newBatch.batchNumber}) with ${fixedWeightKg.toLocaleString()} kg!`
          : `تم بنجاح توليد (${newBatch.batchNumber}) بوزن ${fixedWeightKg.toLocaleString()} كجم!`,
        'success'
      );
      return;
    }

    // Standard Category (Per-Head demand after deducting recycled refusal)
    if (catBarns.length === 0) {
      showToast(
        isEn ? 'No active pens registered in this category!' : 'لا توجد عنابر نشطة مسجلة في هذه الفئة!',
        'warning'
      );
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
      showToast(
        isEn
          ? 'All pens in this category are already fully covered and allocated!'
          : 'جميع عنابر هذه الفئة مغطاة وموزعة بالكامل بالفعل!',
        'info'
      );
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
              notes: isEn
                ? `Covering 100% of ${cat.name} herd demand (${Math.round(fullWeight).toLocaleString()} kg)`
                : `تغطية كامل احتياج قطيع ${cat.name} (${Math.round(fullWeight).toLocaleString()} كجم) - بنسبة 100%`,
            };
          }
          return b;
        });

      const updatedPlan = { ...dailyPlan, batches: updatedBatches };
      setDailyPlan(updatedPlan);
      saveDailyPlan(updatedPlan);
      showToast(
        isEn
          ? `Successfully updated (${existingBatch.batchNumber}) with ${Math.round(fullWeight).toLocaleString()} kg covering 100% of category!`
          : `تم بنجاح تحديث (${existingBatch.batchNumber}) بوزن ${Math.round(fullWeight).toLocaleString()} كجم وتغطية الفئة بنسبة 100%!`,
        'success'
      );
      return;
    }

    const nextNum = catBatches.length + 1;
    const catDisplayName = getCategoryDisplayName(cat.name, isEn);
    const newBatch: MixBatch = {
      id: generateId('batch'),
      batchNumber: isEn ? `Batch ${nextNum} (${catDisplayName})` : `لفة ${nextNum} (${cat.name})`,
      categoryId: cat.id,
      mixerId: cat.mixerId || mixers[0]?.id || '',
      time: isEn ? '09:30 AM' : '09:30 ص',
      targetWeightKg: Math.round(totalBatchWeight * 1000) / 1000,
      status: 'تم التحضير',
      allocations,
      notes: isEn
        ? `Covering ${catDisplayName} herd demand (${Math.round(totalBatchWeight)} kg)`
        : `تغطية احتياج قطيع ${cat.name} (${Math.round(totalBatchWeight)} كجم)`,
    };

    const updatedBatches = [...batches, newBatch];
    const updatedPlan = { ...dailyPlan, batches: updatedBatches };
    setDailyPlan(updatedPlan);
    saveDailyPlan(updatedPlan);
    showToast(
      isEn
        ? `Successfully generated (${newBatch.batchNumber}) with ${Math.round(totalBatchWeight).toLocaleString()} kg allocated 100% to pens!`
        : `تم بنجاح توليد (${newBatch.batchNumber}) بوزن ${Math.round(totalBatchWeight).toLocaleString()} كجم وتوزيعها على العنابر بنسبة 100%!`,
      'success'
    );
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
    showToast(
      isEn
        ? 'Duplicate batches removed and all batch weights synced 100% with pen requirements!'
        : 'تم بنجاح حذف اللفات المكررة ومزامنة وتحديث أوزان اللفات مع الاحتياج الفعلي للعنابر بنسبة 100%!',
      'success'
    );
  };

  // Sorted barns strictly by orderIndex
  const sortedBarns = useMemo(() => {
    return [...barns].sort((a, b) => {
      const orderA = a.orderIndex !== undefined ? a.orderIndex : 9999;
      const orderB = b.orderIndex !== undefined ? b.orderIndex : 9999;
      return orderA - orderB;
    });
  }, [barns]);

  // Grouped by Category View Toggle in Daily Plan Table
  const [groupByCategoryView, setGroupByCategoryView] = useState<boolean>(false);
  const isGroupedViewActive = groupByCategoryView && selectedCategoryFilter === 'all';

  // Manual reorder barn move up / down directly from Daily Plan
  const handleMoveBarn = (barnId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedBarns.findIndex((b) => b.id === barnId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedBarns.length) return;

    const newBarns = [...sortedBarns];
    const temp = newBarns[currentIndex];
    newBarns[currentIndex] = newBarns[targetIndex];
    newBarns[targetIndex] = temp;

    const ordered = newBarns.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    if (setBarns) {
      setBarns(ordered);
    }
    // Also re-sync batches with new barn order
    const { batches: cleaned } = sanitizeBatches(
      dailyPlan.batches || [],
      ordered,
      categories,
      rations,
      dailyPlan
    );
    const updatedPlan = { ...dailyPlan, batches: cleaned };
    setDailyPlan(updatedPlan);
    saveDailyPlan(updatedPlan);

    const barnNumDisplay = isEn && temp.number.startsWith('عنبر')
      ? `Barn ${temp.number.replace('عنبر', '').trim()}`
      : temp.number;
    showToast(
      isEn
        ? `Moved ${barnNumDisplay} ${direction === 'up' ? 'Up ⬆' : 'Down ⬇'} and synchronized operation plan successfully!`
        : `تم نقل ${temp.number} ${direction === 'up' ? 'للأعلى ⬆' : 'للأسفل ⬇'} ومزامنة حطة التشغيل بنجاح`,
      'success'
    );
  };

  // Filtered barns strictly sorted by orderIndex
  const filteredBarns = useMemo(() => {
    return sortedBarns.filter((b) => {
      if (selectedCategoryFilter === 'all') return true;
      return b.categoryId === selectedCategoryFilter;
    });
  }, [sortedBarns, selectedCategoryFilter]);

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
  const milkingBarnsOnly = sortedBarns.filter((b) => {
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
  const refusalPoolStats = calculateAvailableMilkingRefusalPool(sortedBarns, categories, rations, dailyPlan);

  // Dry Matter Summary for current filtered barns
  const dmSummary = useMemo(() => {
    return calculateFarmDmSummary(filteredBarns, categories, rations, dailyPlan, rawMaterials);
  }, [filteredBarns, categories, rations, dailyPlan, rawMaterials]);

  // Periodic Categories (like Calf / Weaner)
  const periodicCategories = categories.filter(
    (c) => c.calculationType === 'fixed_tonnage' || c.isPeriodicMixer
  );

  const renderDailyBarnRow = (barn: Barn, globalIndex: number) => {
    const barnState = getBarnDailyState(barn, dailyPlan);
    const category = categories.find((c) => c.id === barn.categoryId);
    const ration = getBarnRation(barn, categories, rations, dailyPlan);
    const totalRationKgPerHead = calculateRationTotalKgPerHead(ration);
    const rationDmStats = calculateRationDmStats(ration, rawMaterials);
    const barnDmDemandKg = calculateBarnDmDemandKg(barn, categories, rations, dailyPlan, rawMaterials);
    const barnDmiPerHeadKg = calculateBarnDmiPerHeadKg(barn, categories, rations, dailyPlan, rawMaterials);
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
        <td className="py-2.5 px-2 text-center font-bold border-l border-slate-100">
          <div className="flex items-center justify-center gap-1">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] inline-flex items-center justify-center border border-slate-200 shrink-0">
              #{barn.orderIndex || globalIndex + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => handleMoveBarn(barn.id, 'up')}
                disabled={globalIndex === 0}
                className={`p-0.5 rounded transition-all ${
                  globalIndex === 0
                    ? 'text-slate-200 cursor-not-allowed'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer active:scale-90'
                }`}
                title={isEn ? 'Move pen up ⬆' : 'تحريك العنبر للأعلى ⬆'}
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveBarn(barn.id, 'down')}
                disabled={globalIndex === sortedBarns.length - 1}
                className={`p-0.5 rounded transition-all ${
                  globalIndex === sortedBarns.length - 1
                    ? 'text-slate-200 cursor-not-allowed'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer active:scale-90'
                }`}
                title={isEn ? 'Move pen down ⬇' : 'تحريك العنبر للأسفل ⬇'}
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3 font-black text-slate-900">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={isEn ? getBarnNumberDisplayName(barnState.displayNumber || barn.number, true) : (barnState.displayNumber || barn.number)}
              onChange={(e) => handleBarnUpdate(barn.id, { number: e.target.value })}
              className="w-24 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs focus:bg-white focus:outline-emerald-600"
              placeholder={isEn ? 'Pen #' : 'رقم العنبر'}
              title={isEn ? 'Edit pen number' : 'تعديل رقم العنبر'}
            />
            <input
              type="text"
              value={isEn ? getBarnNameDisplayName(barnState.displayName || barn.name || '', true) : (barnState.displayName || barn.name || '')}
              onChange={(e) => handleBarnUpdate(barn.id, { name: e.target.value })}
              className="w-28 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:bg-white focus:outline-emerald-600"
              placeholder={isEn ? 'Pen name' : 'اسم العنبر'}
              title={isEn ? 'Edit pen name' : 'تعديل اسم العنبر'}
            />
          </div>
        </td>
        <td className="py-3 px-3">
          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-1 rounded-md text-[11px] border border-slate-200">
            {getCategoryDisplayName(category?.name, isEn)}
          </span>
        </td>
        <td className="py-3 px-3">
          <div className="flex flex-col gap-0.5 max-w-[130px]">
            <span className="text-[11px] font-bold text-emerald-900 truncate">
              {getRationDisplayName(ration?.name, isEn) || (isEn ? 'No Ration' : 'لا توجد عليقة')}
            </span>
            {ration && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded w-fit">
                <span>{rationDmStats.dmPercent}% DM</span>
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-3 text-center">
          <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl px-1.5 py-0.5">
            <input
              type="number"
              min={1}
              value={barnState.headCount}
              onChange={(e) => handleBarnUpdate(barn.id, { headCount: Math.max(1, Number(e.target.value)) })}
              className="w-14 text-center font-black text-emerald-950 bg-transparent focus:outline-none text-xs"
              title={isEn ? 'Edit head count' : 'تعديل عدد الرؤوس'}
            />
            <span className="font-bold text-emerald-800 text-[10px]">{isEn ? 'heads' : 'رأس'}</span>
          </div>
        </td>
        <td className="py-3 px-3 text-center font-bold text-slate-700">
          {totalRationKgPerHead} {isEn ? 'kg' : 'كجم'}
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
          {grossDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
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
                title={
                  isEn
                    ? 'Enter recycled refusal transferred to this pen in kg (auto-deducted from fresh mixer batch)'
                    : 'اكتب كمية راجع الحلاب المحولة لهذا العنبر بالكيلوجرام (تخصم تلقائياً من خامات المكسر)'
                }
              />
              <span className="text-[10px] font-extrabold text-amber-800">{isEn ? 'kg' : 'كجم'}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px] font-medium">—</span>
          )}
        </td>
        <td className="py-3 px-3 font-extrabold text-emerald-950 bg-emerald-50/80 text-sm">
          {netDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
        </td>
        <td className="py-3 px-3 text-center font-black text-blue-950 bg-blue-50/80">
          {barnDmDemandKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
        </td>
        <td className="py-3 px-3 text-center font-black text-blue-900 bg-blue-50/60">
          {barnDmiPerHeadKg} {isEn ? 'kg' : 'كجم'}
        </td>
        <td className="py-3 px-3 text-center bg-amber-50/40">
          <div className="flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-1.5 py-0.5 shadow-2xs">
              <input
                type="number"
                min={0}
                step="any"
                value={barnState.refusalValue || ''}
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
                {barnState.refusalType === 'kg' ? (isEn ? 'kg' : 'كجم') : '%'}
              </span>
            </div>
            <div className="text-[9px] font-bold text-slate-500 whitespace-nowrap">
              {barnState.refusalType === 'kg' ? (
                <span>
                  {isEn ? 'Equiv: ' : 'يعادل: '}
                  <strong className="text-amber-800">
                    {netDemandKg > 0 ? ((barnRefusalKg / netDemandKg) * 100).toFixed(1) : 0}%
                  </strong>
                </span>
              ) : (
                <span>
                  {isEn ? 'Weight: ' : 'الوزن: '}
                  <strong className="text-amber-800">
                    {barnRefusalKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-3 font-black text-blue-950 text-sm bg-blue-50/40">
          {barnIntakeKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
        </td>
      </tr>
    );
  };

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Print Header (Visible only when printing) */}
      <PrintHeader
        documentTitle={
          isEn
            ? 'Daily Feeding Operations Plan & Mixer Batch Schedule'
            : 'برنامج التغذية اليومي وخطة تشغيل المكسرات والعنابر'
        }
        documentSubtitle={
          isEn
            ? `Herd Feeding Schedule & Daily Demand - ${settings?.farmName || ''}`
            : `جدول التغذية والاحتياج اليومي للقطعان - ${settings?.farmName || ''}`
        }
        selectedDate={dailyPlan.date}
        settings={settings}
      />

      {/* Top Header & View Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-700" />
            {isEn ? 'Daily Feeding Program & Mixer Batches' : 'برنامج التغذية اليومي وخطة المكسرات'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isEn
              ? 'Detailed pen feeding schedules, feeding ratio adjustments, and milking refusal recycling'
              : 'جدول التغذية التفصيلي للعنابر، تعديل نسب التغذية، وتدوير راجع الحلاب'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>{isEn ? 'Date:' : 'التاريخ:'}</span>
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
              {isEn ? '📋 Feeding Program' : '📋 جدول التغذية اليومي'}
            </button>
            <button
              onClick={() => setActiveSubTab('batches')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'batches'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? '🚜 Mixer Batches' : '🚜 خطة لفات المكسر'}
            </button>
          </div>

          {onOpenPrintPreview && (
            <button
              type="button"
              onClick={onOpenPrintPreview}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border border-emerald-700/60"
              title={isEn ? 'Preview daily plan A4 layout' : 'معاينة أوامر تحضير الخطة اليومية A4 قبل الطباعة'}
            >
              <Eye className="w-4 h-4 text-emerald-300" />
              <span>{isEn ? 'Print Preview' : 'معاينة الطباعة'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={isEn ? 'Print daily feeding program' : 'طباعة برنامج التغذية والخطة اليومية'}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{isEn ? 'Print Program' : 'طباعة البرنامج'}</span>
          </button>

          <ExportExcelButton
            onExport={() => exportDailyPlanToExcel(dailyPlan, categories, mixers, rations, barns, rawMaterials)}
            label={isEn ? 'Daily Plan Excel' : 'تصدير الخطة للإكسيل'}
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
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {isEn ? 'Milking Herd Refusal Recycling & Transfer' : 'تدوير وتوزيع راجع قطيع الحلاب'}
                    </h3>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {isEn
                        ? 'Milking refusals are credited and deducted from fresh TMR requirements for designated target groups'
                        : 'يتم سحب راجع الحلاب وخصمه من كمية العلف الطازج المطلوب لأي فئة حيوانية تختارها'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Category Dropdown Selector */}
                  <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                      {isEn ? 'Transfer to:' : 'توزيع على:'}
                    </span>
                    <select
                      value={selectedRefusalTargetCategory}
                      onChange={(e) => setSelectedRefusalTargetCategory(e.target.value)}
                      className="text-xs font-black text-amber-950 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all_eligible">
                        {isEn ? 'All Eligible Groups (Non-Milking)' : 'جميع الفئات المؤهلة (غير الحلاب)'}
                      </option>
                      <option value="growing_fattening">
                        {isEn ? 'Growing & Fattening Combined' : 'فئات النامي والتسمين معاً'}
                      </option>
                      {nonMilkingCategories.map((c) => {
                        const cBarns = barns.filter((b) => b.categoryId === c.id && b.status === 'نشط');
                        return (
                          <option key={c.id} value={c.id}>
                            {isEn ? `${c.name} (${cBarns.length} pens)` : `فئة ${c.name} (${cBarns.length} عنبر)`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoDistributeMilkingRefusal(selectedRefusalTargetCategory)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                    title={isEn ? 'Distribute refusal to selected target category' : 'توزيع راجع الحلاب على الفئة المحددة'}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                    <span>{isEn ? 'Auto-Distribute' : 'توزيع الراجع'}</span>
                  </button>

                  {refusalPoolStats.totalAllocatedRecycledKg > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAutoDistributeMilkingRefusal('clear')}
                      className="px-2.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                      title={isEn ? 'Clear all transferred refusals across pens' : 'تصفير الراجع المحول لجميع العنابر'}
                    >
                      {isEn ? 'Clear' : 'تصفير'}
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white/90 rounded-xl p-3 border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isEn ? 'Available Milking Refusal' : 'راجع الحلاب المتاح'}
                  </span>
                  <span className="text-base font-black text-amber-900">
                    {refusalPoolStats.totalMilkingRefusalKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                  </span>
                </div>
                <div className="bg-white/90 rounded-xl p-3 border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      {isEn ? 'Transferred Refusal' : 'إجمالي الراجع المحول'}
                    </span>
                    {refusalPoolStats.utilizationPercent > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {refusalPoolStats.utilizationPercent}%
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-emerald-800">
                    {refusalPoolStats.totalAllocatedRecycledKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                  </span>
                </div>
                <div className="bg-white/90 rounded-xl p-3 border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isEn ? 'Unallocated Surplus' : 'الفائض غير المحول'}
                  </span>
                  <span className="text-base font-black text-slate-700">
                    {refusalPoolStats.remainingRefusalPoolKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                  </span>
                </div>
              </div>

              {/* Dynamic per-category badges if any recycled */}
              {refusalPoolStats.totalAllocatedRecycledKg > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  <span className="text-[11px] font-bold text-slate-600">
                    {isEn ? 'Current Distribution by Category:' : 'التوزيع الحالي حسب الفئات:'}
                  </span>
                  {categories.map((cat) => {
                    const catBarns = barns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
                    const catAllocated = catBarns.reduce((sum, b) => sum + calculateBarnRecycledRefusalKg(b, dailyPlan), 0);
                    if (catAllocated <= 0) return null;
                    return (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 shadow-2xs"
                      >
                        <span className="text-slate-600">{getCategoryDisplayName(cat.name, isEn)}:</span>
                        <strong className="text-emerald-700">{catAllocated.toLocaleString()} {isEn ? 'kg' : 'كجم'}</strong>
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
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {isEn ? 'Periodic Mixer Batches by Tonnage' : 'تشغيل الخلطات الدورية بالطن'}
                    </h3>
                  </div>
                </div>
              </div>

              {periodicCategories.length === 0 ? (
                <div className="text-xs text-slate-500 bg-white/70 p-3 rounded-xl border border-slate-200 text-center">
                  {isEn
                    ? 'No periodic or fixed-tonnage categories configured. Enable "Periodic Tonnage Mixer" in Categories.'
                    : 'لا توجد فئات معينة بنظام الطن أو المكسر الدوري. يمكنك تفعيل خيار "خلط دوري بالطن" من تبويب "الفئات الحيوانية".'}
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
                                  <span>{isEn ? 'Mixer Operated Today' : 'يتم تشغيل المكسر والخلط اليوم'}</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  <span>{isEn ? 'Not Mixed Today (Feeds from Prior Batch)' : 'لا يخلط اليوم (تغذية من رصيد سابق)'}</span>
                                </>
                              )}
                            </button>
                            <span className="font-black text-slate-900 text-sm">{pCat.name}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2.5 py-1 rounded-lg">
                              {isEn
                                ? `Herd: ${totalCatHeads} heads in ${catBarns.length} pens`
                                : `القطيع: ${totalCatHeads} رأس في ${catBarns.length} عنبر`}
                            </span>
                            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg">
                              {isEn
                                ? `Daily Demand: ${catDailyDemand.toLocaleString()} kg/day`
                                : `الاستهلاك اليومي: ${catDailyDemand.toLocaleString()} كجم/يوم`}
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
                                  {isEn ? '⚖️ Target Mixer Batch Weight (kg / ton):' : '⚖️ وزن لفة المكسر المطلوبة (كجم / طن):'}
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
                                    <span className="font-extrabold text-blue-900 text-xs">{isEn ? 'kg' : 'كجم'}</span>
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
                                      {preset >= 1000 ? `${preset / 1000} ${isEn ? 'ton' : 'طن'}` : `${preset}kg`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 2. Set by Duration / Coverage Days */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-700 block">
                                  {isEn ? '📅 Target Coverage Duration (Days):' : '📅 عدد الأيام المطلوب أن تكفيها الخلطة:'}
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
                                    <span className="font-extrabold text-purple-900 text-xs">{isEn ? 'days' : 'أيام'}</span>
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
                                      {days === 7 ? (isEn ? '1 Week (7d)' : 'أسبوع (7 أيام)') : `${days} ${isEn ? 'days' : 'أيام'}`}
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
                                    {isEn ? (
                                      <>
                                        Batch of <strong>{weightKg.toLocaleString()} kg ({weightKg / 1000} tons)</strong> covers {pCat.name} for{' '}
                                        <strong className="text-emerald-800 underline decoration-2 font-black">{durationDays} days</strong>
                                      </>
                                    ) : (
                                      <>
                                        خلطة <strong>{weightKg.toLocaleString()} كجم ({weightKg / 1000} طن)</strong> ستكفي قطيع {pCat.name} لمدة{' '}
                                        <strong className="text-emerald-800 underline decoration-2 font-black">{durationDays} يوم</strong>
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-800">
                                  {isEn
                                    ? `Full ${weightKg.toLocaleString()} kg raw materials will be dispensed from warehouse today, while pens receive their daily portion (${catDailyDemand.toLocaleString()} kg/day).`
                                    : `يتم سحب خامات الـ ${weightKg.toLocaleString()} كجم كاملة للمكسر اليوم من المخزن، ويتم تغذية العنابر بمقررها اليومي (${catDailyDemand.toLocaleString()} كجم/يوم).`}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAutoGenerateCategoryBatch(pCat.id)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
                              >
                                <Zap className="w-4 h-4 text-amber-300" />
                                <span>{isEn ? `Stage Batch (${weightKg.toLocaleString()} kg)` : `تجهيز لفة المكسر (${weightKg.toLocaleString()} كجم)`}</span>
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
                                  {isEn ? `No mixer operation needed for ${pCat.name} today` : `لا يلزم تشغيل المكسر لـ ${pCat.name} اليوم`}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {isEn
                                    ? `Pens feed from previously mixed batch balance. Daily feeding target (${catDailyDemand.toLocaleString()} kg) shows below.`
                                    : `تتغذى العنابر اليوم من رصيد الخلطة السابقة المحضرة، ويظهر مقرر التغذية اليومي (${catDailyDemand.toLocaleString()} كجم) في جدول العنابر بالأسفل.`}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePeriodicMixerToggle(pCat.id, true)}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              {isEn ? 'Mix Today' : 'تشغيل المكسر اليوم'}
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
              <span className="text-xs font-extrabold text-slate-800">
                {isEn ? 'Filter by Animal Category:' : 'تصفية حسب الفئة الحيوانية:'}
              </span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              >
                <option value="all">
                  {isEn ? `All Animal Categories (${categories.length})` : `جميع الفئات الحيوانية (${categories.length})`}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {isEn ? 'Pens:' : 'العنابر:'} <strong className="text-slate-900">{filteredBarns.length}</strong>
              </span>
              <span className="text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {isEn ? 'Heads:' : 'الرؤوس:'} <strong className="text-emerald-800">{totalHeads.toLocaleString()} {isEn ? 'heads' : 'رأس'}</strong>
              </span>
              <span className="text-slate-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {isEn ? 'Net TMR Demand:' : 'صافي الطازج TMR:'} <strong className="text-emerald-900">{totalDailyDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}</strong>
              </span>
              <span className="text-blue-950 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5">
                <span>{isEn ? 'Dry Matter (DM):' : 'المادة الجافة (DM):'}</span>
                <strong className="text-blue-900">{dmSummary.totalDmDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}</strong>
                <span className="text-[10px] text-blue-700 bg-blue-100/90 px-1.5 py-0.2 rounded font-black">
                  {dmSummary.averageDmPercent}% DM
                </span>
              </span>
              <span className="text-blue-950 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {isEn ? 'Avg DMI/Head:' : 'متوسط DMI للرأس:'} <strong className="text-blue-900">{dmSummary.averageDmiPerHeadKg} {isEn ? 'kg/head' : 'كجم/رأس'}</strong>
              </span>
              <span className="text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {isEn ? 'Refusal:' : 'الراجع:'} <strong className="text-amber-800">{overallRefusalPercent}%</strong> ({totalRefusalKg.toLocaleString()} {isEn ? 'kg' : 'كجم'})
                {selectedCategoryFilter === 'all' && milkingRefusalPercent > 0 && milkingRefusalPercent !== overallRefusalPercent && (
                  <span className={`text-[10px] text-amber-700 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded ${isEn ? 'ml-1.5' : 'mr-1.5'}`}>
                    {isEn ? `Milking: ${milkingRefusalPercent}%` : `قطيع الحلاب: ${milkingRefusalPercent}%`}
                  </span>
                )}
              </span>
              <span className="text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {isEn ? 'Actual Intake:' : 'المأكول الفعلي:'} <strong className="text-blue-950">{totalActualIntakeKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}</strong>
              </span>
            </div>
          </div>

          {/* Interactive Barns Feeding Table (Requirement 7 & 8) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  {isEn ? 'Daily Pen Feeding Demand Schedule' : 'جدول التغذية اليومي وحساب احتياج العنابر'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'Net fresh TMR demand = (Gross demand - Transferred milking refusal). Includes dry matter (DM) and DMI metrics.'
                    : 'صافي الطازج المطلوب TMR = (الاحتياج الإجمالي - راجع الحلاب المحول). يتضمن مؤشرات المادة الجافة (DM) واستهلاك DMI للرأس.'}
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGroupByCategoryView(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    !groupByCategoryView
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isEn ? 'Sequential free pen order' : 'عرض العنابر متتابعة حسب تسلسل وترتيب التسكين الحر'}
                >
                  {isEn ? '🔢 Sequential' : '🔢 عرض متتابع حر'}
                </button>
                <button
                  type="button"
                  onClick={() => setGroupByCategoryView(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    groupByCategoryView
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isEn ? 'Grouped by animal category' : 'عرض العنابر مجمعة داخل فئاتها'}
                >
                  {isEn ? '📁 Grouped by Category' : '📁 عرض مجمع بالفئات'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${isEn ? 'text-left' : 'text-right'}`}>
                <thead className="bg-slate-100/90 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-2 text-center w-24">{isEn ? 'Order' : 'الترتيب'}</th>
                    <th className="py-3.5 px-3">{isEn ? 'Pen # & Name' : 'رقم واسم العنبر'}</th>
                    <th className="py-3.5 px-3">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
                    <th className="py-3.5 px-3">{isEn ? 'Assigned Ration' : 'العليقة المعينّة'}</th>
                    <th className="py-3.5 px-3 text-center">{isEn ? 'Head Count' : 'عدد الرؤوس'}</th>
                    <th className="py-3.5 px-3 text-center">{isEn ? 'Ration (kg/hd)' : 'العليقة (كجم/رأس)'}</th>
                    <th className="py-3.5 px-3 text-center">{isEn ? 'Feed Ratio %' : 'نسبة التغذية %'}</th>
                    <th className="py-3.5 px-3 text-slate-900 text-center">{isEn ? 'Gross Demand' : 'الاحتياج الإجمالي'}</th>
                    <th className="py-3.5 px-3 text-amber-900 bg-amber-50/70 text-center">
                      {isEn ? 'Refusal Credit (kg)' : 'راجع حلاب محول (كجم)'}
                    </th>
                    <th className="py-3.5 px-3 text-emerald-950 bg-emerald-50/80 font-black">
                      {isEn ? 'Net Fresh TMR' : 'صافي الطازج TMR'}
                    </th>
                    <th className="py-3.5 px-3 text-blue-950 bg-blue-50/80 font-black text-center">
                      {isEn ? 'Dry Matter (kg DM)' : 'المادة الجافة (كجم DM)'}
                    </th>
                    <th className="py-3.5 px-3 text-blue-950 bg-blue-50/60 font-black text-center">
                      {isEn ? 'Intake (DMI)' : 'مأكول الرأس (DMI)'}
                    </th>
                    <th className="py-3.5 px-3 text-amber-950 bg-amber-50/40 text-center">
                      {isEn ? 'Manger Refusal' : 'راجع الطوالة'}
                    </th>
                    <th className="py-3.5 px-3 text-blue-950 bg-blue-50/70">
                      {isEn ? 'Actual Intake' : 'المأكول الفعلي'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {filteredBarns.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-slate-400 text-xs">
                        {isEn ? 'No pens registered under this category.' : 'لا توجد عنابر مسجلة في هذه الفئة.'}
                      </td>
                    </tr>
                  ) : isGroupedViewActive ? (
                    // Grouped rendering by category
                    categories.map((category) => {
                      const categoryBarns = sortedBarns.filter((b) => b.categoryId === category.id);
                      if (categoryBarns.length === 0) return null;
                      const totalCatHeads = categoryBarns.reduce((sum, b) => {
                        const bState = getBarnDailyState(b, dailyPlan);
                        return sum + (bState.headCount || 0);
                      }, 0);
                      const totalCatDemand = categoryBarns.reduce(
                        (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
                        0
                      );
                      return (
                        <React.Fragment key={`cat-grp-${category.id}`}>
                          <tr className="bg-slate-100/90 border-t-2 border-b border-slate-300">
                            <td colSpan={14} className="py-2.5 px-4 text-slate-900">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                  <span className="text-xs font-extrabold text-slate-900">
                                    {isEn ? `Category: ${category.name}` : `فئة: ${category.name}`}
                                  </span>
                                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold text-[10px] border border-emerald-300">
                                    {categoryBarns.length} {isEn ? 'pens' : 'عنابر'}
                                  </span>
                                  <span className={`text-slate-600 font-semibold text-[11px] ${isEn ? 'ml-1' : 'mr-1'}`}>
                                    ({totalCatHeads.toLocaleString()} {isEn ? 'heads' : 'رأس'} • {Math.round(totalCatDemand).toLocaleString()} {isEn ? 'kg feed' : 'كجم علف'})
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {categoryBarns.map((barn) => {
                            const globalIndex = sortedBarns.findIndex((b) => b.id === barn.id);
                            return renderDailyBarnRow(barn, globalIndex);
                          })}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    // Flat sequential rendering
                    filteredBarns.map((barn) => {
                      const globalIndex = sortedBarns.findIndex((b) => b.id === barn.id);
                      return renderDailyBarnRow(barn, globalIndex);
                    })
                  )}
                </tbody>
                <tfoot className="bg-emerald-950 text-white font-bold text-xs">
                  <tr>
                    <td colSpan={4} className={`py-3.5 px-3 ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn ? 'Grand Daily Total:' : 'الإجمالي اليومي العام:'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-extrabold text-amber-300">
                      {totalHeads.toLocaleString()} {isEn ? 'heads' : 'رأس'}
                    </td>
                    <td colSpan={2} className="py-3.5 px-3"></td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-300">
                      {totalGrossDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-300">
                      {isEn ? 'Credit: ' : 'محول: '}{totalRecycledRefusalAllocatedKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-3 font-black text-amber-300 text-sm">
                      {totalDailyDemandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-blue-200">
                      {dmSummary.totalDmDemandKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-blue-200">
                      DMI: {dmSummary.averageDmiPerHeadKg} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-200">
                      {isEn ? 'Refusal: ' : 'راجع: '}{filteredBarns.reduce((s, b) => s + calculateBarnRefusalKg(b, categories, rations, dailyPlan), 0).toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td className="py-3.5 px-3 font-black text-emerald-300 text-sm">
                      {isEn ? 'Intake: ' : 'مأكول: '}{filteredBarns.reduce((s, b) => s + calculateBarnActualIntakeKg(b, categories, rations, dailyPlan), 0).toLocaleString()} {isEn ? 'kg' : 'كجم'}
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
              {isEn ? 'Raw Material Demand per Category & Pen (Detailed Summary)' : 'حساب احتياج كل خامة لكل فئة وعنبر (مجموع الاحتياجات التفصيلي)'}
            </h3>

            {categories
              .filter((cat) => selectedCategoryFilter === 'all' || cat.id === selectedCategoryFilter)
              .map((cat) => {
                const catBarns = sortedBarns.filter((b) => b.categoryId === cat.id && b.status === 'نشط');
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
                        <h4 className="font-black text-slate-900 text-base">{isEn ? `Category: ${cat.name}` : `فئة: ${cat.name}`}</h4>
                        <span className="text-xs text-slate-500 font-bold">
                          {isEn
                            ? `(${catBarns.length} pens | Ration: ${ration?.name || '—'})`
                            : `(${catBarns.length} عنابر | عليقة: ${ration?.name || '—'})`}
                        </span>
                        {isPeriodicOrFixed && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            isMixedToday ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isMixedToday
                              ? (isEn ? '⚡ Ton / Periodic Mixer (Mixing Today)' : '⚡ نظام الطن / مكسر دوري (يتم الخلط اليوم)')
                              : (isEn ? '⏸ Periodic (Postponed Today)' : '⏸ دوري (مؤجل اليوم)')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
                        {isEn
                          ? `Total Category Demand: ${totalDemandCat.toLocaleString()} kg`
                          : `إجمالي احتياج الفئة: ${totalDemandCat.toLocaleString()} كجم`}
                      </div>
                    </div>

                    {totalDemandCat <= 0 && isPeriodicOrFixed && !isMixedToday ? (
                      <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                        {isEn
                          ? 'This category is set to "Do Not Mix Today" (alternate days). No raw materials are drawn today.'
                          : 'هذه الفئة محددة كـ "لا يخلط اليوم" (يوم ويوم / كل يومين). لا توجد خامات مسحوبة لليوم.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-xs ${isEn ? 'text-left' : 'text-right'}`}>
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">{isEn ? 'Material Name' : 'اسم الخامة'}</th>
                              <th className="py-2.5 px-3 text-center">{isEn ? 'Qty/Head (kg)' : 'الكمية للرأس (كجم)'}</th>
                              <th className="py-2.5 px-3 text-center">{isEn ? 'Ration %' : 'النسبة بالعليقة %'}</th>
                              <th className="py-2.5 px-3 text-center bg-blue-50/70 text-blue-900">{isEn ? 'Dry Matter % (DM)' : 'المادة الجافة % (DM)'}</th>
                              <th className="py-2.5 px-3 text-center bg-blue-50/70 text-blue-900">{isEn ? 'Dry Matter (kg DM)' : 'المادة الجافة (كجم DM)'}</th>
                              <th className={`py-2.5 px-3 font-extrabold text-slate-900 ${isEn ? 'text-right' : 'text-left'}`}>{isEn ? 'Total Category Qty (kg As-Fed)' : 'إجمالي الكمية للفئة بالكامل (كجم As-Fed)'}</th>
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

                              const matDmPercent = getRawMaterialDryMatterPercent(rawMat);
                              const catIngDmKg = Math.round(catIngredientKg * (matDmPercent / 100) * 10) / 10;

                              return (
                                <tr key={`${cat.id}-${ing.rawMaterialId || 'ing'}-${ingIdx}`} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 font-bold text-slate-900">{rawMat?.name || (isEn ? 'Material' : 'خامة')}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-slate-700">{ing.amountKgPerHead} {isEn ? 'kg' : 'كجم'}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-emerald-800">{proportionPercent}%</td>
                                  <td className="py-2.5 px-3 text-center font-black text-blue-900 bg-blue-50/30">{matDmPercent}%</td>
                                  <td className="py-2.5 px-3 text-center font-black text-blue-950 bg-blue-50/30">
                                    {catIngDmKg.toLocaleString()} {isEn ? 'kg DM' : 'كجم DM'}
                                  </td>
                                  <td className={`py-2.5 px-3 font-black text-emerald-900 text-sm ${isEn ? 'text-right' : 'text-left'}`}>
                                    {Math.round(catIngredientKg * 10) / 10} {isEn ? 'kg' : 'كجم'}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-700" />
                {isEn ? 'Plan Mixer Batches by Category Demand' : 'تخطيط أوزان وعدد لفات المكسر حسب احتياج كل فئة'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanAndSyncBatches}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={isEn ? 'Remove duplicate batches and sync batch weights with actual pen requirements' : 'إزالة أي لفات مكررة وضبط ومزامنة أوزان اللفات مع الاحتياج الفعلي للعنابر فورياً'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Fix & Sync Batches' : 'إصلاح ومزامنة اللفات (حذف التكرار)'}</span>
                </button>
                <button
                  onClick={handleOpenAddBatch}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isEn ? 'Add New Mix Batch' : 'إضافة لفة مكسر جديدة'}</span>
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
                        <span className="font-extrabold text-slate-900 text-sm">{getCategoryDisplayName(cat.name, isEn)}</span>
                        {isPeriodicOrFixed && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                            {isEn ? 'Tons' : 'بالطن'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-bold">{mixer ? getMixerDisplayName(mixer.name, isEn) : (isEn ? 'Mixer' : 'مكسر')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>{isEn ? 'Daily Category Demand:' : 'الاحتياج اليومي للفئة:'}</span>
                      <span className="font-bold text-slate-900">{demandKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>{isEn ? 'Total Batch Weights:' : 'إجمالي أوزان اللفات:'}</span>
                      <span className="font-bold text-emerald-800">
                        {plannedKg.toLocaleString()} {isEn ? `kg (${catBatches.length} batches)` : `كجم (${catBatches.length} لفات)`}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 text-xs flex flex-col gap-2">
                      {Math.abs(diffKg) <= 0.01 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {isEn ? 'Weights perfectly match demand!' : 'الأوزان متطابقة تمامًا مع الاحتياج!'}
                        </span>
                      ) : diffKg < 0 ? (
                        <>
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {isEn ? `Remaining ${Math.abs(diffKg)} kg needs additional batches` : `متبقي ${Math.abs(diffKg)} كجم يحتاج لفات إضافية`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateCategoryBatch(cat.id)}
                            className="w-full py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <Zap className="w-3 h-3 text-amber-200" />
                            <span>{isEn ? `Auto-generate batch for ${cat.name} (${Math.abs(diffKg)} kg)` : `توليد لفة تلقائية لـ ${cat.name} (${Math.abs(diffKg)} كجم)`}</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {isEn ? `Excess planned batch weight by ${diffKg} kg` : `زيادة في أوزان اللفات المخططة بـ ${diffKg} كجم`}
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
                <h3 className="font-bold text-slate-800 text-base">
                  {isEn ? `Approved Mix Batches for (${selectedDate})` : `جدول لفات المكسر المعتمدة ليوم (${selectedDate})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn ? 'Batches sorted and grouped by department (Milking, Growing, etc.)' : 'اللفات مرتبة ومجمعة حسب الأقسام (الحلاب، النامي، ...)'}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                {isEn ? `Total Batches: ${batches.length}` : `إجمالي اللفات: ${batches.length}`}
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
                {isEn ? `All Sections (${batches.length})` : `جميع الأقسام (${batches.length})`}
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
                      <span>{isEn ? `${cat.name} Section` : `قسم ${cat.name}`}</span>
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
                    <h5 className="font-black text-amber-900 text-xs">
                      {isEn ? 'Outdated batch weight detected:' : 'رصد لفات مسجلة بوزن غير محدث:'}
                    </h5>
                    <p className="text-[11px] text-amber-800 font-medium">
                      {isEn ? 'A batch is registered with an old weight that needs syncing with actual pen demand.' : 'يوجد لفة مسجلة بوزن قديم يحتاج إلى مزامنة مع الاحتياج الفعلي للعنابر.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCleanAndSyncBatches}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isEn ? 'Update & Sync Weights Now' : 'تحديث ومزامنة الأوزان الآن'}</span>
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className={`w-full text-sm ${isEn ? 'text-left' : 'text-right'}`}>
                <thead className="bg-slate-100/80 text-slate-600 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">{isEn ? 'Batch #' : 'رقم اللفة'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Time' : 'التوقيت'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Animal Category' : 'الفئة الحيوانية'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Assigned Mixer' : 'المكسر المستخدم'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Target Weight' : 'وزن اللفة المستهدف'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Batch Status' : 'حالة اللفة'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Notes' : 'ملاحظات'}</th>
                    <th className="py-3.5 px-4 text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        {isEn ? 'No mix batches added. Click "Add New Mix Batch" to start.' : 'لا توجد لفات مكسر مضافة. انقر فوق زر "إضافة لفة مكسر جديدة" للبدء.'}
                      </td>
                    </tr>
                  ) : (
                    [...batches]
                      .filter((b) => !categoryId || b.categoryId === categoryId)
                      .sort((a, b) => {
                        const catIndexA = categories.findIndex((c) => c.id === a.categoryId);
                        const catIndexB = categories.findIndex((c) => c.id === b.categoryId);
                        if (catIndexA !== catIndexB) return catIndexA - catIndexB;
                        return a.batchNumber.localeCompare(b.batchNumber, isEn ? 'en' : 'ar');
                      })
                      .map((batch) => {
                        const category = categories.find((c) => c.id === batch.categoryId);
                        const mixer = mixers.find((m) => m.id === batch.mixerId);

                        const formatBatchStatus = (st: MixBatch['status']) => {
                          if (!isEn) return st;
                          switch (st) {
                            case 'مخططة': return 'Planned';
                            case 'قيد التحضير': return 'In Progress';
                            case 'تم التحضير': return 'Prepared';
                            case 'تم التوزيع': return 'Distributed';
                            default: return st;
                          }
                        };

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-4 font-black text-emerald-900 text-base">
                              <div>{batch.batchNumber}</div>
                              {batch.allocations && batch.allocations.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mt-1.5 font-normal">
                                  {batch.allocations.map((a) => {
                                    const bn = sortedBarns.find((b) => b.id === a.barnId);
                                    if (!bn) return null;
                                    return (
                                      <span
                                        key={a.barnId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px] font-bold border border-slate-200"
                                      >
                                        <span className="text-emerald-800 font-black">#{bn.orderIndex || '—'}</span>
                                        <span>{getBarnNumberDisplayName(bn.number, isEn)}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold">({Math.round(a.allocatedKg || 0)} {isEn ? 'kg' : 'كجم'})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-700">
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                                <Clock className="w-3.5 h-3.5 text-slate-500" /> {batch.time}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-emerald-50 text-emerald-900 font-bold px-3 py-1 rounded-lg text-xs border border-emerald-200/80">
                                {category ? getCategoryDisplayName(category.name, isEn) : (isEn ? 'Unassigned' : 'غير محدد')}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600 font-semibold">
                              {mixer ? getMixerDisplayName(mixer.name, isEn) : (isEn ? 'Unassigned' : 'غير محدد')}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-slate-900 text-base">
                              {(() => {
                                const eff = getBatchDerivedTargetWeightKg(batch, barns, categories, rations, dailyPlan);
                                return (eff > 0 ? eff : batch.targetWeightKg).toLocaleString();
                              })()} {isEn ? 'kg' : 'كجم'}
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
                                {formatBatchStatus(batch.status)}
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
                                  title={isEn ? 'Edit' : 'تعديل'}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title={isEn ? 'Delete' : 'حذف'}
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200" dir={isEn ? 'ltr' : 'rtl'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBatch
                  ? (isEn ? 'Edit Mix Batch Details' : 'تعديل بيانات لفة المكسر')
                  : (isEn ? 'Add New Mix Batch' : 'إضافة لفة مكسر جديدة')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className={`space-y-4 ${isEn ? 'text-left' : 'text-right'}`}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Batch Number / Name *' : 'رقم/اسم اللفة *'}</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder={isEn ? 'e.g. Batch 1, Morning Batch...' : 'مثال: لفة 1، لفة الظهر...'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Animal Category *' : 'الفئة الحيوانية *'}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryDisplayName(c.name, isEn)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Assigned Mixer *' : 'المكسر المخصص *'}</label>
                  <select
                    value={mixerId}
                    onChange={(e) => setMixerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  >
                    {mixers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getMixerDisplayName(m.name, isEn)} ({m.maxCapacityKg} {isEn ? 'kg' : 'كجم'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Batch Time *' : 'توقيت اللفة *'}</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder={isEn ? '06:00 AM' : '06:00 ص'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Target Batch Weight (kg) *' : 'وزن اللفة المستهدف (كجم) *'}</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Batch Status' : 'حالة اللفة'}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MixBatch['status'])}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  <option value="مخططة">{isEn ? 'Planned' : 'مخططة'}</option>
                  <option value="قيد التحضير">{isEn ? 'In Progress' : 'قيد التحضير'}</option>
                  <option value="تم التحضير">{isEn ? 'Prepared' : 'تم التحضير'}</option>
                  <option value="تم التوزيع">{isEn ? 'Distributed' : 'تم التوزيع'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Operation Notes' : 'ملاحظات التشغيل'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Special instructions for driver or mixer operator...' : 'أي توجيهات خاصة للسائق أو عامل المكسر...'}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  {isEn ? 'Save Batch' : 'حفظ اللفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Signatures */}
      <PrintSignatures settings={settings} />
    </div>
  );
};

