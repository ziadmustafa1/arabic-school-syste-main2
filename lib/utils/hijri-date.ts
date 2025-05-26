import moment from 'moment-hijri';

/**
 * Convert Gregorian date to Hijri date
 * @param date Gregorian date (Date object or string)
 * @returns Formatted Hijri date string
 */
export function toHijri(date: Date | string): string {
  const momentDate = moment(date);
  return momentDate.format('iYYYY/iMM/iDD'); // Format: YYYY/MM/DD in Hijri
}

/**
 * Get current Hijri date
 * @returns Formatted current Hijri date string
 */
export function getCurrentHijriDate(): string {
  return moment().format('iYYYY/iMM/iDD');
}

/**
 * Convert Gregorian date to Hijri date with day name
 * @param date Gregorian date
 * @returns Formatted Hijri date with day name in Arabic
 */
export function toHijriWithDayName(date: Date | string): string {
  const momentDate = moment(date);
  return momentDate.format('dddd iD iMMMM iYYYY'); // Format: Day DD Month YYYY in Hijri with Arabic names
}

/**
 * Get Hijri year from Gregorian date
 * @param date Gregorian date
 * @returns Hijri year
 */
export function getHijriYear(date: Date | string): number {
  const momentDate = moment(date);
  return momentDate.iYear();
}

/**
 * Get Hijri month from Gregorian date
 * @param date Gregorian date
 * @returns Hijri month (1-12)
 */
export function getHijriMonth(date: Date | string): number {
  const momentDate = moment(date);
  return momentDate.iMonth() + 1; // month is 0-indexed
}

/**
 * Convert Hijri date to Gregorian date
 * @param year Hijri year
 * @param month Hijri month (1-12)
 * @param day Hijri day
 * @returns Gregorian date
 */
export function fromHijri(year: number, month: number, day: number): Date {
  const momentDate = moment().iYear(year).iMonth(month - 1).iDate(day);
  return momentDate.toDate();
}

/**
 * Format Hijri date in friendly readable format
 * @param date Gregorian date to convert
 * @returns Formatted Hijri date
 */
export function formatHijriDate(date: Date | string | null | undefined): string {
  if (!date) {
    return '';
  }

  const hijriMonths = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];
  
  const momentDate = moment(date);
  const day = momentDate.iDate();
  const month = momentDate.iMonth();
  const year = momentDate.iYear();
  
  return `${day} ${hijriMonths[month]} ${year}هـ`;
} 