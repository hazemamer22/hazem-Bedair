import React, { useState, useMemo, useEffect } from 'react';
import { RawMaterial, Ration, RationIngredient } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Sparkles,
  Scale,
  Package,
  Truck,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  FolderInput,
  ArrowRight,
} from 'lucide-react';

interface FatteningRationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMaterials: RawMaterial[];
  rations: Ration[];
  onApplyRation: (newRation: Ration) => void;
  existingRation?: Ration | null;
}

interface TonIngredient {
  rawMaterialId: string;
  kgInTon: number;
}

interface RoughageItem {
  rawMaterialId: string;
  kgPerHead: number;
}

export const FatteningRationWizardModal: React.FC<FatteningRationWizardModalProps> = ({
  isOpen,
  onClose,
  rawMaterials,
  rations,
  onApplyRation,
  existingRation,
}) => {
  const { showToast } = useFeedback();

  // Find candidate default materials
  const defaultCorn = rawMaterials.find((r) => r.name.includes('ذرة') && r.materialType !== 'roughage') || rawMaterials[0];
  const defaultSoy = rawMaterials.find((r) => r.name.includes('صويا')) || rawMaterials[1];
  const defaultBran = rawMaterials.find((r) => r.name.includes('ردة') || r.name.includes('جلوتوفيد') || r.name.includes('DDGS')) || rawMaterials[2];
  const defaultPremix = rawMaterials.find((r) => r.name.includes('أملاح') || r.name.includes('بريمكس') || r.materialType === 'mineral') || rawMaterials[3];

  const defaultSilage = rawMaterials.find((r) => r.name.includes('سيلاج')) || rawMaterials.find((r) => r.materialType === 'roughage');
  const defaultStraw = rawMaterials.find((r) => r.name.includes('تبن')) || rawMaterials.find((r) => r.id !== defaultSilage?.id && r.materialType === 'roughage');

  // Ration identity
  const [rationName, setRationName] = useState(
    existingRation?.name || 'عليقة تسمين متكاملة (عجل 350 كجم - مركز 2.5% + سيلاج وتبن)'
  );
  const [rationCode, setRationCode] = useState(existingRation?.code || 'RAT-FAT-350');

  // Selected source ration for quick concentrate import
  const [selectedSourceRationId, setSelectedSourceRationId] = useState<string>('');

  // Head calculation parameters
  const [bodyWeightKg, setBodyWeightKg] = useState<number>(350);
  const [concentratePercent, setConcentratePercent] = useState<number>(2.5);
  const [isManualConcentrate, setIsManualConcentrate] = useState<boolean>(false);
  const [manualConcentrateKg, setManualConcentrateKg] = useState<number>(8.75);

  // Roughage items (Silage 6kg, Straw 1kg default)
  const [roughageItems, setRoughageItems] = useState<RoughageItem[]>([
    { rawMaterialId: defaultSilage?.id || '', kgPerHead: 6.0 },
    { rawMaterialId: defaultStraw?.id || '', kgPerHead: 1.0 },
  ]);

  // Concentrate Ton formulation items (summing to 1000 kg)
  const [tonIngredients, setTonIngredients] = useState<TonIngredient[]>([
    { rawMaterialId: defaultCorn?.id || '', kgInTon: 600 },
    { rawMaterialId: defaultSoy?.id || '', kgInTon: 200 },
    { rawMaterialId: defaultBran?.id || '', kgInTon: 170 },
    { rawMaterialId: defaultPremix?.id || '', kgInTon: 30 },
  ]);

  // 1. استيراد وقراءة كافة خامات العليقة المستهدفة بنسبة 100% فور فتح الحاسبة
  useEffect(() => {
    if (!isOpen) return;

    if (existingRation) {
      if (existingRation.name) setRationName(existingRation.name);
      if (existingRation.code) setRationCode(existingRation.code);

      if (existingRation.ingredients && existingRation.ingredients.length > 0) {
        const concItems: { rawMaterialId: string; amountKgPerHead: number }[] = [];
        const roughItems: RoughageItem[] = [];

        existingRation.ingredients.forEach((ing) => {
          const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
          // إذا كانت معلمة بالخلاطة أو ليست مالئ
          const isConc = ing.inConcentratePremix ?? (rm ? rm.materialType !== 'roughage' : true);
          if (isConc) {
            concItems.push({ rawMaterialId: ing.rawMaterialId, amountKgPerHead: ing.amountKgPerHead });
          } else {
            roughItems.push({ rawMaterialId: ing.rawMaterialId, kgPerHead: ing.amountKgPerHead });
          }
        });

        // نقل الخامات المالئة إلى جدول المالئ الثابت
        if (roughItems.length > 0) {
          setRoughageItems(roughItems);
        }

        // نقل خامات المركز المحددة للخلاطة إلى تركيبة الطن (1000 كجم) بنسبها المئوية الدقيقة
        const totalConcKg = concItems.reduce((s, i) => s + i.amountKgPerHead, 0);
        if (concItems.length > 0 && totalConcKg > 0) {
          const newTon: TonIngredient[] = concItems.map((item) => {
            const share = item.amountKgPerHead / totalConcKg;
            // دقة عالية حتى جزء من مائة من الكيلو في الطن
            return {
              rawMaterialId: item.rawMaterialId,
              kgInTon: Math.round(share * 1000 * 100) / 100,
            };
          });

          // ضبط الفارق الطفيف إن وجد ليكون المجموع 1000 كجم تماماً
          const tonSum = newTon.reduce((s, i) => s + i.kgInTon, 0);
          const diff = Math.round((1000 - tonSum) * 100) / 100;
          if (diff !== 0 && newTon.length > 0) {
            newTon[0].kgInTon = Math.round((newTon[0].kgInTon + diff) * 100) / 100;
          }

          setTonIngredients(newTon);

          // ضبط حصة المركز المقررة أصلاً
          const roundedConcKg = Math.round(totalConcKg * 10000) / 10000;
          setManualConcentrateKg(roundedConcKg);

          if (bodyWeightKg > 0) {
            const derivedPct = Math.round((totalConcKg / bodyWeightKg) * 100 * 100) / 100;
            if (derivedPct >= 0.5 && derivedPct <= 5) {
              setConcentratePercent(derivedPct);
            }
          }
        }
      }
    }
  }, [isOpen, existingRation, rawMaterials]);

  // 2. قائمة سريعة: استيراد خامات المركز من عليقة أخرى
  const handleImportConcentrateFromRation = (sourceId: string) => {
    if (!sourceId) return;
    const sourceRation = rations.find((r) => r.id === sourceId);
    if (!sourceRation) return;

    const concIngs = sourceRation.ingredients.filter((ing) => {
      const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      return ing.inConcentratePremix ?? (rm ? rm.materialType !== 'roughage' : true);
    });

    if (concIngs.length === 0) {
      showToast(`العليقة المختارة (${sourceRation.name}) لا تحتوي على خامات مركزة مسبقة للخلاطة.`, 'warning');
      return;
    }

    const totalConcKg = concIngs.reduce((s, i) => s + i.amountKgPerHead, 0);
    const safeTotal = totalConcKg > 0 ? totalConcKg : 1;

    const newTon: TonIngredient[] = concIngs.map((ing) => {
      const share = ing.amountKgPerHead / safeTotal;
      return {
        rawMaterialId: ing.rawMaterialId,
        kgInTon: Math.round(share * 1000 * 100) / 100,
      };
    });

    // ضبط ليكون 1000 كجم تماماً
    const tonSum = newTon.reduce((s, i) => s + i.kgInTon, 0);
    const diff = Math.round((1000 - tonSum) * 100) / 100;
    if (diff !== 0 && newTon.length > 0) {
      newTon[0].kgInTon = Math.round((newTon[0].kgInTon + diff) * 100) / 100;
    }

    setTonIngredients(newTon);
    showToast(`تم استيراد ${newTon.length} خامات مركز من (${sourceRation.name}) وتوزيعها على الطن (1000 كجم) بنسبة 100%.`, 'success');
  };

  // Derived effective concentrate kg per head (دقة 4 أرقام عشرية)
  const effectiveConcentrateKg = useMemo(() => {
    if (isManualConcentrate) {
      return Math.max(0, Number(manualConcentrateKg) || 0);
    }
    const weight = Math.max(0, Number(bodyWeightKg) || 0);
    const pct = Math.max(0, Number(concentratePercent) || 0);
    return Math.round((weight * (pct / 100)) * 10000) / 10000;
  }, [isManualConcentrate, manualConcentrateKg, bodyWeightKg, concentratePercent]);

  // Total Ton weight check
  const totalTonKg = useMemo(() => {
    return Math.round(tonIngredients.reduce((sum, item) => sum + (Number(item.kgInTon) || 0), 0) * 100) / 100;
  }, [tonIngredients]);

  // Total Roughage weight per head
  const totalRoughageKg = useMemo(() => {
    return Math.round(roughageItems.reduce((sum, item) => sum + (Number(item.kgPerHead) || 0), 0) * 10000) / 10000;
  }, [roughageItems]);

  // Total TMR Feed per head per day
  const totalRationKgPerHead = useMemo(() => {
    return Math.round((effectiveConcentrateKg + totalRoughageKg) * 10000) / 10000;
  }, [effectiveConcentrateKg, totalRoughageKg]);

  // Percentages in TMR
  const concentrateShareInTmr = useMemo(() => {
    return totalRationKgPerHead > 0
      ? Math.round((effectiveConcentrateKg / totalRationKgPerHead) * 1000) / 10
      : 0;
  }, [effectiveConcentrateKg, totalRationKgPerHead]);

  const roughageShareInTmr = useMemo(() => {
    return totalRationKgPerHead > 0
      ? Math.round((totalRoughageKg / totalRationKgPerHead) * 1000) / 10
      : 0;
  }, [totalRoughageKg, totalRationKgPerHead]);

  // Auto-normalize ton items to exact 1000 kg if user wants
  const handleNormalizeTon = () => {
    if (totalTonKg <= 0) return;
    const factor = 1000 / totalTonKg;
    const normalized = tonIngredients.map((item) => ({
      ...item,
      kgInTon: Math.round(item.kgInTon * factor * 100) / 100,
    }));
    const currentSum = normalized.reduce((s, i) => s + i.kgInTon, 0);
    const diff = Math.round((1000 - currentSum) * 100) / 100;
    if (diff !== 0 && normalized.length > 0) {
      normalized[0].kgInTon = Math.round((normalized[0].kgInTon + diff) * 100) / 100;
    }
    setTonIngredients(normalized);
    showToast('تمت إعادة ضبط مجموع خامات المركز إلى 1000 كجم (طن كامل) تلقائياً بنسبة 100%.', 'success');
  };

  // Add Ton Ingredient
  const handleAddTonIngredient = () => {
    const existingIds = tonIngredients.map((i) => i.rawMaterialId);
    const available = rawMaterials.find((rm) => !existingIds.includes(rm.id) && rm.materialType !== 'roughage') || rawMaterials[0];
    if (!available) return;
    setTonIngredients([...tonIngredients, { rawMaterialId: available.id, kgInTon: 50 }]);
  };

  // Remove Ton Ingredient
  const handleRemoveTonIngredient = (index: number) => {
    if (tonIngredients.length <= 1) {
      showToast('يجب إبقاء خامة واحدة على الأقل في تركيبة المركز.', 'warning');
      return;
    }
    setTonIngredients(tonIngredients.filter((_, i) => i !== index));
  };

  // Add Roughage
  const handleAddRoughage = () => {
    const existingIds = roughageItems.map((i) => i.rawMaterialId);
    const available = rawMaterials.find((rm) => !existingIds.includes(rm.id) && rm.materialType === 'roughage') || rawMaterials[0];
    if (!available) return;
    setRoughageItems([...roughageItems, { rawMaterialId: available.id, kgPerHead: 1.0 }]);
  };

  // Remove Roughage
  const handleRemoveRoughage = (index: number) => {
    setRoughageItems(roughageItems.filter((_, i) => i !== index));
  };

  // 3. دقة الجرامات للإضافات والبريمكس: احتفاظ حتى 4 أرقام عشرية
  const calculatedIngredients = useMemo<RationIngredient[]>(() => {
    const list: RationIngredient[] = [];
    const safeTonTotal = totalTonKg > 0 ? totalTonKg : 1000;

    // 1. خامات المركز مقسمة من الطن مع الحفاظ على دقة الجرامات
    tonIngredients.forEach((item) => {
      const shareInTon = item.kgInTon / safeTonTotal;
      const exactAmount = shareInTon * effectiveConcentrateKg;
      // دقة حتى 4 خانات عشرية (0.0001 كجم = 0.1 جم) لضمان عدم تصفير أي بريمكس
      const kgPerHead = Math.round(exactAmount * 10000) / 10000;
      list.push({
        rawMaterialId: item.rawMaterialId,
        amountKgPerHead: kgPerHead,
        inConcentratePremix: true,
      });
    });

    // 2. خامات المالئ الثابت للرأس
    roughageItems.forEach((item) => {
      list.push({
        rawMaterialId: item.rawMaterialId,
        amountKgPerHead: Math.round(item.kgPerHead * 10000) / 10000,
        inConcentratePremix: false,
      });
    });

    return list;
  }, [tonIngredients, roughageItems, totalTonKg, effectiveConcentrateKg]);

  // دالة عرض الأوزان الصغيرة بدقة الجرامات
  const renderFormattedAmountWithGrams = (kg: number) => {
    if (kg <= 0) return '0 كجم';
    if (kg < 0.1) {
      const grams = (kg * 1000).toFixed(1).replace(/\.0$/, '');
      return (
        <span className="inline-flex items-center gap-1">
          <span className="font-mono font-black text-amber-950 text-sm">
            {kg.toFixed(4).replace(/\.?0+$/, '')} كجم
          </span>
          <span className="text-[11px] bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded font-black whitespace-nowrap">
            {grams} جم
          </span>
        </span>
      );
    }
    return (
      <span className="font-mono font-black text-emerald-950 text-sm">
        {kg.toFixed(2).replace(/\.?0+$/, '')} كجم
      </span>
    );
  };

  // Handle Apply and Generate
  const handleApply = () => {
    if (!rationName.trim()) {
      showToast('يرجى كتابة اسم العليقة.', 'warning');
      return;
    }
    if (tonIngredients.length === 0) {
      showToast('يرجى تحديد خامات المركز.', 'warning');
      return;
    }
    if (effectiveConcentrateKg <= 0 && totalRoughageKg <= 0) {
      showToast('إجمالي العليقة يجب أن يكون أكبر من الصفر.', 'warning');
      return;
    }

    const newRation: Ration = {
      id: existingRation?.id || generateId('rat'),
      name: rationName,
      code: rationCode,
      calculationType: 'per_head',
      notes: `عليقة تسمين متكاملة: وزن عجل ${bodyWeightKg} كجم × نسبة مركز ${concentratePercent}% (${effectiveConcentrateKg} كجم مركز بالطن + ${totalRoughageKg} كجم مالئ ثابت)`,
      ingredients: calculatedIngredients,
    };

    onApplyRation(newRation);
    showToast(
      `تم توليد (${rationName}) بنجاح بإجمالي ${totalRationKgPerHead} كجم/رأس (${effectiveConcentrateKg} كجم مركز + ${totalRoughageKg} كجم مالئ).`,
      'success'
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-300">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                  مُحوّل وحاسبة تركيبة التسمين الذكية
                </h3>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                  طن مركز 📦 + مالئ ثابت 🚜
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                حساب آلي فوري لحصة العجل من طن المركز حسب الوزن الحي مع تثبيت السيلاج والتبن
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-black text-xl p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 2. شريط استيراد خامات المركز من عليقة أخرى */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-amber-950">
            <FolderInput className="w-4 h-4 text-amber-700 shrink-0" />
            <span>استيراد خامات المركز من عليقة أخرى:</span>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <select
              value={selectedSourceRationId}
              onChange={(e) => setSelectedSourceRationId(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-amber-600"
            >
              <option value="">-- اختر عليقة مسجلة بالمزرعة --</option>
              {rations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code || 'بدون كود'})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedSourceRationId}
              onClick={() => handleImportConcentrateFromRation(selectedSourceRationId)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 transition-all ${
                selectedSourceRationId
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>استيراد الخامات 📥</span>
            </button>
          </div>
        </div>

        {/* Dynamic Parameter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Animal Weight & Concentrate Ratio */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                معادلة العجل والمركز:
              </span>
              <button
                type="button"
                onClick={() => setIsManualConcentrate(!isManualConcentrate)}
                className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                {isManualConcentrate ? 'الرجوع للحساب بالوزن' : 'إدخال يدوي مباشر'}
              </button>
            </div>

            {!isManualConcentrate ? (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    متوسط وزن العجل (كجم):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min={100}
                      max={1000}
                      value={bodyWeightKg}
                      onChange={(e) => setBodyWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 text-center focus:outline-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-900">كجم</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    نسبة المركز من الوزن الحي (%):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0.5}
                      max={4.0}
                      value={concentratePercent}
                      onChange={(e) => setConcentratePercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 text-center focus:outline-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-900">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  حصة المركز اليومية المباشرة (كجم/رأس):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0.1}
                    value={manualConcentrateKg}
                    onChange={(e) => setManualConcentrateKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 text-center focus:outline-amber-600"
                  />
                  <span className="text-xs font-bold text-amber-900">كجم</span>
                </div>
              </div>
            )}

            {/* Live Result of Concentrate */}
            <div className="p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl text-center">
              <span className="text-[10px] font-extrabold text-amber-800 block">
                حصة العجل اليومية من المركز:
              </span>
              <span className="text-lg font-black text-amber-950">
                {effectiveConcentrateKg.toLocaleString()} <span className="text-xs">كجم مركز / رأس</span>
              </span>
              <p className="text-[9px] text-amber-700 mt-0.5">
                ({bodyWeightKg} كجم × {concentratePercent}% = {effectiveConcentrateKg} كجم)
              </p>
            </div>
          </div>

          {/* Card 2: Fixed Roughage (Silage & Straw) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-700" />
                المواد المالئة الثابتة (للرأس):
              </span>
              <button
                type="button"
                onClick={handleAddRoughage}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة مالئ
              </button>
            </div>

            <div className="space-y-2">
              {roughageItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200">
                  <select
                    value={item.rawMaterialId}
                    onChange={(e) => {
                      const updated = [...roughageItems];
                      updated[idx].rawMaterialId = e.target.value;
                      setRoughageItems(updated);
                    }}
                    className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {rawMaterials.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.25"
                    min={0}
                    value={item.kgPerHead}
                    onChange={(e) => {
                      const updated = [...roughageItems];
                      updated[idx].kgPerHead = parseFloat(e.target.value) || 0;
                      setRoughageItems(updated);
                    }}
                    className="w-16 px-1.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center"
                  />
                  <span className="text-[10px] font-bold text-slate-500">كجم</span>

                  <button
                    type="button"
                    onClick={() => handleRemoveRoughage(idx)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-center">
              <span className="text-[10px] font-extrabold text-slate-700 block">
                إجمالي المواد المالئة الثابتة:
              </span>
              <span className="text-lg font-black text-slate-900">
                {totalRoughageKg.toLocaleString()} <span className="text-xs">كجم مالئ / رأس</span>
              </span>
              <p className="text-[9px] text-slate-500 mt-0.5">
                تُحمّل باللودر مباشرة في مكسر الـ TMR
              </p>
            </div>
          </div>

          {/* Card 3: Combined TMR Summary */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 mb-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                ملخص العليقة اليومية للرأس (TMR):
              </span>

              <div className="p-3 bg-white border border-emerald-200 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 block">
                  إجمالي العليقة المتكاملة للرأس/يوم:
                </span>
                <span className="text-2xl font-black text-emerald-950">
                  {totalRationKgPerHead.toLocaleString()}{' '}
                  <span className="text-sm font-bold">كجم/رأس</span>
                </span>
              </div>
            </div>

            {/* Proportion Bars */}
            <div className="space-y-2 bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-amber-950 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-700" />
                  علف مركز (شكاير):
                </span>
                <span className="text-amber-900">{effectiveConcentrateKg} كجم ({concentrateShareInTmr}%)</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-800 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-600" />
                  مالئ مباشر (لودر):
                </span>
                <span className="text-slate-900">{totalRoughageKg} كجم ({roughageShareInTmr}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ton Concentrate Formulation Editor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-700" />
                تركيبة طن العلف المركز المسبق (1000 كجم)
              </span>
              <p className="text-[11px] text-slate-500">
                أدخل خامات الطن الواحد وسيوزع البرنامج الـ {effectiveConcentrateKg} كجم على العجل بنسبها المضبوطة آلياً
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border ${
                  Math.abs(totalTonKg - 1000) < 0.1
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                {Math.abs(totalTonKg - 1000) < 0.1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>مجموع الطن: {totalTonKg.toLocaleString()} كجم</span>
              </div>

              {Math.abs(totalTonKg - 1000) >= 0.1 && (
                <button
                  type="button"
                  onClick={handleNormalizeTon}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="ضبط نسبي مباشر ليصبح المجموع 1000 كجم تماماً"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ضبط إلى 1000 كجم</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAddTonIngredient}
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خامة مركز</span>
              </button>
            </div>
          </div>

          {/* Grid of ton ingredients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tonIngredients.map((item, idx) => {
              const safeTon = totalTonKg > 0 ? totalTonKg : 1000;
              const percent = Math.round((item.kgInTon / safeTon) * 1000) / 10;
              const exactAmount = (item.kgInTon / safeTon) * effectiveConcentrateKg;
              const perHeadKg = Math.round(exactAmount * 10000) / 10000;

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {percent}% من المركز
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTonIngredient(idx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <select
                    value={item.rawMaterialId}
                    onChange={(e) => {
                      const updated = [...tonIngredients];
                      updated[idx].rawMaterialId = e.target.value;
                      setTonIngredients(updated);
                    }}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {rawMaterials.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="text-[11px] font-medium text-slate-500">في الطن:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={item.kgInTon}
                        onChange={(e) => {
                          const updated = [...tonIngredients];
                          updated[idx].kgInTon = parseFloat(e.target.value) || 0;
                          setTonIngredients(updated);
                        }}
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-md font-black text-slate-900 text-center"
                      />
                      <span className="text-[10px] font-bold text-slate-500">كجم</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">نصيب الرأس:</span>
                    <div>{renderFormattedAmountWithGrams(perHeadKg)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Detailed Breakdown Table */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">
              المعاينة النهائية لمكونات العليقة اليومية للرأس (بدقة الجرامات):
            </span>
            <span className="text-[11px] text-slate-500">
              {calculatedIngredients.length} خامات علفية (مركّز معبأ في شكاير + مالئ مباشر)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">الخامة العلفية</th>
                  <th className="p-2.5 text-center">الكمية المقررة للرأس/يوم</th>
                  <th className="p-2.5 text-center">النسبة في العليقة %</th>
                  <th className="p-2.5 text-center">طريقة الخلط والتجهيز بالمزرعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {calculatedIngredients.map((item, idx) => {
                  const rm = rawMaterials.find((m) => m.id === item.rawMaterialId);
                  const share = totalRationKgPerHead > 0
                    ? Math.round((item.amountKgPerHead / totalRationKgPerHead) * 1000) / 10
                    : 0;

                  return (
                    <tr key={idx} className={item.inConcentratePremix ? 'bg-amber-50/30' : 'bg-white'}>
                      <td className="p-2.5 font-bold text-slate-900">
                        {rm?.name || 'خامة'}
                      </td>
                      <td className="p-2.5 text-center font-black">
                        {renderFormattedAmountWithGrams(item.amountKgPerHead)}
                      </td>
                      <td className="p-2.5 text-center text-slate-600 font-bold">
                        {share}%
                      </td>
                      <td className="p-2.5 text-center">
                        {item.inConcentratePremix ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-black text-[11px]">
                            <Package className="w-3 h-3 text-amber-700" />
                            خلاطة المركز (شكاير) 📦
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 border border-slate-300 font-bold text-[11px]">
                            <Truck className="w-3 h-3 text-slate-600" />
                            مكسر TMR مباشر 🚜
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ration Naming & Action */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">اسم العليقة:</label>
              <input
                type="text"
                value={rationName}
                onChange={(e) => setRationName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">كود العليقة:</label>
              <input
                type="text"
                value={rationCode}
                onChange={(e) => setRationCode(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد وتطبيق العليقة الذكية</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
