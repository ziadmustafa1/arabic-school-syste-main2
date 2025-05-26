declare module 'moment-hijri' {
  import moment from 'moment';
  
  export interface MomentHijri extends moment.Moment {
    iYear(): number;
    iYear(y: number): this;
    iMonth(): number;
    iMonth(m: number): this;
    iDate(): number;
    iDate(d: number): this;
    iDayOfYear(): number;
    iDayOfYear(d: number): this;
    iDaysInMonth(): number;
    iWeek(): number;
    iWeek(w: number): this;
    iWeekYear(): number;
    iWeekYear(y: number): this;
    iWeekday(): number;
    iWeekday(d: number): this;
    iFormat(format: string): string;
    add(amount: number, unit: moment.unitOfTime.DurationConstructor): this;
    subtract(amount: number, unit: moment.unitOfTime.DurationConstructor): this;
  }

  function hijri(inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean): MomentHijri;
  
  namespace hijri {
    function locale(locale: string): string;
    function locale(locales: string[]): string;
    
    function defineLocale(locale: string, values: moment.LocaleSpecification): moment.Locale;
    function updateLocale(locale: string, values: moment.LocaleSpecification): moment.Locale;
    
    function iDaysInMonth(year: number, month: number): number;
    function toHijri(m: moment.Moment | Date): MomentHijri;
    function fromHijri(year: number, month: number, date: number): moment.Moment;
  }
  
  export default hijri;
} 