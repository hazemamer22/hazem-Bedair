import React, { useState } from 'react';
import {
  useLanguage,
  getBarnNumberDisplayName,
  getBarnNameDisplayName,
  getCategoryDisplayName,
  getStatusDisplayName,
} from '../../context/LanguageContext';
import { Barn, AnimalCategory, Ration } from '../../types';
import {
  calculateBarnDailyDemand,
  calculateBarnGrossDemandKg,
  calculateBarnRecycledRefusalKg,
  calculateBarnRefusalKg,
  calculateBarnActualIntakeKg,
  calculateRationTotalKgPerHead,
  estimateCalfStarterIntakeKgPerHead,
  getBarnEffectiveBaseFeedPerHead,
} from '../../utils/calculations';
import { ExportExcelButton } from '../ExportExcelButton';
import { exportBarnsToExcel } from '../../utils/excelExport';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Home,
  Plus,
  Edit,
  Trash2,
  Scale,
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  ChevronsUp,
  ChevronsDown,
  Move,
  Info,
} from 'lucide-react';

interface BarnsViewProps {
  barns: Barn[];
  setBarns: (items: Barn[]) => void;
  categories: AnimalCategory[];
  rations?: Ration[];
}

export const BarnsView: React.FC<BarnsViewProps> = ({
  barns,
  setBarns,
  categories,
  rations = [],
}) => {
  const { showToast, showConfirm } = useFeedback();
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarn, setEditingBarn] = useState<Barn | null>(null);

  // Grouping & Filtering state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupByCategoryView, setGroupByCategoryView] = useState<boolean>(true);
  const [orderPlacement, setOrderPlacement] = useState<'auto_category' | 'after_barn' | 'start' | 'end' | 'keep'>('auto_category');
  const [placementTargetBarnId, setPlacementTargetBarnId] = useState<string>('');

  // Quick Move Modal state
  const [movingBarn, setMovingBarn] = useState<Barn | null>(null);
  const [quickMoveType, setQuickMoveType] = useState<'category_tail' | 'after_barn' | 'start' | 'end'>('category_tail');
  const [quickMoveTargetBarnId, setQuickMoveTargetBarnId] = useState<string>('');

  // Form
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [headCount, setHeadCount] = useState<number>(50);
  const [baseFeedKgPerHead, setBaseFeedKgPerHead] = useState<number>(50);
  const [feedingRatioPercent, setFeedingRatioPercent] = useState<number>(100);
  
  // Calf / Weaner & Custom Estimation fields
  const [averageAgeDays, setAverageAgeDays] = useState<number | undefined>(undefined);
  const [averageWeightKg, setAverageWeightKg] = useState<number | undefined>(undefined);
  const [customDailyTotalKg, setCustomDailyTotalKg] = useState<number | undefined>(undefined);
  const [calculationMode, setCalculationMode] = useState<'auto_ration' | 'calf_growth' | 'manual_total'>('auto_ration');

  const [recycledRefusalAllocatedKg, setRecycledRefusalAllocatedKg] = useState<number>(0);
  const [refusalType, setRefusalType] = useState<'percent' | 'kg'>('percent');
  const [refusalValue, setRefusalValue] = useState<number>(0);
  const [status, setStatus] = useState<Barn['status']>('نشط');
  const [notes, setNotes] = useState('');

  // Selected Category Helper
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCategoryRation = rations.find((r) => r.id === selectedCategory?.rationId);
  const rationTotalKgPerHead = calculateRationTotalKgPerHead(selectedCategoryRation);

  // Handle Category Change inside form
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    const catRation = rations.find((r) => r.id === cat?.rationId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام') ||
      (cat?.name || '').toLowerCase().includes('calf');

    if (isCalf) {
      if (calculationMode === 'auto_ration') {
        setCalculationMode('calf_growth');
      }
      const estimated = estimateCalfStarterIntakeKgPerHead(averageAgeDays || 45, averageWeightKg);
      setBaseFeedKgPerHead(estimated);
    } else {
      setCalculationMode('auto_ration');
      const rationKg = calculateRationTotalKgPerHead(catRation);
      if (rationKg > 0) {
        setBaseFeedKgPerHead(rationKg);
      }
    }
  };

  const handleOpenAdd = (defaultCatId?: string) => {
    setEditingBarn(null);
    setNumber(isEn ? `Barn ${barns.length + 1}` : `عنبر ${barns.length + 1}`);
    setName('');
    const defaultCat = defaultCatId || (categories.length > 0 ? categories[0].id : '');
    setCategoryId(defaultCat);
    setOrderPlacement('auto_category');
    
    // Default placementTargetBarnId: last barn of this category or last barn in farm
    const catBarns = barns.filter((b) => b.categoryId === defaultCat);
    setPlacementTargetBarnId(catBarns.length > 0 ? catBarns[catBarns.length - 1].id : (barns[barns.length - 1]?.id || ''));
    
    const cat = categories.find((c) => c.id === defaultCat);
    const catRation = rations.find((r) => r.id === cat?.rationId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام');

    if (isCalf) {
      setCalculationMode('calf_growth');
      setAverageAgeDays(45);
      setAverageWeightKg(65);
      setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(45, 65));
    } else {
      setCalculationMode('auto_ration');
      const rationKg = calculateRationTotalKgPerHead(catRation);
      setBaseFeedKgPerHead(rationKg > 0 ? rationKg : 44.5);
      setAverageAgeDays(undefined);
      setAverageWeightKg(undefined);
    }

    setCustomDailyTotalKg(undefined);
    setHeadCount(50);
    setFeedingRatioPercent(100);
    setRecycledRefusalAllocatedKg(0);
    setRefusalType('percent');
    setRefusalValue(0);
    setStatus('نشط');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (barn: Barn) => {
    setEditingBarn(barn);
    setNumber(barn.number);
    setName(barn.name || '');
    setCategoryId(barn.categoryId);
    setHeadCount(barn.headCount);
    setBaseFeedKgPerHead(barn.baseFeedKgPerHead);
    setFeedingRatioPercent(barn.feedingRatioPercent);
    setAverageAgeDays(barn.averageAgeDays);
    setAverageWeightKg(barn.averageWeightKg);
    setCustomDailyTotalKg(barn.customDailyTotalKg);

    // Keep position by default when editing, with option to reorder
    setOrderPlacement('keep');
    const otherBarns = barns.filter((b) => b.id !== barn.id);
    setPlacementTargetBarnId(otherBarns[0]?.id || '');

    const cat = categories.find((c) => c.id === barn.categoryId);
    const isCalf =
      cat?.calculationType === 'fixed_tonnage' ||
      cat?.isPeriodicMixer ||
      (cat?.name || '').toLowerCase().includes('رضيع') ||
      (cat?.name || '').toLowerCase().includes('فطام');

    if (barn.customDailyTotalKg && barn.customDailyTotalKg > 0) {
      setCalculationMode('manual_total');
    } else if (isCalf || barn.averageAgeDays || barn.averageWeightKg) {
      setCalculationMode('calf_growth');
    } else {
      setCalculationMode('auto_ration');
    }

    setRecycledRefusalAllocatedKg(barn.recycledRefusalAllocatedKg || 0);
    setRefusalType(barn.refusalType || 'percent');
    setRefusalValue(barn.refusalValue || 0);
    setStatus(barn.status);
    setNotes(barn.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteBarn = (id: string, barnLabel: string) => {
    showConfirm({
      title: isEn ? 'Delete Barn' : 'حذف عنبر',
      message: isEn
        ? `Are you sure you want to delete barn (${barnLabel})?`
        : `هل أنت متأكد من حذف العنبر (${barnLabel})؟`,
      isDanger: true,
      confirmText: isEn ? 'Delete' : 'حذف',
      onConfirm: () => {
        setBarns(barns.filter((b) => b.id !== id));
        showToast(isEn ? 'Barn deleted successfully.' : 'تم حذف العنبر بنجاح.', 'info');
      },
    });
  };

  const handleSaveBarn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !categoryId || headCount <= 0) {
      showToast(
        isEn
          ? 'Please enter barn number, select category, and specify head count.'
          : 'يرجى كتابة رقم العنبر واختيار الفئة وإدخال عدد الرؤوس.',
        'warning'
      );
      return;
    }

    // Effective final baseFeedKg
    let finalBaseFeed = baseFeedKgPerHead;
    if (calculationMode === 'auto_ration' && rationTotalKgPerHead > 0) {
      finalBaseFeed = rationTotalKgPerHead;
    } else if (calculationMode === 'calf_growth') {
      finalBaseFeed = estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg);
    }

    const finalCustomTotal = calculationMode === 'manual_total' ? (Number(customDailyTotalKg) || 0) : undefined;

    if (editingBarn) {
      const updatedBarnData: Barn = {
        ...editingBarn,
        number,
        name,
        categoryId,
        headCount,
        baseFeedKgPerHead: finalBaseFeed > 0 ? finalBaseFeed : 1,
        feedingRatioPercent,
        averageAgeDays: calculationMode === 'calf_growth' ? averageAgeDays : undefined,
        averageWeightKg: calculationMode === 'calf_growth' ? averageWeightKg : undefined,
        customDailyTotalKg: finalCustomTotal,
        recycledRefusalAllocatedKg: Math.max(0, Number(recycledRefusalAllocatedKg) || 0),
        refusalType,
        refusalValue,
        status,
        notes,
      };

      if (orderPlacement === 'keep') {
        const updated = barns.map((b) => (b.id === editingBarn.id ? updatedBarnData : b));
        const ordered = updated.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
        setBarns(ordered);
      } else {
        const remaining = barns.filter((b) => b.id !== editingBarn.id);
        let updated: Barn[];
        if (orderPlacement === 'start') {
          updated = [updatedBarnData, ...remaining];
        } else if (orderPlacement === 'end') {
          updated = [...remaining, updatedBarnData];
        } else if (orderPlacement === 'after_barn') {
          const targetIndex = remaining.findIndex((b) => b.id === placementTargetBarnId);
          if (targetIndex !== -1) {
            updated = [
              ...remaining.slice(0, targetIndex + 1),
              updatedBarnData,
              ...remaining.slice(targetIndex + 1),
            ];
          } else {
            updated = [...remaining, updatedBarnData];
          }
        } else {
          // 'auto_category'
          let insertIndex = -1;
          for (let i = remaining.length - 1; i >= 0; i--) {
            if (remaining[i].categoryId === categoryId) {
              insertIndex = i;
              break;
            }
          }
          if (insertIndex !== -1) {
            updated = [
              ...remaining.slice(0, insertIndex + 1),
              updatedBarnData,
              ...remaining.slice(insertIndex + 1),
            ];
          } else {
            updated = [...remaining, updatedBarnData];
          }
        }
        const ordered = updated.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
        setBarns(ordered);
      }
      showToast(isEn ? 'Barn details and placement updated successfully.' : 'تم تحديث بيانات وموضع العنبر بنجاح.', 'success');
    } else {
      const newBarn: Barn = {
        id: generateId('barn'),
        number,
        name,
        categoryId,
        headCount,
        baseFeedKgPerHead: finalBaseFeed > 0 ? finalBaseFeed : 1,
        feedingRatioPercent,
        averageAgeDays: calculationMode === 'calf_growth' ? averageAgeDays : undefined,
        averageWeightKg: calculationMode === 'calf_growth' ? averageWeightKg : undefined,
        customDailyTotalKg: finalCustomTotal,
        recycledRefusalAllocatedKg: Math.max(0, Number(recycledRefusalAllocatedKg) || 0),
        refusalType,
        refusalValue,
        status,
        notes,
      };

      // Smart placement: insert directly after the last barn of the same category, or user's choice
      let updatedBarns: Barn[];
      if (orderPlacement === 'start') {
        updatedBarns = [newBarn, ...barns];
      } else if (orderPlacement === 'end') {
        updatedBarns = [...barns, newBarn];
      } else if (orderPlacement === 'after_barn') {
        const targetIndex = barns.findIndex((b) => b.id === placementTargetBarnId);
        if (targetIndex !== -1) {
          updatedBarns = [
            ...barns.slice(0, targetIndex + 1),
            newBarn,
            ...barns.slice(targetIndex + 1),
          ];
        } else {
          updatedBarns = [...barns, newBarn];
        }
      } else {
        // 'auto_category': find last barn belonging to the same category
        let insertIndex = -1;
        for (let i = barns.length - 1; i >= 0; i--) {
          if (barns[i].categoryId === categoryId) {
            insertIndex = i;
            break;
          }
        }
        if (insertIndex !== -1) {
          updatedBarns = [
            ...barns.slice(0, insertIndex + 1),
            newBarn,
            ...barns.slice(insertIndex + 1),
          ];
        } else {
          updatedBarns = [...barns, newBarn];
        }
      }

      const ordered = updatedBarns.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
      setBarns(ordered);
      showToast(isEn ? 'New barn added and placed successfully.' : 'تمت إضافة العنبر وترتيبه في المكان المحدد بنجاح.', 'success');
    }

    setIsModalOpen(false);
  };

  // Reorder barn manual move up / down
  const handleMoveBarn = (barnId: string, direction: 'up' | 'down') => {
    const currentIndex = barns.findIndex((b) => b.id === barnId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= barns.length) return;

    const newBarns = [...barns];
    const temp = newBarns[currentIndex];
    newBarns[currentIndex] = newBarns[targetIndex];
    newBarns[targetIndex] = temp;

    const ordered = newBarns.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    setBarns(ordered);
    showToast(
      isEn
        ? `Moved ${temp.number} ${direction === 'up' ? 'up ⬆' : 'down ⬇'} successfully`
        : `تم نقل ${temp.number} ${direction === 'up' ? 'للأعلى ⬆' : 'للأسفل ⬇'} بنجاح`,
      'success'
    );
  };

  // Move barn directly to top or bottom
  const handleMoveBarnToExtremity = (barnId: string, position: 'top' | 'bottom') => {
    const currentIndex = barns.findIndex((b) => b.id === barnId);
    if (currentIndex === -1) return;
    const barnToMove = barns[currentIndex];
    const remaining = barns.filter((b) => b.id !== barnId);
    const updated = position === 'top' ? [barnToMove, ...remaining] : [...remaining, barnToMove];
    const ordered = updated.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    setBarns(ordered);
    showToast(
      isEn
        ? `Moved ${barnToMove.number} to ${position === 'top' ? 'top of list ⏫' : 'end of list ⏬'} successfully`
        : `تم نقل ${barnToMove.number} إلى ${position === 'top' ? 'أول القائمة ⏫' : 'نهاية القائمة ⏬'} بنجاح`,
      'success'
    );
  };

  // Quick move handler from dialog
  const handleExecuteQuickMove = () => {
    if (!movingBarn) return;
    const barnId = movingBarn.id;
    const remaining = barns.filter((b) => b.id !== barnId);
    let updated: Barn[];

    if (quickMoveType === 'start') {
      updated = [movingBarn, ...remaining];
    } else if (quickMoveType === 'end') {
      updated = [...remaining, movingBarn];
    } else if (quickMoveType === 'category_tail') {
      let lastCatIndex = -1;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (remaining[i].categoryId === movingBarn.categoryId) {
          lastCatIndex = i;
          break;
        }
      }
      if (lastCatIndex !== -1) {
        updated = [
          ...remaining.slice(0, lastCatIndex + 1),
          movingBarn,
          ...remaining.slice(lastCatIndex + 1),
        ];
      } else {
        updated = [...remaining, movingBarn];
      }
    } else {
      // after_barn
      const targetIndex = remaining.findIndex((b) => b.id === quickMoveTargetBarnId);
      if (targetIndex !== -1) {
        updated = [
          ...remaining.slice(0, targetIndex + 1),
          movingBarn,
          ...remaining.slice(targetIndex + 1),
        ];
      } else {
        updated = [...remaining, movingBarn];
      }
    }

    const ordered = updated.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    setBarns(ordered);
    showToast(
      isEn
        ? `Barn (${movingBarn.number}) position updated successfully!`
        : `تم تغيير ترتيب العنبر (${movingBarn.number}) بنجاح!`,
      'success'
    );
    setMovingBarn(null);
  };

  // Organize all barns sequentially by category
  const handleAutoOrderByCategory = () => {
    const sorted: Barn[] = [];
    categories.forEach((cat) => {
      const catBarns = barns.filter((b) => b.categoryId === cat.id);
      sorted.push(...catBarns);
    });
    const remaining = barns.filter((b) => !categories.some((c) => c.id === b.categoryId));
    sorted.push(...remaining);

    const ordered = sorted.map((b, idx) => ({ ...b, orderIndex: idx + 1 }));
    setBarns(ordered);
    showToast(
      isEn
        ? 'All barns sorted and grouped by category successfully!'
        : 'تم ترتيب وتجميع كافة العنابر حسب الفئات بنجاح!',
      'success'
    );
  };

  // Preview Calculations inside modal
  const previewEffectiveBase = calculationMode === 'manual_total'
    ? (customDailyTotalKg && headCount > 0 ? Math.round((customDailyTotalKg / headCount) * 100) / 100 : 0)
    : calculationMode === 'calf_growth'
    ? estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg)
    : (rationTotalKgPerHead > 0 ? rationTotalKgPerHead : baseFeedKgPerHead);

  const currentGrossDemand = calculationMode === 'manual_total' && (customDailyTotalKg || 0) > 0
    ? Math.round((Number(customDailyTotalKg) || 0) * (feedingRatioPercent / 100) * 100) / 100
    : Math.round(headCount * previewEffectiveBase * (feedingRatioPercent / 100) * 100) / 100;

  const currentNetFreshDemand = Math.max(0, Math.round((currentGrossDemand - (Number(recycledRefusalAllocatedKg) || 0)) * 100) / 100);

  const currentCalculatedRefusalKg = refusalType === 'kg'
    ? Math.min(currentGrossDemand, refusalValue)
    : Math.round(((currentGrossDemand * Math.max(0, Math.min(100, refusalValue))) / 100) * 100) / 100;

  const currentCalculatedIntakeKg = Math.max(0, currentGrossDemand - currentCalculatedRefusalKg);

  // Filtered barns
  const filteredBarns = barns.filter((barn) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' || barn.categoryId === selectedCategoryFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      barn.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (barn.name && barn.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isGroupedViewActive =
    groupByCategoryView && selectedCategoryFilter === 'all' && !searchQuery.trim();

  const renderBarnRow = (barn: Barn, globalIndex: number) => {
    const category = categories.find((c) => c.id === barn.categoryId);
    const netFreshDemandKg = calculateBarnDailyDemand(barn, categories, rations);
    const grossDemandKg = calculateBarnGrossDemandKg(barn, categories, rations);
    const recycledKg = calculateBarnRecycledRefusalKg(barn);
    const refusalKg = calculateBarnRefusalKg(barn, categories, rations);
    const intakeKg = calculateBarnActualIntakeKg(barn, categories, rations);
    const effectiveBase = getBarnEffectiveBaseFeedPerHead(barn, categories, rations);

    const isCalf =
      category?.calculationType === 'fixed_tonnage' ||
      category?.isPeriodicMixer ||
      (category?.name || '').toLowerCase().includes('رضيع') ||
      (category?.name || '').toLowerCase().includes('فطام');

    return (
      <tr key={barn.id} className="hover:bg-slate-50 transition-colors">
        <td className="py-3 px-3 text-center">
          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-black text-xs inline-flex items-center justify-center border border-slate-200">
            {globalIndex + 1}
          </span>
        </td>
        <td className="py-3.5 px-4 font-black text-slate-900 text-base">
          <div className="flex flex-col">
            <span>{getBarnNumberDisplayName(barn.number, isEn)}</span>
            {barn.name && <span className="text-[11px] font-semibold text-slate-500">{getBarnNameDisplayName(barn.name, isEn)}</span>}
            {isCalf && (barn.averageAgeDays || barn.averageWeightKg) && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block w-fit">
                {barn.averageAgeDays ? (isEn ? `Age ${barn.averageAgeDays} d` : `عمر ${barn.averageAgeDays} يوم`) : ''}
                {barn.averageAgeDays && barn.averageWeightKg ? ' • ' : ''}
                {barn.averageWeightKg ? (isEn ? `Wt ${barn.averageWeightKg} kg` : `وزن ${barn.averageWeightKg} كجم`) : ''}
              </span>
            )}
            {barn.customDailyTotalKg && (
              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5 inline-block w-fit">
                {isEn ? `Manual Est: ${barn.customDailyTotalKg} kg` : `تقدير يدوي: ${barn.customDailyTotalKg} كجم`}
              </span>
            )}
          </div>
        </td>
        <td className="py-3.5 px-4">
          <span className="bg-emerald-50 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs border border-emerald-200">
            {category ? getCategoryDisplayName(category.name, isEn) : (isEn ? 'General' : 'عام')}
          </span>
        </td>
        <td className="py-3.5 px-4 font-extrabold text-slate-900">
          {barn.headCount} {isEn ? 'heads' : 'رأس'}
        </td>
        <td className="py-3.5 px-4 font-bold text-slate-700">
          {effectiveBase} {isEn ? 'kg' : 'كجم'}
        </td>
        <td className="py-3.5 px-4">
          <span className="bg-slate-100 px-2.5 py-1 rounded-md font-bold text-xs text-slate-800">
            {barn.feedingRatioPercent}%
          </span>
        </td>
        <td className="py-3.5 px-4 font-black text-emerald-950 bg-emerald-50/70 text-base">
          <div>{netFreshDemandKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</div>
          {recycledKg > 0 && (
            <div className="text-[10px] text-slate-500 font-medium">
              {isEn ? `(from total ${grossDemandKg.toLocaleString('en-US')} kg)` : `(من إجمالي ${grossDemandKg.toLocaleString('ar-EG')} كجم)`}
            </div>
          )}
        </td>
        <td className="py-3.5 px-4 bg-cyan-50/40">
          {recycledKg > 0 ? (
            <span className="inline-flex items-center gap-1 font-black text-cyan-900 bg-cyan-100/80 px-2 py-0.5 rounded-md text-xs border border-cyan-300">
              <RefreshCw className="w-3 h-3 text-cyan-700" />
              {recycledKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
            </span>
          ) : (
            <span className="text-xs text-slate-400">0</span>
          )}
        </td>
        <td className="py-3.5 px-4 bg-amber-50/40">
          {refusalKg > 0 ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-amber-900 text-xs">
                {refusalKg} {isEn ? 'kg' : 'كجم'}
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                {barn.refusalType === 'kg' ? (isEn ? 'Weight' : 'وزن') : `${barn.refusalValue || 0}%`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-semibold">{isEn ? '0 (Clean)' : '0 (ممسوح)'}</span>
          )}
        </td>
        <td className="py-3.5 px-4 font-black text-blue-900 bg-blue-50/40 text-sm">
          {intakeKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}
        </td>
        <td className="py-3.5 px-4 font-bold text-xs">
          <span className={`px-2.5 py-1 rounded-full ${barn.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
            {isEn
              ? (barn.status === 'نشط' ? 'Active' : barn.status === 'صيانة' ? 'Maintenance' : 'Empty')
              : barn.status}
          </span>
        </td>
        <td className="py-3.5 px-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => handleMoveBarn(barn.id, 'up')}
              disabled={globalIndex === 0}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                globalIndex === 0
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 cursor-pointer active:scale-90'
              }`}
              title={isEn ? 'Move barn up ⬆' : 'تحريك العنبر للأعلى ⬆'}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveBarn(barn.id, 'down')}
              disabled={globalIndex === barns.length - 1}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                globalIndex === barns.length - 1
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 cursor-pointer active:scale-90'
              }`}
              title={isEn ? 'Move barn down ⬇' : 'تحريك العنبر للأسفل ⬇'}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMovingBarn(barn);
                setQuickMoveType('category_tail');
                const others = barns.filter((b) => b.id !== barn.id);
                if (others.length > 0) setQuickMoveTargetBarnId(others[0].id);
              }}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title={isEn ? 'Change barn order / custom placement' : 'تغيير موضع وترتيب العنبر (نقل حر)'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(barn)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title={isEn ? 'Edit Barn' : 'تعديل العنبر'}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteBarn(barn.id, barn.name ? `${barn.number} (${barn.name})` : barn.number)}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title={isEn ? 'Delete Barn' : 'حذف العنبر'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Main Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-700" />
            <span>{isEn ? 'Barns & Pens Management (Free Reorder)' : 'إدارة العنابر والأحواش والترتيب الحر (Barns & Pens)'}</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {isEn
              ? 'Register barns, smart auto-grouping by category with free reordering ⬆⬇ and herd filtering'
              : 'تسجيل العنابر وترتيبها التلقائي تحت فئاتها مع دعم التحريك اليدوي الحر ⬆⬇ وفلترة القطعان'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleAutoOrderByCategory}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer"
            title={isEn ? 'Group all barns sequentially by category' : 'تجميع كافة العنابر تلقائياً حسب الفئات المتتالية'}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{isEn ? 'Auto-Group by Category' : 'ترتيب مجمع حسب الفئات'}</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupByCategoryView(!groupByCategoryView)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs border shadow-2xs transition-all cursor-pointer ${
              groupByCategoryView
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>
              {groupByCategoryView
                ? (isEn ? 'Grouped by Category' : 'عرض مجمع بالفئات')
                : (isEn ? 'Sequential Free List' : 'عرض متتابع حر')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add New Barn' : 'إضافة عنبر جديد'}</span>
          </button>
          <ExportExcelButton
            onExport={() => exportBarnsToExcel(barns, categories, rations)}
            label={isEn ? 'Export to Excel' : 'تصدير للإكسيل'}
            variant="secondary"
            size="sm"
          />
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mx-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>{isEn ? 'Filter Categories:' : 'تصفية الفئات:'}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {isEn ? `All (${barns.length})` : `الكل (${barns.length})`}
          </button>
          {categories.map((cat) => {
            const count = barns.filter((b) => b.categoryId === cat.id).length;
            if (count === 0 && selectedCategoryFilter !== cat.id) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{getCategoryDisplayName(cat.name, isEn)}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className={`w-4 h-4 text-slate-400 absolute ${isEn ? 'left-3' : 'right-3'} top-2.5 pointer-events-none`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search by barn number or pen name...' : 'بحث برقم أو اسم العنبر...'}
            className={`w-full ${isEn ? 'pl-9 pr-3' : 'pr-9 pl-3'} py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-emerald-600`}
          />
        </div>
      </div>

      {/* Barns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className={`w-full ${isEn ? 'text-left' : 'text-right'} border-collapse text-xs`}>
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-700 font-bold">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4">{isEn ? 'Barn #' : 'رقم العنبر'}</th>
                <th className="py-3.5 px-4">{isEn ? 'Category' : 'الفئة'}</th>
                <th className="py-3.5 px-4">{isEn ? 'Head Count' : 'عدد الرؤوس'}</th>
                <th className="py-3.5 px-4">{isEn ? 'Base (kg/head)' : 'الأساسي (كجم/رأس)'}</th>
                <th className="py-3.5 px-4">{isEn ? 'Feed Ratio %' : 'نسبة التغذية %'}</th>
                <th className="py-3.5 px-4 text-emerald-950 bg-emerald-50/80">{isEn ? 'Net Fresh TMR Demand' : 'صافي الطازج المطلوب TMR'}</th>
                <th className="py-3.5 px-4 text-cyan-950 bg-cyan-50/80">{isEn ? 'Recycled Milking (kg)' : 'راجع حلاب محول (كجم)'}</th>
                <th className="py-3.5 px-4 text-amber-950 bg-amber-50/60">{isEn ? 'Bunk Refusal' : 'راجع طوالة العنبر'}</th>
                <th className="py-3.5 px-4 text-blue-950 bg-blue-50/60">{isEn ? 'Actual Intake (kg)' : 'المأكول الفعلي (كجم)'}</th>
                <th className="py-3.5 px-4">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="py-3.5 px-4 text-center">{isEn ? 'Actions & Order' : 'إجراءات وترتيب'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredBarns.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-bold">
                    {isEn ? 'No barns match the current search or filter criteria.' : 'لا توجد عنابر مطابقة للبحث أو التصفية الحالية.'}
                  </td>
                </tr>
              ) : isGroupedViewActive ? (
                // Grouped Rendering by Category
                categories.map((category) => {
                  const categoryBarns = barns.filter((b) => b.categoryId === category.id);
                  if (categoryBarns.length === 0) return null;

                  const totalCatHeads = categoryBarns.reduce((sum, b) => sum + b.headCount, 0);
                  const totalCatDemand = categoryBarns.reduce(
                    (sum, b) => sum + calculateBarnDailyDemand(b, categories, rations),
                    0
                  );

                  return (
                    <React.Fragment key={`cat-group-${category.id}`}>
                      {/* Category Header Row */}
                      <tr className="bg-slate-100/90 border-t-2 border-b border-slate-300">
                        <td colSpan={12} className="py-2.5 px-4 text-slate-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                              <span className="text-sm font-extrabold text-slate-900">
                                {isEn ? `Category: ${category.name}` : `فئة ${category.name}`}
                              </span>
                              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-300">
                                {categoryBarns.length} {isEn ? 'Barns' : 'عنابر'}
                              </span>
                              <span className="text-slate-600 font-semibold text-[11px] mx-1">
                                ({totalCatHeads.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'heads' : 'رأس'} •{' '}
                                {Math.round(totalCatDemand).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg feed' : 'كجم علف'})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAdd(category.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{isEn ? 'Add Barn to this Herd' : 'إضافة عنبر لهذا القطيع'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Barns inside this category */}
                      {categoryBarns.map((barn) => {
                        const globalIndex = barns.findIndex((b) => b.id === barn.id);
                        return renderBarnRow(barn, globalIndex);
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                // Flat / Filtered rendering
                filteredBarns.map((barn) => {
                  const globalIndex = barns.findIndex((b) => b.id === barn.id);
                  return renderBarnRow(barn, globalIndex);
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Barn Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[92vh] overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingBarn
                  ? (isEn ? 'Edit Barn Details' : 'تعديل بيانات العنبر')
                  : (isEn ? 'Add New Barn' : 'إضافة عنبر جديد')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBarn} className={`space-y-4 ${isEn ? 'text-left' : 'text-right'}`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Barn # / Code *' : 'رقم/رمز العنبر *'}</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder={isEn ? 'Barn 1, Pen 2...' : 'عنبر 1، عنبر 2...'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Barn Name (Optional)' : 'اسم العنبر (اختياري)'}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isEn ? 'Growers A, Milking 1, Calves 70d...' : 'نامي A، حلاب 1، رضيع 70 يوم...'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Animal Category *' : 'الفئة الحيوانية التابع لها *'}</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCategoryDisplayName(c.name, isEn)} {c.isPeriodicMixer ? (isEn ? '(Periodic / Interval mixing)' : '(دوري بالطن / خلط متباعد)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* موضع وترتيب العنبر في القوائم */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-emerald-700" />
                    <span>{isEn ? 'Barn Placement & Order in List:' : 'موضع وترتيب العنبر في القائمة:'}</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {isEn ? 'Flexible Placement' : 'ترتيب حر ومرن'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      orderPlacement === 'auto_category'
                        ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-bold'
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderPlacement"
                      checked={orderPlacement === 'auto_category'}
                      onChange={() => setOrderPlacement('auto_category')}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <span className="block font-black text-xs">{isEn ? 'Auto Under Category' : 'تلقائي تحت نفس الفئة'}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isEn
                          ? 'Placed directly after the last barn in the same category'
                          : 'يوضع مباشرة بعد آخر عنبر تابع لنفس الفئة (لتكون عنابر الفئة متتالية)'}
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      orderPlacement === 'after_barn'
                        ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-bold'
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderPlacement"
                      checked={orderPlacement === 'after_barn'}
                      onChange={() => setOrderPlacement('after_barn')}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <span className="block font-black text-xs">{isEn ? 'After Specific Barn...' : 'بعد عنبر محدد...'}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isEn ? 'Choose the preceding barn in the sequence' : 'اختيار العنبر الذي يسبقه مباشرة في الترتيب'}
                      </span>
                    </div>
                  </label>

                  {editingBarn && (
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        orderPlacement === 'keep'
                          ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-bold'
                          : 'bg-white/60 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="orderPlacement"
                        checked={orderPlacement === 'keep'}
                        onChange={() => setOrderPlacement('keep')}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <span className="block font-black text-xs">{isEn ? 'Keep Current Position' : 'الإبقاء على موضعه الحالي'}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {isEn
                            ? `#${barns.findIndex((b) => b.id === editingBarn.id) + 1} of ${barns.length}`
                            : `رقم ${barns.findIndex((b) => b.id === editingBarn.id) + 1} من ${barns.length}`}
                        </span>
                      </div>
                    </label>
                  )}

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      orderPlacement === 'start'
                        ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-bold'
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderPlacement"
                      checked={orderPlacement === 'start'}
                      onChange={() => setOrderPlacement('start')}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <span className="block font-bold text-xs">{isEn ? 'At Top of List (#1 ⏫)' : 'في أول القائمة (رقم 1 ⏫)'}</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      orderPlacement === 'end'
                        ? 'bg-white border-emerald-600 shadow-2xs text-emerald-950 font-bold'
                        : 'bg-white/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderPlacement"
                      checked={orderPlacement === 'end'}
                      onChange={() => setOrderPlacement('end')}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <div>
                      <span className="block font-bold text-xs">{isEn ? 'At End of List ⏬' : 'في نهاية القائمة ⏬'}</span>
                    </div>
                  </label>
                </div>

                {orderPlacement === 'after_barn' && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isEn ? 'Select preceding barn in list:' : 'اختر العنبر الذي يسبقه مباشرة في القائمة:'}
                    </label>
                    <select
                      value={placementTargetBarnId}
                      onChange={(e) => setPlacementTargetBarnId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-emerald-600"
                    >
                      {barns
                        .filter((b) => !editingBarn || b.id !== editingBarn.id)
                        .map((b) => {
                          const idx = barns.findIndex((x) => x.id === b.id);
                          const cat = categories.find((c) => c.id === b.categoryId);
                          return (
                            <option key={b.id} value={b.id}>
                              #{idx + 1} - {getBarnNumberDisplayName(b.number, isEn)} {b.name ? `(${getBarnNameDisplayName(b.name, isEn)})` : ''} - [{cat ? getCategoryDisplayName(cat.name, isEn) : (isEn ? 'General' : 'عام')}]
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
              </div>

              {/* Mode Selector for Feed Calculation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{isEn ? 'Feed Calculation Method:' : 'طريقة احتساب كمية علف العنبر:'}</span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCalculationMode('auto_ration')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'auto_ration'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Auto from Ration' : 'تلقائي من العليقة'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalculationMode('calf_growth');
                        if (!averageAgeDays) setAverageAgeDays(45);
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'calf_growth'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Age & Weight (Calf)' : 'بالعمر والوزن (رضيع)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalculationMode('manual_total')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        calculationMode === 'manual_total'
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Manual Total kg' : 'تقدير يدوي بالعين'}
                    </button>
                  </div>
                </div>

                {/* Sub-panels based on mode */}
                {calculationMode === 'auto_ration' && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-950 font-bold">
                      <span>{isEn ? 'Approved Herd Ration:' : 'العليقة المعتمدة للفئة:'}</span>
                      <span className="font-black text-emerald-800">{selectedCategoryRation?.name || (isEn ? 'System Default' : 'محددة بالنظام')}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-900">
                      <span>{isEn ? 'Auto Head Allocation from Ration:' : 'مقرر الرأس التلقائي من العليقة:'}</span>
                      <span className="font-black text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {rationTotalKgPerHead > 0
                          ? `${rationTotalKgPerHead} ${isEn ? 'kg/head' : 'كجم/رأس'}`
                          : `${baseFeedKgPerHead} ${isEn ? 'kg/head' : 'كجم/رأس'}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-medium pt-1">
                      {isEn
                        ? 'Head feed intake is dynamically calculated from the sum of raw materials in the approved ration.'
                        : 'يتم سحب الوزن التلقائي للرأس من مجموع مكونات العليقة المعتمدة مباشرة بدون الحاجة لإدخاله يدوياً.'}
                    </p>
                  </div>
                )}

                {calculationMode === 'calf_growth' && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span>{isEn ? 'Calf / Weaner growth curve estimation:' : 'حساب استهلاك الرضيع والفطام بناءً على منحنى العمر والوزن:'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">{isEn ? 'Average Age (Days)' : 'متوسط العمر (بالأيام)'}</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={averageAgeDays !== undefined ? averageAgeDays : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                            setAverageAgeDays(val);
                            setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(val, averageWeightKg));
                          }}
                          placeholder={isEn ? 'e.g. 30 or 70 d' : 'مثال 30 أو 70 يوم'}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">{isEn ? 'Average Head Weight (kg optional)' : 'متوسط وزن الرأس (كجم اختياري)'}</label>
                        <input
                          type="number"
                          step="any"
                          min={1}
                          value={averageWeightKg !== undefined ? averageWeightKg : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            setAverageWeightKg(val);
                            setBaseFeedKgPerHead(estimateCalfStarterIntakeKgPerHead(averageAgeDays, val));
                          }}
                          placeholder={isEn ? 'e.g. 60 or 90 kg' : 'مثال 60 أو 90 كجم'}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/90 p-2 rounded-lg border border-amber-200 text-amber-950 font-bold text-[11px]">
                      <span>{isEn ? 'Expected Head Starter Intake:' : 'معدل سحب الرأس المتوقع للعمر:'}</span>
                      <span className="text-amber-800 font-black text-xs bg-amber-100/70 px-2 py-0.5 rounded">
                        {estimateCalfStarterIntakeKgPerHead(averageAgeDays, averageWeightKg)} {isEn ? 'kg starter / head / day' : 'كجم علف مركز / رأس / يوم'}
                      </span>
                    </div>
                  </div>
                )}

                {calculationMode === 'manual_total' && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-purple-700" />
                        <span>{isEn ? 'Manual Total Pen Feed Estimation (kg)' : 'تقدير إجمالي كمية العلف للعنبر بالكامل (كجم)'}</span>
                      </label>
                      <span className="text-[10px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded border border-purple-200">
                        {isEn ? 'Direct Visual Estimate' : 'تقدير عيني مباشر'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min={1}
                        value={customDailyTotalKg !== undefined ? customDailyTotalKg : ''}
                        placeholder={isEn ? 'e.g. 100 kg...' : 'مثال 100 كجم...'}
                        onChange={(e) => setCustomDailyTotalKg(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm font-black text-purple-950 focus:outline-purple-600 text-center"
                      />
                      <span className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-2.5 text-xs font-bold text-purple-700 pointer-events-none`}>
                        {isEn ? 'kg pen total' : 'كجم إجمالي للعنبر'}
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-800 font-medium">
                      {isEn
                        ? 'Type your visual target (e.g. 100 kg), and the system automatically calculates per-head share and mixer batches.'
                        : 'اكتب تقديرك بالعين (مثلاً 100 كجم)، وسيحسب النظام تلقائياً حصة كل رأس ويوزعها على لفة المكسر بدقة.'}
                    </p>
                  </div>
                )}
              </div>

              {/* HeadCount & Feeding Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Head Count in Barn *' : 'عدد الرؤوس في العنبر *'}</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={headCount || ''}
                    onChange={(e) => setHeadCount(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Feeding Ratio % *' : 'نسبة التغذية % *'}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="300"
                      required
                      value={feedingRatioPercent || ''}
                      onChange={(e) => setFeedingRatioPercent(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-emerald-600 text-center"
                    />
                    <span className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-2 text-xs font-bold text-slate-400 pointer-events-none`}>%</span>
                  </div>
                </div>
              </div>

              {/* Recycled Refusal Allocation from Milking Barns */}
              <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-cyan-700" />
                    <span>{isEn ? 'Allocate Recycled Milking Refusal (kg)' : 'تخصيص راجع حلاب مدوّر للعنبر (كجم)'}</span>
                  </label>
                  <span className="text-[11px] text-cyan-800 font-bold">{isEn ? 'For Growers & Feedlot' : 'مخصص للنامي والتسمين'}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={recycledRefusalAllocatedKg !== undefined ? recycledRefusalAllocatedKg : ''}
                    placeholder={isEn ? 'e.g. 200 kg...' : 'مثال 200 كجم...'}
                    onChange={(e) => setRecycledRefusalAllocatedKg(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-cyan-300 rounded-lg text-xs font-black text-cyan-950 focus:outline-cyan-600 text-center"
                  />
                  <span className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-2 text-xs font-bold text-cyan-800 pointer-events-none`}>
                    {isEn ? 'kg recycled feed' : 'كجم راجع حلاب'}
                  </span>
                </div>
                <p className="text-[10px] text-cyan-800 font-medium">
                  {isEn
                    ? 'Recycled feed amount is automatically deducted from fresh mixer feed needed for this barn.'
                    : 'يتم خصم كمية الراجع تلقائياً من كمية العلف الطازج المطلوب خلطه بالمكسر لهذا العنبر.'}
                </p>
              </div>

              {/* Individual Barn Feed Refusal Controls */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-amber-700" />
                    <span>{isEn ? 'Bunk Refusal (Leftover at End of Day)' : 'راجع طوالة العنبر المتبقي في نهاية اليوم'}</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (refusalType === 'percent') return;
                        const kgVal = Number(refusalValue) || 0;
                        const pctVal = currentGrossDemand > 0
                          ? Math.round(((kgVal / currentGrossDemand) * 100) * 10) / 10
                          : 0;
                        setRefusalValue(pctVal);
                        setRefusalType('percent');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        refusalType === 'percent'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Percent %' : 'نسبة %'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (refusalType === 'kg') return;
                        const pctVal = Number(refusalValue) || 0;
                        const kgVal = Math.round(((currentGrossDemand * pctVal) / 100) * 10) / 10;
                        setRefusalValue(kgVal);
                        setRefusalType('kg');
                      }}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        refusalType === 'kg'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Weight kg' : 'وزن كجم'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={refusalValue !== undefined ? refusalValue : ''}
                      placeholder={refusalType === 'percent' ? (isEn ? 'e.g. 5%' : 'مثال 5%') : (isEn ? 'e.g. 150 kg' : 'مثال 150 كجم')}
                      onChange={(e) => setRefusalValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-amber-600 text-center"
                    />
                    <span className={`absolute ${isEn ? 'right-2.5' : 'left-2.5'} top-2 text-xs font-bold text-amber-800 pointer-events-none`}>
                      {refusalType === 'kg' ? (isEn ? 'kg' : 'كجم') : '%'}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-900 font-bold bg-white/80 p-2 rounded-lg border border-amber-200 text-center">
                    {isEn ? 'Actual Refusal:' : 'الراجع الفعلي:'} <span className="text-amber-700 font-black">{currentCalculatedRefusalKg} {isEn ? 'kg' : 'كجم'}</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                      {refusalType === 'kg'
                        ? (isEn
                            ? `(equiv to ${currentGrossDemand > 0 ? ((currentCalculatedRefusalKg / currentGrossDemand) * 100).toFixed(1) : 0}%)`
                            : `(يعادل ${currentGrossDemand > 0 ? ((currentCalculatedRefusalKg / currentGrossDemand) * 100).toFixed(1) : 0}%)`)
                        : (isEn
                            ? `(from total ${currentGrossDemand} kg)`
                            : `(من إجمالي ${currentGrossDemand} كجم)`)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Demand & Intake Summary */}
              <div className="p-3 bg-emerald-950 text-emerald-50 rounded-xl space-y-1.5 font-bold text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-200">{isEn ? 'Total Barn Gross Demand:' : 'إجمالي الاحتياج الكلي للعنبر:'}</span>
                  <span className="text-amber-300 text-sm font-black">{currentGrossDemand.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                </div>
                {Number(recycledRefusalAllocatedKg) > 0 && (
                  <div className="flex items-center justify-between text-cyan-300 text-[11px]">
                    <span>{isEn ? '- Recycled Milking Feed:' : '- راجع الحلاب المحول:'}</span>
                    <span className="font-black">{(Number(recycledRefusalAllocatedKg) || 0).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800 text-emerald-100">
                  <span className="font-extrabold">{isEn ? 'Net Fresh TMR Required in Mixer:' : 'صافي الطازج المطلوب خلطه بالمكسر:'}</span>
                  <span className="text-white text-base font-black">{currentNetFreshDemand.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-800 text-[11px]">
                  <span className="text-emerald-300">{isEn ? 'Expected Actual Net Intake:' : 'صافي المأكول الفعلي المتوقع:'}</span>
                  <span className="text-emerald-100 font-black">{currentCalculatedIntakeKg.toLocaleString(isEn ? 'en-US' : 'ar-EG')} {isEn ? 'kg' : 'كجم'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Barn Status' : 'حالة العنبر'}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Barn['status'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
                >
                  <option value="نشط">{isEn ? 'Active' : 'نشط'}</option>
                  <option value="صيانة">{isEn ? 'Maintenance' : 'صيانة'}</option>
                  <option value="فارغ">{isEn ? 'Empty' : 'فارغ'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Notes' : 'ملاحظات'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Notes regarding pen location, feeding interval, or condition...' : 'ملاحظات حول موقع العنبر، دورية التغذية، أو حالته...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-600"
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
                  {isEn ? 'Save Barn' : 'حفظ العنبر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Move Barn Modal */}
      {movingBarn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {isEn ? 'Change Barn Placement & Order' : 'تغيير موضع وترتيب العنبر'}
                </h3>
              </div>
              <button
                onClick={() => setMovingBarn(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 text-xs space-y-1.5">
              <div className="font-black text-indigo-950 text-sm flex items-center justify-between">
                <span>{movingBarn.number} {movingBarn.name ? `(${movingBarn.name})` : ''}</span>
                <span className="bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md font-black text-xs">
                  {isEn
                    ? `Current Pos: #${barns.findIndex((b) => b.id === movingBarn.id) + 1}`
                    : `الموضع الحالي: #${barns.findIndex((b) => b.id === movingBarn.id) + 1}`}
                </span>
              </div>
              <div className="text-indigo-800 font-semibold text-[11px]">
                {isEn ? 'Category:' : 'الفئة:'} <strong>{categories.find((c) => c.id === movingBarn.categoryId)?.name || (isEn ? 'General' : 'عام')}</strong>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleMoveBarnToExtremity(movingBarn.id, 'top');
                  setMovingBarn(null);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-900 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-200"
              >
                <ChevronsUp className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'Move to Top (#1)' : 'نقل لأول القائمة (رقم 1)'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMoveBarnToExtremity(movingBarn.id, 'bottom');
                  setMovingBarn(null);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-indigo-100 text-slate-800 hover:text-indigo-900 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-200"
              >
                <ChevronsDown className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'Move to End' : 'نقل لآخر القائمة'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-800">{isEn ? 'Or select custom position in sequence:' : 'أو اختر موضعاً مخصصاً في القائمة:'}</label>

              <div className="space-y-1.5">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    quickMoveType === 'category_tail'
                      ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="quickMove"
                    checked={quickMoveType === 'category_tail'}
                    onChange={() => setQuickMoveType('category_tail')}
                    className="accent-indigo-600"
                  />
                  <span>
                    {isEn
                      ? `Directly under herd barns (${categories.find((c) => c.id === movingBarn.categoryId)?.name || 'Category'})`
                      : `مباشرة تحت عنابر فئته (${categories.find((c) => c.id === movingBarn.categoryId)?.name || 'الفئة'})`}
                  </span>
                </label>

                <label
                  className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    quickMoveType === 'after_barn'
                      ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="quickMove"
                    checked={quickMoveType === 'after_barn'}
                    onChange={() => setQuickMoveType('after_barn')}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div className="w-full">
                    <span className="block mb-1">{isEn ? 'After specific barn...' : 'بعد عنبر محدد...'}</span>
                    {quickMoveType === 'after_barn' && (
                      <select
                        value={quickMoveTargetBarnId}
                        onChange={(e) => setQuickMoveTargetBarnId(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-600"
                      >
                        {barns
                          .filter((b) => b.id !== movingBarn.id)
                          .map((b) => {
                            const idx = barns.findIndex((x) => x.id === b.id);
                            const cat = categories.find((c) => c.id === b.categoryId);
                            return (
                              <option key={b.id} value={b.id}>
                                #{idx + 1} - {getBarnNumberDisplayName(b.number, isEn)} {b.name ? `(${getBarnNameDisplayName(b.name, isEn)})` : ''} [{cat ? getCategoryDisplayName(cat.name, isEn) : (isEn ? 'General' : 'عام')}]
                              </option>
                            );
                          })}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMovingBarn(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="button"
                onClick={handleExecuteQuickMove}
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
              >
                {isEn ? 'Apply Placement' : 'تطبيق الترتيب الجديد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
