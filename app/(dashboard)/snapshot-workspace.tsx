"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CirclePlus,
  CreditCard,
  HelpCircle,
  Info,
  List,
  Lock,
  Maximize2,
  FileText,
  Receipt,
  RefreshCw,
  X,
  Zap,
} from "lucide-react"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { CATEGORY_GLYPH } from "@/components/roadmap-categories-grid"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import { DottedLeaderRow } from "@/components/dotted-leader-row"
import { SettleUpModal } from "@/components/settle-up-modal"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import type { ExpectedIncomeLine } from "@/lib/timeline-roadmap-data"
import {
  getSnapshotExpectedCashout,
  getSnapshotLivingNetRemaining,
  getSnapshotLivingOverageLines,
  partitionBillsByPaid,
  SNAPSHOT_ACTIVITY_ROWS,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_EXPECTED_INCOME,
  SNAPSHOT_GLYPH_LOOKUP,
  SNAPSHOT_LIVING,
  SNAPSHOT_STARTING_FUNDS,
  SNAPSHOT_UPCOMING_PREVIEW,
  type SnapshotActivityRow,
  type SnapshotBill,
  type SnapshotLivingLine,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import { cn } from "@/lib/utils"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  formatMonthAbbrevDisplay,
  formatMonthStripTooltip,
  MONTH_LABELS,
  monthIndexFromLabel,
  monthLongNameFromIndex,
  monthLongNameFromLabel,
  type MonthLabel,
  type MonthStripFlags,
} from "@/lib/budget-month"

type IncomeDraftItem = ExpectedIncomeLine & { markedForDeletion?: boolean }
type CreditOutpostCycle = {
  id: string
  cardLabel: string
  lastFour: string
  cycleLabel: string
  newSpending: number
  reservedPaymentFunds: number
  dueDateLabel: string
  minimumDue: number
  isPastDue: boolean
}

const SNAPSHOT_CREDIT_OUTPOST: CreditOutpostCycle[] = [
  {
    id: "visa-cycle-1",
    cardLabel: "Visa",
    lastFour: "1234",
    cycleLabel: "Jan 12 - Feb 11",
    newSpending: 700,
    reservedPaymentFunds: 700,
    dueDateLabel: "Apr 5",
    minimumDue: 45,
    isPastDue: false,
  },
  {
    id: "mastercard-cycle-4",
    cardLabel: "Mastercard",
    lastFour: "5678",
    cycleLabel: "Jan 20 - Feb 19",
    newSpending: 10,
    reservedPaymentFunds: 0,
    dueDateLabel: "Apr 14",
    minimumDue: 45,
    isPastDue: false,
  },
  {
    id: "discover-cycle-2",
    cardLabel: "Discover",
    lastFour: "2468",
    cycleLabel: "Jan 18 - Feb 17",
    newSpending: 200,
    reservedPaymentFunds: 45,
    dueDateLabel: "Apr 2",
    minimumDue: 120,
    isPastDue: false,
  },
]

/** Match income-dock scheduled pay row hover (inset sky edge, no default border). */
const SNAPSHOT_ROW_INTERACTIVE_CLASS =
  "-mx-1 cursor-pointer rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1"

/** Per-cell inset edges so hover ring is complete (`<tr>` box-shadow is unreliable). */
const ACTIVITY_ROW_HOVER_CELL_FIRST =
  "transition-shadow duration-150 group-hover:shadow-[inset_1px_0_0_0_rgba(2,132,199,0.22),inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"
const ACTIVITY_ROW_HOVER_CELL_MIDDLE =
  "transition-shadow duration-150 group-hover:shadow-[inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"
const ACTIVITY_ROW_HOVER_CELL_LAST =
  "transition-shadow duration-150 group-hover:shadow-[inset_-1px_0_0_0_rgba(2,132,199,0.22),inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"

/** Same hover / border treatment as Credit Card Payments rows. */
const CREDIT_OUTPOST_ROW_BUTTON_CLASS =
  "group w-full min-w-0 cursor-pointer rounded-lg border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-2 py-2 text-left shadow-sm transition-colors duration-150 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1 sm:px-3"

function fmtCurrencyPlain(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n).toLocaleString()
  return (
    <span className="inline-flex items-baseline">
      <span className="text-[0.9em] text-slate-500">{sign}$</span>
      <span className="ml-[0.14em]">{abs}</span>
    </span>
  )
}

function fmtDollars(n: number) {
  return `$${n.toLocaleString()}`
}

function fmtCreditCardName(cardLabel: string, lastFour: string) {
  return `${cardLabel} · ${lastFour}`
}

/** Credit Outpost: always "Mar 5" (short month + day). */
function fmtCreditDueDisplay(dueDateLabel: string) {
  const raw = dueDateLabel.trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const m = parts[0]!
    const d = parts[1]!
    const month = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
    return `${month} ${d}`
  }
  return raw
}

function creditDueDateSortKey(dueDateLabel: string) {
  const raw = dueDateLabel.trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const m = parts[0]!
    const day = parts[1]!
    const month = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
    const t = new Date(`${month} ${day}, 2026`).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const t = new Date(`${raw} 2026`).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Same template on header + each payment row. minmax(0,fr) lets the grid shrink inside the card—no horizontal scroll. */
const CREDIT_PAYMENT_ROW_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[minmax(0,0.62fr)_minmax(0,1.45fr)_minmax(0,1.02fr)_minmax(0,0.78fr)] items-center gap-x-1.5 sm:gap-x-2"

/** e.g. "Jan 12 - Feb 11" → "Feb 11" */
function statementClosedLabelFromCycle(cycleLabel: string) {
  const parts = cycleLabel.split(/\s+-\s+/)
  const last = parts[parts.length - 1]?.trim()
  return last && last.length > 0 ? last : cycleLabel.trim()
}

const categoryGlyphClass =
  "shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-within:opacity-70"

function renderCategoryGlyph(
  displayCategory: string,
  flow: "Income" | "Expense" | "Transfer",
  roadmapCategories: TimelineCategory[],
  options?: { alwaysVisible?: boolean },
) {
  const glyphClass = options?.alwaysVisible ? "shrink-0 opacity-100" : categoryGlyphClass
  if (displayCategory === "Stash") {
    return (
      <Receipt
        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", "text-slate-600", glyphClass)}
        aria-hidden
      />
    )
  }
  if (displayCategory === "Bills") {
    return (
      <FileText
        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", "text-slate-600", glyphClass)}
        aria-hidden
      />
    )
  }
  const matched = roadmapCategories.find((c) => c.name === displayCategory)
  if (matched) {
    const { Icon, className: iconClass } = CATEGORY_GLYPH[matched.glyph]
    return (
      <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)} aria-hidden />
    )
  }
  if (flow === "Income") {
    return (
      <CirclePlus
        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", "text-emerald-600", glyphClass)}
        aria-hidden
      />
    )
  }
  const { Icon, className: iconClass } = CATEGORY_GLYPH.vibe
  return <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)} aria-hidden />
}

/** Living lines use per-id icons (e.g. Coffee for dining); roadmap “food” would duplicate groceries + dining. */
function renderAssignToGlyph(
  appliedKey: string,
  incomeLines: IncomeDraftItem[],
  options?: { alwaysVisible?: boolean },
) {
  const glyphClass = options?.alwaysVisible ? "shrink-0 opacity-100" : categoryGlyphClass
  if (appliedKey.startsWith("living:")) {
    const id = appliedKey.slice("living:".length)
    const g = SNAPSHOT_LIVING_GLYPH[id]
    if (g) {
      const { Icon, className: iconClass } = g
      return <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)} aria-hidden />
    }
  }
  const cat = resolveCategoryFromApplied(appliedKey, incomeLines).category
  return renderCategoryGlyph(cat, flowFromAppliedKey(appliedKey), SNAPSHOT_GLYPH_LOOKUP, options)
}

const SNAPSHOT_TRANSFER_KEY = "transfer:general"

/** Applied-to when expense is paid from My Stash (empty string was ambiguous in merges / UI). */
const STASH_APPLIED_KEY = "stash:direct"

/** Income credited to Stash instead of scheduled pay / other income lines (must not collide with a real line id). */
const STASH_INCOME_APPLIED_KEY = "income:stash"

/** Applied-to target for ad-hoc / non-scheduled inflows (matches income dock “Other income”). */
const OTHER_INCOME_APPLIED_KEY = "income:other"

function isStashAppliedKey(key: string): boolean {
  return key === STASH_APPLIED_KEY || key.startsWith("stash:")
}

type SnapshotFundedBySlot = "prev" | "current" | "next" | "stash"

type SnapshotStatementMonthSlot = "prev" | "current" | "next"

/** Prev / current / next month chips (short labels); stash is a separate segment in the modal. */
function statementSlotMonthIndex(
  slot: SnapshotStatementMonthSlot,
  viewMonth: MonthLabel,
): number {
  const vi = monthIndexFromLabel(viewMonth) ?? 0
  if (slot === "prev") return (vi + 11) % 12
  if (slot === "next") return (vi + 1) % 12
  return vi
}

/** Unselected chip: future = dashed (month strip); current + past months = solid grey border. */
function classNameForStatementMonthChipUnselected(flags: MonthStripFlags): string {
  if (flags.isFuture) {
    return "border border-dashed border-slate-300 bg-white text-slate-500 hover:bg-orange-100 hover:border-orange-200 hover:text-orange-950"
  }
  if (flags.isArchived) {
    return "border border-slate-300 bg-white text-slate-400 hover:bg-slate-50"
  }
  return "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
}

function fundedStatementMonthOptionsForViewMonth(viewMonth: MonthLabel): {
  value: SnapshotStatementMonthSlot
  shortLabel: string
  ariaLabel: string
}[] {
  const vi = monthIndexFromLabel(viewMonth) ?? 0
  const prevMonth = MONTH_LABELS[(vi + 11) % 12]
  const nextMonth = MONTH_LABELS[(vi + 1) % 12]
  return [
    { value: "prev", shortLabel: prevMonth, ariaLabel: monthLongNameFromLabel(prevMonth) },
    { value: "current", shortLabel: viewMonth, ariaLabel: monthLongNameFromLabel(viewMonth) },
    { value: "next", shortLabel: nextMonth, ariaLabel: monthLongNameFromLabel(nextMonth) },
  ]
}

