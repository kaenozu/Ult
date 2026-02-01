/**
 * Tokyo Stock Exchange (TSE) Market Hours Utility
 * 
 * Handles market open/close status for Japanese stock market
 * Trading hours: 9:00-11:30, 12:30-15:00 JST
 * Closed: Weekends and Japanese national holidays
 */

/**
 * Japanese national holidays for 2025-2026
 * Source: https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html
 */
const JAPANESE_HOLIDAYS_2025_2026: Record<string, string> = {
  // 2025
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-02-24': '振替休日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-05-06': '振替休日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': '体育の日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',
  '2025-12-31': '年末休場',
  // 2026
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '振替休日',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-22': '国民の休日',
  '2026-09-23': '秋分の日',
  '2026-10-12': '体育の日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
  '2026-12-31': '年末休場',
};

/**
 * Special market closures (year-end holidays)
 */
const YEAR_END_HOLIDAYS = [
  '12-31', // December 31
  '01-01', // January 1
  '01-02', // January 2 
  '01-03', // January 3
];

export interface MarketStatus {
  isOpen: boolean;
  reason?: string;
  nextOpenTime?: Date;
  lastCloseTime?: Date;
  tradingSession?: 'morning' | 'afternoon' | 'closed';
}

/**
 * Convert current time to Japan Standard Time (JST)
 * JST is UTC+9 (no daylight saving time)
 * 
 * @param date - Date object (can be in any timezone)
 * @returns Date object representing the same moment in JST
 */
function toJST(date: Date = new Date()): Date {
  // Create a new date with the UTC time components set to JST
  // This ensures we're working with the correct time regardless of local system timezone
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();
  const utcMilliseconds = date.getUTCMilliseconds();
  
  // JST is UTC+9, so add 9 hours to UTC time
  const jstDate = new Date(Date.UTC(utcYear, utcMonth, utcDate, utcHours + 9, utcMinutes, utcSeconds, utcMilliseconds));
  
  return jstDate;
}

/**
 * Check if a date is a weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is a Japanese national holiday
 */
function isJapaneseHoliday(date: Date): boolean {
  // Format as YYYY-MM-DD using UTC methods
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return dateStr in JAPANESE_HOLIDAYS_2025_2026;
}

/**
 * Check if date is a year-end holiday
 */
function isYearEndHoliday(date: Date): boolean {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const monthDay = `${month}-${day}`;
  return YEAR_END_HOLIDAYS.includes(monthDay);
}

/**
 * Get the name of the holiday if applicable
 */
function getHolidayName(date: Date): string | undefined {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return JAPANESE_HOLIDAYS_2025_2026[dateStr];
}

/**
 * Calculate next market open time
 */
function getNextOpenTime(currentJST: Date): Date {
  const nextOpen = new Date(currentJST);
  
  // If currently during lunch break (11:30-12:30), return 12:30 today
  const hours = currentJST.getUTCHours();
  const minutes = currentJST.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const lunchStart = 11 * 60 + 30; // 11:30
  const lunchEnd = 12 * 60 + 30; // 12:30
  
  if (timeInMinutes >= lunchStart && timeInMinutes < lunchEnd) {
    nextOpen.setUTCHours(12, 30, 0, 0);
    return nextOpen;
  }
  
  // If after market close (after 15:00), move to next day
  if (timeInMinutes >= 15 * 60) {
    nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
  }
  
  // Find the next business day
  while (isWeekend(nextOpen) || isJapaneseHoliday(nextOpen) || isYearEndHoliday(nextOpen)) {
    nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
  }
  
  // Set to market open time (9:00 AM)
  nextOpen.setUTCHours(9, 0, 0, 0);
  
  return nextOpen;
}

/**
 * Calculate last market close time
 */
function getLastCloseTime(currentJST: Date): Date {
  const lastClose = new Date(currentJST);
  
  // If before market open today (before 9:00), use previous day
  const hours = currentJST.getUTCHours();
  const minutes = currentJST.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes < 9 * 60) {
    lastClose.setUTCDate(lastClose.getUTCDate() - 1);
  }
  
  // Find the previous business day
  while (isWeekend(lastClose) || isJapaneseHoliday(lastClose) || isYearEndHoliday(lastClose)) {
    lastClose.setUTCDate(lastClose.getUTCDate() - 1);
  }
  
  // Set to market close time (3:00 PM)
  lastClose.setUTCHours(15, 0, 0, 0);
  
  return lastClose;
}

