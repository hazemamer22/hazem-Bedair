import React, { useState, useEffect, useMemo } from 'react';
import {
  useLanguage,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getCategoryDisplayName,
  getBatchNumberDisplayName,
  getMixerDisplayName,
} from '../../context/LanguageContext';
import {
  DailyOperationPlan,
  AnimalCategory,
  Barn,
  Mixer,
  MixBatch,
  BarnAllocation,
  Ration,
  DailyBarnState,
  RawMaterial,
  FarmSettings,
} from '../../types';
import {
  calculateBarnDailyDemand,
  calculateRationTotalKgPerHead,
  getBarnRation,
  getBarnDailyState,
  doesBatchBelongToCategory,
} from '../../utils/calculations';
import {
  saveMasterBatchTemplate,
  loadMasterBatchTemplate,
  getAllPlanDates,
  loadDailyPlan,
  cloneBatchesFromTemplate,
  sanitizeBatches,
  saveDailyPlan,
} from '../../services/storage';
import { ExportExcelButton } from '../ExportExcelButton';
import {
  exportDailyPlanToExcel,
  exportSingleBatchOrderToExcel,
} from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Layers,
  Home,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Divide,
  Bot as MixerIcon,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  Sparkles,
  Copy,
  Calendar,
  BookmarkCheck,
  RefreshCw,
} from 'lucide-react';

interface BatchDistributionViewProps {
  dailyPlan: DailyOperationPlan;
  setDailyPlan: (plan: DailyOperationPlan) => void;
  categories: AnimalCategory[];
  barns: Barn[];
  setBarns?: (barns: Barn[]) => void;
  mixers: Mixer[];
  rations: Ration[];
  rawMaterials?: RawMaterial[];
  settings?: FarmSettings;
}