function fundedByFromRow(
  row: SnapshotActivityRow,
  viewMonth: MonthLabel,
): SnapshotFundedBySlot {
  if (row.fromStash) return "stash"
  if (row.budgetMonthLabel === viewMonth) return "current"
  const vi = monthIndexFromLabel(viewMonth) ?? 0
  if (row.budgetMonthLabel === MONTH_LABELS[(vi + 11) % 12]) return "prev"
  if (row.budgetMonthLabel === MONTH_LABELS[(vi + 1) % 12]) return "next"
  return "current"
}

function applyFundedBySelection(
  fb: SnapshotFundedBySlot,
  viewMonth: MonthLabel,
): Pick<SnapshotActivityRow, "budgetMonthLabel" | "fromStash"> {
  if (fb === "stash") return { budgetMonthLabel: viewMonth, fromStash: true }
  const vi = monthIndexFromLabel(viewMonth) ?? 0
  if (fb === "prev") return { budgetMonthLabel: MONTH_LABELS[(vi + 11) % 12], fromStash: false }
  if (fb === "next") return { budgetMonthLabel: MONTH_LABELS[(vi + 1) % 12], fromStash: false }
  return { budgetMonthLabel: viewMonth, fromStash: false }
}

function resolveSnapshotAppliedToLabel(key: string, incomeLines: IncomeDraftItem[]): string {
  if (key === SNAPSHOT_TRANSFER_KEY) return "Transfer"
  if (isStashAppliedKey(key)) return "My Stash"
  if (key === OTHER_INCOME_APPLIED_KEY) return "Other income"
  if (key === STASH_INCOME_APPLIED_KEY) return "My Stash"
  if (key.startsWith("income:")) {
    const id = key.slice("income:".length)
    const line = incomeLines.find((l) => l.id === id)
    return line?.label ?? "Income"
  }
  if (key.startsWith("bill:")) {
    const id = key.slice("bill:".length)
    const b = SNAPSHOT_BILLS.find((x) => x.id === id)
    return b?.listName ?? key
  }
  if (key.startsWith("living:")) {
    const id = key.slice("living:".length)
    const l = SNAPSHOT_LIVING.find((x) => x.id === id)
    return l?.name ?? key
  }
  return key
}

function flowFromAppliedKey(key: string): SnapshotActivityRow["flow"] {
  if (key === SNAPSHOT_TRANSFER_KEY) return "Transfer"
  if (key.startsWith("income:")) return "Income"
  return "Expense"
}

function resolveCategoryFromApplied(
  key: string,
  incomeLines: IncomeDraftItem[],
): { category: string } {
  if (key === SNAPSHOT_TRANSFER_KEY) return { category: "Transfer" }
  if (isStashAppliedKey(key)) return { category: "Stash" }
  if (key.startsWith("income:")) return { category: "Income" }
  if (key.startsWith("bill:")) return { category: "Bills" }
  if (key.startsWith("living:")) {
    const id = key.slice("living:".length)
    const l = SNAPSHOT_LIVING.find((x) => x.id === id)
    return { category: l?.name ?? "" }
  }
  return { category: "" }
}

/** Matches cards row `px-4` (1rem) — horizontal buffer inside the main column. */
const FULL_MONTH_OVERLAY_INSET_PX = 16

function getFullMonthOverlayRect(cardsEl: HTMLElement): {
  top: number
  left: number
  rightInset: number
} {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0
  const b = FULL_MONTH_OVERLAY_INSET_PX
  const r = cardsEl.getBoundingClientRect()
  const main = document.getElementById("dashboard-main-pane")
  if (!main) {
    return {
      top: r.top,
      left: r.left + b,
      rightInset: Math.max(0, vw - (r.right - b)),
    }
  }
  const m = main.getBoundingClientRect()
  return {
    top: r.top,
    left: m.left + b,
    rightInset: Math.max(0, vw - (m.right - b)),
  }
}

/**
 * Snapshot route: Bills + Living envelopes + income dock + activity (demo data).
 */
