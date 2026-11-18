"use client"

import { Suspense, useMemo, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  Info,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react"
import { ActivityLedger } from "@/components/activity-ledger"
import { DottedLeaderRow } from "@/components/dotted-leader-row"
import { HeaderYearControl } from "@/components/header-year-control"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import { SettleUpModal } from "@/components/settle-up-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getSnapshotExpectedCashout,
  getSnapshotLivingNetRemaining,
  getSnapshotLivingOverageLines,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_LIVING,
  SNAPSHOT_STARTING_FUNDS,
  type SnapshotBill,
  type SnapshotLivingLine,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  getMonthStripFlags,
  monthIndexFromLabel,
  monthLongNameFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"
import { cn } from "@/lib/utils"

type Timeline2Tab = "plan" | "activity" | "income-dock" | "cashout"

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

type BillStatus = "paid" | "autodraft" | "pay" | "pending"

const TABS: { id: Timeline2Tab; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "activity", label: "Activity" },
  { id: "income-dock", label: "Income Dock" },
]

/** Demo actuals when paid amount differs from estimate (layout-only). */
const BILL_ACTUAL_BY_ID: Record<string, number> = {
  electric: 158,
}

/** Demo: show PENDING gutter for a couple of far-out upcoming bills. */
const BILL_PENDING_IDS = new Set(["software", "music"])

/** Same cycles as Timeline / SnapshotWorkspace. */
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

const SNAPSHOT_ROW_INTERACTIVE_CLASS =
  "-mx-1 cursor-pointer rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1"

const CREDIT_OUTPOST_ROW_BUTTON_CLASS =
  "group w-full min-w-0 cursor-pointer rounded-lg border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-2 py-2 text-left shadow-sm transition-colors duration-150 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1 sm:px-3"

const CREDIT_PAYMENT_ROW_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-[minmax(0,0.62fr)_minmax(0,1.45fr)_minmax(0,1.02fr)_minmax(0,0.78fr)] items-center gap-x-1.5 sm:gap-x-2"

const BILL_STATUS_GUTTER_CLASS = "inline-flex w-[2.75rem] shrink-0 items-center justify-center"

function fmtDollars(n: number) {
  return `$${n.toLocaleString()}`
}

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

function fmtCreditCardName(cardLabel: string, lastFour: string) {
  return `${cardLabel} · ${lastFour}`
}

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
    const t = new Date(`${month} ${day}, ${DEFAULT_BUDGET_YEAR}`).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const t = new Date(`${raw} ${DEFAULT_BUDGET_YEAR}`).getTime()
  return Number.isNaN(t) ? 0 : t
}

function statementClosedLabelFromCycle(cycleLabel: string) {
  const parts = cycleLabel.split(/\s+-\s+/)
  const last = parts[parts.length - 1]?.trim()
  return last && last.length > 0 ? last : cycleLabel.trim()
}

function getBillStatus(bill: SnapshotBill, asOfDay: number): BillStatus {
  if (bill.dueDay <= asOfDay) return "paid"
  if (BILL_PENDING_IDS.has(bill.id)) return "pending"
  if (bill.paymentMode === "manual") return "pay"
  return "autodraft"
}

