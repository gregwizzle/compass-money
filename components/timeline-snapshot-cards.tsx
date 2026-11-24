"use client"

import type { KeyboardEvent, Ref } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  CirclePlus,
  CreditCard,
  FileText,
  HelpCircle,
  List,
  Receipt,
  RefreshCw,
  Tag,
  Zap,
} from "lucide-react"
import { CATEGORY_GLYPH } from "@/components/roadmap-categories-grid"
import { DottedLeaderRow } from "@/components/dotted-leader-row"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  formatMonthAbbrevDisplay,
  monthIndexFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"
import {
  getSnapshotExpectedCashout,
  partitionBillsByPaid,
  SNAPSHOT_ACTIVITY_ROWS,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_EXPECTED_INCOME,
  SNAPSHOT_GLYPH_LOOKUP,
  SNAPSHOT_LIVING,
  SNAPSHOT_UPCOMING_PREVIEW,
  type SnapshotActivityRow,
  type SnapshotBill,
  type SnapshotLivingLine,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import type { ExpectedIncomeLine, TimelineCategory } from "@/lib/timeline-roadmap-data"
import { cn } from "@/lib/utils"

export type TimelineCreditCycle = {
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

/** Same closed-statement cycles as the Timeline page. */
export const TIMELINE_CREDIT_CYCLES: TimelineCreditCycle[] = [
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

const CARD_SHELL = "border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
const CARD_HEADER = "shrink-0 border-b border-slate-300 bg-white px-3 py-2.5"
const CARD_TITLE = "text-[15px] font-bold tracking-tight text-slate-600"

const SNAPSHOT_ROW_INTERACTIVE_CLASS =
  "-mx-1 cursor-pointer rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1"

const ACTIVITY_ROW_HOVER_CELL_FIRST =
  "transition-shadow duration-150 group-hover:shadow-[inset_1px_0_0_0_rgba(2,132,199,0.22),inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"
const ACTIVITY_ROW_HOVER_CELL_MIDDLE =
  "transition-shadow duration-150 group-hover:shadow-[inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"
const ACTIVITY_ROW_HOVER_CELL_LAST =
  "transition-shadow duration-150 group-hover:shadow-[inset_-1px_0_0_0_rgba(2,132,199,0.22),inset_0_1px_0_0_rgba(2,132,199,0.22),inset_0_-1px_0_0_rgba(2,132,199,0.22)]"

const CREDIT_OUTPOST_ROW_BUTTON_CLASS =
  "group w-full min-w-0 cursor-pointer rounded-lg border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-2 py-2 text-left shadow-sm transition-colors duration-150 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1 sm:px-3"

const CREDIT_PAYMENT_ROW_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[minmax(0,0.62fr)_minmax(0,1.45fr)_minmax(0,1.02fr)_minmax(0,0.78fr)] items-center gap-x-1.5 sm:gap-x-2"

const categoryGlyphClass =
  "shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-within:opacity-70"

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

function fmtCreditDueDisplay(dueDateLabel: string) {
  const raw = dueDateLabel.trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase()
    return `${month} ${parts[1]}`
  }
  return raw
}

function creditDueDateSortKey(dueDateLabel: string) {
  const raw = dueDateLabel.trim()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase()
    const t = new Date(`${month} ${parts[1]}, 2026`).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const t = new Date(`${raw} 2026`).getTime()
  return Number.isNaN(t) ? 0 : t
}

function statementClosedLabelFromCycle(cycleLabel: string) {
  const parts = cycleLabel.split(/\s+-\s+/)
  const last = parts[parts.length - 1]?.trim()
  return last && last.length > 0 ? last : cycleLabel.trim()
}

function flowFromAppliedKey(key: string): SnapshotActivityRow["flow"] {
  if (key === "transfer:general") return "Transfer"
  if (key.startsWith("income:")) return "Income"
  return "Expense"
}

function resolveCategoryFromApplied(key: string): { category: string } {
  if (key === "transfer:general") return { category: "Transfer" }
  if (key === "stash:direct" || key.startsWith("stash:")) return { category: "Stash" }
  if (key.startsWith("income:")) return { category: "Income" }
  if (key.startsWith("bill:")) return { category: "Bills" }
  if (key.startsWith("living:")) {
    const id = key.slice("living:".length)
    const line = SNAPSHOT_LIVING.find((item) => item.id === id)
    return { category: line?.name ?? "" }
  }
  return { category: "" }
}

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
  const matched = roadmapCategories.find((category) => category.name === displayCategory)
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

function renderAssignToGlyph(appliedKey: string) {
  if (appliedKey.startsWith("living:")) {
    const id = appliedKey.slice("living:".length)
    const glyph = SNAPSHOT_LIVING_GLYPH[id]
    if (glyph) {
      const { Icon, className: iconClass } = glyph
      return (
        <Icon
          className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, categoryGlyphClass)}
          aria-hidden
        />
      )
    }
  }
  const category = resolveCategoryFromApplied(appliedKey).category
  return renderCategoryGlyph(category, flowFromAppliedKey(appliedKey), SNAPSHOT_GLYPH_LOOKUP)
}