export function SnapshotWorkspace() {
  const { selectedMonth, setSelectedMonth, budgetYear, getFlags } = useMonthSelection()
  const roadmapCardRef = useRef<HTMLElement | null>(null)
  const [incomeItems, setIncomeItems] = useState<IncomeDraftItem[]>(
    SNAPSHOT_EXPECTED_INCOME.map((x) => ({ ...x })),
  )
  const [incomeEditDraft, setIncomeEditDraft] = useState<IncomeDraftItem[]>(
    SNAPSHOT_EXPECTED_INCOME.map((x) => ({ ...x })),
  )
  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [activityOverrides, setActivityOverrides] = useState<
    Record<string, Partial<SnapshotActivityRow>>
  >({})
  const [activityFundedByDraft, setActivityFundedByDraft] = useState<SnapshotFundedBySlot>("current")
  const [statementMonthSlot, setStatementMonthSlot] = useState<SnapshotStatementMonthSlot>("current")
  const [activityAppliedToKeyDraft, setActivityAppliedToKeyDraft] = useState("")
  const [isAppliedToOpen, setIsAppliedToOpen] = useState(false)
  const prevActivityIdRef = useRef<string | null>(null)
  const prevActivityFundedByRef = useRef<SnapshotFundedBySlot | null>(null)
  const [selectedCreditCycleId, setSelectedCreditCycleId] = useState<string | null>(null)
  const [isCreditOutpostAboutOpen, setIsCreditOutpostAboutOpen] = useState(false)
  const [isExpectedCashoutInfoOpen, setIsExpectedCashoutInfoOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<SnapshotBill | null>(null)
  const [selectedLivingLine, setSelectedLivingLine] = useState<SnapshotLivingLine | null>(null)
  const [roadmapCardMinHeight, setRoadmapCardMinHeight] = useState<number>(0)
  const [fullMonthActivityOpen, setFullMonthActivityOpen] = useState(false)
  const [fullMonthActivityAnchor, setFullMonthActivityAnchor] = useState<{
    top: number
    left: number
    rightInset: number
  } | null>(null)
  const snapshotPageCardsRef = useRef<HTMLDivElement>(null)
  const [fullActivityAccountFilter, setFullActivityAccountFilter] = useState<string>("all")
  const [fullActivityCategoryFilter, setFullActivityCategoryFilter] = useState<string>("all")
  const [fullActivitySearch, setFullActivitySearch] = useState("")
  const isReadyToCashOut = false

  const monthShort = selectedMonth.slice(0, 3)
  const fundedStatementMonthOptions = useMemo(
    () => fundedStatementMonthOptionsForViewMonth(selectedMonth),
    [selectedMonth],
  )
  const { paid, upcoming, paidTotal } = useMemo(
    () => partitionBillsByPaid(SNAPSHOT_AS_OF_DAY),
    [],
  )
  const sortedActivityRows = useMemo(() => {
    const toSortableDate = (value: string) => {
      const d = new Date(`${value}, 2026`)
      return Number.isNaN(d.getTime()) ? -1 : d.getTime()
    }
    const clearedIncomeRows: SnapshotActivityRow[] = incomeItems
      .filter((line) => line.cleared && !line.markedForDeletion)
      .map((line) => ({
        id: `income-${line.id}`,
        dateLabel: line.expectedDate,
        source: line.label,
        category: "Income",
        flow: "Income" as const,
        actual: line.amount,
        budgetMonthLabel: selectedMonth,
        fromStash: false,
        appliedToKey: `income:${line.id}`,
        accountLabel: "Not linked",
      }))
    const merged = [...SNAPSHOT_ACTIVITY_ROWS, ...clearedIncomeRows].map((row) => {
      const o = activityOverrides[row.id]
      let base: SnapshotActivityRow = { ...row, ...o }
      if (base.fromStash && base.flow === "Expense" && !base.appliedToKey) {
        base = { ...base, appliedToKey: STASH_APPLIED_KEY }
      }
      if (base.fromStash && base.flow === "Income" && !base.appliedToKey) {
        base = { ...base, appliedToKey: STASH_INCOME_APPLIED_KEY }
      }
      return { ...base, flow: flowFromAppliedKey(base.appliedToKey) }
    })
    return merged.sort((a, b) => toSortableDate(b.dateLabel) - toSortableDate(a.dateLabel))
  }, [incomeItems, selectedMonth, activityOverrides])
  const visibleActivityRows = useMemo(() => sortedActivityRows.slice(0, 14), [sortedActivityRows])

  const fullMonthActivityRows = useMemo(() => {
    return sortedActivityRows.filter((row) => {
      if (row.budgetMonthLabel === selectedMonth) return true
      const dStr = row.dateLabel?.trim()
      if (!dStr) return false
      const d = new Date(`${dStr}, ${DEFAULT_BUDGET_YEAR}`)
      if (Number.isNaN(d.getTime())) return false
      const mIdx = monthIndexFromLabel(selectedMonth)
      return mIdx != null && d.getMonth() === mIdx
    })
  }, [sortedActivityRows, selectedMonth])

  const fullActivityCategoryOptions = useMemo(() => {
    const set = new Set<string>(["Bills", "Income", "Transfer", "Stash"])
    for (const l of SNAPSHOT_LIVING) {
      set.add(l.name)
    }
    for (const row of fullMonthActivityRows) {
      set.add(row.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [fullMonthActivityRows])

  const fullActivityAccountOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of fullMonthActivityRows) {
      set.add(row.accountLabel ?? "Not linked")
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [fullMonthActivityRows])

  const filteredFullMonthActivityRows = useMemo(() => {
    let rows = fullMonthActivityRows
    if (fullActivityAccountFilter !== "all") {
      rows = rows.filter((r) => (r.accountLabel ?? "Not linked") === fullActivityAccountFilter)
    }
    if (fullActivityCategoryFilter !== "all") {
      rows = rows.filter((r) => r.category === fullActivityCategoryFilter)
    }
    const q = fullActivitySearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const applied = resolveSnapshotAppliedToLabel(r.appliedToKey, incomeItems)
        return (
          r.source.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.flow.toLowerCase().includes(q) ||
          (r.accountLabel ?? "").toLowerCase().includes(q) ||
          applied.toLowerCase().includes(q) ||
          r.dateLabel.toLowerCase().includes(q)
        )
      })
    }
    return rows
  }, [
    fullMonthActivityRows,
    fullActivityAccountFilter,
    fullActivityCategoryFilter,
    fullActivitySearch,
    incomeItems,
  ])

  const selectedActivity = useMemo(
    () => sortedActivityRows.find((row) => row.id === selectedActivityId) ?? null,
    [selectedActivityId, sortedActivityRows],
  )

  const appliedToPickerItems = useMemo(() => {
    const scheduledIncome = incomeItems
      .filter((l) => !l.markedForDeletion)
      .map((line) => ({
        key: `income:${line.id}` as const,
        label: line.label,
      }))
    const livingItems = SNAPSHOT_LIVING.map((l) => ({
      key: `living:${l.id}` as const,
      label: l.name,
    }))
    /** Upcoming (by due date) plus this row’s bill if it’s not in that set—keeps the current pick visible. */
    const billsAppliedToOptions: { key: `bill:${string}`; label: string }[] = upcoming.map((b) => ({
      key: `bill:${b.id}` as const,
      label: b.listName,
    }))
    if (activityAppliedToKeyDraft.startsWith("bill:")) {
      const id = activityAppliedToKeyDraft.slice("bill:".length)
      const alreadyListed = billsAppliedToOptions.some((o) => o.key === `bill:${id}`)
      if (!alreadyListed) {
        const b = SNAPSHOT_BILLS.find((x) => x.id === id)
        if (b) billsAppliedToOptions.push({ key: `bill:${b.id}`, label: b.listName })
      }
      const current = billsAppliedToOptions.find((o) => o.key === activityAppliedToKeyDraft)
      if (current) {
        const rest = billsAppliedToOptions.filter((o) => o.key !== activityAppliedToKeyDraft)
        billsAppliedToOptions.length = 0
        billsAppliedToOptions.push(current, ...rest)
      }
    }
    return {
      scheduledIncome,
      otherIncome: { key: OTHER_INCOME_APPLIED_KEY, label: "Other income" },
      livingItems,
      billsAppliedToOptions,
    }
  }, [incomeItems, upcoming, activityAppliedToKeyDraft])

  useEffect(() => {
    if (selectedActivityId === prevActivityIdRef.current) return
    prevActivityIdRef.current = selectedActivityId
    if (!selectedActivityId) return
    const row = sortedActivityRows.find((r) => r.id === selectedActivityId)
    if (!row) return
    const fundedSlot = fundedByFromRow(row, selectedMonth)
    setActivityFundedByDraft(fundedSlot)
    setStatementMonthSlot(fundedSlot === "stash" ? "current" : fundedSlot)
    if (row.flow === "Expense" && row.fromStash) {
      setActivityAppliedToKeyDraft(STASH_APPLIED_KEY)
    } else if (row.flow === "Income" && row.fromStash) {
      setActivityAppliedToKeyDraft(STASH_INCOME_APPLIED_KEY)
    } else {
      setActivityAppliedToKeyDraft(row.appliedToKey)
    }
  }, [selectedActivityId, sortedActivityRows, selectedMonth])

  useEffect(() => {
    if (!selectedActivityId) {
      prevActivityFundedByRef.current = null
    }
  }, [selectedActivityId])

  useEffect(() => {
    if (!selectedActivityId) return
    const row = sortedActivityRows.find((r) => r.id === selectedActivityId)
    if (!row) return
    if (row.flow !== "Expense" && row.flow !== "Income") {
      prevActivityFundedByRef.current = activityFundedByDraft
      return
    }
    if (activityFundedByDraft === "stash") {
      if (row.flow === "Expense") {
        setActivityAppliedToKeyDraft(STASH_APPLIED_KEY)
      } else {
        setActivityAppliedToKeyDraft(STASH_INCOME_APPLIED_KEY)
      }
      setIsAppliedToOpen(false)
    } else if (prevActivityFundedByRef.current === "stash") {
      const key = row.appliedToKey
      if (row.flow === "Expense") {
        if (isStashAppliedKey(key) || key === "") {
          setActivityAppliedToKeyDraft("")
        } else {
          setActivityAppliedToKeyDraft(key)
        }
      } else if (key === STASH_INCOME_APPLIED_KEY || key === "") {
        setActivityAppliedToKeyDraft("")
      } else {
        setActivityAppliedToKeyDraft(key)
      }
    }
    prevActivityFundedByRef.current = activityFundedByDraft
  }, [activityFundedByDraft, selectedActivityId, sortedActivityRows])

  const activityFlowDraft = flowFromAppliedKey(activityAppliedToKeyDraft)
  const stashExpenseModal = Boolean(
    selectedActivity && selectedActivity.flow === "Expense" && activityFundedByDraft === "stash",
  )
  const stashIncomeModal = Boolean(
    selectedActivity && selectedActivity.flow === "Income" && activityFundedByDraft === "stash",
  )
  const statementArchivedMonthModal = Boolean(
    selectedActivity &&
      activityFundedByDraft !== "stash" &&
      getFlags(statementSlotMonthIndex(statementMonthSlot, selectedMonth)).isArchived,
  )
  const selectedStatementMonthLongName = monthLongNameFromIndex(
    statementSlotMonthIndex(statementMonthSlot, selectedMonth),
  )
  const hasPendingActivityChanges = Boolean(
    selectedActivity &&
      (activityFundedByDraft !== fundedByFromRow(selectedActivity, selectedMonth) ||
        (stashExpenseModal
          ? selectedActivity.fromStash === false || !isStashAppliedKey(selectedActivity.appliedToKey)
          : stashIncomeModal
            ? selectedActivity.fromStash === false ||
              selectedActivity.appliedToKey !== STASH_INCOME_APPLIED_KEY
            : activityAppliedToKeyDraft !== selectedActivity.appliedToKey ||
              activityFlowDraft !== selectedActivity.flow)),
  )

  const saveActivityDetails = () => {
    if (!selectedActivityId || !selectedActivity) return
    const funded = applyFundedBySelection(activityFundedByDraft, selectedMonth)
    const stashExpenseSave = funded.fromStash && selectedActivity.flow === "Expense"
    const stashIncomeSave = funded.fromStash && selectedActivity.flow === "Income"
    const appliedToKey = stashExpenseSave
      ? STASH_APPLIED_KEY
      : stashIncomeSave
        ? STASH_INCOME_APPLIED_KEY
        : activityAppliedToKeyDraft
    const flow = flowFromAppliedKey(appliedToKey)
    const cat = stashExpenseSave
      ? { category: "Stash" }
      : stashIncomeSave
        ? { category: "Income" }
        : resolveCategoryFromApplied(activityAppliedToKeyDraft, incomeItems)
    setActivityOverrides((prev) => ({
      ...prev,
      [selectedActivityId]: {
        budgetMonthLabel: funded.budgetMonthLabel,
        fromStash: funded.fromStash,
        appliedToKey,
        category: cat.category,
        flow,
      },
    }))
    setSelectedActivityId(null)
  }

  const selectedCreditCycle = useMemo(
    () => SNAPSHOT_CREDIT_OUTPOST.find((cycle) => cycle.id === selectedCreditCycleId) ?? null,
    [selectedCreditCycleId],
  )
  const paidCount = paid.length
  const { expectedNet, totalBudget, livingBudget, livingOverage, billsTotal } = useMemo(
    () => getSnapshotExpectedCashout(),
    [],
  )
  const livingNetRemaining = useMemo(() => getSnapshotLivingNetRemaining(), [])
  const livingOverageLines = useMemo(() => getSnapshotLivingOverageLines(), [])
  const billsUpcomingTotal = useMemo(
    () => upcoming.reduce((s, b) => s + b.amount, 0),
    [upcoming],
  )
  const upcomingPreview = upcoming.slice(0, SNAPSHOT_UPCOMING_PREVIEW)
  const upcomingRest = Math.max(0, upcoming.length - SNAPSHOT_UPCOMING_PREVIEW)

  const startIncomeEdit = () => {
    setIncomeEditDraft(incomeItems.map((item) => ({ ...item, markedForDeletion: false })))
    setIsEditingIncome(true)
  }
  const cancelIncomeEdit = () => {
    setIsEditingIncome(false)
    setIncomeEditDraft(incomeItems.map((item) => ({ ...item, markedForDeletion: false })))
  }
  const saveIncomeEdit = () => {
    setIncomeItems(
      incomeEditDraft
        .filter((item) => !item.markedForDeletion)
        .map(({ markedForDeletion, ...item }) => ({ ...item })),
    )
    setIsEditingIncome(false)
  }
  const handleIncomeAmountChange = (itemId: string, nextAmount: number) => {
    setIncomeEditDraft((prev) =>
      prev.map((item) =>
        item.id === itemId && !item.cleared ? { ...item, amount: nextAmount } : item,
      ),
    )
  }
  const handleIncomeLabelChange = (itemId: string, nextLabel: string) => {
    setIncomeEditDraft((prev) =>
      prev.map((item) =>
        item.id === itemId && !item.cleared ? { ...item, label: nextLabel } : item,
      ),
    )
  }
  const handleIncomeToggleDelete = (itemId: string) => {
    setIncomeEditDraft((prev) =>
      prev.map((item) =>
        item.id === itemId && !item.cleared
          ? { ...item, markedForDeletion: !item.markedForDeletion }
          : item,
      ),
    )
  }
  const addIncomeItem = (draft: { label: string; expectedDate: string; amount: number }) => {
    const newId = `income-new-${Date.now()}`
    setIncomeEditDraft((prev) => [
      ...prev,
      {
        id: newId,
        label: draft.label,
        expectedDate: draft.expectedDate,
        amount: Math.max(0, draft.amount),
        cleared: false,
        markedForDeletion: false,
      },
    ])
  }

  const cardShellClass =
    "border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
  const cardHeaderClass = "shrink-0 border-b border-slate-300 bg-white px-3 py-2.5"
  const cardTitleClass = "text-[15px] font-bold tracking-tight text-slate-600"
  const layoutGapClass = "gap-4"
  const monthStripWrapClass = "shrink-0 bg-stone-100 px-4 pb-2 pt-3"
  const monthStripClass = "border-slate-300/70 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"

  const nextMonthLabel =
    MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12] != null
      ? monthLongNameFromLabel(
          MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12] as MonthLabel,
        )
      : "Next Month"
  const daysUntilNextMonth = useMemo(() => {
    const monthIndex = monthIndexFromLabel(selectedMonth)
    if (monthIndex == null) return 0
    const year = DEFAULT_BUDGET_YEAR
    const now = new Date()
    const day = now.getDate()
    const daysInSelectedMonth = new Date(year, monthIndex + 1, 0).getDate()
    const anchorDay = Math.min(day, daysInSelectedMonth)
    const anchor = new Date(year, monthIndex, anchorDay)
    const nextMonthFirst = new Date(year, monthIndex + 1, 1)
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.max(0, Math.ceil((nextMonthFirst.getTime() - anchor.getTime()) / msPerDay))
  }, [selectedMonth])
  const fmtAmount = (n: number) => `$${n.toLocaleString()}`

  useEffect(() => {
    const node = roadmapCardRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const updateHeight = () => {
      const h = Math.ceil(node.getBoundingClientRect().height)
      setRoadmapCardMinHeight((prev) => (prev !== h ? h : prev))
    }

    updateHeight()
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setFullMonthActivityOpen(false)
  }, [selectedMonth])

  useEffect(() => {
    if (!fullMonthActivityOpen) {
      setFullActivityAccountFilter("all")
      setFullActivityCategoryFilter("all")
      setFullActivitySearch("")
    }
  }, [fullMonthActivityOpen])

  useEffect(() => {
    if (!fullMonthActivityOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setFullMonthActivityOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullMonthActivityOpen])

  useEffect(() => {
    if (!fullMonthActivityOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [fullMonthActivityOpen])

  useLayoutEffect(() => {
    if (!fullMonthActivityOpen) {
      setFullMonthActivityAnchor(null)
      return
    }
    const el = snapshotPageCardsRef.current
    if (!el) return
    const main = document.getElementById("dashboard-main-pane")
    const update = () => {
      setFullMonthActivityAnchor(getFullMonthOverlayRect(el))
    }
    update()
    const roCards = new ResizeObserver(update)
    roCards.observe(el)
    const roMain = main ? new ResizeObserver(update) : null
    if (main && roMain) roMain.observe(main)
    window.addEventListener("resize", update)
    return () => {
      roCards.disconnect()
      roMain?.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [fullMonthActivityOpen])

  const openFullMonthActivity = () => {
    setSelectedActivityId(null)
    const el = snapshotPageCardsRef.current
    if (el) {
      setFullMonthActivityAnchor(getFullMonthOverlayRect(el))
    }
    setFullMonthActivityOpen(true)
  }

  return (
    <div className="relative flex flex-col">
      <div className={monthStripWrapClass}>
        <MonthStrip value={selectedMonth} onValueChange={setSelectedMonth} className={monthStripClass} />
      </div>

      <div
        ref={snapshotPageCardsRef}
        className={cn(
          `flex min-w-0 flex-col ${layoutGapClass} px-4 pb-4 pt-2 lg:flex-row lg:items-start`,
          fullMonthActivityOpen &&
            "pointer-events-none invisible select-none opacity-0",
        )}
        aria-hidden={fullMonthActivityOpen}
      >
        <div className="relative flex w-full min-w-0 max-w-[min(100%,40rem)] shrink-0 flex-col gap-4 lg:max-w-[min(100%,50%)]">
          <section
            ref={roadmapCardRef}
            className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border shadow-sm ${cardShellClass}`}
            aria-labelledby="snapshot-budget-heading"
          >
            <header className={cardHeaderClass}>
              <div className="flex min-w-0 items-center gap-2">
                <h2
                  id="snapshot-budget-heading"
                  className={cn(cardTitleClass, "flex min-w-0 flex-1 items-center gap-2")}
                >
                  <Camera
                    className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">
                    {monthLongNameFromLabel(selectedMonth)} Snapshot
                  </span>
                </h2>
                <Link
                  href={`/roadmap?month=${selectedMonth}`}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                >
                  <span>{monthLongNameFromLabel(selectedMonth)} Roadmap</span>
                  <Maximize2
                    className="h-3.5 w-3.5 shrink-0 stroke-[2] text-[#0087D2]"
                    aria-hidden
                  />
                </Link>
              </div>
            </header>
            <div className="relative z-10 min-w-0 space-y-4 p-3">
              <div className="flex justify-center pr-1.5 sm:pr-2">
                <p className="inline-flex flex-wrap items-baseline justify-center gap-2">
                  <span className="text-[15px] font-medium italic text-slate-500">Starting Funds</span>
                  <span
                    className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                  >
                    {fmtCurrencyPlain(SNAPSHOT_STARTING_FUNDS)}
                  </span>
                  <span
                    className={`ml-1 text-xl font-semibold italic text-orange-700/90 ${myJourneyNav.className}`}
                  >
                    Let&apos;s do this
                  </span>
                </p>
              </div>

              {/* Bills */}
              <div className="px-2.5 sm:px-3">
                <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
                  <h3 className="shrink-0 text-[12px] font-semibold text-slate-700">Bills</h3>
                  <div className="inline-flex min-w-0 max-w-full shrink-0 items-baseline justify-end gap-3 whitespace-nowrap text-right text-[11px] text-slate-500 sm:gap-4">
                    <span
                      className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                    >
                      <span className="sr-only">{fmtDollars(billsTotal)} total reserved for bills. </span>
                      {fmtDollars(billsTotal)} Total Reserved
                      <span className="pl-2 font-normal text-slate-300 sm:pl-2.5" aria-hidden>
                        |
                      </span>
                    </span>
                    <div>
                      <span className="sr-only">Still due on upcoming bills: </span>
                      <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                        <span
                          className={`text-right text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                        >
                          {fmtDollars(billsUpcomingTotal)}
                        </span>
                        <span className="w-[2.25rem] text-right text-[11px] font-medium text-slate-500">
                          Left
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mb-2 pl-3 sm:pl-4">
                  <p className="inline-flex w-full items-baseline gap-1 text-[11px] text-slate-600">
                    <span className="font-medium">{monthLongNameFromLabel(selectedMonth)}</span>
                    <span
                      className="min-h-[1em] min-w-[1.5rem] flex-1 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
                      aria-hidden
                    />
                    <span className="font-medium italic tabular-nums">{paidCount} Bills Paid</span>
                    <span
                      className="min-h-[1em] min-w-[1.5rem] flex-1 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
                      aria-hidden
                    />
                    <span className="inline-flex items-baseline gap-1.5 italic">
                      <span className="font-medium text-slate-600">Total</span>
                      <span className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}>
                        {fmtDollars(paidTotal)}
                      </span>
                    </span>
                    <span className="inline-flex w-[2.25rem] justify-center" aria-hidden>
                      <ReceivedCheckIcon />
                    </span>
                  </p>
                </div>
                <ul className="space-y-2 pl-3 sm:pl-4">
                  {upcomingPreview.map((b) => (
                    <li key={b.id} className="min-w-0">
                      <div
                        role="button"
                        tabIndex={0}
                        className={SNAPSHOT_ROW_INTERACTIVE_CLASS}
                        onClick={() => setSelectedBill(b)}
                        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedBill(b)
                          }
                        }}
                        aria-label={`Open bill details for ${b.listName}`}
                      >
                        <DottedLeaderRow
                          left={
                            <span className="inline-flex min-w-0 items-baseline gap-1.5">
                              <span
                                className={`w-[1.5rem] shrink-0 font-normal tabular-nums text-slate-500 ${amountInter.className}`}
                              >
                                {b.dueDay}
                              </span>
                              <span className="min-w-0 truncate">{b.listName}</span>
                            </span>
                          }
                          right={
                            <span className={`w-[5.25rem] text-right text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`}>
                              {fmtDollars(b.amount)}
                            </span>
                          }
                          afterRight={
                            <span className="inline-flex w-[2.25rem] justify-center">
                              {b.paymentMode === "manual" ? (
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-[#0087D2]">
                                  Pay
                                </span>
                              ) : (
                                <RefreshCw
                                  className="h-3 w-3 stroke-[1.8] text-slate-400"
                                  aria-label="Auto drafted"
                                />
                              )}
                            </span>
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {upcomingRest > 0 ? (
                  <div className="mt-1 pl-3 sm:pl-4">
                    <span className="inline-flex min-w-0 items-baseline gap-1.5">
                      <span className="w-[1.5rem] shrink-0" aria-hidden />
                      <span className="text-left text-[10px] font-medium italic tracking-wide text-[#0087D2]">
                        {upcomingRest} more upcoming . . .
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Living funds */}
              <div className="px-2.5 sm:px-3">
                <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
                  <h3 className="shrink-0 text-[12px] font-semibold text-slate-700">Living Funds</h3>
                  <div className="inline-flex min-w-0 max-w-full shrink-0 items-baseline justify-end gap-3 whitespace-nowrap text-right text-[11px] text-slate-500 sm:gap-4">
                    <span
                      className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                    >
                      <span className="sr-only">{fmtDollars(livingBudget)} total funded. </span>
                      {fmtDollars(livingBudget)} Total Funded
                      <span className="pl-2 font-normal text-slate-300 sm:pl-2.5" aria-hidden>
                        |
                      </span>
                    </span>
                    <div>
                      <span className="sr-only">Net remaining across categories: </span>
                      {livingNetRemaining < 0 ? (
                        <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                          <span
                            className={`text-right text-[11px] font-semibold text-rose-700 ${amountInter.className}`}
                          >
                            {fmtDollars(Math.abs(livingNetRemaining))}
                          </span>
                          <span className="w-[2.25rem] text-right text-[11px] font-semibold text-rose-700">
                            Over
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                          <span
                            className={`text-right text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                          >
                            {fmtDollars(livingNetRemaining)}
                          </span>
                          <span className="w-[2.25rem] text-right text-[11px] font-medium text-slate-500">
                            Left
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 pl-3 sm:pl-4">
                  {SNAPSHOT_LIVING.map((line) => {
                    const left = line.target - line.spent
                    const isOver = left < 0
                    const overAmt = isOver ? Math.abs(left) : 0
                    const leftAmt = !isOver ? left : 0
                    const g = SNAPSHOT_LIVING_GLYPH[line.id]
                    const GIcon = g?.Icon
                    return (
                      <div
                        key={line.id}
                        role="button"
                        tabIndex={0}
                        className={SNAPSHOT_ROW_INTERACTIVE_CLASS}
                        onClick={() => setSelectedLivingLine(line)}
                        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedLivingLine(line)
                          }
                        }}
                        aria-label={`Open living fund details for ${line.name}`}
                      >
                        <DottedLeaderRow
                          left={
                            <span className="inline-flex min-w-0 items-baseline gap-1.5">
                              {GIcon ? (
                                <span className="inline-flex w-[1.5rem] shrink-0 justify-center">
                                  <GIcon
                                    className={cn(
                                      "h-4 w-4 shrink-0 stroke-[1.5]",
                                      g.className,
                                    )}
                                    aria-hidden
                                  />
                                </span>
                              ) : null}
                              <span className="grid w-[18rem] min-w-0 grid-cols-[max-content_1fr_max-content] items-baseline gap-x-0.5">
                                <span className="whitespace-nowrap">{line.shortName}</span>
                                <span
                                  className="min-h-[1em] min-w-[1rem] bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
                                  aria-hidden
                                />
                                <span
                                  className={`shrink-0 text-right font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                                >
                                  ({fmtDollars(line.target)})
                                </span>
                              </span>
                            </span>
                          }
                          right={
                            isOver ? (
                              <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                                <span className={`text-right text-[11px] font-semibold text-rose-700 ${amountInter.className}`}>
                                  {fmtDollars(overAmt)}
                                </span>
                                <span className="w-[2.25rem] text-right text-[11px] font-semibold text-rose-700">
                                  Over
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                                <span className={`text-right text-[11px] font-medium text-slate-500 ${amountInter.className}`}>
                                  {fmtDollars(leftAmt)}
                                </span>
                                <span className="w-[2.25rem] text-right text-[11px] font-medium text-slate-500">
                                  Left
                                </span>
                              </span>
                            )
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-2">
                  <span className="text-[15px] font-medium italic text-slate-500">Expected Cashout</span>
                  <span className="inline-flex items-baseline gap-1">
                    <span
                      className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                    >
                      {fmtCurrencyPlain(expectedNet)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsExpectedCashoutInfoOpen(true)}
                      className="-mb-0.5 inline-flex shrink-0 cursor-pointer rounded-sm p-0.5 text-slate-400 outline-none transition-colors hover:text-[#0087D2] focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1"
                      title="How Expected Cashout is calculated"
                      aria-label="How Expected Cashout is calculated"
                    >
                      <HelpCircle className="h-4 w-4 stroke-[1.75]" aria-hidden />
                    </button>
                  </span>
                  <p
                    className={`inline-flex items-center gap-1.5 text-xl font-semibold italic text-orange-700/90 ${myJourneyNav.className}`}
                  >
                    <span>
                      {expectedNet === 0 ? (
                        "payin' the bills"
                      ) : (
                        <>
                          {expectedNet < 0 ? "dipping in the stash in " : "available in "}
                          <span className="text-[1.3em] font-bold leading-none">
                            {daysUntilNextMonth}
                          </span>{" "}
                          {daysUntilNextMonth === 1 ? "day" : "days"}
                        </>
                      )}
                    </span>
                    <Receipt className="ml-1 h-4 w-4 shrink-0 stroke-[1.7] text-orange-700/80" aria-hidden />
                  </p>
                </div>
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsSettleUpOpen(true)}
                    className={`group inline-flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-5 py-2 shadow-sm transition-colors duration-150 ${
                      isReadyToCashOut
                        ? "bg-[#0087D2] text-white hover:bg-[#00487A] active:bg-[#00365D]"
                        : "border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-slate-200 to-slate-200 text-slate-400 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 group-hover:text-slate-600"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-wide">
                        Cash Out {monthLongNameFromLabel(selectedMonth)}
                      </span>
                      <span
                        className={`pb-px text-[17px] font-black leading-none transition-colors duration-150 ${
                          isReadyToCashOut
                            ? "text-amber-400 group-hover:text-amber-200"
                            : "text-slate-300 group-hover:text-slate-500"
                        }`}
                        aria-hidden
                      >
                        &raquo;
                      </span>
                      <span
                        className={`text-[15px] font-medium italic leading-tight transition-colors duration-150 ${myJourneyNav.className} ${
                          isReadyToCashOut
                            ? "text-white group-hover:text-white"
                            : "text-slate-500 group-hover:text-slate-700"
                        }`}
                      >
                        Advance to {nextMonthLabel}
                      </span>
                    </span>
                    {!isReadyToCashOut ? (
                      <span className="text-[10px] font-medium italic leading-tight text-slate-500 transition-colors duration-150 group-hover:text-slate-600">
                        Unlocks on {nextMonthLabel} 1st
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border shadow-sm ${cardShellClass}`}
            aria-labelledby="snapshot-credit-outpost-heading"
          >
            <header className={cn(cardHeaderClass, "flex items-center justify-between gap-3")}>
              <h2
                id="snapshot-credit-outpost-heading"
                className={cn(cardTitleClass, "flex min-w-0 items-center gap-2")}
              >
                <CreditCard
                  className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]"
                  aria-hidden
                />
                <span className="min-w-0 truncate">Credit Card Payments</span>
              </h2>
              <button
                type="button"
                className="inline-flex max-w-[min(100%,15rem)] shrink-0 cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-[18rem]"
                onClick={() => setIsCreditOutpostAboutOpen(true)}
              >
                <span>About Credit Cards & Reserves</span>
                <Info className="h-3.5 w-3.5 shrink-0 stroke-[2]" aria-hidden />
              </button>
            </header>
            <div className="relative z-10 min-w-0 space-y-4 bg-slate-50/40 p-3">
              <div className="px-2.5 sm:px-3">
                <div className="min-w-0 space-y-2 pl-3 sm:pl-4">
                  <ul className="space-y-2">
                      {[...SNAPSHOT_CREDIT_OUTPOST]
                        .filter((c) => {
                          const monthIdx = monthIndexFromLabel(selectedMonth) ?? 0
                          const start = new Date(2026, monthIdx, 1).getTime()
                          const end = new Date(2026, monthIdx + 1, 0, 23, 59, 59).getTime()
                          const t = creditDueDateSortKey(c.dueDateLabel)
                          // Include due from previous months that were never paid.
                          // (We don't model "paid" in this UI yet; showing anything due up through the selected month matches your intent.)
                          return t <= end
                        })
                        .sort(
                          (a, b) =>
                            creditDueDateSortKey(a.dueDateLabel) - creditDueDateSortKey(b.dueDateLabel),
                        )
                        .map((cycle) => {
                        const reserved = cycle.reservedPaymentFunds
                        const minDue = cycle.minimumDue
                        const isPaymentReady = reserved >= minDue
                        const isMinDue = reserved === 0
                        const isActionNeeded = reserved > 0 && !isPaymentReady

                        const amount =
                          isPaymentReady
                            ? { value: fmtDollars(reserved), label: "Reserved" }
                            : isActionNeeded
                              ? { value: fmtDollars(minDue - reserved), label: "Short" }
                              : { value: fmtDollars(minDue), label: "Needed" }

                        const status = isPaymentReady
                          ? { text: "Payment Ready", cls: "text-emerald-700" }
                          : isMinDue
                            ? { text: "Minimum Due", cls: "text-amber-700" }
                            : { text: "Action Needed", cls: "text-rose-700" }

                        const dueDisplay = fmtCreditDueDisplay(cycle.dueDateLabel)

                        const amountTone =
                          isPaymentReady ? "text-emerald-700" : isMinDue ? "text-amber-700" : "text-rose-700"
                        const amountLabelTone =
                          isPaymentReady
                            ? "text-emerald-600"
                            : isMinDue
                              ? "text-amber-600"
                              : "text-rose-600"

                        return (
                          <li key={cycle.id} className="min-w-0">
                            <button
                              type="button"
                              className={CREDIT_OUTPOST_ROW_BUTTON_CLASS}
                              aria-label={`Open settlement for ${fmtCreditCardName(cycle.cardLabel, cycle.lastFour)}`}
                              onClick={() => {
                                setSelectedCreditCycleId(cycle.id)
                              }}
                            >
                              <div className={CREDIT_PAYMENT_ROW_GRID_CLASS} role="row">
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 leading-none">
                                    DUE
                                  </span>
                                  <span
                                    className={`mt-0.5 block text-center text-[11px] font-medium tabular-nums text-slate-600 ${amountInter.className}`}
                                  >
                                    {dueDisplay}
                                  </span>
                                </div>
                                <div className="min-w-0 self-center py-0.5">
                                  <div className="break-words text-[12px] font-semibold leading-snug text-slate-800">
                                    {fmtCreditCardName(cycle.cardLabel, cycle.lastFour)}
                                  </div>
                                  <div className="break-words text-[10px] leading-snug text-slate-500">
                                    Statement Closed {statementClosedLabelFromCycle(cycle.cycleLabel)}
                                  </div>
                                </div>
                                <div className="w-full text-center">
                                  <span
                                    className={`block text-center text-[11px] font-semibold tabular-nums ${amountTone} ${amountInter.className}`}
                                  >
                                    {amount.value}
                                  </span>
                                  <span
                                    className={`block mt-0.5 text-center text-[10px] font-semibold ${amountLabelTone}`}
                                  >
                                    {amount.label}
                                  </span>
                                </div>
                                <div className="w-full text-center">
                                  <span
                                    className={`flex w-full items-center justify-center gap-1 px-2 text-[9px] font-semibold leading-none tracking-normal ${status.cls}`}
                                  >
                                    {isMinDue ? (
                                      <AlertTriangle
                                        className="h-3 w-3 shrink-0 stroke-[2]"
                                        aria-hidden
                                      />
                                    ) : null}
                                    {isActionNeeded ? (
                                      <span
                                        className="shrink-0 text-[13px] font-extrabold leading-none"
                                        aria-hidden
                                      >
                                        !
                                      </span>
                                    ) : null}
                                    {isPaymentReady ? (
                                      <Zap
                                        className="h-3 w-3 shrink-0 stroke-[2]"
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span className="shrink-0">{status.text}</span>
                                    <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                  </ul>
                  {(() => {
                    const monthIdx = monthIndexFromLabel(selectedMonth) ?? 0
                    const start = new Date(2026, monthIdx, 1).getTime()
                    const end = new Date(2026, monthIdx + 1, 0, 23, 59, 59).getTime()
                    const dueCount = SNAPSHOT_CREDIT_OUTPOST.filter((c) => {
                      const t = creditDueDateSortKey(c.dueDateLabel)
                      return t <= end
                    }).length
                    return dueCount === 0 ? (
                      <div className="px-2 py-3 text-center">
                        <p className="text-[12px] font-semibold text-slate-600">All Caught Up</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          No Payments due at this time
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
              </div>

            </div>
          </section>

        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section
            className={cn(
              "flex min-h-[12rem] min-w-0 flex-1 flex-col overflow-hidden rounded-sm border shadow-sm",
              cardShellClass,
            )}
            style={roadmapCardMinHeight > 0 ? { minHeight: `${roadmapCardMinHeight}px` } : undefined}
            aria-labelledby="snapshot-activity-heading"
          >
            <header className={cardHeaderClass}>
              <div className="flex min-w-0 items-center gap-2">
                <h2
                  id="snapshot-activity-heading"
                  className={cn(cardTitleClass, "flex min-w-0 flex-1 items-center gap-2")}
                >
                  <List
                    className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">Recent Activity</span>
                </h2>
                <button
                  type="button"
                  onClick={openFullMonthActivity}
                  className="ml-auto inline-flex max-w-[min(100%,14rem)] shrink-0 cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-none"
                >
                  <span className="leading-snug">
                    Full {monthLongNameFromLabel(selectedMonth)} Activity
                  </span>
                  <Maximize2 className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                </button>
              </div>
            </header>
            <div className="relative flex min-h-0 flex-1 flex-col p-2">
              <Table className="text-[11px]">
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="h-8 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Date
                  </TableHead>
                  <TableHead className="h-8 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Transaction
                  </TableHead>
                  <TableHead className="h-8 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Category
                  </TableHead>
                  <TableHead className="h-8 px-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleActivityRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90"
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedActivityId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedActivityId(row.id)
                      }
                    }}
                  >
                    <TableCell
                      className={cn(
                        "px-2 py-1.5 text-[11px] tabular-nums",
                        ACTIVITY_ROW_HOVER_CELL_FIRST,
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500",
                      )}
                    >
                      <span className="inline-flex flex-wrap items-center gap-1.5 leading-tight">
                        <span>{row.dateLabel}</span>
                        {!row.fromStash &&
                        row.budgetMonthLabel &&
                        row.dateLabel.slice(0, 3) !== row.budgetMonthLabel.slice(0, 3) ? (
                          <span className="rounded border border-slate-200 bg-slate-50 px-1 py-px text-[9px] font-semibold tabular-nums text-slate-500">
                            {formatMonthAbbrevDisplay(row.budgetMonthLabel)}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "max-w-[13rem] truncate px-2 py-1.5 text-[11px]",
                        ACTIVITY_ROW_HOVER_CELL_MIDDLE,
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-700",
                      )}
                    >
                      {row.source}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "max-w-[8rem] truncate px-2 py-1.5 text-[11px]",
                        ACTIVITY_ROW_HOVER_CELL_MIDDLE,
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500",
                      )}
                    >
                      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {row.appliedToKey.startsWith("living:")
                          ? renderAssignToGlyph(row.appliedToKey, incomeItems)
                          : renderCategoryGlyph(row.category, row.flow, SNAPSHOT_GLYPH_LOOKUP)}
                        {row.fromStash && row.category === "Stash" ? (
                          <>
                            <span className="sr-only">Paid from My Stash</span>
                            <span className="shrink-0 rounded border border-amber-200/90 bg-amber-50/95 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-900/90">
                              Stash
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="truncate">{row.category}</span>
                            {row.fromStash ? (
                              <>
                                <span className="sr-only">Paid from My Stash</span>
                                <Receipt
                                  className="h-3 w-3 shrink-0 stroke-[1.75] text-slate-600"
                                  aria-hidden
                                />
                                <span className="shrink-0 rounded border border-amber-200/90 bg-amber-50/95 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-900/90">
                                  Stash
                                </span>
                              </>
                            ) : null}
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-2 py-1.5 text-right text-[11px] tabular-nums",
                        ACTIVITY_ROW_HOVER_CELL_LAST,
                        amountInter.className,
                        row.flow === "Income"
                          ? "text-emerald-700"
                          : row.flow === "Transfer"
                            ? "text-slate-500"
                            : "text-slate-700",
                      )}
                    >
                      {row.flow === "Income" ? "+" : row.flow === "Transfer" ? "" : "-"}$
                      {row.actual.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
              <div className="mt-auto border-t border-slate-100 pt-2 text-center">
                <p className="inline-flex items-baseline gap-1.5">
                  <span className={`text-sm font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>
                    {visibleActivityRows.length}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    of {sortedActivityRows.length} transactions this month
                  </span>
                </p>
              </div>
            </div>
          </section>

          <TimelineIncomeTankCard
            items={isEditingIncome ? incomeEditDraft : incomeItems}
            selectedMonth={selectedMonth}
            editMode={isEditingIncome}
            muted={false}
            elevated={isEditingIncome}
            headerTheme="softSlate"
            otherIncomeAmount={240}
            onAmountChange={handleIncomeAmountChange}
            onLabelChange={handleIncomeLabelChange}
            onStartEdit={startIncomeEdit}
            onSaveEdit={saveIncomeEdit}
            onCancelEdit={cancelIncomeEdit}
            onToggleDelete={handleIncomeToggleDelete}
            onAddItem={addIncomeItem}
          />
        </div>
      </div>

      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivityId(null)}>
        <DialogContent className="sm:max-w-[540px]">
          {selectedActivity ? (
            <>
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>
              <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Date</label>
                    <div className="min-w-0">
                      <span className="text-[14px] font-medium tabular-nums text-slate-800">
                        {selectedActivity.dateLabel}, {budgetYear}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <span className="text-right text-[12px] font-medium text-slate-500" id="statement-slider-label">
                      Statement
                    </span>
                    <div
                      className="flex min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-1.5"
                      role="radiogroup"
                      aria-labelledby="statement-slider-label"
                    >
                      <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {fundedStatementMonthOptions.map((opt) => {
                          const monthSelected =
                            activityFundedByDraft !== "stash" && statementMonthSlot === opt.value
                          const slotMonthIndex = statementSlotMonthIndex(opt.value, selectedMonth)
                          const slotFlags = getFlags(slotMonthIndex)
                          const archived = slotFlags.isArchived
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={monthSelected}
                              title={formatMonthStripTooltip(slotFlags, monthSelected)}
                              data-phase={
                                slotFlags.isLive ? "live" : archived ? "archived" : "future"
                              }
                              onClick={() => {
                                setStatementMonthSlot(opt.value)
                                setActivityFundedByDraft(opt.value)
                              }}
                              className={cn(
                                "min-w-[2.75rem] flex-1 cursor-pointer rounded-md px-2 py-1.5 text-center text-[12px] font-semibold tabular-nums transition-colors",
                                monthSelected
                                  ? "border border-transparent bg-[#0087D2] text-white shadow-sm hover:bg-[#006BB3]"
                                  : classNameForStatementMonthChipUnselected(slotFlags),
                              )}
                            >
                              <span className="flex items-center justify-center gap-1 leading-none">
                                {archived && (
                                  <Lock
                                    className={cn(
                                      "h-3 w-3 shrink-0 stroke-[1.5]",
                                      monthSelected ? "text-white" : "text-slate-400",
                                    )}
                                    aria-hidden
                                  />
                                )}
                                <span className={archived ? "italic" : undefined}>{opt.shortLabel}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <span
                        className="shrink-0 px-0.5 text-[12px] italic text-slate-500"
                        aria-hidden
                      >
                        or
                      </span>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={activityFundedByDraft === "stash"}
                        title="Use My Stash"
                        onClick={() => setActivityFundedByDraft("stash")}
                        className={cn(
                          "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                          activityFundedByDraft === "stash"
                            ? "border-[#0087D2] bg-[#0087D2] text-white shadow-sm hover:bg-[#006BB3]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <span className="whitespace-nowrap">My Stash</span>
                        <Receipt
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 stroke-[1.5]",
                            activityFundedByDraft === "stash" ? "text-white" : "text-slate-600",
                          )}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>

                  {stashExpenseModal ? (
                    <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-start gap-4">
                      <span className="min-w-0 shrink-0" aria-hidden />
                      <div className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] leading-relaxed text-slate-600">
                        <p>
                          This expense will be paid for directly from your Stash funds. It will not affect your
                          monthly bills, living funds, or final Cashout.
                        </p>
                      </div>
                    </div>
                  ) : stashIncomeModal ? (
                    <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-start gap-4">
                      <span className="min-w-0 shrink-0" aria-hidden />
                      <div className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] leading-relaxed text-slate-600">
                        <p>
                          This income will be credited directly to your Stash. It will not be assigned to scheduled
                          pay or other income lines for this budget month.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {statementArchivedMonthModal && (
                        <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-start gap-4">
                          <span className="min-w-0 shrink-0" aria-hidden />
                          <div className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] leading-relaxed text-slate-600">
                            <p className="font-semibold text-slate-700">
                              Amending the {selectedStatementMonthLongName} Statement
                            </p>
                            <p className="mt-1.5">
                              An amendment will be added to your {selectedStatementMonthLongName} Statement.
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                        <label className="text-right text-[12px] font-medium text-slate-500">Assign To</label>
                        <div className="min-w-0">
                          <Popover open={isAppliedToOpen} onOpenChange={setIsAppliedToOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="h-8 w-full justify-between border-slate-300 px-2 py-1 text-[13px] font-normal font-medium text-slate-800 shadow-none hover:bg-slate-50"
                              >
                                {activityAppliedToKeyDraft ? (
                                  <span className="inline-flex items-center gap-1.5 truncate">
                                    {renderAssignToGlyph(activityAppliedToKeyDraft, incomeItems, {
                                      alwaysVisible: true,
                                    })}
                                    <span className="truncate">
                                      {resolveSnapshotAppliedToLabel(activityAppliedToKeyDraft, incomeItems)}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="font-normal text-slate-500">Select assign to…</span>
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search…" className="h-9 text-[13px]" />
                              <CommandList className="max-h-[min(52vh,420px)]">
                                <CommandEmpty className="py-2 text-center text-[12px] text-slate-500">
                                  No match.
                                </CommandEmpty>
                                {selectedActivity.flow === "Income" ? (
                                  <>
                                    <CommandGroup heading="Scheduled pay">
                                      {appliedToPickerItems.scheduledIncome.map((opt) => (
                                        <CommandItem
                                          key={opt.key}
                                          value={`${opt.label} ${opt.key}`}
                                          onSelect={() => {
                                            setActivityAppliedToKeyDraft(opt.key)
                                            setIsAppliedToOpen(false)
                                          }}
                                          className="text-[13px]"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              activityAppliedToKeyDraft === opt.key ? "opacity-100" : "opacity-0",
                                            )}
                                          />
                                          {renderCategoryGlyph("Income", "Income", SNAPSHOT_GLYPH_LOOKUP, {
                                            alwaysVisible: true,
                                          })}
                                          <span className="ml-2">{opt.label}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                    <CommandGroup heading="Other income">
                                      <CommandItem
                                        value={`${appliedToPickerItems.otherIncome.label} ${appliedToPickerItems.otherIncome.key}`}
                                        onSelect={() => {
                                          setActivityAppliedToKeyDraft(appliedToPickerItems.otherIncome.key)
                                          setIsAppliedToOpen(false)
                                        }}
                                        className="text-[13px]"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            activityAppliedToKeyDraft === appliedToPickerItems.otherIncome.key
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {renderCategoryGlyph("Income", "Income", SNAPSHOT_GLYPH_LOOKUP, {
                                          alwaysVisible: true,
                                        })}
                                        <span className="ml-2">{appliedToPickerItems.otherIncome.label}</span>
                                      </CommandItem>
                                    </CommandGroup>
                                  </>
                                ) : (
                                  <>
                                    <CommandGroup heading="Living funds">
                                      {appliedToPickerItems.livingItems.map((opt) => (
                                        <CommandItem
                                          key={opt.key}
                                          value={`${opt.label} ${opt.key}`}
                                          onSelect={() => {
                                            setActivityAppliedToKeyDraft(opt.key)
                                            setIsAppliedToOpen(false)
                                          }}
                                          className="text-[13px]"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              activityAppliedToKeyDraft === opt.key ? "opacity-100" : "opacity-0",
                                            )}
                                          />
                                          {renderAssignToGlyph(opt.key, incomeItems, { alwaysVisible: true })}
                                          <span className="ml-2">{opt.label}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                    {appliedToPickerItems.billsAppliedToOptions.length > 0 ? (
                                      <CommandGroup heading="Bills">
                                        {appliedToPickerItems.billsAppliedToOptions.map((opt) => (
                                          <CommandItem
                                            key={opt.key}
                                            value={`${opt.label} ${opt.key}`}
                                            onSelect={() => {
                                              setActivityAppliedToKeyDraft(opt.key)
                                              setIsAppliedToOpen(false)
                                            }}
                                            className="text-[13px]"
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                activityAppliedToKeyDraft === opt.key ? "opacity-100" : "opacity-0",
                                              )}
                                            />
                                            {renderCategoryGlyph("Bills", "Expense", SNAPSHOT_GLYPH_LOOKUP, {
                                              alwaysVisible: true,
                                            })}
                                            <span className="ml-2">{opt.label}</span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ) : null}
                                  </>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    </>
                  )}

                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Amount</label>
                    <div className="min-w-0">
                      <span
                        className={`text-[15px] font-semibold tabular-nums ${amountInter.className} ${
                          selectedActivity.flow === "Income"
                            ? "text-emerald-700"
                            : selectedActivity.flow === "Transfer"
                              ? "text-slate-600"
                              : "text-slate-800"
                        }`}
                      >
                        {selectedActivity.flow === "Income"
                          ? "+"
                          : selectedActivity.flow === "Transfer"
                            ? ""
                            : "-"}
                        {fmtAmount(selectedActivity.actual)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Description</label>
                    <div className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold tracking-tight text-slate-800">
                        {selectedActivity.source}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Account</label>
                    <div className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-slate-800">
                        {selectedActivity.accountLabel ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedActivityId(null)}
                  className="cursor-pointer rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveActivityDetails}
                  disabled={
                    !hasPendingActivityChanges ||
                    (!stashExpenseModal && !stashIncomeModal && !activityAppliedToKeyDraft.trim())
                  }
                  className={cn(
                    "rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
                    hasPendingActivityChanges &&
                      (stashExpenseModal || stashIncomeModal || activityAppliedToKeyDraft.trim())
                      ? "cursor-pointer bg-[#0087D2] text-white hover:bg-[#006BB3]"
                      : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none",
                  )}
                >
                  Save
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedCreditCycle}
        onOpenChange={(open) => {
          if (!open) setSelectedCreditCycleId(null)
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          {selectedCreditCycle ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Settle {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)}
                </DialogTitle>
              </DialogHeader>
              <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                {(() => {
                  const isUnfunded = selectedCreditCycle.reservedPaymentFunds < selectedCreditCycle.minimumDue
                  
                  return (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-700">
                          {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)} (
                          {selectedCreditCycle.cycleLabel})
                        </p>
                      </div>

                      {isUnfunded ? (
                        <>
                          <div className="space-y-1.5">
                            <DottedLeaderRow left={<span>Converted to Debt</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.newSpending)}</span>} />
                            <DottedLeaderRow left={<span>Reserved Payment Funds</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.reservedPaymentFunds)}</span>} />
                            <DottedLeaderRow left={<span>Minimum Due</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.minimumDue)}</span>} />
                          </div>
                          
                          <div className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2">
                            <p className="text-[11px] font-medium text-amber-900">
                              Your reserved funds do not cover the bank's minimum payment. Choose how to fund the remaining {fmtDollars(Math.max(0, selectedCreditCycle.minimumDue - selectedCreditCycle.reservedPaymentFunds))}.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Link href="/accounts" className="inline-flex rounded bg-slate-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-slate-700">
                              Pay from {monthLongNameFromLabel(selectedMonth)} Income
                            </Link>
                            <Link href="/accounts" className="inline-flex rounded bg-slate-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-300">
                              Pay from My Stash
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <DottedLeaderRow left={<span>New Spending</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.newSpending)}</span>} />
                            <DottedLeaderRow left={<span>Reserved Payment Funds</span>} right={<span className={`font-semibold tabular-nums text-emerald-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.reservedPaymentFunds)}</span>} />
                          </div>

                          <div className="rounded border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] font-medium text-slate-600">
                              Your budget successfully secured these funds during cashout. Complete the bank transfer to{" "}
                              {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)} to clear
                              this cycle.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Link href="/accounts" className="inline-flex rounded bg-[#0087D2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-[#00487A]">
                              Transfer Payment
                            </Link>
                          </div>
                          
                          <p className={`text-[10px] font-medium text-slate-400 ${amountInter.className}`}>
                            Side note: Minimum due from issuer is {fmtDollars(selectedCreditCycle.minimumDue)} by{" "}
                            {fmtCreditDueDisplay(selectedCreditCycle.dueDateLabel)}.
                          </p>
                        </>
                      )}
                    </div>
                  )
                })()}
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isExpectedCashoutInfoOpen} onOpenChange={setIsExpectedCashoutInfoOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Expected Cashout</DialogTitle>
            <DialogDescription className="text-left text-[12px] leading-relaxed text-slate-600">
              Your &ldquo;Profit&rdquo; for the month. If all goes according to plan, this Cashout will be
              leftover money from the month that gets added to your STASH.
            </DialogDescription>
          </DialogHeader>
          <div
            className={`space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3 text-[12px] text-slate-700 ${amountInter.className}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-600">Starting funds</span>
              <span className="tabular-nums font-medium text-slate-800">{fmtDollars(SNAPSHOT_STARTING_FUNDS)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-600">− Bills (this month)</span>
              <span className="tabular-nums text-slate-700">−{fmtDollars(billsTotal)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-600">− Living Funds</span>
              <span className="tabular-nums text-slate-700">−{fmtDollars(livingBudget)}</span>
            </div>
            {livingOverageLines.length > 0 ? (
              livingOverageLines.map((line) => {
                const glyphMeta = SNAPSHOT_LIVING_GLYPH[line.id]
                return (
                  <div key={line.id} className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex min-w-0 flex-1 flex-wrap items-baseline gap-1 text-slate-600">
                      <span>
                        − {line.label}{" "}
                        <span className="text-slate-500">(overage)</span>
                      </span>
                      {glyphMeta ? (
                        <glyphMeta.Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 stroke-[1.5]",
                            glyphMeta.className,
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-700">−{fmtDollars(line.overage)}</span>
                  </div>
                )
              })
            ) : (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-600">− Living overage (none)</span>
                <span className="tabular-nums text-slate-700">−{fmtDollars(0)}</span>
              </div>
            )}
            {livingOverageLines.length > 1 ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-slate-200 pt-1.5">
                <span className="text-slate-600">Overage subtotal</span>
                <span className="tabular-nums font-medium text-slate-800">−{fmtDollars(livingOverage)}</span>
              </div>
            ) : null}
            <div className="border-t border-slate-200 pt-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-800">Expected cashout</span>
                <span className="tabular-nums font-semibold text-slate-800">{fmtDollars(expectedNet)}</span>
              </div>
            </div>
          </div>
          {expectedNet < 0 ? (
            <p className="mt-3 text-[12px] leading-relaxed text-rose-700">
              Your expected cashout is currently negative. At the end of the month, you will need to cover the
              difference from your Stash, or you will end up with some long-term debt.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreditOutpostAboutOpen} onOpenChange={setIsCreditOutpostAboutOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>About Credit Card Payments</DialogTitle>
          </DialogHeader>
          <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-600">
                Each card row represents a <span className="font-semibold">closed statement cycle</span>. The
                due date is when the issuer expects payment.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-700">
                    <Zap className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-[12px] font-semibold text-slate-800">Payment Ready</p>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Reserved funds cover the issuer&apos;s minimum due for this cycle.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-700">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-[12px] font-semibold text-slate-800">Minimum Due / Action Needed</p>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Reserved funds do not fully cover the minimum due yet. Choose how to fund the remaining amount
                  in the modal.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Tip: click any card to manage funding for that cycle.
              </p>
            </div>
          </section>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedBill !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBill(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bill</p>
                <p className="text-base font-medium text-slate-900">{selectedBill.listName}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due</p>
                <p>
                  Day {selectedBill.dueDay} of {monthLongNameFromLabel(selectedMonth)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                <p className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}>
                  {fmtDollars(selectedBill.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment</p>
                <p>
                  {selectedBill.paymentMode === "manual"
                    ? "Manual — pay on the biller's site or app when due (carrier, utilities, etc.)."
                    : "Autodraft — scheduled with your bank or biller."}
                </p>
              </div>
              {selectedBill.paymentMode === "manual" ? (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[11px] text-slate-500">
                    Jump to Accounts to record or complete payment.
                  </p>
                  <Link
                    href="/accounts"
                    className="inline-flex text-[12px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                  >
                    Pay from Accounts
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedLivingLine !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLivingLine(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Living Fund Details</DialogTitle>
          </DialogHeader>
          {selectedLivingLine ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</p>
                <p className="text-base font-medium text-slate-900">{selectedLivingLine.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Budget target</p>
                <p className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}>
                  {fmtDollars(selectedLivingLine.target)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spent so far</p>
                <p className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}>
                  {fmtDollars(selectedLivingLine.spent)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                {selectedLivingLine.spent > selectedLivingLine.target ? (
                  <p className="text-rose-700">
                    {fmtDollars(selectedLivingLine.spent - selectedLivingLine.target)} over budget
                  </p>
                ) : (
                  <p>
                    {fmtDollars(selectedLivingLine.target - selectedLivingLine.spent)} left in envelope
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {fullMonthActivityOpen
        ? createPortal(
            <div className="fixed inset-0 z-[200]">
              <div className="absolute inset-0 bg-black/45" aria-hidden />
              {fullMonthActivityAnchor ? (
              <div
                className="fixed z-[1] box-border flex min-w-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
                style={{
                  top: fullMonthActivityAnchor.top,
                  left: fullMonthActivityAnchor.left,
                  right: fullMonthActivityAnchor.rightInset,
                  bottom: FULL_MONTH_OVERLAY_INSET_PX,
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="snapshot-full-month-activity-title"
                  className="flex w-full min-w-0 flex-col"
                >
                  <div
                    className={cn(
                      "flex flex-col overflow-hidden rounded-sm",
                      cardShellClass,
                    )}
                  >
                <header
                  className={cn(
                    cardHeaderClass,
                    "shrink-0 rounded-t-sm px-3 sm:px-4",
                  )}
                >
                  <div className="relative flex min-w-0 items-center pr-10">
                    <h2 id="snapshot-full-month-activity-title" className={cardTitleClass}>
                      {monthLongNameFromLabel(selectedMonth)} Activity
                    </h2>
                    <button
                      type="button"
                      onClick={() => setFullMonthActivityOpen(false)}
                      className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                      aria-label="Close full month activity"
                      title="Close"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" aria-hidden />
                    </button>
                  </div>
                </header>

                <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor="snapshot-full-activity-account"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Account
                </label>
                <Select
                  value={fullActivityAccountFilter}
                  onValueChange={setFullActivityAccountFilter}
                >
                  <SelectTrigger
                    id="snapshot-full-activity-account"
                    className="h-8 w-full min-w-[10rem] text-[12px] sm:w-[11rem]"
                  >
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="all">All accounts</SelectItem>
                    {fullActivityAccountOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor="snapshot-full-activity-category"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Category (living funds)
                </label>
                <Select
                  value={fullActivityCategoryFilter}
                  onValueChange={setFullActivityCategoryFilter}
                >
                  <SelectTrigger
                    id="snapshot-full-activity-category"
                    className="h-8 w-full min-w-[10rem] text-[12px] sm:w-[13rem]"
                  >
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="all">All categories</SelectItem>
                    {fullActivityCategoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label
                  htmlFor="snapshot-full-activity-search"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Search
                </label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    id="snapshot-full-activity-search"
                    value={fullActivitySearch}
                    onChange={(e) => setFullActivitySearch(e.target.value)}
                    placeholder="Description, category…"
                    className="h-7 max-w-[10rem] min-w-0 px-2 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFullActivityAccountFilter("all")
                      setFullActivityCategoryFilter("all")
                      setFullActivitySearch("")
                    }}
                    disabled={
                      fullActivityAccountFilter === "all" &&
                      fullActivityCategoryFilter === "all" &&
                      fullActivitySearch.trim() === ""
                    }
                    className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline disabled:pointer-events-none disabled:text-slate-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

                <div className="flex w-full min-w-0 max-w-full flex-col bg-white">
                  <div className="w-full min-w-0 max-w-full overflow-x-auto px-3 sm:px-4">
                    <Table className="min-w-[44rem] max-w-full text-[11px]">
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Date
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Timeline
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Transaction
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Category
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Applied to
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Account
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Actual
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFullMonthActivityRows.map((row) => {
                    const budgetMonth = row.budgetMonthLabel
                    return (
                      <TableRow
                        key={row.id}
                        className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"
                        tabIndex={0}
                        role="button"
                        onClick={() => {
                          setFullMonthActivityOpen(false)
                          setSelectedActivityId(row.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setFullMonthActivityOpen(false)
                            setSelectedActivityId(row.id)
                          }
                        }}
                      >
                        <TableCell
                          className={cn(
                            "whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums",
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-500",
                          )}
                        >
                          <span className="inline-flex flex-wrap items-center gap-1.5 leading-tight">
                            <span>{row.dateLabel}</span>
                            {!row.fromStash &&
                            row.budgetMonthLabel &&
                            row.dateLabel.slice(0, 3) !== row.budgetMonthLabel.slice(0, 3) ? (
                              <span className="rounded border border-slate-200 bg-slate-50 px-1 py-px text-[9px] font-semibold tabular-nums text-slate-500">
                                {formatMonthAbbrevDisplay(budgetMonth)}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-700">
                          {monthLongNameFromLabel(budgetMonth)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "max-w-[14rem] truncate px-2 py-1.5 text-[11px]",
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-700",
                          )}
                        >
                          {row.source}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "max-w-[12rem] truncate px-2 py-1.5 text-[11px]",
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-500",
                          )}
                        >
                          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {row.appliedToKey.startsWith("living:")
                              ? renderAssignToGlyph(row.appliedToKey, incomeItems)
                              : renderCategoryGlyph(row.category, row.flow, SNAPSHOT_GLYPH_LOOKUP)}
                            <span className="truncate">{row.category}</span>
                            {row.fromStash && row.category === "Stash" ? (
                              <span className="shrink-0 rounded border border-amber-200/90 bg-amber-50/95 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-900/90">
                                Stash
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate px-2 py-1.5 text-[11px] text-slate-600">
                          {resolveSnapshotAppliedToLabel(row.appliedToKey, incomeItems)}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate px-2 py-1.5 text-[11px] text-slate-700">
                          {row.accountLabel ?? "Not linked"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap px-2 py-1.5 text-right text-[11px] tabular-nums",
                            amountInter.className,
                            row.flow === "Income"
                              ? "text-emerald-700"
                              : row.flow === "Transfer"
                                ? "text-slate-500"
                                : "text-slate-700",
                          )}
                        >
                          {row.flow === "Income" ? "+" : row.flow === "Transfer" ? "" : "-"}$
                          {row.actual.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                    </Table>
                  </div>
                  <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5 sm:px-4">
                    <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {filteredFullMonthActivityRows.length} transaction
                      {filteredFullMonthActivityRows.length === 1 ? "" : "s"}
                      {fullMonthActivityRows.length !== filteredFullMonthActivityRows.length
                        ? ` (filtered from ${fullMonthActivityRows.length})`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            </div>
              ) : null}
        </div>,
            document.body,
          )
        : null}

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onOpenChange={setIsSettleUpOpen}
        currentMonth={monthLongNameFromLabel(selectedMonth)}
        nextMonth={nextMonthLabel}
        startingFunds={SNAPSHOT_STARTING_FUNDS}
        totalExpenses={totalBudget + livingOverage}
        cashoutAmount={expectedNet}
        currentStashAmount={2450}
        isReadyToCashOut={isReadyToCashOut}
      />
    </div>
  )
}
