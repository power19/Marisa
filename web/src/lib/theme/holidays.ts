export type HolidayThemeId =
  | 'new_year'
  | 'valentines'
  | 'holi'
  | 'easter'
  | 'keti_koti'
  | 'eid'
  | 'diwali'
  | 'independence'
  | 'christmas'

export interface HolidayTheme {
  id: HolidayThemeId
  /** CSS custom property value for --color-accent */
  accent: string
  /** CSS custom property value for --color-accent-hover */
  accentHover: string
  /** Optional hero overlay class (applied to hero section) */
  heroClass: string
  /** Whether to enable CSS decoration animation */
  decoration: boolean
  /** Name of the decoration animation (matches CSS class) */
  decorationClass?: string
}

const THEMES: Record<HolidayThemeId, HolidayTheme> = {
  new_year: {
    id: 'new_year',
    accent: '#C9A84C',
    accentHover: '#A8893E',
    heroClass: 'theme-hero-new-year',
    decoration: true,
    decorationClass: 'decoration-confetti',
  },
  valentines: {
    id: 'valentines',
    accent: '#C0394B',
    accentHover: '#9C2D3C',
    heroClass: 'theme-hero-valentines',
    decoration: false,
  },
  holi: {
    id: 'holi',
    accent: '#E84393',
    accentHover: '#C2326F',
    heroClass: 'theme-hero-holi',
    decoration: true,
    decorationClass: 'decoration-powder',
  },
  easter: {
    id: 'easter',
    accent: '#7BAE7F',
    accentHover: '#5E8E62',
    heroClass: 'theme-hero-easter',
    decoration: false,
  },
  keti_koti: {
    id: 'keti_koti',
    accent: '#C9A84C',
    accentHover: '#A8893E',
    heroClass: 'theme-hero-keti-koti',
    decoration: false,
  },
  eid: {
    id: 'eid',
    accent: '#2D6A4F',
    accentHover: '#1B4332',
    heroClass: 'theme-hero-eid',
    decoration: false,
  },
  diwali: {
    id: 'diwali',
    accent: '#E07B39',
    accentHover: '#B85E20',
    heroClass: 'theme-hero-diwali',
    decoration: true,
    decorationClass: 'decoration-sparkle',
  },
  independence: {
    id: 'independence',
    accent: '#C9A84C',
    accentHover: '#A8893E',
    heroClass: 'theme-hero-independence',
    decoration: false,
  },
  christmas: {
    id: 'christmas',
    accent: '#2D6A2D',
    accentHover: '#1B4A1B',
    heroClass: 'theme-hero-christmas',
    decoration: true,
    decorationClass: 'decoration-snow',
  },
}

interface DateRange {
  /** Inclusive start: [month (1-based), day] */
  start: [number, number]
  /** Inclusive end: [month (1-based), day] */
  end: [number, number]
  themeId: HolidayThemeId
}

/**
 * Fixed-date windows. Lunar/moveable holidays (Holi, Easter, Eid, Diwali) are
 * approximated by year below in getMovableWindows().
 */
const FIXED_WINDOWS: DateRange[] = [
  // New Year: Dec 28 – Jan 2 (spans year boundary — handled specially)
  { start: [12, 28], end: [12, 31], themeId: 'new_year' },
  { start: [1, 1],   end: [1, 2],   themeId: 'new_year' },
  // Valentine's Day: Feb 10–14
  { start: [2, 10],  end: [2, 14],  themeId: 'valentines' },
  // Keti Koti: Jul 1
  { start: [7, 1],   end: [7, 1],   themeId: 'keti_koti' },
  // Independence Day: Nov 25
  { start: [11, 25], end: [11, 25], themeId: 'independence' },
  // Christmas: Dec 15–26
  { start: [12, 15], end: [12, 26], themeId: 'christmas' },
]

/**
 * Moveable holiday anchor dates by year. Add future years as needed.
 * Each entry is the center date; the window is ±1 day (3-day window) unless noted.
 */
const MOVEABLE_ANCHORS: Record<number, { holi?: [number, number]; easter?: [number, number]; eid?: [number, number]; diwali?: [number, number] }> = {
  2024: { holi: [3, 25], easter: [3, 31], eid: [4, 10], diwali: [11, 1] },
  2025: { holi: [3, 14], easter: [4, 20], eid: [3, 30], diwali: [10, 20] },
  2026: { holi: [3, 3],  easter: [4, 5],  eid: [3, 20], diwali: [11, 8] },
  2027: { holi: [3, 22], easter: [3, 28], eid: [3, 9],  diwali: [10, 29] },
  2028: { holi: [3, 11], easter: [4, 16], eid: [2, 26], diwali: [10, 17] },
}

function addDays(month: number, day: number, days: number): [number, number] {
  const d = new Date(2000, month - 1, day + days)
  return [d.getMonth() + 1, d.getDate()]
}

function getMovableWindows(year: number): DateRange[] {
  const anchors = MOVEABLE_ANCHORS[year]
  if (!anchors) return []
  const windows: DateRange[] = []
  if (anchors.holi) {
    windows.push({ start: addDays(...anchors.holi, -1), end: addDays(...anchors.holi, 1), themeId: 'holi' })
  }
  if (anchors.easter) {
    // Good Friday (–2) through Easter Monday (+1)
    windows.push({ start: addDays(...anchors.easter, -2), end: addDays(...anchors.easter, 1), themeId: 'easter' })
  }
  if (anchors.eid) {
    windows.push({ start: addDays(...anchors.eid, -1), end: addDays(...anchors.eid, 1), themeId: 'eid' })
  }
  if (anchors.diwali) {
    windows.push({ start: addDays(...anchors.diwali, -1), end: addDays(...anchors.diwali, 1), themeId: 'diwali' })
  }
  return windows
}

function inRange(month: number, day: number, range: DateRange): boolean {
  const md = month * 100 + day
  const start = range.start[0] * 100 + range.start[1]
  const end = range.end[0] * 100 + range.end[1]
  return md >= start && md <= end
}

/**
 * Returns the active HolidayTheme for the given date, or null if no theme applies.
 * Checks fixed windows first, then moveable holidays for the given year.
 */
export function getActiveTheme(date: Date = new Date()): HolidayTheme | null {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear()

  for (const w of FIXED_WINDOWS) {
    if (inRange(month, day, w)) return THEMES[w.themeId]
  }
  for (const w of getMovableWindows(year)) {
    if (inRange(month, day, w)) return THEMES[w.themeId]
  }
  return null
}

export { THEMES }