function daysUntilNextMonth(selectedMonth: MonthLabel) {
  const monthIndex = monthIndexFromLabel(selectedMonth)
  if (monthIndex == null) return 0
  const now = new Date()
  const day = now.getDate()
  const daysInSelectedMonth = new Date(DEFAULT_BUDGET_YEAR, monthIndex + 1, 0).getDate()
  const anchorDay = Math.min(day, daysInSelectedMonth)
  const anchor = new Date(DEFAULT_BUDGET_YEAR, monthIndex, anchorDay)
  const nextMonthFirst = new Date(DEFAULT_BUDGET_YEAR, monthIndex + 1, 1)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((nextMonthFirst.getTime() - anchor.getTime()) / msPerDay))
}

/** Default Timeline ledger: demo activity plus cleared income, newest first, first 14 rows. */
export function buildTimelineActivityPreview(
  selectedMonth: MonthLabel,
  incomeItems: ExpectedIncomeLine[] = SNAPSHOT_EXPECTED_INCOME,
) {
  const toSortableDate = (value: string) => {
    const date = new Date(`${value}, 2026`)
    return Number.isNaN(date.getTime()) ? -1 : date.getTime()
  }
  const clearedIncomeRows: SnapshotActivityRow[] = incomeItems
    .filter((line) => line.cleared)
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
  const sorted = [...SNAPSHOT_ACTIVITY_ROWS, ...clearedIncomeRows]
    .map((row) => ({ ...row, flow: flowFromAppliedKey(row.appliedToKey) }))
    .sort((a, b) => toSortableDate(b.dateLabel) - toSortableDate(a.dateLabel))
  return { visible: sorted.slice(0, 14), total: sorted.length }
}

function dueCyclesForMonth(selectedMonth: MonthLabel) {
  const monthIdx = monthIndexFromLabel(selectedMonth) ?? 0
  const end = new Date(2026, monthIdx + 1, 0, 23, 59, 59).getTime()
  return TIMELINE_CREDIT_CYCLES.filter((cycle) => creditDueDateSortKey(cycle.dueDateLabel) <= end).sort(
    (a, b) => creditDueDateSortKey(a.dueDateLabel) - creditDueDateSortKey(b.dueDateLabel),
  )
}

