import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  Award,
  ShieldCheck,
  Sparkles,
  Code2,
  Upload,
  Cpu,
  BookmarkCheck,
  Layers,
  FileCheck,
  QrCode,
  Share2,
} from 'lucide-react';
import defaultAvatarImg from '../../assets/images/hazem_amer_avatar_1790149376767.jpg';

export const DeveloperContactView: React.FC = () => {
  const { language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    return localStorage.getItem('hazem_amer_avatar_image') || defaultAvatarImg;
  });

  const developerInfo = {
    name: isEn ? 'Eng. Hazem Amer' : 'المهندس حازم عامر',
    englishName: 'Eng. Hazem Amer',
    title: isEn
      ? 'Lead Software Engineer & Solutions Architect'
      : 'مهندس ومطور النظام (Lead Software Engineer & Solutions Architect)',
    specialty: isEn
      ? 'Specialized in building livestock feed management systems, TMR automation & dairy operations'
      : 'متخصص في بناء وتطوير أنظمة إدارة وتغذية مزارع الألبان والتسمين وميكنة المكاسر',
    phone: '00201050787825',
    phoneFormatted: '+20 105 078 7825',
    email: 'hazamer22@gmail.com',
    linkedinUrl: 'https://www.linkedin.com/in/hazem-amer-874335265',
    facebookUrl: 'https://www.facebook.com/share/19nsTqq3D5/',
    telegramUrl: 'https://t.me/+201050787825',
    whatsappUrl: `https://wa.me/201050787825?text=${encodeURIComponent(
      isEn
        ? 'Hello Eng. Hazem, I am contacting you regarding the Smart Cattle Feeding & TMR Management System'
        : 'مرحباً مهندس حازم، أتواصل معك بخصوص نظام إدارة التغذية والمكاسر الذكي'
    )}`,
    version: 'v1.2.0 Pro Enterprise',
    releaseYear: '2026',
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  const handleCopyAll = () => {
    const fullSummary = isEn
      ? `Developer & System Architect Contact Card:
Name: ${developerInfo.englishName}
Role: ${developerInfo.title}
Specialty: ${developerInfo.specialty}
Phone / WhatsApp: ${developerInfo.phone}
Email: ${developerInfo.email}
LinkedIn: ${developerInfo.linkedinUrl}
Facebook: ${developerInfo.facebookUrl}
Telegram: ${developerInfo.telegramUrl}
All Rights Reserved © ${developerInfo.releaseYear}`
      : `بطاقة التواصل ومطور النظام:
الاسم: ${developerInfo.name} (${developerInfo.englishName})
الصفة: ${developerInfo.title}
التخصص: ${developerInfo.specialty}
الهاتف / واتساب: ${developerInfo.phone}
البريد الإلكتروني: ${developerInfo.email}
لينكد إن: ${developerInfo.linkedinUrl}
فيسبوك: ${developerInfo.facebookUrl}
تيليجرام: ${developerInfo.telegramUrl}
حقوق النظام: جميع الحقوق الفكرية والبرمجية محفوظة للمطور © ${developerInfo.releaseYear}`;
    handleCopy(fullSummary, 'all');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setAvatarSrc(result);
          try {
            localStorage.setItem('hazem_amer_avatar_image', result);
          } catch {
            // localStorage quota fallback
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/60 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar Profile Section */}
          <div className="relative group shrink-0 flex flex-col items-center">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden ring-4 ring-amber-400 shadow-2xl bg-slate-950 flex items-center justify-center">
              <img
                src={avatarSrc}
                alt={developerInfo.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div
              className={`absolute top-2 ${isRtl ? 'right-2' : 'left-2'} bg-amber-500 text-emerald-950 p-1.5 rounded-xl shadow-lg border-2 border-slate-900`}
              title={isEn ? 'Certified Developer' : 'مطور معتمد'}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>

            {/* Change Avatar Button */}
            <label
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/20 active:scale-95"
              title={isEn ? 'Change or upload avatar photo' : 'تغيير أو رفع الصورة الشخصية الأصلية من جهازك'}
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEn ? 'Change / Upload Photo' : 'تغيير / رفع الصورة'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Profile Details & Bio */}
          <div className={`flex-1 text-center ${isRtl ? 'md:text-right' : 'md:text-left'} space-y-3`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Official System Architect & Lead Developer' : 'مصمم ومبرمج النظام بالكامل (Official System Architect)'}</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {developerInfo.name}
              </h1>
              <p className="text-sm sm:text-base font-bold text-amber-300/90 mt-1">
                {developerInfo.englishName}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed font-medium max-w-3xl">
              {developerInfo.title} — {developerInfo.specialty}.
            </p>

            {/* Key Architectural Pillars */}
            <div className={`pt-2 flex flex-wrap items-center justify-center ${isRtl ? 'md:justify-start' : 'md:justify-start'} gap-2 text-xs font-bold text-emerald-300`}>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
                <Code2 className="w-3.5 h-3.5 text-amber-300" />
                {isEn ? 'Full-Stack Software Architecture' : 'هندسة برمجية متكاملة Full-Stack'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                {isEn ? 'Smart TMR & Ration Algorithms' : 'خوارزميات التغذية والـ TMR الذكية'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
                {isEn ? 'Warehouse & Daily Operations Engine' : 'إدارة المستودعات والتشغيل اليومي'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Intellectual Property & Authorship Certificate */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {isEn ? 'Intellectual Property & Authorship Certificate' : 'شهادة إثبات الملكية الفكرية وحقوق التطوير'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {isEn ? 'Official engineering and development documentation' : 'وثيقة التوثيق الهندسي والبرمجي للنظام'}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate Text Box */}
        <div className="bg-gradient-to-br from-slate-50 via-amber-50/20 to-emerald-50/30 p-5 sm:p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {isEn ? (
              <>
                This authenticated digital record certifies that the{' '}
                <strong className="text-emerald-950 font-black">
                  «Smart Cattle Feeding & TMR Mixer Management System»
                </strong>{' '}
                was engineered, architected, and programmed entirely from scratch by{' '}
                <strong className="text-slate-900 font-black">Eng. Hazem Amer</strong>.
              </>
            ) : (
              <>
                يُقر هذا السجل الرقمي الموثق بأن نظام{' '}
                <strong className="text-emerald-950 font-black">
                  «إدارة التغذية والمكاسر الذكي لمزارع الألبان والتسمين»
                </strong>{' '}
                تم تخطيطه وهيكلته وبرمجته بالكامل وبشكل أصيل من الصفر بواسطة{' '}
                <strong className="text-slate-900 font-black">المهندس حازم عامر</strong>.
              </>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-slate-700">
            <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>{isEn ? 'TMR Formulation Engine:' : 'محرك حسابات العلائق (TMR):'}</strong>{' '}
                {isEn
                  ? 'Precise weight calculations per head and per ton, with accurate Dry Matter (% DM) simulation.'
                  : 'خوارزميات الحسابات الوزنية لكل رأس ولكل طن، ومحاكاة نسب المادة الجافة (Dry Matter).'}
              </span>
            </div>

            <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>{isEn ? 'Load Scheduling & Routing:' : 'مزامنة وجدولة اللفات:'}</strong>{' '}
                {isEn
                  ? 'Automatic barn distribution engine matching mixer capacities with real loading weights.'
                  : 'محرك التوزيع التلقائي على العنابر مع مطابقة سعات المكسرات وأوزان التحميل الفعلية.'}
              </span>
            </div>

            <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>{isEn ? 'Smart Refusal Recycling:' : 'تدوير راجع الحلاب الذكي:'}</strong>{' '}
                {isEn
                  ? 'Advanced system for recycling milking cow refusals flexibly into targeted animal groups.'
                  : 'منظومة متطورة لإعادة تدوير راجع الحلاب وتوزيعه بمرونة على الفئات المستهدفة.'}
              </span>
            </div>

            <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>{isEn ? 'Warehouse & Premix Bagging:' : 'المستودع وخلاطة المركز:'}</strong>{' '}
                {isEn
                  ? 'Real-time inventory deduction with preparation sheets and premix bagging workflows.'
                  : 'سجل المخزن الحركي التلقائي مع أوامر تحضير وتعبئة شكاير المركز المسبق.'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-bold">
            <div>
              {isEn ? 'Author & Architect:' : 'الجهة المطورة:'}{' '}
              <span className="text-slate-800 font-black">Eng. Hazem Amer</span>
            </div>
            <div>{isEn ? 'All Rights Reserved © 2026' : 'جميع الحقوق البرمجية والفكرية محفوظة © 2026'}</div>
          </div>
        </div>
      </div>

      {/* Direct Contact & Support Methods */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-700" />
              <span>{isEn ? 'Direct Contact & Technical Support' : 'طرق وقنوات التواصل المباشر والدعم الفني'}</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {isEn
                ? 'For technical consultations, feature requests, or direct system support'
                : 'للاستشارات البرمجية، طلب ميزات إضافية، أو الدعم الفني المباشر'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95"
            title={isEn ? 'Copy full contact card to clipboard' : 'نسخ بطاقة التواصل كاملة في الحافظة'}
          >
            {copiedField === 'all' ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{isEn ? 'Card Copied!' : 'تم نسخ بطاقة التواصل!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-emerald-700" />
                <span>{isEn ? 'Copy Full Contact Card' : 'نسخ بطاقة العمل كاملة'}</span>
              </>
            )}
          </button>
        </div>

        {/* Primary Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp Direct Card */}
          <a
            href={developerInfo.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.596 2.679-.702c.97.53 1.761.821 2.781.821 3.182 0 5.768-2.587 5.769-5.766.001-3.182-2.585-5.768-5.769-5.768zm3.364 8.163c-.14.394-.712.723-1.002.766-.279.042-.644.076-1.848-.423-1.442-.598-2.368-2.073-2.439-2.168-.071-.096-.583-.775-.583-1.479s.369-1.05.5-1.192c.132-.142.287-.178.383-.178.096 0 .192.001.275.006.089.004.208-.034.325.247.122.293.417 1.018.454 1.092.036.074.06.161.012.257-.048.096-.073.155-.144.239-.072.083-.151.186-.216.25-.072.072-.148.15-.064.294.084.143.373.615.8 1.004.55.5 1.014.655 1.157.727.144.072.227.06.312-.036.084-.096.36-419.456-.563.096-.144.192-.12.324-.072.132.048.835.394.979.466.144.072.24.108.275.168.036.06.036.348-.104.742zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.436 5.176L2 22l4.981-1.396A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.17 8.17 0 0 1-4.218-1.168l-.302-.18-2.966.83.844-2.887-.197-.315A8.155 8.155 0 0 1 3.8 12c0-4.522 3.678-8.2 8.2-8.2 4.522 0 8.2 3.678 8.2 8.2 0 4.522-3.678 8.2-8.2 8.2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>{isEn ? 'Direct WhatsApp Chat' : 'محادثة واتساب مباشرة (WhatsApp)'}</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded font-black">
                    {isEn ? 'Online' : 'مباشر'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5" dir="ltr">
                  {developerInfo.phoneFormatted}
                </div>
              </div>
            </div>
            <ExternalLink className={`w-5 h-5 text-emerald-600 group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'} transition-transform`} />
          </a>

          {/* Direct Phone Call Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md shrink-0">
                <Phone className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">{isEn ? 'Direct Phone Call' : 'الهاتف والاتصال المباشر'}</div>
                <a
                  href={`tel:${developerInfo.phone}`}
                  className="text-xs font-extrabold text-emerald-800 hover:underline mt-0.5 block"
                  dir="ltr"
                >
                  {developerInfo.phoneFormatted}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(developerInfo.phone, 'phone')}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title={isEn ? 'Copy Phone Number' : 'نسخ رقم الهاتف'}
            >
              {copiedField === 'phone' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Email Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">{isEn ? 'Direct Email' : 'البريد الإلكتروني المباشر'}</div>
                <a
                  href={`mailto:${developerInfo.email}`}
                  className="text-xs font-extrabold text-slate-700 hover:text-amber-800 hover:underline mt-0.5 truncate block"
                  dir="ltr"
                >
                  {developerInfo.email}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(developerInfo.email, 'email')}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title={isEn ? 'Copy Email Address' : 'نسخ البريد الإلكتروني'}
            >
              {copiedField === 'email' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Telegram Card */}
          <a
            href={developerInfo.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-4 rounded-2xl bg-sky-50/80 hover:bg-sky-100 border border-sky-200 hover:border-sky-300 transition-all shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#229ed9] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">{isEn ? 'Telegram' : 'تيليجرام (Telegram)'}</div>
                <div className="text-xs font-bold text-slate-600 mt-0.5" dir="ltr">
                  {developerInfo.phoneFormatted}
                </div>
              </div>
            </div>
            <ExternalLink className={`w-5 h-5 text-sky-600 group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'} transition-transform`} />
          </a>
        </div>

        {/* Social Profiles: LinkedIn & Facebook */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* LinkedIn Button */}
          <a
            href={developerInfo.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0a66c2]/10 hover:bg-[#0a66c2]/20 border border-[#0a66c2]/30 text-[#0a66c2] transition-all font-bold text-xs shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span>{isEn ? 'Professional Profile on LinkedIn' : 'الملف المهني على LinkedIn'}</span>
            </div>
            <ExternalLink className={`w-4 h-4 text-[#0a66c2] group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'} transition-transform`} />
          </a>

          {/* Facebook Button */}
          <a
            href={developerInfo.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1877f2]/10 hover:bg-[#1877f2]/20 border border-[#1877f2]/30 text-[#1877f2] transition-all font-bold text-xs shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>{isEn ? 'Personal Page on Facebook' : 'الصفحة الشخصية على Facebook'}</span>
            </div>
            <ExternalLink className={`w-4 h-4 text-[#1877f2] group-hover:${isRtl ? '-translate-x-1' : 'translate-x-1'} transition-transform`} />
          </a>
        </div>
      </div>
    </div>
  );
};