/**
 * Check if Tokyo Stock Exchange is currently open
 * 
 * Trading hours:
 * - Morning session: 9:00-11:30 JST
 * - Lunch break: 11:30-12:30 JST
 * - Afternoon session: 12:30-15:00 JST
 * 
 * Closed on:
 * - Weekends (Saturday, Sunday)
 * - Japanese national holidays
 * - Year-end holidays (Dec 31 - Jan 3)
 */
export function isTSEOpen(date: Date = new Date()): MarketStatus {
  const jstTime = toJST(date);
  
  // Check if it's a weekend
  if (isWeekend(jstTime)) {
    return {
      isOpen: false,
      reason: '週末のため休場',
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
      tradingSession: 'closed',
    };
  }
  
  // Check if it's a holiday
  const holidayName = getHolidayName(jstTime);
  if (holidayName) {
    return {
      isOpen: false,
      reason: `${holidayName}のため休場`,
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
      tradingSession: 'closed',
    };
  }
  
  // Check if it's a year-end holiday
  if (isYearEndHoliday(jstTime)) {
    return {
      isOpen: false,
      reason: '年末年始休場',
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
      tradingSession: 'closed',
    };
  }
  
  // Check trading hours
  const hours = jstTime.getUTCHours();
  const minutes = jstTime.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours in minutes
  const morningOpen = 9 * 60; // 9:00
  const morningClose = 11 * 60 + 30; // 11:30
  const afternoonOpen = 12 * 60 + 30; // 12:30
  const afternoonClose = 15 * 60; // 15:00
  
  // Morning session
  if (timeInMinutes >= morningOpen && timeInMinutes < morningClose) {
    return {
      isOpen: true,
      tradingSession: 'morning',
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
    };
  }
  
  // Lunch break
  if (timeInMinutes >= morningClose && timeInMinutes < afternoonOpen) {
    return {
      isOpen: false,
      reason: '昼休み（11:30-12:30）',
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
      tradingSession: 'closed',
    };
  }
  
  // Afternoon session
  if (timeInMinutes >= afternoonOpen && timeInMinutes < afternoonClose) {
    return {
      isOpen: true,
      tradingSession: 'afternoon',
      nextOpenTime: getNextOpenTime(jstTime),
      lastCloseTime: getLastCloseTime(jstTime),
    };
  }
  
  // Outside trading hours
  return {
    isOpen: false,
    reason: timeInMinutes < morningOpen ? '取引開始前' : '取引終了後',
    nextOpenTime: getNextOpenTime(jstTime),
    lastCloseTime: getLastCloseTime(jstTime),
    tradingSession: 'closed',
  };
}

/**
 * Get human-readable market status message
 */
export function getMarketStatusMessage(status: MarketStatus): string {
  if (status.isOpen) {
    const session = status.tradingSession === 'morning' ? '前場' : '後場';
    return `取引中（${session}）`;
  }
  return status.reason || '休場';
}

/**
 * Format next open time for display
 */
export function formatNextOpenTime(date: Date): string {
  const jstDate = toJST(date);
  const now = toJST();
  
  // Compare dates at day level to avoid DST issues
  const jstDateOnly = new Date(jstDate.getUTCFullYear(), jstDate.getUTCMonth(), jstDate.getUTCDate());
  const nowDateOnly = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  
  const dayDiff = Math.floor((jstDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dayDiff === 0) {
    return `本日 ${jstDate.getUTCHours()}:${String(jstDate.getUTCMinutes()).padStart(2, '0')}`;
  } else if (dayDiff === 1) {
    return `明日 ${jstDate.getUTCHours()}:${String(jstDate.getUTCMinutes()).padStart(2, '0')}`;
  } else {
    const month = jstDate.getUTCMonth() + 1;
    const day = jstDate.getUTCDate();
    return `${month}月${day}日 ${jstDate.getUTCHours()}:${String(jstDate.getUTCMinutes()).padStart(2, '0')}`;
  }
}