export function TimelineSnapshotCard({
  selectedMonth,
  cardRef,
  livingLines,
  expectedNet: expectedNetOverride,
  onSelectBill,
  onSelectLivingLine,
  onOpenCashoutInfo,
  onOpenBudget,
}: {
  selectedMonth: MonthLabel
  cardRef?: Ref<HTMLElement>
  /** Logbook living funds, including Curveballs. Falls back to the Timeline demo lines. */
  livingLines?: SnapshotLivingLine[]
  expectedNet?: number
  onSelectBill?: (bill: SnapshotBill) => void
  onSelectLivingLine?: (line: SnapshotLivingLine) => void
  onOpenCashoutInfo?: () => void
  onOpenBudget?: () => void
}) {
  const { upcoming } = partitionBillsByPaid(SNAPSHOT_AS_OF_DAY)
  const snapshotMath = getSnapshotExpectedCashout()
  const lines = livingLines ?? SNAPSHOT_LIVING
  const expectedNet = expectedNetOverride ?? snapshotMath.expectedNet
  const upcomingPreview = upcoming.slice(0, SNAPSHOT_UPCOMING_PREVIEW)
  const upcomingRest = Math.max(0, upcoming.length - SNAPSHOT_UPCOMING_PREVIEW)
  const countdown = daysUntilNextMonth(selectedMonth)

  return (
    <section
      ref={cardRef}
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border font-sans shadow-sm ${CARD_SHELL}`}
      aria-labelledby="snapshot-budget-heading"
    >
      <header className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2">
          <h2
            id="snapshot-budget-heading"
            className={cn(CARD_TITLE, "flex min-w-0 flex-1 items-center gap-2")}
          >
            <Camera className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
            <span className="min-w-0 truncate">Snapshot</span>
          </h2>
        </div>
      </header>
      <div className="relative z-10 min-w-0 space-y-4 p-3">
        <div className="px-2.5 pt-2 sm:px-3">
          <div className="mb-2 border-b border-slate-200 pb-2">
            <h3 className="text-[12px] font-semibold text-slate-700">Upcoming Bills</h3>
          </div>
          <ul className="space-y-2 pl-3 sm:pl-4">
            {upcomingPreview.map((bill) => (
              <li key={bill.id} className="min-w-0">
                <div
                  role="button"
                  tabIndex={0}
                  className={SNAPSHOT_ROW_INTERACTIVE_CLASS}
                  onClick={() => onSelectBill?.(bill)}
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onSelectBill?.(bill)
                    }
                  }}
                  aria-label={`Open bill details for ${bill.listName}`}
                >
                  <DottedLeaderRow
                    left={
                      <span className="inline-flex min-w-0 items-baseline gap-1.5">
                        <span
                          className={`w-[1.5rem] shrink-0 font-normal tabular-nums text-slate-500 ${amountInter.className}`}
                        >
                          {bill.dueDay}
                        </span>
                        <span className="min-w-0 truncate">{bill.listName}</span>
                      </span>
                    }
                    right={
                      <span
                        className={`w-[5.25rem] text-right text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                      >
                        {fmtDollars(bill.amount)}
                      </span>
                    }
                    afterRight={
                      <span className="inline-flex w-[2.25rem] justify-center">
                        {bill.paymentMode === "manual" ? (
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-[#0087D2]">
                            Pay
                          </span>
                        ) : (
                          <RefreshCw className="h-3 w-3 stroke-[1.8] text-slate-400" aria-label="Auto drafted" />
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
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span className="w-[1.5rem] shrink-0" aria-hidden />
                <button
                  type="button"
                  onClick={() => onOpenBudget?.()}
                  className="inline-flex cursor-pointer items-center gap-0.5 text-left text-[10px] font-medium italic tracking-wide text-[#0087D2] underline-offset-2 hover:underline"
                >
                  {upcomingRest} more this month
                  <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                </button>
              </span>
            </div>
          ) : null}
        </div>

        <div className="px-2.5 pb-3 sm:px-3">
          <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="shrink-0 text-[12px] font-semibold text-slate-700">Living Expenses</h3>
            <span className="shrink-0 text-right text-[11px] font-medium text-slate-500">
              Remaining Funds
            </span>
          </div>
          <div className="space-y-2.5 pl-3 sm:pl-4">
            {lines.map((line) => {
              const left = line.target - line.spent
              const isOver = left < 0
              const glyph = SNAPSHOT_LIVING_GLYPH[line.id]
              const Icon = glyph?.Icon
              return (
                <div
                  key={line.id}
                  role="button"
                  tabIndex={0}
                  className={SNAPSHOT_ROW_INTERACTIVE_CLASS}
                  onClick={() => onSelectLivingLine?.(line)}
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onSelectLivingLine?.(line)
                    }
                  }}
                  aria-label={`Open living fund details for ${line.name}`}
                >
                  <DottedLeaderRow
                    left={
                      <span className="inline-flex min-w-0 items-baseline gap-1.5">
                        {Icon ? (
                          <span className="inline-flex w-[1.5rem] shrink-0 justify-center">
                            <Icon
                              className={cn("h-4 w-4 shrink-0 stroke-[1.5]", glyph.className)}
                              aria-hidden
                            />
                          </span>
                        ) : null}
                        <span className="whitespace-nowrap">{line.shortName}</span>
                      </span>
                    }
                    right={
                      isOver ? (
                        <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                          <span className={`text-right text-[11px] font-semibold text-rose-700 ${amountInter.className}`}>
                            {fmtDollars(Math.abs(left))}
                          </span>
                          <span className="w-[2.25rem] text-right text-[11px] font-semibold text-rose-700">Over</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                          <span className={`text-right text-[11px] font-medium text-slate-500 ${amountInter.className}`}>
                            {fmtDollars(left)}
                          </span>
                          <span className="w-[2.25rem] text-right text-[11px] font-medium text-slate-500">Left</span>
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
                onClick={() => onOpenCashoutInfo?.()}
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
                    <span className="text-[1.3em] font-bold leading-none">{countdown}</span>{" "}
                    {countdown === 1 ? "day" : "days"}
                  </>
                )}
              </span>
              <Receipt className="ml-1 h-4 w-4 shrink-0 stroke-[1.7] text-orange-700/80" aria-hidden />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function TimelineCreditPaymentsCard({
  selectedMonth,
  onSelectCycle,
}: {
  selectedMonth: MonthLabel
  onSelectCycle?: (cycleId: string) => void
}) {
  const due = dueCyclesForMonth(selectedMonth)

  return (
    <section
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border font-sans shadow-sm ${CARD_SHELL}`}
      aria-labelledby="snapshot-credit-outpost-heading"
    >
      <header className={cn(CARD_HEADER, "flex items-center justify-between gap-3")}>
        <h2
          id="snapshot-credit-outpost-heading"
          className={cn(CARD_TITLE, "flex min-w-0 items-center gap-2")}
        >
          <CreditCard className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
          <span className="min-w-0 truncate">Credit Card Payments Due</span>
        </h2>
        <Link
          href="/accounts"
          className="inline-flex max-w-[min(100%,15rem)] shrink-0 cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-[18rem]"
        >
          <span>Credit Outpost</span>
          <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
        </Link>
      </header>
      <div className="relative z-10 min-w-0 space-y-4 bg-slate-50/40 p-3">
        <div className="px-2.5 sm:px-3">
          <div className="min-w-0 space-y-2 pl-3 sm:pl-4">
            <ul className="space-y-2">
              {due.map((cycle) => {
                const reserved = cycle.reservedPaymentFunds
                const minDue = cycle.minimumDue
                const isPaymentReady = reserved >= minDue
                const isMinDue = reserved === 0
                const isActionNeeded = reserved > 0 && !isPaymentReady
                const amount = isPaymentReady
                  ? { value: fmtDollars(reserved), label: "Reserved" }
                  : isActionNeeded
                    ? { value: fmtDollars(minDue - reserved), label: "Short" }
                    : { value: fmtDollars(minDue), label: "Needed" }
                const status = isPaymentReady
                  ? { text: "Payment Ready", cls: "text-emerald-700" }
                  : isMinDue
                    ? { text: "Minimum Due", cls: "text-amber-700" }
                    : { text: "Action Needed", cls: "text-rose-700" }
                const amountTone = isPaymentReady
                  ? "text-emerald-700"
                  : isMinDue
                    ? "text-amber-700"
                    : "text-rose-700"
                const amountLabelTone = isPaymentReady
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
                      onClick={() => onSelectCycle?.(cycle.id)}
                    >
                      <div className={CREDIT_PAYMENT_ROW_GRID_CLASS} role="row">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-slate-400">
                            DUE
                          </span>
                          <span
                            className={`mt-0.5 block text-center text-[11px] font-medium tabular-nums text-slate-600 ${amountInter.className}`}
                          >
                            {fmtCreditDueDisplay(cycle.dueDateLabel)}
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
                          <span className={`mt-0.5 block text-center text-[10px] font-semibold ${amountLabelTone}`}>
                            {amount.label}
                          </span>
                        </div>
                        <div className="w-full text-center">
                          <span
                            className={`flex w-full items-center justify-center gap-1 px-2 text-[9px] font-semibold leading-none tracking-normal ${status.cls}`}
                          >
                            {isMinDue ? (
                              <AlertTriangle className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                            ) : null}
                            {isActionNeeded ? (
                              <span className="shrink-0 text-[13px] font-extrabold leading-none" aria-hidden>
                                !
                              </span>
                            ) : null}
                            {isPaymentReady ? (
                              <Zap className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
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
            {due.length === 0 ? (
              <div className="px-2 py-3 text-center">
                <p className="text-[12px] font-semibold text-slate-600">All Caught Up</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">No Payments due at this time</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

const RECENT_ACTIVITY_ROW_CAP = 6

function billLabelFromAppliedKey(appliedToKey: string) {
  if (!appliedToKey.startsWith("bill:")) return null
  const id = appliedToKey.slice("bill:".length)
  return SNAPSHOT_BILLS.find((bill) => bill.id === id)?.listName ?? null
}

function isUnassignedActivity(row: SnapshotActivityRow) {
  return !row.appliedToKey || row.category === "Unassigned"
}

function activityRecency(row: SnapshotActivityRow) {
  const date = new Date(`${row.dateLabel}, ${DEFAULT_BUDGET_YEAR}`)
  return Number.isNaN(date.getTime()) ? -1 : date.getTime()
}

/** Newest six in date order, plus any older unassigned rows that fell outside that window. */
export function selectRecentActivityDisplay(rows: SnapshotActivityRow[], cap = RECENT_ACTIVITY_ROW_CAP) {
  const byRecency = (a: SnapshotActivityRow, b: SnapshotActivityRow) => activityRecency(b) - activityRecency(a)
  const ordered = [...rows].sort(byRecency)
  const recent = ordered.slice(0, cap)
  const shown = new Set(recent.map((row) => row.id))
  const additionalUnassigned = ordered.filter((row) => isUnassignedActivity(row) && !shown.has(row.id))
  return { recent, additionalUnassigned }
}

export function TimelineRecentActivityCard({
  selectedMonth: _selectedMonth,
  rows,
  totalCount,
  minHeight,
  onOpenFullMonth,
  onSelectRow,
}: {
  selectedMonth: MonthLabel
  rows: SnapshotActivityRow[]
  totalCount: number
  minHeight?: number
  onOpenFullMonth?: () => void
  onSelectRow?: (rowId: string) => void
}) {
  const { recent, additionalUnassigned } = selectRecentActivityDisplay(rows)
  const shownCount = recent.length + additionalUnassigned.length

  const renderActivityRow = (row: SnapshotActivityRow) => (
    <TableRow
      key={row.id}
      className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90"
      tabIndex={0}
      role="button"
      onClick={() => onSelectRow?.(row.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelectRow?.(row.id)
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
        {isUnassignedActivity(row) ? (
          <span className="inline-flex min-w-0 items-center gap-x-1.5">
            <Tag
              className={cn("h-4 w-4 shrink-0 stroke-[1.5] text-slate-500", categoryGlyphClass)}
              aria-hidden
            />
            <span className="text-[11px] font-medium text-[#0087D2]">Assign →</span>
          </span>
        ) : (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {row.appliedToKey.startsWith("living:")
              ? renderAssignToGlyph(row.appliedToKey)
              : renderCategoryGlyph(
                  billLabelFromAppliedKey(row.appliedToKey) ? "Bills" : row.category,
                  row.flow,
                  SNAPSHOT_GLYPH_LOOKUP,
                )}
            {row.fromStash && row.category === "Stash" ? (
              <>
                <span className="sr-only">Paid from My Stash</span>
                <span className="shrink-0 rounded border border-amber-200/90 bg-amber-50/95 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-900/90">
                  Stash
                </span>
              </>
            ) : (
              <>
                <span className="truncate">{billLabelFromAppliedKey(row.appliedToKey) ?? row.category}</span>
                {row.fromStash ? (
                  <>
                    <span className="sr-only">Paid from My Stash</span>
                    <Receipt className="h-3 w-3 shrink-0 stroke-[1.75] text-slate-600" aria-hidden />
                    <span className="shrink-0 rounded border border-amber-200/90 bg-amber-50/95 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-900/90">
                      Stash
                    </span>
                  </>
                ) : null}
              </>
            )}
          </span>
        )}
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
  )

  return (
    <section
      className={cn(
        "flex min-h-[12rem] min-w-0 flex-1 flex-col overflow-hidden rounded-sm border font-sans shadow-sm",
        CARD_SHELL,
      )}
      style={minHeight && minHeight > 0 ? { minHeight: `${minHeight}px` } : undefined}
      aria-labelledby="snapshot-activity-heading"
    >
      <header className={CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2">
          <h2
            id="snapshot-activity-heading"
            className={cn(CARD_TITLE, "flex min-w-0 flex-1 items-center gap-2")}
          >
            <List className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
            <span className="min-w-0 truncate">Recent Activity</span>
          </h2>
          <button
            type="button"
            onClick={() => onOpenFullMonth?.()}
            className="ml-auto inline-flex max-w-[min(100%,14rem)] shrink-0 cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-none"
          >
            <span className="leading-snug">View all</span>
            <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
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
            {recent.map(renderActivityRow)}
            {additionalUnassigned.length > 0 ? (
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableCell colSpan={4} className="px-2 py-1.5 text-center">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Additional Unassigned Activity
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
            {additionalUnassigned.map(renderActivityRow)}
          </TableBody>
        </Table>
        <div className="mt-auto border-t border-slate-100 pt-2 text-center">
          <p className="inline-flex items-baseline gap-1.5">
            <span className={`text-sm font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>
              {shownCount}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              of {totalCount} transactions this month
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
