/**
 * Calendar month labels (short) in order. Index 0 = January … 11 = December.
 */
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export type MonthLabel = (typeof MONTH_LABELS)[number]

export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/** Default budget year (align with sidebar “2026”). */
export const DEFAULT_BUDGET_YEAR = 2026

/** Active budget year on the calendar (does not go below launch year). */
export function getLiveBudgetYear(now: Date = new Date()): number {
  return Math.max(DEFAULT_BUDGET_YEAR, now.getFullYear())
}

/** Past budget years available as read-only archives (before the live year). */
export function getArchivedBudgetYears(liveYear: number): number[] {
  const years: number[] = []
  for (let y = DEFAULT_BUDGET_YEAR; y < liveYear; y++) {
    years.push(y)
  }
  return years
}

/**
 * Phase of a month cell relative to “today” and the budget year.
 * - live: calendar month matches selected budget year and is the current month
 * - archived: month is in the past (closed)
 * - future: month is ahead (planning / not yet active)
 */
export type MonthPhase = "live" | "archived" | "future"

export type MonthStripFlags = {
  isLive: boolean
  isArchived: boolean
  isFuture: boolean
}

/** Snapshot layout mode for the selected month (Pulse vs rollover vs planning). */
export type SnapshotView = "current" | "past" | "future"

export type MonthStateOptions = {
  budgetYear?: number
  now?: Date
}

function clampMonthIndex(n: number): MonthIndex {
  const i = Math.max(0, Math.min(11, Math.floor(n)))
  return i as MonthIndex
}

export function monthIndexFromLabel(label: string): MonthIndex | null {
  const i = MONTH_LABELS.indexOf(label as MonthLabel)
  return i === -1 ? null : (i as MonthIndex)
}

export function labelFromMonthIndex(index: number): MonthLabel {
  return MONTH_LABELS[clampMonthIndex(index)]
}

/** 3-letter month chip: first letter uppercase, next two lowercase (e.g. `Apr`). */
export function formatMonthAbbrevDisplay(label: string): string {
  const s = label.trim().slice(0, 3)
  if (s.length === 0) return label
  return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase()
}

/** Full English month name for titles (e.g. "March Roadmap"). */
const MONTH_LONG_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export function monthLongNameFromIndex(monthIndex: number): string {
  return MONTH_LONG_NAMES[clampMonthIndex(monthIndex)] ?? "January"
}

export function monthLongNameFromLabel(label: MonthLabel): string {
  const i = monthIndexFromLabel(label)
  return i === null ? "January" : monthLongNameFromIndex(i)
}

/** Long name of the calendar month after `label` (Dec → January). */
export function nextMonthLongNameFromLabel(label: MonthLabel): string {
  const i = monthIndexFromLabel(label)
  const base = i === null ? 0 : i
  return monthLongNameFromIndex((base + 1) % 12)
}

export function getCalendarMonthIndex(now: Date = new Date()): MonthIndex {
  return clampMonthIndex(now.getMonth())
}

/**
 * Per-month flags for styling the strip (archived / live / future).
 */
export function getMonthStripFlags(
  monthIndex: number,
  options: MonthStateOptions = {}
): MonthStripFlags {
  const budgetYear = options.budgetYear ?? DEFAULT_BUDGET_YEAR
  const now = options.now ?? new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (y < budgetYear) {
    return { isLive: false, isArchived: false, isFuture: true }
  }
  if (y > budgetYear) {
    return { isLive: false, isArchived: true, isFuture: false }
  }
  if (monthIndex < m) {
    return { isLive: false, isArchived: true, isFuture: false }
  }
  if (monthIndex > m) {
    return { isLive: false, isArchived: false, isFuture: true }
  }
  return { isLive: true, isArchived: false, isFuture: false }
}

export function phaseFromFlags(flags: MonthStripFlags): MonthPhase {
  if (flags.isLive) return "live"
  if (flags.isArchived) return "archived"
  return "future"
}

/**
 * Which Snapshot view to show for the **selected** month.
 */
export function getSnapshotViewForMonth(
  monthIndex: number,
  options: MonthStateOptions = {}
): SnapshotView {
  const flags = getMonthStripFlags(monthIndex, options)
  if (flags.isLive) return "current"
  if (flags.isArchived) return "past"
  return "future"
}

export function formatMonthStripTooltip(
  flags: MonthStripFlags,
  isSelected: boolean
): string {
  const parts: string[] = []
  if (flags.isLive) parts.push("Current month (live)")
  else if (flags.isArchived) parts.push("Archived")
  else if (flags.isFuture) parts.push("Future — planning")
  if (isSelected) parts.push("Viewing")
  return parts.join(" · ")
}

export function getDefaultSelectedMonthLabel(
  options: MonthStateOptions = {}
): MonthLabel {
  const now = options.now ?? new Date()
  const budgetYear = options.budgetYear ?? DEFAULT_BUDGET_YEAR
  if (now.getFullYear() !== budgetYear) {
    return now.getFullYear() < budgetYear ? "Jan" : "Dec"
  }
  return labelFromMonthIndex(now.getMonth())
}