export const BatchDistributionView: React.FC<BatchDistributionViewProps> = ({
  dailyPlan,
  setDailyPlan,
  categories,
  barns,
  setBarns,
  mixers,
  rations,
  rawMaterials = [],
  settings,
}) => {
  const { showToast } = useFeedback();
  const { language, isRtl, t } = useLanguage();
  const isEn = language === 'en';
  const [viewMode, setViewMode] = useState<'by_barn' | 'by_batch'>('by_barn');

  // Selected filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeMixer = mixers.find((m) => m.id === activeCategory?.mixerId);

  const activeCategoryBarns = useMemo(
    () =>
      [...barns]
        .filter((b) => b.categoryId === selectedCategoryId && b.status === 'نشط')
        .sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : 9999;
          const orderB = b.orderIndex !== undefined ? b.orderIndex : 9999;
          return orderA - orderB;
        }),
    [barns, selectedCategoryId]
  );

  const [selectedBarnId, setSelectedBarnId] = useState<string>(
    activeCategoryBarns[0]?.id || ''
  );

  // Modals and feedback state
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string } | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedSourceDate, setSelectedSourceDate] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Clear status message after 4 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // When category changes, default to first barn in category if current selection is invalid
  useEffect(() => {
    const firstBarn = activeCategoryBarns[0];
    if (firstBarn && (!selectedBarnId || !activeCategoryBarns.some((b) => b.id === selectedBarnId))) {
      setSelectedBarnId(firstBarn.id);
    }
  }, [activeCategoryBarns, selectedBarnId]);

  const batches = dailyPlan.batches || [];
  const categoryBatches = batches.filter(
    (b) => b.categoryId === selectedCategoryId || doesBatchBelongToCategory(b, activeCategory, barns)
  );

  const activeBarn = barns.find((b) => b.id === selectedBarnId);
  const activeRation = activeBarn ? getBarnRation(activeBarn, categories, rations, dailyPlan) : undefined;
  const rationKgPerHead = calculateRationTotalKgPerHead(activeRation);
  const barnDailyDemandKg = activeBarn
    ? calculateBarnDailyDemand(activeBarn, categories, rations, dailyPlan)
    : 0;

  // Single Source of Truth for allocations: allocationsPercentMap
  // Format: [batchId]: { [barnId]: allocatedPercent (0-100) }
  const [allocationsPercentMap, setAllocationsPercentMap] = useState<Record<string, Record<string, number>>>(() => {
    const map: Record<string, Record<string, number>> = {};
    batches.forEach((b) => {
      map[b.id] = {};
      if (b.allocations) {
        b.allocations.forEach((a) => {
          if (a.allocatedPercent !== undefined) {
            map[b.id][a.barnId] = Number(a.allocatedPercent) || 0;
          } else {
            const barnObj = barns.find((bn) => bn.id === a.barnId);
            const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
            map[b.id][a.barnId] = demand > 0 ? (Number(a.allocatedKg) / demand) * 100 : 0;
          }
        });
      }
    });
    return map;
  });

  // Keep allocationsPercentMap synchronized when dailyPlan.batches or date changes
  useEffect(() => {
    const map: Record<string, Record<string, number>> = {};
    (dailyPlan.batches || []).forEach((b) => {
      map[b.id] = {};
      if (b.allocations) {
        b.allocations.forEach((a) => {
          if (a.allocatedPercent !== undefined) {
            map[b.id][a.barnId] = Number(a.allocatedPercent) || 0;
          } else {
            const barnObj = barns.find((bn) => bn.id === a.barnId);
            const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
            map[b.id][a.barnId] = demand > 0 ? (Number(a.allocatedKg) / demand) * 100 : 0;
          }
        });
      }
    });
    setAllocationsPercentMap(map);
  }, [dailyPlan.batches, dailyPlan.date]);

  // Derived helper functions
  const getBarnAllocatedPercent = (batchId: string, barnId: string): number => {
    return allocationsPercentMap[batchId]?.[barnId] || 0;
  };

  const getBarnAllocatedKg = (batchId: string, barn: Barn): number => {
    const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
    const percent = getBarnAllocatedPercent(batchId, barn.id);
    return Math.round(((demand * percent) / 100) * 1000) / 1000;
  };

  const getBatchTotalWeightKg = (batchId: string): number => {
    return activeCategoryBarns.reduce((sum, b) => {
      return sum + getBarnAllocatedKg(batchId, b);
    }, 0);
  };

  // Handle Percentage Input change for a specific batch & barn
  const handlePercentChange = (batchId: string, barnId: string, percent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
    setAllocationsPercentMap((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [barnId]: clampedPercent,
      },
    }));
  };

  // Handle Weight Input change for a specific batch & barn (converts kg to percent)
  const handleKgChange = (batchId: string, barnId: string, kg: number) => {
    const barnObj = barns.find((b) => b.id === barnId);
    const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
    const safeKg = Math.max(0, isNaN(kg) ? 0 : kg);
    const calcPercent = demand > 0 ? (safeKg / demand) * 100 : 0;
    const clampedPercent = Math.max(0, Math.min(100, Math.round(calcPercent * 1000) / 1000));

    setAllocationsPercentMap((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [barnId]: clampedPercent,
      },
    }));
  };

  // Distribute 100% equally across all category batches for this barn (e.g. 25% each for 4 batches)
  const handleDistributeAllEquallyToBarn = () => {
    if (!activeBarn || categoryBatches.length === 0) return;
    const count = categoryBatches.length;
    const pct = Math.round((100 / count) * 1000) / 1000;

    setAllocationsPercentMap((prev) => {
      const next = { ...prev };
      categoryBatches.forEach((b, idx) => {
        const isLast = idx === count - 1;
        const val = isLast ? Math.round((100 - pct * (count - 1)) * 1000) / 1000 : pct;
        next[b.id] = {
          ...(next[b.id] || {}),
          [activeBarn.id]: val,
        };
      });
      return next;
    });

    setStatusMessage({
      text: isEn
        ? `Allocated share of (${activeBarn.name || activeBarn.number}) equally at ${pct}% across ${count} batches!`
        : `تم توزيع استحقاق (${activeBarn.name || activeBarn.number}) بالتساوي بنسبة ${pct}% على الـ ${count} لفات!`,
      type: 'success',
    });
  };

  // Divide remaining percentage equally among batches for this barn
  const handleDistributeRemainingEqually = () => {
    if (!activeBarn || categoryBatches.length === 0) return;

    let currentAllocatedPercent = 0;
    categoryBatches.forEach((b) => {
      currentAllocatedPercent += allocationsPercentMap[b.id]?.[activeBarn.id] || 0;
    });

    const remainingPercent = Math.max(0, 100 - currentAllocatedPercent);
    if (remainingPercent <= 0.001) {
      showToast(
        isEn
          ? 'This barn is already 100% fully allocated!'
          : 'استحقاق هذا العنبر موزع بالكامل بالفعل (100%)!',
        'info'
      );
      return;
    }

    const emptyBatches = categoryBatches.filter(
      (b) => !(allocationsPercentMap[b.id]?.[activeBarn.id] > 0)
    );

    const targetBatches = emptyBatches.length > 0 ? emptyBatches : categoryBatches;
    const percentPerBatch = Math.round((remainingPercent / targetBatches.length) * 1000) / 1000;

    setAllocationsPercentMap((prev) => {
      const next = { ...prev };
      targetBatches.forEach((b, idx) => {
        const isLast = idx === targetBatches.length - 1;
        const valToAdd = isLast
          ? Math.round((remainingPercent - percentPerBatch * (targetBatches.length - 1)) * 1000) / 1000
          : percentPerBatch;
        const currentVal = next[b.id]?.[activeBarn.id] || 0;
        next[b.id] = {
          ...(next[b.id] || {}),
          [activeBarn.id]: Math.round((currentVal + valToAdd) * 1000) / 1000,
        };
      });
      return next;
    });
  };

  // Quick Add Batch
  const handleAddNewBatch = () => {
    const newBatchNum = batches.length + 1;
    const newBatch: MixBatch = {
      id: generateId('batch'),
      batchNumber: isEn ? `Batch ${newBatchNum}` : `لفة ${newBatchNum}`,
      categoryId: selectedCategoryId,
      mixerId: activeCategory?.mixerId || mixers[0]?.id || '',
      time: isEn ? '08:00 AM' : '08:00 ص',
      targetWeightKg: 3000,
      status: 'مخططة',
      allocations: [],
    };

    const updatedBatches = [...batches, newBatch];
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    showToast(isEn ? 'New mix batch added successfully.' : 'تمت إضافة لفة جديدة بنجاح.', 'success');
  };

  // Auto Generate Batch for this category to cover remaining demand
  const handleAutoGenerateCategoryBatch = () => {
    if (!activeCategory) return;
    const catBarns = activeCategoryBarns;
    if (catBarns.length === 0) {
      showToast(isEn ? 'No active pens in this category!' : 'لا توجد عنابر نشطة في هذه الفئة!', 'warning');
      return;
    }

    const allocations: BarnAllocation[] = [];
    let totalBatchWeight = 0;

    catBarns.forEach((barn) => {
      const demand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
      const allocatedKgAlready = categoryBatches.reduce((sum, b) => {
        const percent = allocationsPercentMap[b.id]?.[barn.id] || 0;
        return sum + (demand * percent) / 100;
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
      showToast(isEn ? 'All pens in this category are already 100% allocated!' : 'جميع عنابر هذه الفئة مغطاة بنسبة 100% بالفعل!', 'info');
      return;
    }

    // If category demand fits in a single mixer run and a batch already exists, update/deduplicate instead of creating an unnecessary second batch
    const mixerCapacity = activeMixer?.capacityKg || 5000;
    const totalCatDemand = catBarns.reduce(
      (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations, dailyPlan),
      0
    );
    const canFitInSingleBatch = totalCatDemand <= mixerCapacity;

    if (canFitInSingleBatch && categoryBatches.length >= 1) {
      const existingBatch = categoryBatches[0];
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
        .filter((b) => b.categoryId !== selectedCategoryId || b.id === existingBatch.id)
        .map((b) => {
          if (b.id === existingBatch.id) {
            return {
              ...b,
              targetWeightKg: fullWeight,
              allocations: fullAllocations,
              notes: isEn
                ? `Full feeding of all ${activeCategory.name} pens at 100%`
                : `تغذية كامل عنابر ${activeCategory.name} بنسبة 100%`,
            };
          }
          return b;
        });

      setAllocationsPercentMap((prev) => {
        const nextMap = { ...prev, [existingBatch.id]: {} };
        fullAllocations.forEach((a) => {
          nextMap[existingBatch.id][a.barnId] = 100;
        });
        return nextMap;
      });

      const newPlan = { ...dailyPlan, batches: updatedBatches };
      setDailyPlan(newPlan);
      saveDailyPlan(newPlan);
      saveMasterBatchTemplate(updatedBatches);
      showToast(
        isEn
          ? `Updated (${existingBatch.batchNumber}) with ${Math.round(fullWeight).toLocaleString()} kg, covering category 100%!`
          : `تم تحديث (${existingBatch.batchNumber}) بوزن ${Math.round(fullWeight).toLocaleString()} كجم وتغطية الفئة 100%!`,
        'success'
      );
      return;
    }

    const nextNum = categoryBatches.length + 1;
    const newBatchId = generateId('batch');
    const newBatch: MixBatch = {
      id: newBatchId,
      batchNumber: isEn ? `Batch ${nextNum} (${activeCategory.name})` : `لفة ${nextNum} (${activeCategory.name})`,
      categoryId: selectedCategoryId,
      mixerId: activeCategory.mixerId || mixers[0]?.id || '',
      time: isEn ? '09:30 AM' : '09:30 ص',
      targetWeightKg: Math.round(totalBatchWeight * 1000) / 1000,
      status: 'تم التحضير',
      allocations,
      notes: isEn
        ? `Automatic full feeding of ${activeCategory.name} pens`
        : `تغذية كامل عنابر ${activeCategory.name} تلقائياً`,
    };

    // Update allocationsPercentMap directly
    setAllocationsPercentMap((prev) => {
      const nextMap = { ...prev, [newBatchId]: {} };
      allocations.forEach((a) => {
        nextMap[newBatchId][a.barnId] = a.allocatedPercent || 100;
      });
      return nextMap;
    });

    const updatedBatches = [...batches, newBatch];
    const newPlan = { ...dailyPlan, batches: updatedBatches };
    setDailyPlan(newPlan);
    saveDailyPlan(newPlan);
    showToast(
      isEn
        ? `Generated (${newBatch.batchNumber}) with ${Math.round(totalBatchWeight).toLocaleString()} kg and allocated 100%!`
        : `تم توليد (${newBatch.batchNumber}) بوزن ${Math.round(totalBatchWeight).toLocaleString()} كجم وتوزيعها بنسبة 100%!`,
      'success'
    );
  };

  // Clean and sync batches from BatchDistributionView
  const handleCleanAndSyncBatches = () => {
    const { batches: cleaned } = sanitizeBatches(
      dailyPlan.batches || [],
      barns,
      categories,
      rations,
      dailyPlan
    );
    const newPlan = { ...dailyPlan, batches: cleaned };
    setDailyPlan(newPlan);
    saveDailyPlan(newPlan);
    saveMasterBatchTemplate(cleaned);
    showToast(
      isEn
        ? 'Successfully deduplicated and synchronized batch weights with actual pen requirements at 100%!'
        : 'تم بنجاح إزالة التكرار ومزامنة وتحديث أوزان اللفات مع الاحتياج الفعلي للعنابر بنسبة 100%!',
      'success'
    );
  };

  // Edit Batch (Name & Time) Handler
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [tempBatchName, setTempBatchName] = useState<string>('');
  const [tempBatchTime, setTempBatchTime] = useState<string>('');

  const startEditBatch = (batch: MixBatch) => {
    setEditingBatchId(batch.id);
    setTempBatchName(batch.batchNumber);
    setTempBatchTime(batch.time || (isEn ? '08:00 AM' : '08:00 ص'));
  };

  const saveEditBatch = (batchId: string) => {
    if (!tempBatchName.trim()) {
      setEditingBatchId(null);
      return;
    }
    const updatedBatches = (dailyPlan.batches || []).map((b) =>
      b.id === batchId
        ? {
            ...b,
            batchNumber: tempBatchName.trim(),
            time: tempBatchTime.trim() || b.time,
          }
        : b
    );
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setEditingBatchId(null);
  };

  // Delete Batch
  const handleDeleteBatch = (batchId: string, batchNumber: string) => {
    setBatchToDelete({ id: batchId, name: batchNumber });
  };

  const confirmDeleteBatch = () => {
    if (!batchToDelete) return;
    const batchId = batchToDelete.id;
    const updatedBatches = (dailyPlan.batches || []).filter((b) => b.id !== batchId);
    setAllocationsPercentMap((prev) => {
      const next = { ...prev };
      delete next[batchId];
      return next;
    });
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    setBatchToDelete(null);
    showToast(isEn ? 'Batch deleted successfully.' : 'تم حذف اللفة بنجاح.', 'info');
  };

  // Direct Barn Editing Handler (Head Count, Feeding Ratio %, Name, Number)
  const handleBarnChange = (barnId: string, updates: Partial<Barn>) => {
    if (setBarns) {
      const updatedBarns = barns.map((b) => (b.id === barnId ? { ...b, ...updates } : b));
      setBarns(updatedBarns);
    }
    const barn = barns.find((b) => b.id === barnId);
    if (barn) {
      const currentDailyBarnState = dailyPlan.dailyBarnStates?.[barnId] || {
        barnId,
        headCount: barn.headCount,
        feedingRatioPercent: barn.feedingRatioPercent || 100,
        rationId: barn.rationId,
      };
      setDailyPlan({
        ...dailyPlan,
        dailyBarnStates: {
          ...(dailyPlan.dailyBarnStates || {}),
          [barnId]: {
            ...currentDailyBarnState,
            headCount: updates.headCount !== undefined ? updates.headCount : currentDailyBarnState.headCount,
            feedingRatioPercent:
              updates.feedingRatioPercent !== undefined
                ? updates.feedingRatioPercent
                : currentDailyBarnState.feedingRatioPercent,
            rationId: updates.rationId !== undefined ? updates.rationId : currentDailyBarnState.rationId,
            displayName: updates.name !== undefined ? updates.name : currentDailyBarnState.displayName,
            displayNumber: updates.number !== undefined ? updates.number : currentDailyBarnState.displayNumber,
          },
        },
      });
    }
  };

  // Build the compiled batches list from the state
  const getCompiledBatches = (): MixBatch[] => {
    return batches.map((b) => {
      const bPercentMap = allocationsPercentMap[b.id] || {};
      const newAllocationsList: BarnAllocation[] = Object.entries(bPercentMap)
        .filter(([_, percent]) => Number(percent) > 0)
        .map(([barnId, allocatedPercent]) => {
          const barnObj = barns.find((bn) => bn.id === barnId);
          const demand = barnObj ? calculateBarnDailyDemand(barnObj, categories, rations, dailyPlan) : 0;
          const allocatedKg = Math.round(((demand * Number(allocatedPercent)) / 100) * 1000) / 1000;
          return {
            barnId,
            allocatedKg,
            allocatedPercent: Math.round(Number(allocatedPercent) * 1000) / 1000,
          };
        });

      // Automatically recalculate target weight from sum of allocations
      const totalBatchWeight = newAllocationsList.reduce((s, a) => s + a.allocatedKg, 0);
      const matchedCat = categories.find((c) => doesBatchBelongToCategory(b, c, barns));

      return {
        ...b,
        categoryId: matchedCat ? matchedCat.id : b.categoryId,
        allocations: newAllocationsList,
        targetWeightKg: totalBatchWeight > 0 ? totalBatchWeight : b.targetWeightKg,
      };
    });
  };

  // Save changes to dailyPlan and Master Template
  const handleSaveAllDistributions = () => {
    const updatedBatches = getCompiledBatches();
    const newPlan = { ...dailyPlan, batches: updatedBatches };
    setDailyPlan(newPlan);
    saveMasterBatchTemplate(updatedBatches);
    setStatusMessage({
      text: isEn
        ? 'All barn and batch allocations saved successfully and set as default for coming days!'
        : 'تم حفظ كافة توزيعات العنابر واللفات بنجاح، وتثبيتها كنمط افتراضي للأيام القادمة!',
      type: 'success',
    });
  };

  // Explicit Save as Master Template
  const handleSaveAsMasterTemplate = () => {
    const updatedBatches = getCompiledBatches();
    setDailyPlan({ ...dailyPlan, batches: updatedBatches });
    saveMasterBatchTemplate(updatedBatches);
    setStatusMessage({
      text: isEn
        ? '⭐ This pattern is permanently saved as master template for all upcoming new days!'
        : '⭐ تم تثبيت هذا النمط كقالب دائم لجميع الأيام الجديدة القادمة!',
      type: 'success',
    });
  };

  // Copy Distribution from Another Date
  const handleCopyFromDate = (sourceDate: string) => {
    if (!sourceDate) return;
    const sourcePlan = loadDailyPlan(sourceDate);
    if (!sourcePlan || !sourcePlan.batches || sourcePlan.batches.length === 0) {
      showToast(isEn ? 'Selected date has no batches to copy!' : 'اليوم المختار لا يحتوي على أي لفات لتوزيعها!', 'warning');
      return;
    }

    const clonedBatches = cloneBatchesFromTemplate(
      sourcePlan.batches,
      barns,
      categories,
      rations,
      dailyPlan
    );

    setDailyPlan({
      ...dailyPlan,
      batches: clonedBatches,
    });
    setCopyModalOpen(false);
    showToast(
      isEn
        ? `Successfully copied allocation pattern from (${sourceDate}) to current date!`
        : `تم نسخ نمط توزيعات يوم (${sourceDate}) وتطبيقها على اليوم الحالي بنجاح!`,
      'success'
    );
    setStatusMessage({
      text: isEn
        ? `Successfully copied allocation pattern from (${sourceDate}) to current date!`
        : `تم نسخ نمط توزيعات يوم (${sourceDate}) وتطبيقها على اليوم الحالي بنجاح!`,
      type: 'success',
    });
  };

  // Calculations for current selected Barn
  let currentBarnAllocatedPercentSum = 0;
  categoryBatches.forEach((b) => {
    currentBarnAllocatedPercentSum += allocationsPercentMap[b.id]?.[selectedBarnId] || 0;
  });
  currentBarnAllocatedPercentSum = Math.round(currentBarnAllocatedPercentSum * 1000) / 1000;

  const currentBarnAllocatedKgSum =
    Math.round(((barnDailyDemandKg * currentBarnAllocatedPercentSum) / 100) * 1000) / 1000;
  const currentBarnDiffKg = Math.round((currentBarnAllocatedKgSum - barnDailyDemandKg) * 1000) / 1000;
  const currentBarnDiffPercent = Math.round((currentBarnAllocatedPercentSum - 100) * 10) / 10;

  const activeBarnState = activeBarn ? getBarnDailyState(activeBarn, dailyPlan) : undefined;
  const allAvailableDates = getAllPlanDates().filter((d) => d !== dailyPlan.date);

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Status Feedback Toast */}
      {statusMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 text-white px-6 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{statusMessage.text}</span>
        </div>
      )}

      {/* Copy From Date Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Copy className="w-5 h-5 text-emerald-700" />
                <span>{isEn ? 'Copy Allocation Pattern from Previous Date' : 'نسخ نمط التوزيعات من يوم سابق'}</span>
              </h3>
              <button
                onClick={() => setCopyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {isEn
                ? `Choose the date from which to import batch allocation percentages and apply them to today (${dailyPlan.date}).`
                : `اختر اليوم المراد استيراد لفاته ونسب توزيعه لتطبيقها على تاريخ اليوم الحالي (${dailyPlan.date}).`}
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">{isEn ? 'Select Source Date:' : 'اختر التاريخ:'}</label>
              <select
                value={selectedSourceDate}
                onChange={(e) => setSelectedSourceDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              >
                <option value="">{isEn ? '-- Click to select a date --' : '-- اضغط لاختيار اليوم --'}</option>
                {allAvailableDates.map((d) => (
                  <option key={d} value={d}>
                    {isEn ? `Plan for: ${d}` : `خطة يوم: ${d}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="button"
                disabled={!selectedSourceDate}
                onClick={() => handleCopyFromDate(selectedSourceDate)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isEn ? 'Apply Allocations' : 'تطبيق التوزيعات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Control Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-700" />
              {isEn ? 'Batch & Pen Feed Distribution Matrix' : 'الشاشة المحورية: توزيع استحقاق العنابر على لفات المكسر'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {isEn
                ? 'Link pen feed requirements (kg) to TMR mixer batches via percentages (%) with automated persistence for upcoming days'
                : 'ربط استحقاق كل عنبر (كجم) بلفات المكسر عبر النسب المئوية % مع الحفظ التلقائي الدائم للأيام القادمة'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCleanAndSyncBatches}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Clean duplicates and sync batch weights with actual pen requirements' : 'إزالة أي لفات مكررة وضبط ومزامنة أوزان اللفات مع الاحتياج الفعلي للعنابر فورياً'}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isEn ? 'Fix & Clean Duplicates' : 'إصلاح وحذف التكرار'}</span>
            </button>

            <button
              onClick={handleSaveAllDistributions}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Save distributions and set as default pattern' : 'حفظ التوزيع وتثبيته لليوم وللأيام القادمة'}
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{isEn ? 'Save All Distributions' : 'حفظ جميع التوزيعات'}</span>
            </button>

            <button
              onClick={handleSaveAsMasterTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              title={isEn ? 'Lock this distribution as master template for all future days' : 'تثبيت هذا التوزيع كنمط وقالب دائم لجميع الأيام الجديدة'}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isEn ? 'Save as Master Template' : 'تثبيت كقالب دائم'}</span>
            </button>

            {allAvailableDates.length > 0 && (
              <button
                onClick={() => setCopyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                title={isEn ? 'Copy distribution pattern from previous date' : 'نسخ نمط التوزيع من يوم سابق'}
              >
                <Copy className="w-4 h-4 text-slate-600" />
                <span>{isEn ? 'Copy from Date' : 'نسخ من يوم سابق'}</span>
              </button>
            )}

            <ExportExcelButton
              onExport={() => exportDailyPlanToExcel(dailyPlan, categories, mixers, rations, barns)}
              label={isEn ? 'Export Excel' : 'تصدير للإكسيل'}
              variant="secondary"
              size="sm"
            />
          </div>
        </div>

        {/* Quick Category / Department Tabs */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            {isEn ? 'Herd Departments & Categories (Click to filter):' : 'أقسام وفئات القطيع (انقر للتنقل السريع بين الأقسام):'}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const catBatches = batches.filter((b) => b.categoryId === c.id || doesBatchBelongToCategory(b, c, barns));
              const catBarns = barns.filter((b) => b.categoryId === c.id && b.status === 'نشط');
              const totalHeads = catBarns.reduce((s, b) => {
                const bState = getBarnDailyState(b, dailyPlan);
                return s + (bState.headCount || 0);
              }, 0);
              const isSelected = selectedCategoryId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(c.id);
                    const firstBarn = catBarns[0];
                    if (firstBarn) setSelectedBarnId(firstBarn.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="font-black">{c.name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    isSelected ? 'bg-emerald-800 text-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {catBatches.length} {isEn ? 'batches' : 'لفات'}
                  </span>
                  <span className="text-[11px] opacity-75">
                    ({totalHeads} {isEn ? 'heads' : 'رأس'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode & Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Select Animal Category:' : 'اختر الفئة الحيوانية:'}</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                const firstBarn = barns.find((b) => b.status === 'نشط' && b.categoryId === e.target.value);
                if (firstBarn) setSelectedBarnId(firstBarn.id);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
            >
              {categories.map((c) => {
                const catBarns = barns.filter((b) => b.categoryId === c.id && b.status === 'نشط');
                const totalHeads = catBarns.reduce((s, b) => {
                  const bState = getBarnDailyState(b, dailyPlan);
                  return s + (bState.headCount || 0);
                }, 0);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {totalHeads > 0 ? `(${totalHeads} ${isEn ? 'heads' : 'رأس'})` : (isEn ? '(0 heads)' : '(0 رأس - لا توجد قطعان)')}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Barn Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Select Pen for Allocation:' : 'اختر العنبر للتوزيع:'}</label>
            <select
              value={selectedBarnId}
              onChange={(e) => setSelectedBarnId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
            >
              {activeCategoryBarns.length === 0 ? (
                <option value="">{isEn ? 'No pens in this category' : 'لا توجد عنابر في هذه الفئة'}</option>
              ) : (
                activeCategoryBarns.map((b, idx) => {
                  const bState = getBarnDailyState(b, dailyPlan);
                  return (
                    <option key={b.id} value={b.id}>
                      #{b.orderIndex || idx + 1} - {bState.displayNumber || b.number} {bState.displayName ? `(${bState.displayName})` : ''} - {bState.headCount} {isEn ? 'heads' : 'رأس'}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'View & Allocation Mode:' : 'نمط العرض والتوزيع:'}</label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('by_barn')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'by_barn'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏠 {isEn ? 'By Barn' : 'التوزيع حسب العنبر'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_batch')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'by_batch'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🚜 {isEn ? 'By Batch' : 'التوزيع حسب اللفة'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODE 1: BY BARN DISTRIBUTION */}
      {viewMode === 'by_barn' && activeBarn && activeBarnState && (
        <div className="space-y-6">
          {/* Barn Details Summary Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {isEn
                    ? `Category: ${activeCategory?.name} | Mixer: ${activeMixer?.name || 'TMR Mixer'}`
                    : `فئة: ${activeCategory?.name} | مكسر: ${activeMixer?.name || 'مكسر TMR'}`}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <h3 className="font-black text-slate-900 text-lg flex items-center gap-1.5 shrink-0">
                    <Home className="w-5 h-5 text-emerald-700" />
                    <span>{isEn ? 'Allocation Details:' : 'تفاصيل استحقاق:'}</span>
                  </h3>
                  <input
                    type="text"
                    value={activeBarnState.displayNumber || activeBarn.number}
                    onChange={(e) => handleBarnChange(activeBarn.id, { number: e.target.value })}
                    className="w-24 font-black text-slate-900 text-sm bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-center focus:bg-white focus:outline-emerald-600"
                    title={isEn ? 'Edit Barn Number' : 'تعديل رقم العنبر'}
                    placeholder={isEn ? 'Barn #' : 'رقم العنبر'}
                  />
                  <input
                    type="text"
                    value={activeBarnState.displayName || activeBarn.name || ''}
                    onChange={(e) => handleBarnChange(activeBarn.id, { name: e.target.value })}
                    className="w-32 font-bold text-slate-700 text-sm bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:bg-white focus:outline-emerald-600"
                    title={isEn ? 'Edit Barn Name' : 'تعديل اسم العنبر'}
                    placeholder={isEn ? 'Barn Name (optional)' : 'اسم العنبر (اختياري)'}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 25% Equal Distribution Button */}
                <button
                  onClick={handleDistributeAllEquallyToBarn}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title={isEn
                    ? `Distribute barn allocation equally (${categoryBatches.length > 0 ? (100 / categoryBatches.length).toFixed(1) : 25}% per batch)`
                    : `توزيع استحقاق العنبر بالتساوي بنسبة ${categoryBatches.length > 0 ? (100 / categoryBatches.length).toFixed(1) : 25}% على كل لفة`}
                >
                  <Divide className="w-4 h-4 text-amber-300" />
                  <span>
                    {isEn
                      ? `Distribute Equally ${categoryBatches.length > 0 ? `(${Math.round(100 / categoryBatches.length)}% × ${categoryBatches.length} batches)` : ''}`
                      : `توزيع بالتساوي ${categoryBatches.length > 0 ? `(${Math.round(100 / categoryBatches.length)}% × ${categoryBatches.length} لفات)` : ''}`}
                  </span>
                </button>

                <button
                  onClick={handleAutoGenerateCategoryBatch}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title={isEn
                    ? 'Auto-generate batch and allocate 100% of this category requirements'
                    : 'توليد لفة تلقائية وتوزيع استحقاق عنابر هذه الفئة بالكامل بنسبة 100%'}
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>{isEn ? 'Auto-Generate Batch (100%)' : 'توليد لفة تلقائية (100%)'}</span>
                </button>

                <button
                  onClick={handleDistributeRemainingEqually}
                  className="px-3.5 py-2 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Divide className="w-4 h-4 text-amber-700" />
                  <span>{isEn ? 'Distribute Remainder Equally' : 'توزيع المتبقي بالتساوي'}</span>
                </button>

                <button
                  onClick={handleAddNewBatch}
                  className="px-3.5 py-2 bg-slate-800 text-white hover:bg-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>{isEn ? '+ Add Batch' : 'إضافة لفة'}</span>
                </button>
              </div>
            </div>

            {/* Formula Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-emerald-500 transition-all">
                <label className="text-slate-500 block text-[11px] mb-1">
                  {isEn ? 'Head Count (Direct Edit):' : 'عدد الرؤوس (تعديل مباشر):'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={activeBarnState.headCount}
                    onChange={(e) =>
                      handleBarnChange(activeBarn.id, { headCount: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full font-black text-slate-900 text-base bg-white border border-slate-300 rounded-lg px-2 py-1 text-center focus:outline-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0">{isEn ? 'heads' : 'رأس'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">
                  {isEn ? 'Target Ration:' : 'العليقة المقررة:'}
                </span>
                <span className="text-emerald-900 text-sm font-black">{activeRation?.name || '—'}</span>
                <span className="text-[10px] text-slate-500 block font-semibold">
                  ({rationKgPerHead} {isEn ? 'kg/head' : 'كجم/رأس'})
                </span>
              </div>

              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 focus-within:border-amber-500 transition-all">
                <label className="text-amber-800 block text-[11px] mb-1">
                  {isEn ? 'Feeding Ratio % (Direct Edit):' : 'نسبة التغذية % (تعديل مباشر):'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step="any"
                    value={activeBarnState.feedingRatioPercent || 100}
                    onChange={(e) =>
                      handleBarnChange(activeBarn.id, {
                        feedingRatioPercent: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full font-black text-amber-950 text-base bg-white border border-amber-300 rounded-lg px-2 py-1 text-center focus:outline-emerald-600"
                  />
                  <span className="text-xs font-bold text-amber-800 shrink-0">%</span>
                </div>
              </div>

              <div className="bg-emerald-900 text-emerald-50 p-3 rounded-xl">
                <span className="text-emerald-300 block text-[11px]">
                  {isEn ? 'Total Daily Target Demand:' : 'الاستحقاق اليومي الإجمالي:'}
                </span>
                <span className="text-amber-300 text-lg font-black">
                  {barnDailyDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg/day' : 'كجم/يوم'}
                </span>
              </div>
            </div>

            {/* 100% Distribution Status Alert Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
                Math.abs(currentBarnDiffKg) <= 1
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : currentBarnDiffKg > 1
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {Math.abs(currentBarnDiffKg) <= 1 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : currentBarnDiffKg > 1 ? (
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <div className="font-black text-sm">
                    {Math.abs(currentBarnDiffKg) <= 1
                      ? isEn
                        ? 'Pen allocation is fully satisfied (100%)!'
                        : 'توزيع استحقاق العنبر مكتمل بنجاح (100%)!'
                      : currentBarnDiffKg > 1
                      ? isEn
                        ? `Warning: Total allocation exceeds pen target (100%) by ${currentBarnDiffPercent}% (${currentBarnDiffKg.toLocaleString()} kg)`
                        : `خطأ: إجمالي التوزيع يتجاوز استحقاق العنبر (100%) بـ ${currentBarnDiffPercent}% (${currentBarnDiffKg.toLocaleString()} كجم)`
                      : isEn
                      ? `Remaining ${Math.abs(currentBarnDiffPercent)}% (${Math.abs(currentBarnDiffKg).toLocaleString()} kg) unallocated`
                      : `متبقي ${Math.abs(currentBarnDiffPercent)}% (${Math.abs(currentBarnDiffKg).toLocaleString()} كجم) لم يتم توزيعه على اللفات`}
                  </div>
                  <div className="opacity-80 font-medium mt-0.5">
                    {isEn
                      ? `Currently allocated across batches: ${currentBarnAllocatedKgSum.toLocaleString()} kg (${currentBarnAllocatedPercentSum}%) out of ${barnDailyDemandKg.toLocaleString()} kg`
                      : `إجمالي الموزع حاليًا على اللفات: ${currentBarnAllocatedKgSum.toLocaleString()} كجم (${currentBarnAllocatedPercentSum}%) من أصل ${barnDailyDemandKg.toLocaleString()} كجم`}
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-white font-black text-sm border shadow-2xs">
                  {currentBarnAllocatedPercentSum}% / 100%
                </span>
              </div>
            </div>
          </div>

          {/* Batches Distribution Interactive Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">
                  {isEn
                    ? `Mixer Batches Available for (${activeCategory?.name}) to Distribute (${activeBarnState.displayNumber || activeBarn.number})`
                    : `جدول لفات المكسر المتاحة لفئة (${activeCategory?.name}) لتوزيع استحقاق (${activeBarnState.displayNumber || activeBarn.number})`}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'Percentage % is the primary persisted basis; when transitioning to new dates, percentages remain locked while weights scale to the new day head counts'
                    : 'النسبة % هي الأساس المحفوظ؛ عند الانتقال لأيام جديدة تظل النسبة محفوظة وتُحسب الأوزان وفق رؤوس اليوم الجديد'}
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                {isEn ? `Batches Count: ${categoryBatches.length}` : `عدد اللفات: ${categoryBatches.length}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${isEn ? 'text-left' : 'text-right'}`}>
                <thead className="bg-slate-100 text-slate-700 font-bold text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">{isEn ? 'Batch #' : 'رقم اللفة'}</th>
                    <th className="py-3.5 px-4">{isEn ? 'Batch Time' : 'توقيت اللفة'}</th>
                    <th className="py-3.5 px-4 text-center">{isEn ? 'Allocation %' : 'نسبة التوزيع % من العنبر'}</th>
                    <th className="py-3.5 px-4 text-center text-emerald-950 bg-emerald-50">
                      {isEn ? 'Allocated Weight (Derived kg)' : 'الكمية الموزعة (كجم مشتقة)'}
                    </th>
                    <th className="py-3.5 px-4 text-center">{isEn ? 'Total Batch Weight' : 'إجمالي وزن اللفة الناتج'}</th>
                    <th className="py-3.5 px-4">
                      {isEn
                        ? `Mixer Capacity (${activeMixer?.maxCapacityKg || 3000} kg)`
                        : `حالة سعة المكسر (${activeMixer?.maxCapacityKg} كجم)`}
                    </th>
                    <th className="py-3.5 px-4 text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {categoryBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <p className="text-slate-500 font-bold text-sm">
                            {isEn
                              ? `No mixer batches assigned for (${activeCategory?.name}) today.`
                              : `لا توجد لفات مكسر محددة لفئة (${activeCategory?.name}) اليوم.`}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAutoGenerateCategoryBatch}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                            >
                              <Zap className="w-4 h-4 text-amber-300" />
                              <span>
                                {isEn
                                  ? `Auto-Generate Batch for ${activeCategory?.name} (100%)`
                                  : `توليد وتوزيع لفة تلقائية لـ ${activeCategory?.name} بنسبة 100%`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleAddNewBatch}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>{isEn ? '+ Manual Batch' : 'إضافة لفة يدوية'}</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    categoryBatches.map((batch) => {
                      const allocatedPercent = getBarnAllocatedPercent(batch.id, activeBarn.id);
                      const allocatedKg = getBarnAllocatedKg(batch.id, activeBarn);
                      const batchTotalWeightKg = getBatchTotalWeightKg(batch.id);

                      const mixerMaxCapacity = activeMixer?.maxCapacityKg || 3000;
                      const isOverMixerCapacity = batchTotalWeightKg > mixerMaxCapacity;
                      const overflowKg = batchTotalWeightKg - mixerMaxCapacity;

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            {editingBatchId === batch.id ? (
                              <div>
                                <input
                                  type="text"
                                  value={tempBatchName}
                                  onChange={(e) => setTempBatchName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditBatch(batch.id);
                                    if (e.key === 'Escape') setEditingBatchId(null);
                                  }}
                                  autoFocus
                                  className="px-2.5 py-1 bg-white border-2 border-emerald-500 rounded-lg text-sm font-black text-slate-900 focus:outline-none w-36 shadow-xs"
                                  placeholder={isEn ? 'Batch name...' : 'اسم اللفة...'}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span className="font-black text-slate-900 text-base">{batch.batchNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => startEditBatch(batch)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                                  title={isEn ? 'Edit batch name & time' : 'تعديل اسم وتوقيت اللفة'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-600 text-xs">
                            {editingBatchId === batch.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={tempBatchTime}
                                  onChange={(e) => setTempBatchTime(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditBatch(batch.id);
                                    if (e.key === 'Escape') setEditingBatchId(null);
                                  }}
                                  className="px-2.5 py-1 bg-white border-2 border-emerald-500 rounded-lg text-xs font-black text-slate-900 focus:outline-none w-28 shadow-xs"
                                  placeholder={isEn ? 'e.g. 08:30 AM' : 'مثلاً 08:30 ص'}
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEditBatch(batch.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                  title={isEn ? 'Save' : 'حفظ التعديلات'}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingBatchId(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                  title={isEn ? 'Cancel' : 'إلغاء'}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span>{batch.time}</span>
                                <button
                                  type="button"
                                  onClick={() => startEditBatch(batch)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                  title={isEn ? 'Edit time' : 'تعديل التوقيت'}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Interactive Percentage Input with Quick Preset Chips */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={100}
                                  value={allocatedPercent}
                                  onChange={(e) =>
                                    handlePercentChange(
                                      batch.id,
                                      activeBarn.id,
                                      e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    )
                                  }
                                  placeholder="0"
                                  className="w-20 text-center font-extrabold text-slate-900 focus:outline-emerald-600 text-sm"
                                />
                                <span className="font-bold text-slate-500 text-xs">%</span>
                              </div>

                              {/* Quick Percentage Chips */}
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {[25, 33.33, 50, 100, 0].map((quickVal) => (
                                  <button
                                    key={quickVal}
                                    type="button"
                                    onClick={() => handlePercentChange(batch.id, activeBarn.id, quickVal)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                      Math.abs(allocatedPercent - quickVal) < 0.1
                                        ? 'bg-emerald-700 text-white border-emerald-800'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    {quickVal}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Interactive Weight KG Input */}
                          <td className="py-4 px-4 text-center bg-emerald-50/50">
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1 shadow-2xs">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={allocatedKg}
                                onChange={(e) =>
                                  handleKgChange(
                                    batch.id,
                                    activeBarn.id,
                                    e.target.value === '' ? 0 : parseFloat(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="w-28 text-center font-black text-emerald-950 focus:outline-emerald-600 text-base bg-transparent"
                              />
                              <span className="font-bold text-emerald-800 text-xs">{isEn ? 'kg' : 'كجم'}</span>
                            </div>
                          </td>

                          {/* Total Batch Weight */}
                          <td className="py-4 px-4 text-center font-extrabold text-slate-900 text-base">
                            {batchTotalWeightKg.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                          </td>

                          {/* Mixer Capacity Check */}
                          <td className="py-4 px-4">
                            {isOverMixerCapacity ? (
                              <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>
                                  {isEn
                                    ? `Exceeded by ${overflowKg.toLocaleString()} kg (${batchTotalWeightKg.toLocaleString()}/${mixerMaxCapacity.toLocaleString()})`
                                    : `تجاوز السعة بـ ${overflowKg.toLocaleString()} كجم (${batchTotalWeightKg.toLocaleString()}/${mixerMaxCapacity.toLocaleString()})`}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>
                                  {isEn
                                    ? `Within capacity (${batchTotalWeightKg.toLocaleString()}/${mixerMaxCapacity.toLocaleString()} kg)`
                                    : `ضمن السعة (${batchTotalWeightKg.toLocaleString()}/${mixerMaxCapacity.toLocaleString()} كجم)`}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={isEn ? 'Delete batch' : 'حذف اللفة'}
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
                <tfoot className="bg-emerald-950 text-emerald-50 font-bold border-t-2 border-emerald-800 text-xs">
                  <tr>
                    <td colSpan={2} className={`py-4 px-4 ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn
                        ? `Total Allocated for Pen (${activeBarnState.displayNumber || activeBarn.number}):`
                        : `الإجمالي الموزع لهذا العنبر (${activeBarnState.displayNumber || activeBarn.number}):`}
                    </td>
                    <td className="py-4 px-4 text-center text-amber-300 font-black text-sm">
                      {currentBarnAllocatedPercentSum}%
                    </td>
                    <td className="py-4 px-4 text-center text-amber-300 font-black text-sm">
                      {currentBarnAllocatedKgSum.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                    </td>
                    <td colSpan={3} className={`py-4 px-4 ${isEn ? 'text-right' : 'text-left'} font-medium text-emerald-200`}>
                      {isEn
                        ? `Target Daily Demand: ${barnDailyDemandKg.toLocaleString()} kg`
                        : `الاستحقاق اليومي المستهدف: ${barnDailyDemandKg.toLocaleString()} كجم`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: BY BATCH DISTRIBUTION */}
      {viewMode === 'by_batch' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 border-b border-slate-100 pb-3">
              <MixerIcon className="w-5 h-5 text-emerald-700" />
              {isEn
                ? `Review and Distribute all Pens for Category (${activeCategory?.name}) by Batches`
                : `استعراض وتوزيع جميع عنابر الفئة (${activeCategory?.name}) حسب اللفات`}
            </h3>

            <div className="space-y-6">
              {categoryBatches.map((batch) => {
                const totalBatchKg = getBatchTotalWeightKg(batch.id);
                const mixerMax = activeMixer?.maxCapacityKg || 3000;
                const isOver = totalBatchKg > mixerMax;

                return (
                  <div key={batch.id} className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        {editingBatchId === batch.id ? (
                          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-300">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-600">{isEn ? 'Batch:' : 'اسم اللفة:'}</span>
                              <input
                                type="text"
                                value={tempBatchName}
                                onChange={(e) => setTempBatchName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditBatch(batch.id);
                                  if (e.key === 'Escape') setEditingBatchId(null);
                                }}
                                autoFocus
                                className="px-3 py-1 bg-white border-2 border-emerald-500 rounded-lg text-sm font-black text-slate-900 focus:outline-none w-36 shadow-xs"
                                placeholder={isEn ? 'Batch name...' : 'اسم اللفة...'}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-600">{isEn ? 'Time:' : 'التوقيت:'}</span>
                              <input
                                type="text"
                                value={tempBatchTime}
                                onChange={(e) => setTempBatchTime(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditBatch(batch.id);
                                  if (e.key === 'Escape') setEditingBatchId(null);
                                }}
                                className="px-3 py-1 bg-white border-2 border-emerald-500 rounded-lg text-xs font-black text-slate-900 focus:outline-none w-28 shadow-xs"
                                placeholder={isEn ? '08:30 AM' : 'مثلاً 08:30 ص'}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => saveEditBatch(batch.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                              title={isEn ? 'Save' : 'حفظ التعديلات'}
                            >
                              <Check className="w-4 h-4" />
                              <span>{isEn ? 'Save' : 'حفظ'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBatchId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer text-xs font-bold px-2"
                              title={isEn ? 'Cancel' : 'إلغاء'}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="bg-emerald-900 text-emerald-50 px-3.5 py-1 rounded-xl font-black text-base flex items-center gap-2">
                              <span>{batch.batchNumber}</span>
                              <span className="text-xs font-semibold opacity-75">({batch.time})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditBatch(batch)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-all border border-slate-200 flex items-center gap-1 text-xs font-bold cursor-pointer"
                              title={isEn ? 'Edit name & time' : 'تعديل اسم وتوقيت اللفة'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{isEn ? 'Edit Name/Time' : 'تعديل الاسم والتوقيت'}</span>
                            </button>
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-600">
                          {isEn ? 'Mixer:' : 'المكسر:'} {activeMixer?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-left">
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">
                            {isEn ? 'Total Batch Weight:' : 'إجمالي وزن اللفة:'}
                          </span>
                          <span className={`text-lg font-black ${isOver ? 'text-rose-700' : 'text-emerald-900'}`}>
                            {totalBatchKg.toLocaleString()} {isEn ? 'kg' : 'كجم'} / {mixerMax.toLocaleString()} {isEn ? 'kg' : 'كجم'}
                          </span>
                        </div>

                        <ExportExcelButton
                          onExport={() =>
                            exportSingleBatchOrderToExcel(
                              batch,
                              dailyPlan,
                              categories,
                              rations,
                              mixers,
                              rawMaterials,
                              barns,
                              settings
                            )
                          }
                          label={isEn ? 'Batch Order Excel' : 'أمر اللفة إكسيل'}
                          variant="secondary"
                          size="sm"
                        />

                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-all active:scale-95 border border-rose-200 flex items-center gap-1 text-xs shrink-0 cursor-pointer"
                          title={isEn ? 'Delete batch' : 'حذف اللفة'}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{isEn ? 'Delete Batch' : 'حذف اللفة'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Barns Inputs inside this batch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeCategoryBarns.map((barn, bIdx) => {
                        const bDemand = calculateBarnDailyDemand(barn, categories, rations, dailyPlan);
                        const bState = getBarnDailyState(barn, dailyPlan);
                        const currPercent = getBarnAllocatedPercent(batch.id, barn.id);
                        const currKg = getBarnAllocatedKg(batch.id, barn);

                        return (
                          <div key={barn.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black inline-flex items-center justify-center border border-emerald-300">
                                  #{barn.orderIndex || bIdx + 1}
                                </span>
                                <span>
                                  {getBarnNumberDisplayName(bState.displayNumber || barn.number, isEn)}{' '}
                                  {bState.displayName && `(${getBarnNameDisplayName(bState.displayName, isEn)})`}
                                </span>
                              </div>
                              <span className="text-emerald-900 font-extrabold">
                                {bDemand.toLocaleString()} {isEn ? 'kg/day' : 'كجم/يوم'}
                              </span>
                            </div>

                            {/* Quick Barn Head Count & Feeding Ratio Control */}
                            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-500">{isEn ? 'Heads:' : 'رؤوس:'}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={bState.headCount}
                                  onChange={(e) =>
                                    handleBarnChange(barn.id, { headCount: Math.max(1, Number(e.target.value)) })
                                  }
                                  className="w-14 font-black text-slate-900 bg-slate-50 border border-slate-300 rounded px-1 text-center text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-500">{isEn ? 'Feed %:' : 'تغذية%:'}</span>
                                <input
                                  type="number"
                                  min={10}
                                  max={200}
                                  step="any"
                                  value={bState.feedingRatioPercent || 100}
                                  onChange={(e) =>
                                    handleBarnChange(barn.id, {
                                      feedingRatioPercent: Math.max(1, Number(e.target.value)),
                                    })
                                  }
                                  className="w-14 font-black text-amber-950 bg-amber-50 border border-amber-300 rounded px-1 text-center text-xs"
                                />
                              </div>
                            </div>

                            {/* Direct Percentage and Derived KG Inputs */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                  {isEn ? 'Pen Share %:' : 'نسبة % من العنبر:'}
                                </label>
                                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min={0}
                                    max={100}
                                    value={currPercent}
                                    onChange={(e) =>
                                      handlePercentChange(
                                        batch.id,
                                        barn.id,
                                        e.target.value === '' ? 0 : parseFloat(e.target.value)
                                      )
                                    }
                                    className="w-full text-center font-bold text-slate-900 text-xs focus:outline-none"
                                  />
                                  <span className="text-[10px] text-slate-500 font-bold">%</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                                  {isEn ? 'Weight (kg):' : 'الوزن المشتق (كجم):'}
                                </label>
                                <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min={0}
                                    value={currKg}
                                    onChange={(e) =>
                                      handleKgChange(
                                        batch.id,
                                        barn.id,
                                        e.target.value === '' ? 0 : parseFloat(e.target.value)
                                      )
                                    }
                                    className="w-full text-center font-black text-emerald-950 text-xs focus:outline-none bg-transparent"
                                  />
                                  <span className="text-[10px] text-emerald-700 font-bold">{isEn ? 'kg' : 'كجم'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick percentage buttons */}
                            <div className="flex items-center justify-between gap-1 pt-1">
                              {[25, 33.33, 50, 100, 0].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => handlePercentChange(batch.id, barn.id, v)}
                                  className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${
                                    Math.abs(currPercent - v) < 0.1
                                      ? 'bg-emerald-700 text-white border-emerald-800'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {v}%
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">
                {isEn ? 'Confirm Batch Deletion' : 'تأكيد حذف اللفة'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEn
                  ? `Are you sure you want to delete (${batchToDelete.name})? All associated pen distribution records will be removed.`
                  : `هل أنت متأكد من حذف (${batchToDelete.name})؟ سيتم إزالة كافة توزيعات العنابر المرتبطة بها.`}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="button"
                onClick={confirmDeleteBatch}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {isEn ? 'Delete Permanently' : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
