export interface CurrencyOption {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  symbolAr: string;
  symbolEn: string;
}

export const ALL_CURRENCIES: CurrencyOption[] = [
  // Arab & Regional Currencies (الدول العربية والإقليمية)
  { code: 'EGP', symbol: 'ج.م', symbolAr: 'ج.م', symbolEn: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'SAR', symbol: 'ر.س', symbolAr: 'ر.س', symbolEn: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', symbol: 'د.إ', symbolAr: 'د.إ', symbolEn: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', symbol: 'د.ك', symbolAr: 'د.ك', symbolEn: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'QAR', symbol: 'ر.ق', symbolAr: 'ر.ق', symbolEn: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'BHD', symbol: 'د.ب', symbolAr: 'د.ب', symbolEn: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OMR', symbol: 'ر.ع', symbolAr: 'ر.ع', symbolEn: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial', flag: '🇴🇲' },
  { code: 'JOD', symbol: 'د.أ', symbolAr: 'د.أ', symbolEn: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'IQD', symbol: 'د.ع', symbolAr: 'د.ع', symbolEn: 'IQD', nameAr: 'دينار عراقي', nameEn: 'Iraqi Dinar', flag: '🇮🇶' },
  { code: 'LYD', symbol: 'د.ل', symbolAr: 'د.ل', symbolEn: 'LYD', nameAr: 'دينار ليبي', nameEn: 'Libyan Dinar', flag: '🇱🇾' },
  { code: 'DZD', symbol: 'د.ج', symbolAr: 'د.ج', symbolEn: 'DZD', nameAr: 'دينار جزائري', nameEn: 'Algerian Dinar', flag: '🇩🇿' },
  { code: 'MAD', symbol: 'د.م.', symbolAr: 'د.م.', symbolEn: 'MAD', nameAr: 'درهم مغربي', nameEn: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'TND', symbol: 'د.ت', symbolAr: 'د.ت', symbolEn: 'TND', nameAr: 'دينار تونسي', nameEn: 'Tunisian Dinar', flag: '🇹🇳' },
  { code: 'SDG', symbol: 'ج.س', symbolAr: 'ج.س', symbolEn: 'SDG', nameAr: 'جنيه سوداني', nameEn: 'Sudanese Pound', flag: '🇸🇩' },
  { code: 'YER', symbol: 'ر.ي', symbolAr: 'ر.ي', symbolEn: 'YER', nameAr: 'ريال يمني', nameEn: 'Yemeni Rial', flag: '🇾🇪' },
  { code: 'LBP', symbol: 'ل.ل', symbolAr: 'ل.ل', symbolEn: 'LBP', nameAr: 'ليرة لبنانية', nameEn: 'Lebanese Pound', flag: '🇱🇧' },
  { code: 'SYP', symbol: 'ل.س', symbolAr: 'ل.س', symbolEn: 'SYP', nameAr: 'ليرة سورية', nameEn: 'Syrian Pound', flag: '🇸🇾' },
  { code: 'ILS', symbol: '₪', symbolAr: 'شيكل', symbolEn: 'ILS', nameAr: 'شيكل (فلسطين)', nameEn: 'Shekel', flag: '🇵🇸' },
  { code: 'MRU', symbol: 'أ.م', symbolAr: 'أ.م', symbolEn: 'MRU', nameAr: 'أوقية موريتانية', nameEn: 'Mauritanian Ouguiya', flag: '🇲🇷' },
  { code: 'SOS', symbol: 'ش.ص', symbolAr: 'ش.ص', symbolEn: 'SOS', nameAr: 'شلن صومالي', nameEn: 'Somali Shilling', flag: '🇸🇴' },
  { code: 'DJF', symbol: 'ف.ج', symbolAr: 'ف.ج', symbolEn: 'DJF', nameAr: 'فرنك جيبوتي', nameEn: 'Djiboutian Franc', flag: '🇩🇯' },

  // Major Global Currencies (العملات الدولية والعالمية الكبرى)
  { code: 'USD', symbol: '$', symbolAr: '$', symbolEn: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', symbolAr: '€', symbolEn: '€', nameAr: 'يورو أوروبي', nameEn: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', symbolAr: '£', symbolEn: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'C$', symbolAr: 'C$', symbolEn: 'C$', nameAr: 'دولار كندي', nameEn: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', symbolAr: 'A$', symbolEn: 'A$', nameAr: 'دولار أسترالي', nameEn: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'NZD', symbol: 'NZ$', symbolAr: 'NZ$', symbolEn: 'NZ$', nameAr: 'دولار نيوزيلندي', nameEn: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'CHF', symbol: 'CHF', symbolAr: 'CHF', symbolEn: 'CHF', nameAr: 'فرنك سويسري', nameEn: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'TRY', symbol: '₺', symbolAr: '₺', symbolEn: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'CNY', symbol: '¥', symbolAr: '¥', symbolEn: 'CNY', nameAr: 'يوان صيني', nameEn: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'JPY', symbol: '¥', symbolAr: '¥', symbolEn: 'JPY', nameAr: 'ين ياباني', nameEn: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'INR', symbol: '₹', symbolAr: '₹', symbolEn: 'INR', nameAr: 'روبية هندية', nameEn: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', symbol: '₨', symbolAr: '₨', symbolEn: 'PKR', nameAr: 'روبية باكستانية', nameEn: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', symbolAr: '৳', symbolEn: 'BDT', nameAr: 'تاكا بنغلاديشية', nameEn: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'BRL', symbol: 'R$', symbolAr: 'R$', symbolEn: 'BRL', nameAr: 'ريال برازيلي', nameEn: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'RUB', symbol: '₽', symbolAr: '₽', symbolEn: 'RUB', nameAr: 'روبل روسي', nameEn: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'ZAR', symbol: 'R', symbolAr: 'R', symbolEn: 'ZAR', nameAr: 'راند جنوب أفريقي', nameEn: 'South African Rand', flag: '🇿🇦' },
  { code: 'MXN', symbol: 'Mex$', symbolAr: 'Mex$', symbolEn: 'MXN', nameAr: 'بيزو مكسيكي', nameEn: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'IDR', symbol: 'Rp', symbolAr: 'Rp', symbolEn: 'IDR', nameAr: 'روبية إندونيسية', nameEn: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM', symbolAr: 'RM', symbolEn: 'MYR', nameAr: 'رينغيت ماليزي', nameEn: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'SGD', symbol: 'S$', symbolAr: 'S$', symbolEn: 'SGD', nameAr: 'دولار سنغافوري', nameEn: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'SEK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'SEK', nameAr: 'كرونة سويدية', nameEn: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'NOK', nameAr: 'كرونة نرويجية', nameEn: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'DKK', nameAr: 'كرونة دنماركية', nameEn: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł', symbolAr: 'zł', symbolEn: 'PLN', nameAr: 'زلوتي بولندي', nameEn: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'NGN', symbol: '₦', symbolAr: '₦', symbolEn: 'NGN', nameAr: 'نايرا نيجيرية', nameEn: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh', symbolAr: 'KSh', symbolEn: 'KES', nameAr: 'شلن كيني', nameEn: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'GHS', symbol: 'GH₵', symbolAr: 'GH₵', symbolEn: 'GHS', nameAr: 'سيدي غاني', nameEn: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'ARS', symbol: 'AR$', symbolAr: 'AR$', symbolEn: 'ARS', nameAr: 'بيزو أرجنتيني', nameEn: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'COP', symbol: 'COL$', symbolAr: 'COL$', symbolEn: 'COP', nameAr: 'بيزو كولومبي', nameEn: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'CLP', symbol: 'CLP$', symbolAr: 'CLP$', symbolEn: 'CLP', nameAr: 'بيزو تشيلي', nameEn: 'Chilean Peso', flag: '🇨🇱' },
];

export const POPULAR_CURRENCIES = ['EGP', 'SAR', 'AED', 'USD', 'EUR', 'KWD'];

/**
 * Finds a matching currency object by code or symbol or text.
 */
export function findCurrency(currencyText: string): CurrencyOption | undefined {
  if (!currencyText) return undefined;
  const clean = currencyText.trim().toLowerCase();
  return ALL_CURRENCIES.find(
    (c) =>
      c.code.toLowerCase() === clean ||
      c.symbol.toLowerCase() === clean ||
      c.symbolAr.toLowerCase() === clean ||
      c.symbolEn.toLowerCase() === clean ||
      c.nameAr.toLowerCase() === clean ||
      c.nameEn.toLowerCase() === clean
  );
}

/**
 * Formats a currency label for display based on the active language.
 */
export function formatCurrencyLabel(c: CurrencyOption, lang: 'ar' | 'en' = 'ar'): string {
  if (lang === 'en') {
    return `${c.flag} ${c.code} - ${c.nameEn} (${c.symbolEn})`;
  }
  return `${c.flag} ${c.nameAr} (${c.symbolAr} / ${c.code})`;
}