function MathLabelTip({
  label,
  tip,
  emphasize = false,
}: {
  label: string
  tip: string
  emphasize?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "mb-1 cursor-help whitespace-nowrap text-[11.5px] italic leading-none tracking-wide transition-colors hover:text-slate-600 focus-visible:text-slate-600 focus-visible:outline-none",
            emphasize
              ? "font-semibold text-slate-600"
              : "font-medium text-slate-400",
          )}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-[260px] border border-slate-700/80 bg-slate-800 px-2.5 py-2 text-[11.5px] leading-snug text-white shadow-md"
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function BillStatusGutter({ status }: { status: BillStatus }) {
  if (status === "paid") {
    return (
      <span className={BILL_STATUS_GUTTER_CLASS} aria-label="Paid">
        <ReceivedCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
      </span>
    )
  }
  if (status === "autodraft") {
    return (
      <span className={BILL_STATUS_GUTTER_CLASS} aria-label="Auto drafted">
        <RefreshCw className="h-3 w-3 stroke-[1.8] text-slate-400" aria-hidden />
      </span>
    )
  }
  if (status === "pay") {
    return (
      <span className={BILL_STATUS_GUTTER_CLASS}>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-[#0087D2]">
          PAY
        </span>
      </span>
    )
  }
  return (
    <span className={BILL_STATUS_GUTTER_CLASS}>
      <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
        PENDING
      </span>
    </span>
  )
}

/**
 * Timeline 2: Plan two-column layout + persistent scoreboard header + Timeline modals.
 */
export function Timeline2Workspace() {
  const { selectedMonth, setSelectedMonth } = useMonthSelection()
  const [activeTab, setActiveTab] = useState<Timeline2Tab>("plan")
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false)
  const [isCreditOutpostAboutOpen, setIsCreditOutpostAboutOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<SnapshotBill | null>(null)
  const [selectedLivingLine, setSelectedLivingLine] = useState<SnapshotLivingLine | null>(null)
  const [selectedCreditCycleId, setSelectedCreditCycleId] = useState<string | null>(null)
  /** Demo: Dec 1+ unlocks cashout; false = locked until next month 1st. */
  const isCashoutUnlocked = false

  const monthName = monthLongNameFromLabel(selectedMonth)
  const monthAbbrev = selectedMonth.toUpperCase()
  const selectedMonthIndex = monthIndexFromLabel(selectedMonth) ?? 0
  const isArchivedMonth = getMonthStripFlags(selectedMonthIndex, {
    budgetYear: DEFAULT_BUDGET_YEAR,
  }).isArchived
  const { expectedNet, totalBudget, billsTotal, livingBudget, livingOverage } = useMemo(
    () => getSnapshotExpectedCashout(),
    [],
  )
  const livingNetRemaining = useMemo(() => getSnapshotLivingNetRemaining(), [])
  const livingOverageLines = useMemo(() => getSnapshotLivingOverageLines(), [])
  const livingFundsLeft = Math.max(0, livingNetRemaining)

  const allBillsChronological = useMemo(
    () => [...SNAPSHOT_BILLS].sort((a, b) => a.dueDay - b.dueDay),
    [],
  )

  const billsUpcomingTotal = useMemo(
    () =>
      SNAPSHOT_BILLS.filter((b) => b.dueDay > SNAPSHOT_AS_OF_DAY).reduce(
        (s, b) => s + b.amount,
        0,
      ),
    [],
  )

  const prevMonthLabel = monthLongNameFromLabel(
    MONTH_LABELS[(selectedMonthIndex + 11) % 12] as MonthLabel,
  )
  const nextMonthLabel =
    MONTH_LABELS[(selectedMonthIndex + 1) % 12] != null
      ? monthLongNameFromLabel(
          MONTH_LABELS[(selectedMonthIndex + 1) % 12] as MonthLabel,
        )
      : "Next Month"

  const creditCyclesDue = useMemo(() => {
    const monthIdx = monthIndexFromLabel(selectedMonth) ?? 0
    const end = new Date(DEFAULT_BUDGET_YEAR, monthIdx + 1, 0, 23, 59, 59).getTime()
    return [...SNAPSHOT_CREDIT_OUTPOST]
      .filter((c) => creditDueDateSortKey(c.dueDateLabel) <= end)
      .sort(
        (a, b) =>
          creditDueDateSortKey(a.dueDateLabel) - creditDueDateSortKey(b.dueDateLabel),
      )
  }, [selectedMonth])

  const selectedCreditCycle = useMemo(
    () => SNAPSHOT_CREDIT_OUTPOST.find((cycle) => cycle.id === selectedCreditCycleId) ?? null,
    [selectedCreditCycleId],
  )

  const livingFundsEquation = livingBudget + livingOverage

  const planInnerCardClass =
    "flex min-w-0 flex-col overflow-hidden rounded-sm border border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"

  return (
    <div className="relative flex flex-col">
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 pt-3">
        {/* Master year + month selector */}
        <div className={cn(planInnerCardClass, "flex-row items-center gap-2 p-1.5")}>
          <Suspense
            fallback={
              <span
                className={`px-1.5 text-sm font-semibold tabular-nums text-slate-400 ${amountInter.className}`}
              >
                …
              </span>
            }
          >
            <HeaderYearControl variant="compact" />
          </Suspense>
          <span className="shrink-0 text-slate-300" aria-hidden>
            |
          </span>
          <div className="min-w-0 flex-1">
            <MonthStrip
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        </div>

        {/* Active-month header: November | tabs · math — single row */}
        <header
          className={cn(planInnerCardClass, "flex-row items-center justify-between gap-4 px-5 py-3")}
          aria-labelledby="timeline-2-heading"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2
              id="timeline-2-heading"
              className="min-w-0 shrink-0 text-[20px] font-bold tracking-tight text-slate-900"
            >
              {monthName}
            </h2>
            <span className="shrink-0 text-slate-300" aria-hidden>
              |
            </span>
            <div
              className="inline-flex w-auto max-w-full items-center gap-1"
              role="tablist"
              aria-label="Timeline 2 sections"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "cursor-pointer px-1.5 py-1 text-[12px] font-medium transition-colors duration-200",
                      isActive
                        ? "font-semibold text-[#0087D2]"
                        : "text-stone-500 hover:text-slate-700",
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            className="ml-auto flex min-w-0 shrink-0 items-center gap-3.5"
            aria-label="Month math"
          >
            <div className="hidden items-center gap-3.5 xl:flex">
              <div className="flex flex-col items-center">
                <MathLabelTip
                  label="Starting Funds"
                  tip="Total income collected last month that rolled forward to fund this month."
                />
                <span
                  className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-800 ${amountInter.className}`}
                >
                  {fmtCurrencyPlain(SNAPSHOT_STARTING_FUNDS)}
                </span>
              </div>
              <span
                className="select-none self-center text-[15px] font-medium leading-none text-slate-400"
                aria-hidden
              >
                −
              </span>
              <div className="flex flex-col items-center">
                <MathLabelTip
                  label="Bills"
                  tip="100% of this month's scheduled bills—both paid and upcoming—reserved upfront."
                />
                <span
                  className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-800 ${amountInter.className}`}
                >
                  {fmtCurrencyPlain(billsTotal)}
                </span>
              </div>
              <span
                className="select-none self-center text-[15px] font-medium leading-none text-slate-400"
                aria-hidden
              >
                −
              </span>
              <div className="flex flex-col items-center">
                <MathLabelTip
                  label="Living Funds"
                  tip="Assumes 100% of your funded categories plus any overages will be spent, protecting your remaining balance."
                />
                <span
                  className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-800 ${amountInter.className}`}
                >
                  {fmtCurrencyPlain(livingFundsEquation)}
                </span>
              </div>
              <span
                className="select-none self-center text-[15px] font-medium leading-none text-slate-400"
                aria-hidden
              >
                =
              </span>
            </div>
            <div className="flex flex-col items-center">
              <MathLabelTip
                label="Cashout"
                tip="Projected monthly surplus swept into STASH at month-end (recalculated from actual spending when you close the month)."
                emphasize
              />
              <span
                className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-900 ${amountInter.className}`}
              >
                {fmtCurrencyPlain(expectedNet)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("cashout")}
              aria-pressed={activeTab === "cashout"}
              aria-label={
                isArchivedMonth
                  ? `Open Cashout Receipt for ${monthName}`
                  : `Open Cashout for ${monthName}`
              }
              className={cn(
                "shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-0 bg-emerald-50 px-3.5 py-1.5 text-[13px] font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100/80 hover:text-emerald-800 hover:shadow-[0_2px_10px_rgba(16,185,129,0.22)] hover:ring-1 hover:ring-emerald-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1",
                activeTab === "cashout" &&
                  "bg-emerald-100/90 text-emerald-800 shadow-[0_2px_8px_rgba(16,185,129,0.18)]",
              )}
            >
              {isArchivedMonth ? (
                <span>Cashout Receipt</span>
              ) : activeTab !== "cashout" && isCashoutUnlocked ? (
                <span className="inline-flex flex-col items-center">
                  <span className="text-[12.5px] font-bold leading-tight">
                    Cashout {monthAbbrev} &raquo;
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-medium leading-none text-emerald-600/80">
                    <span
                      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                      aria-hidden
                    />
                    Ready
                  </span>
                </span>
              ) : (
                <span>
                  Cashout {monthAbbrev} &raquo;
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="relative z-10 min-w-0 space-y-4">
          {activeTab === "plan" ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
              {/* Left stack: Living Funds → Credit Cards */}
              <div className="flex min-w-0 flex-col gap-4">
                  <article
                    className={planInnerCardClass}
                    aria-labelledby="timeline-2-living-heading"
                  >
                    <div className="border-b border-slate-200 px-3 py-2.5">
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        <h3
                          id="timeline-2-living-heading"
                          className="shrink-0 text-[12px] font-semibold text-slate-700"
                        >
                          Living Funds
                        </h3>
                        <div className="inline-flex min-w-0 max-w-full shrink-0 items-baseline justify-end gap-3 whitespace-nowrap text-right text-[11px] text-slate-500 sm:gap-4">
                          <span
                            className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                          >
                            {fmtDollars(livingBudget)} Total Funded
                            <span className="pl-2 font-normal text-slate-300 sm:pl-2.5" aria-hidden>
                              |
                            </span>
                          </span>
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
                    <div className="space-y-2.5 px-3 py-3 sm:px-4">
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
                                    <span
                                      className={`text-right text-[11px] font-semibold text-rose-700 ${amountInter.className}`}
                                    >
                                      {fmtDollars(overAmt)}
                                    </span>
                                    <span className="w-[2.25rem] text-right text-[11px] font-semibold text-rose-700">
                                      Over
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-baseline justify-end pr-0.5 tabular-nums">
                                    <span
                                      className={`text-right text-[11px] font-medium text-slate-500 ${amountInter.className}`}
                                    >
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
                  </article>

                  <article
                    className={planInnerCardClass}
                    aria-labelledby="timeline-2-credit-heading"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <CreditCard
                          className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]"
                          aria-hidden
                        />
                        <h3
                          id="timeline-2-credit-heading"
                          className="text-[12px] font-semibold text-slate-700"
                        >
                          Credit Card Payments
                        </h3>
                      </div>
                      <button
                        type="button"
                        className="inline-flex max-w-[min(100%,12rem)] shrink-0 cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-[15rem]"
                        onClick={() => setIsCreditOutpostAboutOpen(true)}
                      >
                        <span>About Credit Cards & Reserves</span>
                        <Info className="h-3.5 w-3.5 shrink-0 stroke-[2]" aria-hidden />
                      </button>
                    </div>
                    <div className="space-y-2 bg-slate-50/40 p-3">
                      {creditCyclesDue.length === 0 ? (
                        <div className="px-2 py-3 text-center">
                          <p className="text-[12px] font-semibold text-slate-600">All Caught Up</p>
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            No Payments due at this time
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {creditCyclesDue.map((cycle) => {
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
                                  onClick={() => setSelectedCreditCycleId(cycle.id)}
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
                                        Statement Closed{" "}
                                        {statementClosedLabelFromCycle(cycle.cycleLabel)}
                                      </div>
                                    </div>
                                    <div className="w-full text-center">
                                      <span
                                        className={`block text-center text-[11px] font-semibold tabular-nums ${amountTone} ${amountInter.className}`}
                                      >
                                        {amount.value}
                                      </span>
                                      <span
                                        className={`mt-0.5 block text-center text-[10px] font-semibold ${amountLabelTone}`}
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
                                        <ChevronRight
                                          className="h-3 w-3 shrink-0 stroke-[2]"
                                          aria-hidden
                                        />
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </article>
              </div>

              {/* Right: full-height Bills */}
              <article className={planInnerCardClass} aria-labelledby="timeline-2-bills-heading">
                <div className="border-b border-slate-200 px-3 py-2.5">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <h3
                      id="timeline-2-bills-heading"
                      className="shrink-0 text-[12px] font-semibold text-slate-700"
                    >
                      Bills
                    </h3>
                    <div className="inline-flex min-w-0 max-w-full shrink-0 items-baseline justify-end gap-3 whitespace-nowrap text-right text-[11px] text-slate-500 sm:gap-4">
                      <span
                        className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                      >
                        {fmtDollars(billsTotal)} Total Reserved
                        <span className="pl-2 font-normal text-slate-300 sm:pl-2.5" aria-hidden>
                          |
                        </span>
                      </span>
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
                <ul className="space-y-2 px-3 py-3 sm:px-4">
                  {allBillsChronological.map((b) => {
                    const status = getBillStatus(b, SNAPSHOT_AS_OF_DAY)
                    const estimate = b.amount
                    const actual = BILL_ACTUAL_BY_ID[b.id]
                    const showVariance =
                      status === "paid" && actual != null && actual !== estimate
                    const displayAmount = showVariance ? actual : estimate

                    return (
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
                                {showVariance ? (
                                  <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                    (est. {fmtDollars(estimate)})
                                  </span>
                                ) : null}
                              </span>
                            }
                            right={
                              <span
                                className={`text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`}
                              >
                                {fmtDollars(displayAmount)}
                              </span>
                            }
                            afterRight={<BillStatusGutter status={status} />}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </article>
            </div>
          ) : null}

            {activeTab === "activity" ? (
              <div className="min-w-0">
                <ActivityLedger />
              </div>
            ) : null}

            {activeTab === "income-dock" ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-[13px] font-medium text-slate-500">
                Income Dock goes here
              </div>
            ) : null}

            {activeTab === "cashout" ? (
              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                <article
                  className={cn(planInnerCardClass, "h-full")}
                  aria-labelledby="timeline-2-cashout-how-heading"
                >
                  <div className="border-b border-slate-200 px-3 py-2.5">
                    <h3
                      id="timeline-2-cashout-how-heading"
                      className="text-[12px] font-semibold text-slate-700"
                    >
                      How Cash Out Works
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col gap-5 px-3 py-4">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[13px] font-bold text-slate-600">
                          1
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            Finalize {monthName}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            We tally up your actual expenses and subtract them from your Starting
                            Funds.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 text-[13px] font-bold text-[#0087D2]">
                          2
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0087D2]">Sweep the Cashout</h4>
                          <p className="mt-1 text-sm text-slate-600">
                            The remaining amount becomes your Cashout and is safely added to your
                            Stash.
                            <span className="mt-1.5 block text-[13px] italic text-slate-500">
                              (If you overspent, the difference will be deducted from your Stash
                              instead.)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px] font-bold text-emerald-700">
                          3
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-700">Start Fresh</h4>
                          <p className="mt-1 text-sm text-slate-600">
                            Your {monthName} Income rolls over to become your Starting Funds for{" "}
                            {nextMonthLabel}!
                          </p>
                        </div>
                      </div>
                    </div>

                    <p
                      className={`mt-auto flex items-center gap-1.5 text-lg font-medium italic text-orange-700/90 ${myJourneyNav.className}`}
                    >
                      Keep it up!
                      <Sparkles className="h-4 w-4 text-orange-700/80" aria-hidden />
                    </p>

                    {isArchivedMonth ? (
                      <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-800">
                        <ReceivedCheckIcon className="h-4 w-4 text-emerald-600" />
                        <span className="text-[13px] font-semibold">Swept to Stash</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isCashoutUnlocked) setIsSettleUpOpen(true)
                        }}
                        disabled={!isCashoutUnlocked}
                        className={cn(
                          "group inline-flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-5 py-2.5 shadow-sm transition-colors duration-150",
                          isCashoutUnlocked
                            ? "cursor-pointer bg-[#0087D2] text-white hover:bg-[#00487A] active:bg-[#00365D]"
                            : "cursor-not-allowed border border-slate-200/80 bg-gradient-to-b from-slate-200 to-slate-200 text-slate-400",
                        )}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="text-[12px] font-bold uppercase tracking-wide">
                            Cash Out {monthName}
                          </span>
                          <span
                            className={cn(
                              "pb-px text-[17px] font-black leading-none",
                              isCashoutUnlocked ? "text-amber-400" : "text-slate-300",
                            )}
                            aria-hidden
                          >
                            &raquo;
                          </span>
                          <span
                            className={cn(
                              `text-[15px] font-medium italic leading-tight ${myJourneyNav.className}`,
                              isCashoutUnlocked ? "text-white" : "text-slate-500",
                            )}
                          >
                            Advance to {nextMonthLabel}
                          </span>
                        </span>
                        {!isCashoutUnlocked ? (
                          <span className="text-[10px] font-medium italic leading-tight text-slate-500">
                            Unlocks on {nextMonthLabel} 1st
                          </span>
                        ) : null}
                      </button>
                    )}
                  </div>
                </article>

                <article
                  className={planInnerCardClass}
                  aria-labelledby="timeline-2-understanding-heading"
                >
                  <div className="border-b border-slate-200 px-3 py-2.5">
                    <h3
                      id="timeline-2-understanding-heading"
                      className="text-[12px] font-semibold text-slate-700"
                    >
                      Understanding Your Numbers
                    </h3>
                  </div>
                  <div className="space-y-5 px-3 py-4 text-[12.5px] leading-relaxed text-slate-600">
                    <section className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-[13px] font-semibold text-slate-800">Starting Funds</h4>
                        <span
                          className={`rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-slate-800 ${amountInter.className}`}
                        >
                          {fmtDollars(SNAPSHOT_STARTING_FUNDS)}
                        </span>
                      </div>
                      <p>
                        This is total income collected in{" "}
                        <span className="font-semibold text-slate-700">{prevMonthLabel}</span> that
                        rolled forward to fund{" "}
                        <span className="font-semibold text-slate-700">{monthName}</span>. Paychecks
                        arriving during {monthName} stage in{" "}
                        <span className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold text-slate-700">
                          Income Dock
                        </span>{" "}
                        for {nextMonthLabel}.
                      </p>
                    </section>

                    <section className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-[13px] font-semibold text-slate-800">Bills</h4>
                        <span
                          className={`rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-slate-800 ${amountInter.className}`}
                        >
                          {fmtDollars(billsTotal)}
                        </span>
                      </div>
                      <p>
                        This reserves 100% of scheduled bills—both already paid and still
                        upcoming (
                        <span
                          className={`rounded bg-amber-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800 ${amountInter.className}`}
                        >
                          {fmtDollars(billsUpcomingTotal)} Left
                        </span>
                        )—so upcoming bills are never mistaken for extra profit.
                      </p>
                    </section>

                    <section className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-[13px] font-semibold text-slate-800">Living Funds</h4>
                        <span
                          className={`rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-slate-800 ${amountInter.className}`}
                        >
                          {fmtDollars(livingFundsEquation)}
                        </span>
                      </div>
                      <p>
                        This assumes 100% of funded categories (
                        <span
                          className={`rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
                        >
                          {fmtDollars(livingBudget)}
                        </span>
                        )
                        {livingOverageLines.length > 0 ? (
                          <>
                            {" "}
                            plus any category overages (
                            {livingOverageLines.map((line, i) => (
                              <span key={line.id}>
                                {i > 0 ? ", " : null}
                                <span
                                  className={`rounded bg-rose-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-rose-700 ${amountInter.className}`}
                                >
                                  {line.label} ({fmtDollars(line.overage)})
                                </span>
                              </span>
                            ))}
                            )
                          </>
                        ) : (
                          <> with no category overages</>
                        )}{" "}
                        will be spent, keeping your remaining{" "}
                        <span
                          className={`rounded bg-emerald-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 ${amountInter.className}`}
                        >
                          {fmtDollars(livingFundsLeft)} Left
                        </span>{" "}
                        safely protected.
                      </p>
                    </section>

                    <section className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-[13px] font-semibold text-slate-800">
                          {isArchivedMonth
                            ? "Final Cashout"
                            : "Expected vs. Actual Cashout"}
                        </h4>
                        <span
                          className={`rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-slate-900 ${amountInter.className}`}
                        >
                          {fmtDollars(expectedNet)}
                        </span>
                      </div>
                      <p>
                        {isArchivedMonth ? (
                          <>
                            <span className="font-semibold text-slate-700">Final Cashout</span> is
                            the amount swept into{" "}
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold tracking-wide text-slate-700">
                              STASH
                            </span>{" "}
                            after closing {monthName}, recalculated from actual spending (
                            Starting Funds − Actual Bills − Actual Living Expenses). Any unspent
                            Living Funds (
                            <span
                              className={`rounded bg-emerald-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 ${amountInter.className}`}
                            >
                              {fmtDollars(livingFundsLeft)} Left
                            </span>
                            ) or lower-than-estimated bills automatically boosted the final
                            payout.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-700">Expected Cashout</span>{" "}
                            is your safe baseline profit assuming all planned funds are spent.
                            When you close the month,{" "}
                            <span className="font-semibold text-slate-700">Actual Cashout</span>{" "}
                            recalculates from actual spending (Starting Funds − Actual Bills −
                            Actual Living Expenses)—so any unspent Living Funds (
                            <span
                              className={`rounded bg-emerald-50 px-1 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-800 ${amountInter.className}`}
                            >
                              {fmtDollars(livingFundsLeft)} Left
                            </span>
                            ) or lower-than-estimated bills automatically boost the final payout
                            swept into{" "}
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold tracking-wide text-slate-700">
                              STASH
                            </span>
                            .
                          </>
                        )}
                      </p>
                    </section>
                  </div>
                </article>
              </div>
            ) : null}
        </div>
      </div>

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
                  const isUnfunded =
                    selectedCreditCycle.reservedPaymentFunds < selectedCreditCycle.minimumDue

                  return (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-700">
                          {fmtCreditCardName(
                            selectedCreditCycle.cardLabel,
                            selectedCreditCycle.lastFour,
                          )}{" "}
                          ({selectedCreditCycle.cycleLabel})
                        </p>
                      </div>

                      {isUnfunded ? (
                        <>
                          <div className="space-y-1.5">
                            <DottedLeaderRow
                              left={<span>Converted to Debt</span>}
                              right={
                                <span
                                  className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
                                >
                                  {fmtDollars(selectedCreditCycle.newSpending)}
                                </span>
                              }
                            />
                            <DottedLeaderRow
                              left={<span>Reserved Payment Funds</span>}
                              right={
                                <span
                                  className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
                                >
                                  {fmtDollars(selectedCreditCycle.reservedPaymentFunds)}
                                </span>
                              }
                            />
                            <DottedLeaderRow
                              left={<span>Minimum Due</span>}
                              right={
                                <span
                                  className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
                                >
                                  {fmtDollars(selectedCreditCycle.minimumDue)}
                                </span>
                              }
                            />
                          </div>

                          <div className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2">
                            <p className="text-[11px] font-medium text-amber-900">
                              Your reserved funds do not cover the bank&apos;s minimum payment.
                              Choose how to fund the remaining{" "}
                              {fmtDollars(
                                Math.max(
                                  0,
                                  selectedCreditCycle.minimumDue -
                                    selectedCreditCycle.reservedPaymentFunds,
                                ),
                              )}
                              .
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Link
                              href="/accounts"
                              className="inline-flex rounded bg-slate-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
                            >
                              Pay from {monthName} Income
                            </Link>
                            <Link
                              href="/accounts"
                              className="inline-flex rounded bg-slate-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-300"
                            >
                              Pay from My Stash
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <DottedLeaderRow
                              left={<span>New Spending</span>}
                              right={
                                <span
                                  className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
                                >
                                  {fmtDollars(selectedCreditCycle.newSpending)}
                                </span>
                              }
                            />
                            <DottedLeaderRow
                              left={<span>Reserved Payment Funds</span>}
                              right={
                                <span
                                  className={`font-semibold tabular-nums text-emerald-700 ${amountInter.className}`}
                                >
                                  {fmtDollars(selectedCreditCycle.reservedPaymentFunds)}
                                </span>
                              }
                            />
                          </div>

                          <div className="rounded border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] font-medium text-slate-600">
                              Your budget successfully secured these funds during cashout. Complete
                              the bank transfer to{" "}
                              {fmtCreditCardName(
                                selectedCreditCycle.cardLabel,
                                selectedCreditCycle.lastFour,
                              )}{" "}
                              to clear this cycle.
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Link
                              href="/accounts"
                              className="inline-flex rounded bg-[#0087D2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-[#00487A]"
                            >
                              Transfer Payment
                            </Link>
                          </div>

                          <p
                            className={`text-[10px] font-medium text-slate-400 ${amountInter.className}`}
                          >
                            Side note: Minimum due from issuer is{" "}
                            {fmtDollars(selectedCreditCycle.minimumDue)} by{" "}
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

      <Dialog open={isCreditOutpostAboutOpen} onOpenChange={setIsCreditOutpostAboutOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>About Credit Card Payments</DialogTitle>
          </DialogHeader>
          <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-600">
                Each card row represents a <span className="font-semibold">closed statement cycle</span>
                . The due date is when the issuer expects payment.
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
                  <p className="text-[12px] font-semibold text-slate-800">
                    Minimum Due / Action Needed
                  </p>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Reserved funds do not fully cover the minimum due yet. Choose how to fund the
                  remaining amount in the modal.
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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Bill
                </p>
                <p className="text-base font-medium text-slate-900">{selectedBill.listName}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Due
                </p>
                <p>
                  Day {selectedBill.dueDay} of {monthName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </p>
                <p
                  className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}
                >
                  {fmtDollars(selectedBill.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Payment
                </p>
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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </p>
                <p className="text-base font-medium text-slate-900">{selectedLivingLine.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Budget target
                </p>
                <p
                  className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}
                >
                  {fmtDollars(selectedLivingLine.target)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Spent so far
                </p>
                <p
                  className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}
                >
                  {fmtDollars(selectedLivingLine.spent)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </p>
                {selectedLivingLine.spent > selectedLivingLine.target ? (
                  <p className="text-rose-700">
                    {fmtDollars(selectedLivingLine.spent - selectedLivingLine.target)} over budget
                  </p>
                ) : (
                  <p>
                    {fmtDollars(selectedLivingLine.target - selectedLivingLine.spent)} left in
                    envelope
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onOpenChange={setIsSettleUpOpen}
        currentMonth={monthName}
        nextMonth={nextMonthLabel}
        startingFunds={SNAPSHOT_STARTING_FUNDS}
        totalExpenses={totalBudget + livingOverage}
        cashoutAmount={expectedNet}
        currentStashAmount={2450}
        isReadyToCashOut={isCashoutUnlocked}
      />
    </div>
  )
}
