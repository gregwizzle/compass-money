"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, ChartColumn, Check, ChevronRight, ChevronsRight, ClipboardList, CreditCard, FileText, Lock, RefreshCw, ShipWheel, Sparkles, Star, X } from "lucide-react"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import {
  TimelineCreditPaymentsCard,
  TimelineRecentActivityCard,
  TimelineSnapshotCard,
} from "@/components/timeline-snapshot-cards"
import { useLogbookCardModals, type LogbookActivitySave } from "@/components/logbook-timeline-modals"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { YearForecastPanel } from "@/components/year-forecast-panel"
import { useMonthSelection } from "@/hooks/use-month-selection"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  getMonthStripFlags,
  monthIndexFromLabel,
  monthLongNameFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"
import {
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_LIVING,
  SNAPSHOT_STARTING_FUNDS,
  type SnapshotBill,
  type SnapshotLivingLine,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import { cn } from "@/lib/utils"

type LogbookTab = "snapshot" | "plan" | "activity" | "cashout" | "income-tank"
type BillStatus = "paid" | "autodraft" | "pay" | "pending"

type CreditCycle = {
  id: string
  tier: 1 | 2
  cardLabel: string
  lastFour: string
  cycleLabel: string
  newSpending: number
  reservedPaymentFunds: number
  dueDateLabel?: string
  minimumDue: number
}

type LogTxn = {
  id: string
  day: number
  merchant: string
  amount: number
  /** Living envelope id, `reserve:{cycleId}`, or null when uncategorized. */
  categoryId: string | null
  /** Bill-linked expenses are excluded from the virtual Unassigned liability. */
  billId?: string
}

type IncomeLine = {
  id: string
  label: string
  expectedDate: string
  amount: number
  cleared: boolean
}

const TABS: { id: LogbookTab; label: string }[] = [
  { id: "snapshot", label: "Now" },
  { id: "plan", label: "Budget" },
  { id: "activity", label: "Activity" },
  { id: "cashout", label: "Cashout" },
]

const CARD_CLASS = "rounded-[2px] border border-slate-200 bg-white p-5"
const SECTION_RULE = "mb-3 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2"

const BILL_PENDING_IDS = new Set(["software", "music", "extra-7", "extra-19"])

/** Tier 1 closed statements (due) plus Tier 2 open cycles (building, 1:1 reserved). */
const BASE_CREDIT_CYCLES: CreditCycle[] = [
  {
    id: "discover-cycle-2",
    tier: 1,
    cardLabel: "Discover",
    lastFour: "2468",
    cycleLabel: "Jan 18 - Feb 17",
    newSpending: 200,
    reservedPaymentFunds: 45,
    dueDateLabel: "Apr 2",
    minimumDue: 120,
  },
  {
    id: "visa-cycle-1",
    tier: 1,
    cardLabel: "Visa",
    lastFour: "1234",
    cycleLabel: "Jan 12 - Feb 11",
    newSpending: 700,
    reservedPaymentFunds: 700,
    dueDateLabel: "Apr 5",
    minimumDue: 45,
  },
  {
    id: "mastercard-cycle-4",
    tier: 1,
    cardLabel: "Mastercard",
    lastFour: "5678",
    cycleLabel: "Jan 20 - Feb 19",
    newSpending: 10,
    reservedPaymentFunds: 0,
    dueDateLabel: "Apr 14",
    minimumDue: 45,
  },
  {
    id: "visa-open",
    tier: 2,
    cardLabel: "Visa",
    lastFour: "1234",
    cycleLabel: "Feb 12 - Mar 11",
    newSpending: 186,
    reservedPaymentFunds: 186,
    minimumDue: 0,
  },
  {
    id: "discover-open",
    tier: 2,
    cardLabel: "Discover",
    lastFour: "2468",
    cycleLabel: "Feb 18 - Mar 17",
    newSpending: 95,
    reservedPaymentFunds: 95,
    minimumDue: 0,
  },
  {
    id: "mastercard-open",
    tier: 2,
    cardLabel: "Mastercard",
    lastFour: "5678",
    cycleLabel: "Feb 20 - Mar 19",
    newSpending: 42,
    reservedPaymentFunds: 42,
    minimumDue: 0,
  },
]

/** Six stored living categories. Unassigned is computed, never stored here. */
const LIVING_FUNDS: SnapshotLivingLine[] = [
  ...SNAPSHOT_LIVING,
  { id: "curveballs", name: "Curveballs", shortName: "Curveballs", target: 0, spent: 0 },
]

const MONTH_ACTIVITY: LogTxn[] = [
  { id: "u1", day: 22, merchant: "Corner Market", amount: 34, categoryId: null },
  { id: "u2", day: 19, merchant: "City Transit", amount: 12, categoryId: null },
  { id: "u3", day: 16, merchant: "Night Market", amount: 48, categoryId: null },
  { id: "c1", day: 21, merchant: "Kroger", amount: 64, categoryId: "groceries" },
  { id: "c2", day: 18, merchant: "Shell", amount: 41, categoryId: "gas" },
  { id: "c3", day: 15, merchant: "Local Cafe", amount: 16, categoryId: "dining" },
  { id: "c4", day: 14, merchant: "Pharmacy", amount: 22, categoryId: "personal" },
  { id: "c5", day: 11, merchant: "Concert tickets", amount: 80, categoryId: "vibe" },
  { id: "u4", day: 10, merchant: "Hardware Store", amount: 27, categoryId: null },
  { id: "u5", day: 10, merchant: "Bookstore", amount: 18, categoryId: null },
  { id: "c6", day: 9, merchant: "Whole Foods", amount: 91, categoryId: "groceries" },
  { id: "c7", day: 7, merchant: "Pizza night", amount: 28, categoryId: "dining" },
  { id: "c8", day: 4, merchant: "Target", amount: 19, categoryId: "vibe" },
  { id: "c9", day: 2, merchant: "Uber", amount: 15, categoryId: "gas" },
]

const EXTRA_BILL_NAMES = [
  "Student Loan",
  "Health Insurance",
  "Dental Insurance",
  "Life Insurance",
  "Natural Gas",
  "Trash & Recycling",
  "Renters Insurance",
  "Streaming Bundle",
  "Cloud Storage",
  "Domain & Hosting",
  "Phone Insurance",
  "Parking Permit",
  "Toll Pass",
  "Childcare",
  "Pet Care",
  "Lawn Service",
  "Security System",
  "Storage Unit",
  "Union Dues",
  "Professional License",
  "Newspaper",
  "Charity Pledge",
  "Alimony",
  "529 Contribution",
  "HSA Contribution",
  "Gym Class Pack",
  "Internet Backup",
  "Water Softener",
  "HOA Special",
  "Warranty Plan",
  "Identity Protection",
  "Roadside Assist",
  "Software Suite",
  "Music Family Plan",
  "News Subscription",
  "Postage Meter",
  "PO Box",
]

const ESCROW_SETTLEMENTS = [
  {
    id: "e1",
    when: "Oct 5",
    card: "Visa · 1234",
    amount: 640,
    note: "Statement payment released from escrow",
  },
  {
    id: "e2",
    when: "Oct 2",
    card: "Discover · 2468",
    amount: 210,
    note: "Statement payment released from escrow",
  },
]

const STASH_BALANCE = 4200

const PLAN_BILLS: SnapshotBill[] = [
  ...SNAPSHOT_BILLS,
  ...EXTRA_BILL_NAMES.map((name, i) => ({
    id: `extra-${i}`,
    listName: name,
    dueDay: (i % 28) + 1,
    amount: 12 + ((i * 17) % 180),
    paymentMode: (i % 5 === 0 ? "manual" : "autodraft") as SnapshotBill["paymentMode"],
  })),
].sort((a, b) => a.dueDay - b.dueDay || a.listName.localeCompare(b.listName))

function fmtDollars(n: number) {
  return `$${Math.abs(n).toLocaleString()}`
}

function fmtSignedDollars(n: number) {
  const sign = n < 0 ? "-" : ""
  return `${sign}${fmtDollars(n)}`
}

/** Category, Total Funded, Spent, Remaining. Shared so the header, rows, and total line up. */
const livingExpenseCols =
  "grid w-full grid-cols-[minmax(0,1fr)_5.75rem_4rem_5.25rem] items-center gap-x-1.5"

/** Card, Payment, From Reserve, Additional Needed. */
const creditPayCols =
  "grid w-full grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_6rem] items-center gap-x-1.5"

/** Label plus a right-hand amount. The amount column matches the edit box so the three figures line up. */
const livingEditCols = "grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-x-3"

/** Same shell as the Now tab cards: slate border and a light drop shadow. */
const budgetCardShell = "rounded-sm border border-slate-300/70 bg-white shadow-sm"

/** Plan-line hover: thicker blue ring and a pale sky wash, without shifting the card. */
const planCardLinkStyle = {
  borderColor: "#0087D2",
  backgroundColor: "#f0f9ff",
  boxShadow: "0 0 0 2px #0087D2",
} as const

/** Quiet network tint for the last-four card pill. */
function creditNetworkPillClass(cardLabel: string) {
  const key = cardLabel.trim().toLowerCase()
  if (key.includes("visa")) return "border-sky-300/80 bg-sky-50 text-sky-900"
  if (key.includes("master")) return "border-rose-300/70 bg-rose-50 text-rose-900"
  if (key.includes("discover")) return "border-orange-300/80 bg-orange-50 text-orange-950"
  if (key.includes("amex") || key.includes("american")) return "border-slate-400/70 bg-slate-100 text-slate-800"
  return "border-slate-300/80 bg-stone-50 text-slate-800"
}

/** Soft blue row highlight from the Now tab, with a little room inside the edge. */
const budgetRowHover =
  "-mx-2 rounded-md px-2 transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"

function reserveKey(cycleId: string) {
  return `reserve:${cycleId}`
}

function effectiveCategory(
  txn: LogTxn,
  assignments: Record<string, string | null>,
): string | null {
  if (Object.prototype.hasOwnProperty.call(assignments, txn.id)) return assignments[txn.id]
  return txn.categoryId
}

function creditDueSortKey(dueDateLabel: string) {
  const parts = dueDateLabel.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase()
    const t = new Date(`${month} ${parts[1]}, ${DEFAULT_BUDGET_YEAR}`).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

function fmtCreditDueDisplay(dueDateLabel: string) {
  const parts = dueDateLabel.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase()
    return `${month} ${parts[1]}`
  }
  return dueDateLabel.trim()
}

function tier1Status(cycle: CreditCycle) {
  const reserved = cycle.reservedPaymentFunds
  const minDue = cycle.minimumDue
  if (reserved >= minDue && reserved > 0) {
    return { amount: reserved, label: "Reserved", tone: "text-emerald-700" }
  }
  if (reserved > 0 && reserved < minDue) {
    return { amount: minDue - reserved, label: "Short", tone: "text-rose-600" }
  }
  return { amount: minDue, label: "Needed", tone: "text-amber-700" }
}

function getBillStatus(bill: SnapshotBill, asOfDay: number): BillStatus {
  if (bill.dueDay <= asOfDay) return "paid"
  if (BILL_PENDING_IDS.has(bill.id)) return "pending"
  if (bill.paymentMode === "manual") return "pay"
  return "autodraft"
}

function monthGaugeStatusLabel(flags: {
  isLive: boolean
  isArchived: boolean
  isFuture: boolean
}) {
  if (flags.isArchived) return "Closed"
  if (flags.isFuture) return "Upcoming"
  return "Current"
}

function incomeForMonth(month: MonthLabel): IncomeLine[] {
  return [
    { id: "pay-1", label: "Employer — direct deposit", expectedDate: `${month} 1`, amount: 2800, cleared: true },
    { id: "rental", label: "Rental income", expectedDate: `${month} 5`, amount: 450, cleared: true },
    { id: "pay-2", label: "Employer — direct deposit", expectedDate: `${month} 15`, amount: 2800, cleared: false },
    { id: "side", label: "Freelance (invoice)", expectedDate: `${month} 26`, amount: 600, cleared: false },
    { id: "pay-3", label: "Employer — direct deposit", expectedDate: `${month} 29`, amount: 2800, cleared: false },
  ]
}

function Leader({
  left,
  right,
  rightClassName,
  meta,
}: {
  left: ReactNode
  right: ReactNode
  rightClassName?: string
  meta?: ReactNode
}) {
  return (
    <div className="min-w-0 py-0.5">
      <div className="flex min-w-0 items-baseline text-sm">
        <span className="min-w-0 truncate text-slate-800">{left}</span>
        <span className="mx-2 min-w-[1.25rem] flex-1 border-b border-dotted border-slate-300" aria-hidden />
        <span className={cn("shrink-0 text-right font-mono tabular-nums", rightClassName)}>{right}</span>
      </div>
      {meta ? <p className="text-[11px] italic leading-snug text-slate-400">{meta}</p> : null}
    </div>
  )
}

function CategorySelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string | null
  onChange: (next: string | null) => void
  options: { id: string; label: string }[]
  label: string
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? event.target.value : null)}
      className={cn(
        "max-w-[12.5rem] cursor-pointer rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px] tabular-nums outline-none",
        value
          ? "border-slate-200 bg-white text-slate-700"
          : "border-rose-200 bg-amber-50 text-rose-700",
      )}
    >
      <option value="">[Assign ▾]</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function AnnualMonthGauge({
  selectedMonth,
  allYearSelected,
  onSelectMonth,
  onSelectAllYear,
  budgetYear = DEFAULT_BUDGET_YEAR,
}: {
  selectedMonth: MonthLabel
  allYearSelected: boolean
  onSelectMonth: (month: MonthLabel) => void
  onSelectAllYear: () => void
  budgetYear?: number
}) {
  return (
    <div
      className="flex w-full min-w-0 items-center justify-end gap-0.5 bg-transparent font-sans"
      role="navigation"
      aria-label="Time scope"
    >
      {MONTH_LABELS.map((month, monthIndex) => {
        const flags = getMonthStripFlags(monthIndex, { budgetYear })
        const isSelected = !allYearSelected && selectedMonth === month
        const tooltip = `${monthLongNameFromLabel(month)} · ${monthGaugeStatusLabel(flags)}`
        return (
          <button
            key={month}
            type="button"
            onClick={() => onSelectMonth(month)}
            title={tooltip}
            aria-label={tooltip}
            aria-pressed={isSelected}
            className={cn(
              "shrink-0 cursor-pointer rounded-[2px] border px-2 py-1 text-[13px] font-medium transition-colors",
              isSelected
                ? "border-[#0087D2] bg-sky-100/80 font-semibold text-slate-600"
                : flags.isLive
                  ? "border-transparent bg-transparent text-slate-800 hover:bg-stone-200/60"
                  : flags.isFuture
                    ? "border-transparent bg-transparent text-slate-700 hover:bg-stone-200/60"
                    : "border-transparent bg-transparent text-slate-400 hover:bg-stone-200/60 hover:text-slate-600",
            )}
          >
            <span className="inline-flex items-center justify-center">
              {flags.isArchived ? (
                <Lock
                  className="mr-1 h-2.5 w-2.5 shrink-0 opacity-75"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
              {flags.isLive ? (
                <Star
                  className="mr-1 h-[11px] w-[11px] shrink-0 fill-amber-500 text-amber-500"
                  aria-hidden
                />
              ) : null}
              <span>{month}</span>
            </span>
          </button>
        )
      })}
      <span className="mx-1 h-3.5 w-px shrink-0 bg-stone-300" aria-hidden />
      <button
        type="button"
        onClick={onSelectAllYear}
        title={`All ${budgetYear}`}
        aria-label={`All ${budgetYear} forecast`}
        aria-pressed={allYearSelected}
        className={cn(
          "shrink-0 cursor-pointer rounded-[2px] border px-2 py-1 text-[13px] font-medium transition-colors",
          allYearSelected
            ? "border-[#0087D2] bg-sky-100/80 font-semibold text-slate-600"
            : "border-transparent bg-transparent text-slate-600 hover:bg-stone-200/60",
        )}
      >
        All {budgetYear}
      </button>
    </div>
  )
}

function BillStatusGutter({ status }: { status: BillStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex w-[4.5rem] shrink-0 items-center justify-end gap-1 font-mono text-[10px] uppercase tracking-wide text-emerald-700">
        <ReceivedCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
        Paid
      </span>
    )
  }
  if (status === "autodraft") {
    return (
      <span className="inline-flex w-[4.5rem] shrink-0 items-center justify-end gap-1 font-mono text-[10px] uppercase tracking-wide text-slate-400">
        <RefreshCw className="h-3 w-3 stroke-[1.8]" aria-hidden />
        Auto
      </span>
    )
  }
  if (status === "pay") {
    return (
      <span className="inline-flex w-[4.5rem] shrink-0 items-center justify-end font-mono text-[10px] font-semibold uppercase tracking-wide text-[#0087D2]">
        Pay
      </span>
    )
  }
  return (
    <span className="inline-flex w-[4.5rem] shrink-0 items-center justify-end font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      Pending
    </span>
  )
}

function PlanDetailsDialog({
  open,
  onOpenChange,
  monthName,
  prevMonthName,
  livingLines,
  creditPayments,
  expectedCashout,
  daysToCashout,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  monthName: string
  prevMonthName: string
  livingLines: SnapshotLivingLine[]
  creditPayments: { id: string; label: string; additionalNeeded: number }[]
  expectedCashout: number
  daysToCashout: number
}) {
  const paidTotal = SNAPSHOT_BILLS.filter((bill) => bill.dueDay <= SNAPSHOT_AS_OF_DAY).reduce(
    (sum, bill) => sum + bill.amount,
    0,
  )
  const upcomingTotal = SNAPSHOT_BILLS.filter((bill) => bill.dueDay > SNAPSHOT_AS_OF_DAY).reduce(
    (sum, bill) => sum + bill.amount,
    0,
  )
  const billTotal = paidTotal + upcomingTotal
  const livingRows = livingLines.map((line) => ({
    id: line.id,
    label: line.name,
    amount: line.target,
    overage: Math.max(0, line.spent - line.target),
  }))
  const livingSubtotal = livingRows.reduce((sum, line) => sum + line.amount + line.overage, 0)
  const creditAdditionalTotal = creditPayments.reduce((sum, row) => sum + row.additionalNeeded, 0)
  const creditAdditionalRows = creditPayments.filter((row) => row.additionalNeeded > 0)
  const showCreditAdditional = creditAdditionalTotal > 0
  const cashoutStep = showCreditAdditional ? 5 : 4
  const cashoutShort = expectedCashout < 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(920px,94vh)] gap-0 overflow-hidden border-slate-200 bg-white p-0 sm:max-w-md">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
              {monthName} Plan Details
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-6 border-y border-slate-100 bg-slate-50 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
              1
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-600">Starting Funds</h4>
                <span className={cn("text-sm font-semibold tabular-nums text-slate-600", amountInter.className)}>
                  {fmtDollars(SNAPSHOT_STARTING_FUNDS)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                The income you made in {prevMonthName} was set aside to fund {monthName}&apos;s Bills and Expenses
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 text-sm font-bold text-[#0087D2]">
              2
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-bold text-[#0087D2]">Bills</h4>
                <span className={cn("text-sm font-semibold tabular-nums text-slate-900", amountInter.className)}>
                  {fmtDollars(billTotal)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1 border-l border-slate-200 pl-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-slate-600">Paid Bills</span>
                  <span className={cn("pr-4 text-[13px] tabular-nums text-slate-600", amountInter.className)}>
                    {fmtDollars(paidTotal)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-slate-600">Upcoming Bills</span>
                  <span className={cn("pr-4 text-[13px] tabular-nums text-slate-600", amountInter.className)}>
                    {fmtDollars(upcomingTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100/90 text-sm font-bold text-orange-700/90">
              3
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-bold text-orange-700/90">Living Expenses</h4>
                <span className={cn("text-sm font-semibold tabular-nums text-slate-900", amountInter.className)}>
                  {fmtDollars(livingSubtotal)}
                </span>
              </div>
              <ul className="mt-1.5 flex flex-col gap-1 border-l border-orange-200 pl-3">
                {livingRows.map((row) => (
                  <li key={row.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[13px] text-slate-600">{row.label}</span>
                      <span className={cn("shrink-0 pr-4 text-[13px] tabular-nums text-slate-600", amountInter.className)}>
                        {fmtDollars(row.amount)}
                      </span>
                    </div>
                    {row.overage > 0 ? (
                      <div className="flex items-baseline justify-between gap-3 pl-4">
                        <span className="min-w-0 text-[13px] italic text-slate-500">overage</span>
                        <span
                          style={{ fontStyle: "italic" }}
                          className={cn("shrink-0 pr-4 text-[13px] tabular-nums text-slate-600", amountInter.className)}
                        >
                          {fmtDollars(row.overage)}
                        </span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {showCreditAdditional ? (
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-[#0087D2]">
                4
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-sm font-bold text-[#0087D2]">
                    Additional Needed for Credit Card Payments
                  </h4>
                  <span className={cn("shrink-0 text-sm font-semibold tabular-nums text-slate-900", amountInter.className)}>
                    {fmtDollars(creditAdditionalTotal)}
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-col gap-1 border-l border-sky-200 pl-3">
                  {creditAdditionalRows.map((row) => (
                    <li key={row.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[13px] text-slate-600">{row.label}</span>
                      <span className={cn("shrink-0 pr-4 text-[13px] tabular-nums text-slate-600", amountInter.className)}>
                        {fmtDollars(row.additionalNeeded)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {cashoutStep}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-bold text-emerald-700">
                  Expected Cashout
                  <span className="ml-1.5 font-normal italic text-emerald-700/70">
                    · in {daysToCashout} day{daysToCashout === 1 ? "" : "s"}
                  </span>
                </h4>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    amountInter.className,
                    cashoutShort ? "text-rose-700" : "text-emerald-700",
                  )}
                >
                  {cashoutShort ? fmtSignedDollars(expectedCashout) : fmtDollars(expectedCashout)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {cashoutShort
                  ? "Your current budget exceeds Starting Funds. You might want to tighten up spending this month—any shortfall will need to be covered from your Stash."
                  : "You are on track to deposit these unused funds into your Stash at the end of the month."}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="items-center border-t border-slate-100 bg-white px-6 py-4 sm:justify-between">
          <p className={cn("flex items-center gap-1.5 text-lg font-medium italic text-orange-700/90", myJourneyNav.className)}>
            {cashoutShort ? "Looks like a tight month - You can do this!" : "Planning for success"}
            <Sparkles className="h-4 w-4 text-orange-700/80" aria-hidden />
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreditPaymentDetailsDialog({
  open,
  onOpenChange,
  monthName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  monthName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(920px,94vh)] gap-0 overflow-hidden border-slate-200 bg-white p-0 sm:max-w-lg">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
              Credit Card Payments due in {monthName}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-6 border-y border-slate-100 bg-slate-50 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 text-sm font-bold text-[#0087D2]">
              1
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#0087D2]">Proposed Payment</h4>
              <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-slate-600">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 text-xs font-bold text-[#0087D2]">
                    A
                  </span>
                  <p className="min-w-0 flex-1 pt-0.5">
                    Total of all new spending during the statement cycle.
                  </p>
                </div>
                <div className="flex justify-center py-0.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold uppercase tracking-wide text-slate-600">
                    or
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 text-xs font-bold text-[#0087D2]">
                    B
                  </span>
                  <p className="min-w-0 flex-1 pt-0.5">
                    Minimum due (from the Bank) if it is higher.
                  </p>
                </div>
                <p className="pt-1">
                  You will be able to adjust the Actual Payment during the payment process.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100/90 text-sm font-bold text-orange-700/90">
              2
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-orange-700/90">From Reserve</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                As you were spending on the card, we were pulling money from your Living Expenses and
                Bills funds to cover those new purchases and placing it into a reserve. This is YOUR
                MONEY already set aside previously to apply to this CC payment.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              3
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-emerald-700">Additional Needed</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                If the Proposed Payment is more than what was set aside in Reserve, this is where we
                have to pull some money from this month&apos;s funds to make up the gap.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="items-center border-t border-slate-100 bg-white px-6 py-4 sm:justify-between">
          <p className={cn("flex items-center gap-1.5 text-lg font-medium italic text-orange-700/90", myJourneyNav.className)}>
            You&apos;ve already done the hard part.
            <Sparkles className="h-4 w-4 text-orange-700/80" aria-hidden />
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Logbook inside the 1280px Surgical Cockpit.
 * Folder tabs stay on the canvas. Nothing on this page opens a drawer or modal.
 */
export function LogbookWorkspace() {
  const { selectedMonth, setSelectedMonth } = useMonthSelection()
  const [allYearSelected, setAllYearSelected] = useState(false)
  const [activeTab, setActiveTab] = useState<LogbookTab>("snapshot")

  const selectMonth = (month: MonthLabel) => {
    setSelectedMonth(month)
    setAllYearSelected(false)
    setActiveTab("snapshot")
  }

  const selectAllYear = () => {
    setAllYearSelected(true)
  }
  const [assignments, setAssignments] = useState<Record<string, string | null>>({})
  const [activityOverrides, setActivityOverrides] = useState<Record<string, LogbookActivitySave>>({})
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [billsReviewed, setBillsReviewed] = useState(false)
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false)
  const [creditPaymentDetailsOpen, setCreditPaymentDetailsOpen] = useState(false)
  const [planCardLink, setPlanCardLink] = useState<"bills" | "living" | "credit" | null>(null)
  const [shortfallAck, setShortfallAck] = useState(false)
  const [lockNote, setLockNote] = useState<string | null>(null)
  const [billPaidOverrides] = useState<Record<string, boolean>>({})
  const [billAmountOverrides, setBillAmountOverrides] = useState<Record<string, number>>({})
  const [billDueOverrides, setBillDueOverrides] = useState<Record<string, number>>({})
  const [billModeOverrides, setBillModeOverrides] = useState<
    Record<string, SnapshotBill["paymentMode"]>
  >({})
  const [livingEditId, setLivingEditId] = useState<string | null>(null)
  const [livingTargetDraft, setLivingTargetDraft] = useState("")
  const [livingNameDraft, setLivingNameDraft] = useState("")
  const [renamingLiving, setRenamingLiving] = useState(false)
  const [livingDeleteOpen, setLivingDeleteOpen] = useState(false)
  const [removedLivingIds, setRemovedLivingIds] = useState<Partial<Record<MonthLabel, string[]>>>({})
  const [livingNameOverrides, setLivingNameOverrides] = useState<Record<string, string>>({})
  const [paidBillsCollapsed, setPaidBillsCollapsed] = useState(false)
  const [addedBills, setAddedBills] = useState<SnapshotBill[]>([])
  const [newBillOpen, setNewBillOpen] = useState(false)
  const [newBillName, setNewBillName] = useState("")
  const [newBillAmount, setNewBillAmount] = useState("")
  const [newBillDue, setNewBillDue] = useState("")
  const [newBillRecurring, setNewBillRecurring] = useState(true)
  const [addedLivingByMonth, setAddedLivingByMonth] = useState<
    Partial<Record<MonthLabel, SnapshotLivingLine[]>>
  >({})
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)
  const [newExpenseName, setNewExpenseName] = useState("")
  const [newExpenseFunded, setNewExpenseFunded] = useState("")
  const [billEditId, setBillEditId] = useState<string | null>(null)
  const [billAmountDraft, setBillAmountDraft] = useState("")
  const [billDueDraft, setBillDueDraft] = useState("")
  const [billRecurringDraft, setBillRecurringDraft] = useState(true)

  const monthName = monthLongNameFromLabel(selectedMonth)
  const monthAbbrev = selectedMonth
  const selectedMonthIndex = monthIndexFromLabel(selectedMonth) ?? 0
  const selectedMonthFlags = getMonthStripFlags(selectedMonthIndex, {
    budgetYear: DEFAULT_BUDGET_YEAR,
  })
  const isArchivedMonth = selectedMonthFlags.isArchived
  const nextMonthLabel = monthLongNameFromLabel(
    MONTH_LABELS[(selectedMonthIndex + 1) % 12] as MonthLabel,
  )
  const prevMonthName = monthLongNameFromLabel(
    MONTH_LABELS[(selectedMonthIndex + 11) % 12] as MonthLabel,
  )
  const daysToCashout = useMemo(() => {
    const now = new Date()
    const day = Math.min(now.getDate(), new Date(DEFAULT_BUDGET_YEAR, selectedMonthIndex + 1, 0).getDate())
    const anchor = new Date(DEFAULT_BUDGET_YEAR, selectedMonthIndex, day)
    const nextFirst = new Date(DEFAULT_BUDGET_YEAR, selectedMonthIndex + 1, 1)
    return Math.max(0, Math.ceil((nextFirst.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)))
  }, [selectedMonthIndex])

  const assignCategory = (txnId: string, categoryId: string | null) => {
    setAssignments((current) => ({ ...current, [txnId]: categoryId }))
    setActivityOverrides((current) => {
      if (!current[txnId]) return current
      const next = { ...current }
      delete next[txnId]
      return next
    })
    setLockNote(null)
  }

  const saveActivityFromModal = (rowId: string, patch: LogbookActivitySave) => {
    setAssignments((current) => ({ ...current, [rowId]: patch.categoryId }))
    setActivityOverrides((current) => ({ ...current, [rowId]: patch }))
    setLockNote(null)
  }

  const displayCategory = (txn: LogTxn) => activityOverrides[txn.id]?.categoryId ?? effectiveCategory(txn, assignments)

  const countsTowardMonth = (txn: LogTxn) => {
    const patch = activityOverrides[txn.id]
    if (!patch) return true
    return !patch.fromStash && patch.budgetMonthLabel === selectedMonth
  }

  const setLivingBudget = (id: string, budgeted: number) => {
    setBudgets((current) => ({ ...current, [id]: budgeted }))
  }

  const cycles = useMemo(() => {
    return BASE_CREDIT_CYCLES.map((cycle) => {
      const key = reserveKey(cycle.id)
      let reserveDelta = 0
      let spendDelta = 0
      for (const txn of MONTH_ACTIVITY) {
        const effective = countsTowardMonth(txn) ? displayCategory(txn) : null
        if (effective === key) {
          reserveDelta += txn.amount
          if (cycle.tier === 2) spendDelta += txn.amount
        }
        if (txn.categoryId === key) {
          reserveDelta -= txn.amount
          if (cycle.tier === 2) spendDelta -= txn.amount
        }
      }
      return {
        ...cycle,
        newSpending: cycle.newSpending + spendDelta,
        reservedPaymentFunds: cycle.reservedPaymentFunds + reserveDelta,
      }
    })
  }, [activityOverrides, assignments, selectedMonth])

  const livingLines = useMemo(() => {
    const removed = new Set(removedLivingIds[selectedMonth] ?? [])
    const withMonthState = (line: SnapshotLivingLine) => {
      let delta = 0
      for (const txn of MONTH_ACTIVITY) {
        const effective = countsTowardMonth(txn) ? displayCategory(txn) : null
        if (effective === line.id) delta += txn.amount
        if (txn.categoryId === line.id) delta -= txn.amount
      }
      const budgeted = budgets[line.id] ?? line.target
      const renamed = livingNameOverrides[`${selectedMonth}:${line.id}`]?.trim()
      return {
        ...line,
        name: renamed || line.name,
        shortName: renamed || line.shortName,
        target: budgeted,
        spent: line.spent + delta,
      }
    }
    const fromTemplate = LIVING_FUNDS.filter((line) => !removed.has(line.id)).map(withMonthState)
    const addedThisMonth = (addedLivingByMonth[selectedMonth] ?? [])
      .filter((line) => !removed.has(line.id))
      .map(withMonthState)
    return [...fromTemplate, ...addedThisMonth]
  }, [
    activityOverrides,
    addedLivingByMonth,
    assignments,
    budgets,
    livingNameOverrides,
    removedLivingIds,
    selectedMonth,
  ])

  const assignOptions = useMemo(() => {
    const extras: { id: string; label: string }[] = []
    for (const txn of MONTH_ACTIVITY) {
      const categoryId = activityOverrides[txn.id]?.categoryId
      if (categoryId === "stash" && !extras.some((option) => option.id === "stash")) {
        extras.push({ id: "stash", label: "My Stash" })
      }
      if (categoryId?.startsWith("bill:") && !extras.some((option) => option.id === categoryId)) {
        const bill = SNAPSHOT_BILLS.find((item) => item.id === categoryId.slice("bill:".length))
        extras.push({ id: categoryId, label: bill?.listName ?? "Bill" })
      }
    }
    return [
      ...livingLines.map((line) => ({ id: line.id, label: line.shortName })),
      ...extras,
      ...cycles.map((cycle) => ({
        id: reserveKey(cycle.id),
        label:
          cycle.tier === 1
            ? `${cycle.cardLabel} · ${cycle.lastFour} Due (+)`
            : `${cycle.cardLabel} · ${cycle.lastFour} Building (+)`,
      })),
    ]
  }, [activityOverrides, cycles, livingLines])

  const cycleStampFor = (txn: LogTxn) => {
    const categoryId = displayCategory(txn)
    if (!countsTowardMonth(txn)) return "Another statement"
    if (!categoryId) return "Unassigned"
    if (categoryId === "stash") return "My Stash"
    if (categoryId.startsWith("bill:")) return "Bills"
    if (categoryId.startsWith("reserve:")) {
      const cycle = cycles.find((item) => reserveKey(item.id) === categoryId)
      return cycle ? `${cycle.cardLabel} · ${cycle.cycleLabel}` : "Card cycle"
    }
    return `${monthName} Living`
  }

  const snapshotBills = useMemo(() => {
    const paid = SNAPSHOT_BILLS.filter((bill) => bill.dueDay <= SNAPSHOT_AS_OF_DAY)
    const upcoming = SNAPSHOT_BILLS.filter((bill) => bill.dueDay > SNAPSHOT_AS_OF_DAY)
    return {
      paidCount: paid.length,
      paidTotal: paid.reduce((sum, bill) => sum + bill.amount, 0),
      upcomingCount: upcoming.length,
      upcomingTotal: upcoming.reduce((sum, bill) => sum + bill.amount, 0),
      total: SNAPSHOT_BILLS.reduce((sum, bill) => sum + bill.amount, 0),
    }
  }, [])

  const livingUnspent = livingLines.reduce((sum, line) => sum + Math.max(0, line.target - line.spent), 0)
  const livingLiability = livingLines.reduce((sum, line) => sum + Math.max(line.target, line.spent), 0)
  const livingFundedTotal = livingLines.reduce((sum, line) => sum + line.target, 0)
  const livingSpentTotal = livingLines.reduce((sum, line) => sum + line.spent, 0)
  const livingRemainingTotal = livingFundedTotal - livingSpentTotal
  const unassignedSpent = MONTH_ACTIVITY.reduce((sum, txn) => {
    if (!countsTowardMonth(txn)) return sum
    if (txn.billId || displayCategory(txn)?.startsWith("bill:")) return sum
    if (displayCategory(txn)) return sum
    return sum + txn.amount
  }, 0)
  const livingFundsEquation = livingLiability + unassignedSpent
  const tier1Due = cycles
    .filter((cycle) => cycle.tier === 1 && cycle.dueDateLabel)
    .sort((a, b) => creditDueSortKey(a.dueDateLabel!) - creditDueSortKey(b.dueDateLabel!))
  const tier2Open = cycles.filter((cycle) => cycle.tier === 2)
  const tier1Short = tier1Due.filter((cycle) => cycle.reservedPaymentFunds < cycle.minimumDue)
  const creditPaymentRows = tier1Due.map((cycle) => {
    const lastCycleTotalSpend = cycle.newSpending
    const minDueFromIssuer = cycle.minimumDue
    const fromReserve = cycle.reservedPaymentFunds
    const payment = Math.max(lastCycleTotalSpend, minDueFromIssuer)
    const additionalNeeded = Math.max(0, payment - fromReserve)
    return { ...cycle, payment, fromReserve, additionalNeeded }
  })
  const additionalFundsNeededForCards = creditPaymentRows.reduce(
    (sum, row) => sum + row.additionalNeeded,
    0,
  )
  const expectedNet =
    SNAPSHOT_STARTING_FUNDS -
    snapshotBills.total -
    livingLiability -
    additionalFundsNeededForCards -
    unassignedSpent
  const projectedCashout = expectedNet + livingUnspent
  const stashAfter = STASH_BALANCE + projectedCashout

  const activityRows = [...MONTH_ACTIVITY].sort((a, b) => b.day - a.day)
  const uncategorized = activityRows.filter((txn) => countsTowardMonth(txn) && !displayCategory(txn))
  const recentRows = activityRows.map((txn) => {
    const patch = activityOverrides[txn.id]
    const categoryId = displayCategory(txn)
    const living = livingLines.find((line) => line.id === categoryId)
    const cycle = cycles.find((item) => reserveKey(item.id) === categoryId)
    const billName = categoryId?.startsWith("bill:")
      ? SNAPSHOT_BILLS.find((bill) => bill.id === categoryId.slice("bill:".length))?.listName
      : null
    return {
      id: txn.id,
      dateLabel: `${monthAbbrev} ${txn.day}`,
      source: txn.merchant,
      category:
        patch?.category ||
        living?.shortName ||
        (cycle ? `${cycle.cardLabel} · ${cycle.lastFour}` : null) ||
        billName ||
        (categoryId === "stash" ? "Stash" : "Unassigned"),
      flow: "Expense" as const,
      actual: txn.amount,
      budgetMonthLabel: patch?.budgetMonthLabel ?? selectedMonth,
      fromStash: patch?.fromStash ?? false,
      appliedToKey:
        patch?.appliedToKey ??
        (categoryId
          ? categoryId.startsWith("reserve:") || categoryId.startsWith("bill:")
            ? categoryId
            : categoryId === "stash"
              ? "stash:direct"
              : `living:${categoryId}`
          : ""),
      accountLabel: "Linked Checking",
    }
  })
  const activeRecentRows = recentRows.filter(
    (row) => !row.fromStash && row.budgetMonthLabel === selectedMonth,
  )

  const incomeLines = incomeForMonth(selectedMonth)
  const incomeTotal = incomeLines.reduce((sum, line) => sum + line.amount, 0)

  const budgetBills = useMemo(() => {
    const withOverrides = (bill: SnapshotBill) => ({
      ...bill,
      amount: billAmountOverrides[bill.id] ?? bill.amount,
      dueDay: billDueOverrides[bill.id] ?? bill.dueDay,
      paymentMode: billModeOverrides[bill.id] ?? bill.paymentMode,
    })
    return [...PLAN_BILLS.map(withOverrides), ...addedBills.map(withOverrides)]
  }, [addedBills, billAmountOverrides, billDueOverrides, billModeOverrides])

  const budgetBillStatus = (bill: SnapshotBill): BillStatus => {
    if (billPaidOverrides[bill.id] === true) return "paid"
    if (billPaidOverrides[bill.id] === false) {
      return bill.paymentMode === "manual" ? "pay" : "autodraft"
    }
    if (isArchivedMonth) return "paid"
    return getBillStatus(bill, SNAPSHOT_AS_OF_DAY)
  }

  const planBillTotals = useMemo(() => {
    const unpaid = budgetBills.filter((bill) => budgetBillStatus(bill) !== "paid")
    return {
      total: budgetBills.reduce((sum, bill) => sum + bill.amount, 0),
      unpaid: unpaid.reduce((sum, bill) => sum + bill.amount, 0),
    }
  }, [budgetBills, billPaidOverrides, isArchivedMonth])

  const orderedBudgetBills = useMemo(
    () =>
      [...budgetBills].sort(
        (a, b) => a.dueDay - b.dueDay || a.listName.localeCompare(b.listName),
      ),
    [budgetBills],
  )

  const paidBudgetBills = orderedBudgetBills.filter((bill) => budgetBillStatus(bill) === "paid")
  const paidBillsTotal = paidBudgetBills.reduce((sum, bill) => sum + bill.amount, 0)
  const visibleBudgetBills = (() => {
    const rows: Array<
      { kind: "paid-total" } | { kind: "bill"; bill: (typeof orderedBudgetBills)[number] }
    > = []
    let foldedPaid = false
    for (const bill of orderedBudgetBills) {
      if (paidBillsCollapsed && budgetBillStatus(bill) === "paid") {
        if (!foldedPaid) {
          rows.push({ kind: "paid-total" })
          foldedPaid = true
        }
        continue
      }
      rows.push({ kind: "bill", bill })
    }
    return rows
  })()

  const editingLiving = livingLines.find((line) => line.id === livingEditId) ?? null
  const editingLivingGlyph = editingLiving ? SNAPSHOT_LIVING_GLYPH[editingLiving.id] : null
  const editingLivingFunded = Math.max(0, Number(livingTargetDraft) || 0)
  const editingLivingRemaining = editingLiving ? editingLivingFunded - editingLiving.spent : 0
  const editingBill = budgetBills.find((bill) => bill.id === billEditId) ?? null

  const openLivingEdit = (line: SnapshotLivingLine) => {
    setLivingEditId(line.id)
    setLivingTargetDraft(String(line.target))
    setLivingNameDraft(line.name)
    setRenamingLiving(false)
    setLivingDeleteOpen(false)
  }

  const closeLivingEdit = () => {
    setLivingEditId(null)
    setRenamingLiving(false)
    setLivingDeleteOpen(false)
  }

  const saveLivingEdit = () => {
    if (!livingEditId) return
    const trimmed = livingNameDraft.trim()
    if (trimmed) {
      setLivingNameOverrides((current) => ({
        ...current,
        [`${selectedMonth}:${livingEditId}`]: trimmed,
      }))
    }
    setLivingBudget(livingEditId, Math.max(0, Number(livingTargetDraft) || 0))
    closeLivingEdit()
  }

  const confirmLivingDelete = () => {
    if (!editingLiving) return
    const id = editingLiving.id
    const isMonthOnly = id.startsWith("added-living-")
    if (isMonthOnly) {
      setAddedLivingByMonth((current) => ({
        ...current,
        [selectedMonth]: (current[selectedMonth] ?? []).filter((line) => line.id !== id),
      }))
    } else {
      setRemovedLivingIds((current) => {
        const existing = current[selectedMonth] ?? []
        if (existing.includes(id)) return current
        return { ...current, [selectedMonth]: [...existing, id] }
      })
    }
    closeLivingEdit()
  }

  const openNewExpense = () => {
    setNewExpenseName("")
    setNewExpenseFunded("")
    setNewExpenseOpen(true)
  }

  const saveNewExpense = () => {
    const name = newExpenseName.trim()
    if (!name) return
    const funded = Math.max(0, Number(newExpenseFunded) || 0)
    const id = `added-living-${selectedMonth}-${Date.now()}`
    setAddedLivingByMonth((current) => ({
      ...current,
      [selectedMonth]: [
        ...(current[selectedMonth] ?? []),
        {
          id,
          name,
          shortName: name,
          target: funded,
          spent: 0,
        },
      ],
    }))
    setBudgets((current) => ({ ...current, [id]: funded }))
    setNewExpenseOpen(false)
  }

  const openBillEdit = (bill: SnapshotBill) => {
    setBillEditId(bill.id)
    setBillAmountDraft(String(bill.amount))
    setBillDueDraft(String(bill.dueDay))
    setBillRecurringDraft(bill.paymentMode === "autodraft")
  }

  const saveBillEdit = () => {
    if (!billEditId) return
    const amount = Math.max(0, Number(billAmountDraft) || 0)
    const dueDay = Math.min(28, Math.max(1, Math.round(Number(billDueDraft) || 1)))
    setBillAmountOverrides((current) => ({ ...current, [billEditId]: amount }))
    setBillDueOverrides((current) => ({ ...current, [billEditId]: dueDay }))
    setBillModeOverrides((current) => ({
      ...current,
      [billEditId]: billRecurringDraft ? "autodraft" : "manual",
    }))
    setBillEditId(null)
  }

  const openNewBill = () => {
    setNewBillName("")
    setNewBillAmount("")
    setNewBillDue("")
    setNewBillRecurring(true)
    setNewBillOpen(true)
  }

  const saveNewBill = () => {
    const name = newBillName.trim()
    if (!name) return
    const amount = Math.max(0, Number(newBillAmount) || 0)
    const dueDay = Math.min(28, Math.max(1, Math.round(Number(newBillDue) || 1)))
    setAddedBills((current) => [
      ...current,
      {
        id: `added-${current.length}-${dueDay}-${amount}`,
        listName: name,
        dueDay,
        amount,
        paymentMode: newBillRecurring ? "autodraft" : "manual",
      },
    ])
    setNewBillOpen(false)
  }

  const categorizationClear = uncategorized.length === 0
  const minimumsClear = tier1Short.length === 0 || shortfallAck
  const readyToLock = categorizationClear && billsReviewed && minimumsClear

  const cardModals = useLogbookCardModals({
    selectedMonth,
    activityRows: recentRows,
    livingLines,
    billsTotal: snapshotBills.total,
    expectedNet,
    unassignedSpent,
    onSaveActivity: saveActivityFromModal,
  })

  return (
    <div className="bg-stone-100 px-4 pb-6 pt-7 font-mono text-slate-800">
      <header aria-labelledby="logbook-heading">
        <div className="flex items-end gap-6">
          <h1
            id="logbook-heading"
            className="flex shrink-0 items-center gap-2.5 font-sans text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-600"
          >
            <ShipWheel className="h-7 w-7 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
            <span className="min-w-0 truncate">Captain&apos;s Chair</span>
          </h1>
          <div className="flex min-w-0 flex-1 items-end">
            <AnnualMonthGauge
              selectedMonth={selectedMonth}
              allYearSelected={allYearSelected}
              onSelectMonth={selectMonth}
              onSelectAllYear={selectAllYear}
            />
          </div>
        </div>

        {!allYearSelected ? (
          <div className="mt-3 flex items-end border-b border-[#0087D2]">
            <span className="mr-5 pb-1.5 font-sans text-lg font-bold italic tracking-tight text-slate-600">
              {monthName}
            </span>
            <div
              className="flex min-w-0 items-end gap-1"
              role="tablist"
              aria-label="Captain's Chair"
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
                      "cursor-pointer px-3 py-1.5 font-sans text-sm font-medium",
                      isActive
                        ? "-mb-px rounded-t-[2px] border-x border-b border-t border-x-[#0087D2] border-b-stone-100 border-t-[#0087D2] bg-stone-100 font-semibold text-[#0087D2]"
                        : tab.id === "cashout"
                          ? "rounded-t-[2px] text-slate-600 hover:text-slate-900"
                          : "rounded-t-[2px] text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {tab.id === "cashout" ? (
                      <span className="inline-flex items-center gap-0.5">
                        {`Cashout ${monthName}`}
                        <ChevronsRight className="h-3.5 w-3.5 shrink-0 stroke-[2]" aria-hidden />
                      </span>
                    ) : (
                      tab.label
                    )}
                  </button>
                )
              })}
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "income-tank"}
                onClick={() => setActiveTab("income-tank")}
                className={cn(
                  "ml-3.5 cursor-pointer px-3 py-1.5 font-sans text-sm font-medium",
                  activeTab === "income-tank"
                    ? "-mb-px rounded-t-[2px] border-x border-b border-t border-x-[#0087D2] border-b-stone-100 border-t-[#0087D2] bg-stone-100 font-semibold text-emerald-700"
                    : "rounded-t-[2px] text-emerald-700 hover:text-emerald-900",
                )}
              >
                Income Dock
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="pt-4" role={allYearSelected ? "region" : "tabpanel"}>
        {allYearSelected ? <YearForecastPanel budgetYear={DEFAULT_BUDGET_YEAR} /> : null}
        {!allYearSelected && activeTab === "snapshot" ? (
          <div className="grid grid-cols-2 items-start gap-4">
            <TimelineSnapshotCard
              selectedMonth={selectedMonth}
              livingLines={livingLines}
              expectedNet={expectedNet}
              onSelectBill={cardModals.openBill}
              onSelectLivingLine={cardModals.openLiving}
              onOpenCashoutInfo={cardModals.openCashoutInfo}
              onOpenBudget={() => setActiveTab("plan")}
            />
            <div className="flex min-w-0 flex-col gap-4">
              <TimelineCreditPaymentsCard
                selectedMonth={selectedMonth}
                onSelectCycle={cardModals.openCreditCycle}
              />
              <TimelineRecentActivityCard
                selectedMonth={selectedMonth}
                rows={activeRecentRows}
                onOpenFullMonth={() => setActiveTab("activity")}
                onSelectRow={cardModals.openActivity}
              />
            </div>
          </div>
        ) : null}

        {!allYearSelected && activeTab === "plan" ? (
          <div className="grid grid-cols-2 items-start gap-4">
            <div className="min-w-0">
              <article
                className={cn("overflow-hidden font-sans", budgetCardShell)}
                aria-labelledby="budget-plan-heading"
              >
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-300 bg-white px-3 py-2.5">
                  <h2
                    id="budget-plan-heading"
                    className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-slate-600"
                  >
                    <ClipboardList className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
                    <span className="min-w-0 truncate">{monthName} Plan</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPlanDetailsOpen(true)}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline"
                  >
                    <span>Plan Details</span>
                    <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                  </button>
                </header>
                <div className="px-4 pb-3 pt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="pl-5 text-sm font-semibold text-slate-600">Starting Funds</span>
                    <span className={cn("shrink-0 text-lg font-semibold tabular-nums text-slate-700", amountInter.className)}>
                      {fmtDollars(SNAPSHOT_STARTING_FUNDS)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <div
                      className="group flex cursor-default items-center justify-between gap-3"
                      onMouseEnter={() => setPlanCardLink("bills")}
                      onMouseLeave={() => setPlanCardLink((current) => (current === "bills" ? null : current))}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 pl-8 text-[13px] text-slate-600 transition-colors duration-150 group-hover:text-[#0087D2]">
                        {planCardLink === "bills" ? (
                          <ArrowRight className="h-4 w-4 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-500" aria-hidden />
                        )}
                        Bills
                      </span>
                      <span className={cn("shrink-0 text-sm font-medium tabular-nums text-slate-700", amountInter.className)}>
                        {fmtSignedDollars(-snapshotBills.total)}
                      </span>
                    </div>
                    <div
                      className="group flex cursor-default items-center justify-between gap-3"
                      onMouseEnter={() => setPlanCardLink("living")}
                      onMouseLeave={() => setPlanCardLink((current) => (current === "living" ? null : current))}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 pl-8 text-[13px] text-slate-600 transition-colors duration-150 group-hover:text-[#0087D2]">
                        {planCardLink === "living" ? (
                          <ArrowDown className="h-4 w-4 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
                        ) : (
                          <ChartColumn className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-500" aria-hidden />
                        )}
                        Living Expenses
                      </span>
                      <span className={cn("shrink-0 text-sm font-medium tabular-nums text-slate-700", amountInter.className)}>
                        {fmtSignedDollars(-livingLiability)}
                      </span>
                    </div>
                    {additionalFundsNeededForCards > 0 ? (
                      <div
                        className="group flex cursor-default items-center justify-between gap-3"
                        onMouseEnter={() => setPlanCardLink("credit")}
                        onMouseLeave={() => setPlanCardLink((current) => (current === "credit" ? null : current))}
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5 pl-8 text-[13px] text-slate-600 transition-colors duration-150 group-hover:text-[#0087D2]">
                          {planCardLink === "credit" ? (
                            <ArrowDown className="h-4 w-4 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
                          ) : (
                            <CreditCard className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-500" aria-hidden />
                          )}
                          Additional Needed for Credit Card Payments
                        </span>
                        <span className={cn("shrink-0 text-sm font-medium tabular-nums text-slate-700", amountInter.className)}>
                          {fmtSignedDollars(-additionalFundsNeededForCards)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <div className="relative flex items-baseline justify-end">
                    <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-sm font-medium italic text-slate-700">
                      Expected Cashout
                      <span
                        className={cn(
                          "ml-2 inline-flex items-baseline font-semibold italic text-orange-700/90",
                          myJourneyNav.className,
                          "text-xl",
                        )}
                      >
                        in{" "}
                        <span className="mx-1 text-[1.3em] font-bold leading-none">{daysToCashout}</span>
                        {daysToCashout === 1 ? "day" : "days"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "relative shrink-0 text-lg font-semibold tabular-nums",
                        amountInter.className,
                        expectedNet < 0 ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {expectedNet < 0 ? fmtSignedDollars(expectedNet) : fmtDollars(expectedNet)}
                    </span>
                  </div>
                  {expectedNet < 0 ? (
                    <p className="mt-1.5 pl-5 text-[11px] leading-snug text-slate-600">
                      Shortfall at the end of the month will need to be covered from your Stash. You can adjust your budget to prevent this.
                    </p>
                  ) : null}
                </div>
              </article>

              <article
                className={cn(
                  "mt-4 overflow-hidden font-sans transition-[background-color,box-shadow,border-color] duration-150",
                  budgetCardShell,
                )}
                style={planCardLink === "living" ? planCardLinkStyle : undefined}
                aria-label="Living Expenses"
              >
                <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-3 py-2.5">
                  <h3 className="relative z-10 flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-slate-600">
                    <ChartColumn className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
                    Living Expenses
                  </h3>
                  <button
                    type="button"
                    onClick={openNewExpense}
                    className="relative z-10 inline-flex shrink-0 cursor-pointer items-center font-sans text-[11px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                  >
                    + New Category
                  </button>
                </div>
                <div className="px-3">
                <div
                  className={cn(
                    livingExpenseCols,
                    "-mx-2 px-2 py-1.5 text-[10px] font-medium leading-tight text-slate-400",
                  )}
                >
                  <span className="min-w-0">
                    <span className="sr-only">Category</span>
                  </span>
                  <span className="whitespace-nowrap text-right">Total Funded</span>
                  <span className="whitespace-nowrap text-right">Spent</span>
                  <span className="whitespace-nowrap text-right">Remaining</span>
                </div>
                <ul className="divide-y divide-stone-100">
                  {livingLines.map((line) => {
                    const remaining = line.target - line.spent
                    const isOver = remaining < 0
                    const glyph = SNAPSHOT_LIVING_GLYPH[line.id]
                    const Icon = glyph?.Icon
                    return (
                      <li key={line.id}>
                        <button
                          type="button"
                          onClick={() => openLivingEdit(line)}
                          className={cn(
                            livingExpenseCols,
                            budgetRowHover,
                            "cursor-pointer py-2 text-left",
                          )}
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            {Icon ? (
                              <Icon
                                className={cn("h-4 w-4 shrink-0 stroke-[1.5]", glyph.className)}
                                aria-hidden
                              />
                            ) : (
                              <span className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                            <span className="min-w-0 truncate text-[13px] text-slate-800">
                              {line.name}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "text-right text-[11px] font-medium tabular-nums text-slate-700",
                              amountInter.className,
                            )}
                          >
                            {fmtDollars(line.target)}
                          </span>
                          <span
                            className={cn(
                              "text-right text-[11px] font-medium tabular-nums text-slate-500",
                              amountInter.className,
                            )}
                          >
                            {fmtDollars(line.spent)}
                          </span>
                          <span
                            className={cn(
                              "text-right text-[11px] tabular-nums",
                              amountInter.className,
                              isOver ? "font-semibold text-rose-700" : "font-medium text-slate-500",
                            )}
                          >
                            {isOver ? `-${fmtDollars(remaining)}` : fmtDollars(remaining)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                </div>
                <div
                  className={cn(
                    livingExpenseCols,
                    "border-t border-sky-200 bg-sky-100/80 px-3 py-2 text-[13px] font-semibold text-slate-800",
                  )}
                >
                  <span className="text-center uppercase tracking-wide">Total</span>
                  <span
                    className={cn(
                      "text-right text-[11px] font-semibold tabular-nums text-slate-700",
                      amountInter.className,
                    )}
                  >
                    {fmtDollars(livingFundedTotal)}
                  </span>
                  <span
                    className={cn(
                      "text-right text-[11px] font-semibold tabular-nums text-slate-700",
                      amountInter.className,
                    )}
                  >
                    {fmtDollars(livingSpentTotal)}
                  </span>
                  <span
                    className={cn(
                      "text-right text-[11px] font-semibold tabular-nums",
                      amountInter.className,
                      livingRemainingTotal < 0 ? "text-rose-700" : "text-emerald-700",
                    )}
                  >
                    {livingRemainingTotal < 0
                      ? `-${fmtDollars(livingRemainingTotal)}`
                      : fmtDollars(livingRemainingTotal)}
                  </span>
                </div>
              </article>

              <article
                className={cn(
                  "mt-4 overflow-hidden font-sans transition-[background-color,box-shadow,border-color] duration-150",
                  budgetCardShell,
                )}
                style={planCardLink === "credit" ? planCardLinkStyle : undefined}
                aria-label="Credit Card Payments"
              >
                <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-3 py-2.5">
                  <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-slate-600">
                    <CreditCard className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
                    Credit Card Payments
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCreditPaymentDetailsOpen(true)}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline"
                  >
                    <span>Payment Details</span>
                    <ChevronRight className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                  </button>
                </div>
                <div className="px-3">
                  <div
                    className={cn(
                      creditPayCols,
                      "py-1.5 text-[10px] font-medium leading-tight text-slate-400",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="sr-only">Card</span>
                    </span>
                    <span className="text-right">Payment</span>
                    <span className="text-right">From Reserve</span>
                    <span className="text-right">Additional Needed</span>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {creditPaymentRows.map((cycle) => (
                      <li key={cycle.id} className={cn(creditPayCols, "py-2")}>
                        <span className="flex min-w-0 items-center gap-3.5">
                          {cycle.dueDateLabel ? (
                            <span className="flex w-10 shrink-0 flex-col items-center">
                              <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-slate-400">
                                Due
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 text-center text-[11px] font-medium tabular-nums text-slate-600",
                                  amountInter.className,
                                )}
                              >
                                {fmtCreditDueDisplay(cycle.dueDateLabel)}
                              </span>
                            </span>
                          ) : null}
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-[13px] text-slate-800">
                              {cycle.cardLabel}
                            </span>
                            <span
                              className={cn(
                                "inline-flex h-4 shrink-0 items-center rounded-[2px] border px-1 text-[10px] font-medium tabular-nums leading-none",
                                amountInter.className,
                                creditNetworkPillClass(cycle.cardLabel),
                              )}
                              aria-hidden
                            >
                              {cycle.lastFour}
                            </span>
                          </span>
                        </span>
                        <span
                          className={cn(
                            "text-right text-[11px] font-medium tabular-nums text-slate-700",
                            amountInter.className,
                          )}
                        >
                          {fmtDollars(cycle.payment)}
                        </span>
                        <span
                          className={cn(
                            "text-right text-[11px] font-medium tabular-nums text-slate-500",
                            amountInter.className,
                          )}
                        >
                          {fmtDollars(cycle.fromReserve)}
                        </span>
                        <span
                          className={cn(
                            "text-right text-[11px] font-medium tabular-nums text-slate-700",
                            amountInter.className,
                          )}
                        >
                          {fmtDollars(cycle.additionalNeeded)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={cn(
                    creditPayCols,
                    "border-t border-sky-200 bg-sky-100/80 px-3 py-2 text-[13px] font-semibold text-slate-800",
                  )}
                >
                  <span className="col-span-3 flex min-w-0 justify-center px-2 text-center leading-snug">
                    Additional Funds Needed for Credit Card Payments
                  </span>
                  <span
                    className={cn(
                      "text-right text-[11px] font-semibold tabular-nums text-slate-800",
                      amountInter.className,
                    )}
                  >
                    {fmtDollars(additionalFundsNeededForCards)}
                  </span>
                </div>
              </article>
            </div>

            <article
              className={cn(
                "flex min-w-0 flex-col transition-[background-color,box-shadow,border-color] duration-150",
                budgetCardShell,
              )}
              style={planCardLink === "bills" ? planCardLinkStyle : undefined}
              aria-label="Bills"
            >
              <div className="relative flex shrink-0 items-center gap-2 border-b border-stone-200 px-3 py-2.5">
                <h3 className="relative z-10 flex min-w-0 flex-1 items-center gap-2 font-sans text-[15px] font-bold tracking-tight text-slate-600">
                  <FileText className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
                  Bills
                </h3>
                {paidBudgetBills.length > 0 ? (
                  <label className="pointer-events-auto absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-1.5 whitespace-nowrap font-sans text-[11px] font-medium text-slate-500">
                    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-slate-300 bg-transparent">
                      {!paidBillsCollapsed ? (
                        <Check
                          className="h-2.5 w-2.5 stroke-[1.5] text-slate-500"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={!paidBillsCollapsed}
                      onChange={(event) => setPaidBillsCollapsed(!event.target.checked)}
                      className="sr-only"
                    />
                    Show paid bills
                  </label>
                ) : null}
                <span className="relative z-10 inline-flex shrink-0 items-baseline gap-1 font-sans text-xs font-medium text-slate-500">
                  Total{" "}
                  <span className={cn("text-[11px] font-medium tabular-nums text-slate-700", amountInter.className)}>
                    {fmtDollars(planBillTotals.total)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={openNewBill}
                  className="relative z-10 inline-flex w-[4.5rem] shrink-0 cursor-pointer items-center justify-end font-sans text-[11px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                >
                  + New Bill
                </button>
              </div>
              <ul className="px-3">
                {visibleBudgetBills.map((row) => {
                  if (row.kind === "paid-total") {
                    return (
                      <li
                        key="paid-bills-total"
                        className="-mx-3 border-b border-amber-100/80 bg-amber-50/60 px-3 transition-colors duration-150 hover:bg-sky-50/90"
                      >
                        <button
                          type="button"
                          onClick={() => setPaidBillsCollapsed(false)}
                          aria-expanded={false}
                          aria-label="Show paid bills"
                          className="flex w-full cursor-pointer items-center gap-2 py-2 text-left"
                        >
                          <span className="w-6 shrink-0" aria-hidden />
                          <span
                            className="flex min-w-0 flex-1 items-center justify-center gap-1 truncate font-sans text-sm text-slate-600"
                            style={{ fontStyle: "italic" }}
                          >
                            {paidBudgetBills.length} Paid Bills
                            <ChevronRight className="h-3 w-3 shrink-0 stroke-[2] text-[#0087D2]" aria-hidden />
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-[11px] font-medium tabular-nums text-slate-700",
                              amountInter.className,
                            )}
                          >
                            {fmtDollars(paidBillsTotal)}
                          </span>
                          <BillStatusGutter status="paid" />
                        </button>
                      </li>
                    )
                  }
                  const { bill } = row
                  const status = budgetBillStatus(bill)
                  return (
                    <li key={bill.id} className="border-b border-stone-100">
                      <button
                        type="button"
                        onClick={() => openBillEdit(bill)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 py-2 text-left",
                          budgetRowHover,
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 shrink-0 text-[11px] font-normal tabular-nums text-slate-500",
                            amountInter.className,
                          )}
                        >
                          {bill.dueDay}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-800">
                          {bill.listName}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-medium tabular-nums text-slate-700",
                            amountInter.className,
                          )}
                        >
                          {fmtDollars(bill.amount)}
                        </span>
                        <BillStatusGutter status={status} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </article>
          </div>
        ) : null}

        {!allYearSelected && activeTab === "activity" ? (
          <article className="overflow-hidden rounded-[2px] border border-slate-200 bg-white" aria-label={`${monthName} activity`}>
            <div className="flex items-baseline justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">{monthName} Activity</h3>
              <span className="text-xs italic text-slate-400">{activityRows.length} transactions</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Calendar Stamp</th>
                  <th className="px-3 py-2 font-medium">Cycle Stamp</th>
                  <th className="px-3 py-2 font-medium">Merchant</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((txn) => {
                  const categoryId = displayCategory(txn)
                  const unassigned = categoryId == null
                  return (
                    <tr
                      key={txn.id}
                      className={cn("border-b border-slate-100", unassigned && "bg-amber-50/70")}
                    >
                      <td className="whitespace-nowrap px-5 py-2 font-mono tabular-nums text-slate-700">
                        {monthAbbrev} {txn.day}
                      </td>
                      <td className="px-3 py-2 text-xs italic text-slate-500">{cycleStampFor(txn)}</td>
                      <td className="px-3 py-2 text-slate-800">{txn.merchant}</td>
                      <td className="px-3 py-2">
                        <CategorySelect
                          value={categoryId}
                          onChange={(next) => assignCategory(txn.id, next)}
                          options={assignOptions}
                          label={`Category for ${txn.merchant}`}
                        />
                      </td>
                      <td className="px-5 py-2 text-right font-mono tabular-nums text-slate-800">
                        -{fmtDollars(txn.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </article>
        ) : null}

        {!allYearSelected && activeTab === "income-tank" ? (
          <div className="max-w-xl">
            <TimelineIncomeTankCard
              items={incomeLines}
              selectedMonth={selectedMonth}
              headerTheme="softSlate"
            />
          </div>
        ) : null}

        {!allYearSelected && activeTab === "cashout" ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => cardModals.openSettleUp()}
                className={cn(
                  "group inline-flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[2px] px-5 py-2 shadow-sm transition-colors duration-150",
                  readyToLock
                    ? "bg-[#0087D2] text-white hover:bg-[#00487A] active:bg-[#00365D]"
                    : "border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-slate-200 to-slate-200 text-slate-400 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 group-hover:text-slate-600",
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-wide">
                    Cash Out {monthName}
                  </span>
                  <span
                    className={cn(
                      "pb-px text-[17px] font-black leading-none transition-colors duration-150",
                      readyToLock
                        ? "text-amber-400 group-hover:text-amber-200"
                        : "text-slate-300 group-hover:text-slate-500",
                    )}
                    aria-hidden
                  >
                    &raquo;
                  </span>
                  <span
                    className={cn(
                      `text-[15px] font-medium italic leading-tight transition-colors duration-150 ${myJourneyNav.className}`,
                      readyToLock
                        ? "text-white group-hover:text-white"
                        : "text-slate-500 group-hover:text-slate-700",
                    )}
                  >
                    Advance to {nextMonthLabel}
                  </span>
                </span>
                {!readyToLock ? (
                  <span className="text-[10px] font-medium italic leading-tight text-slate-500 transition-colors duration-150 group-hover:text-slate-600">
                    Unlocks on {nextMonthLabel} 1st
                  </span>
                ) : null}
              </button>
            </div>

          <div className="grid grid-cols-2 items-start gap-4">
            <article className={CARD_CLASS} aria-label={`${monthName} Closeout Audit`}>
              <div className={SECTION_RULE}>
                <h3 className="text-sm font-bold text-slate-900">{monthName} Closeout Audit</h3>
                <span className="text-xs italic text-slate-400">Maximum liability, then the sweep</span>
              </div>
              <Leader
                left="Starting Funds"
                right={fmtDollars(SNAPSHOT_STARTING_FUNDS)}
                rightClassName="text-sm font-semibold text-slate-900"
              />
              <Leader
                left="Bills"
                meta={`${snapshotBills.paidCount} paid · ${snapshotBills.upcomingCount} unpaid`}
                right={fmtDollars(snapshotBills.total)}
                rightClassName="text-sm text-slate-800"
              />
              <div className="mb-1 mt-4 border-b border-slate-100 pb-2">
                <h4 className="text-sm font-semibold text-slate-900">Living Expenses & The Sweep</h4>
              </div>
              {livingLines.map((line) => {
                const remaining = line.target - line.spent
                return (
                  <Leader
                    key={line.id}
                    left={line.shortName}
                    meta={remaining < 0 ? "overage stays in liability" : "unspent returns in the sweep"}
                    right={remaining < 0 ? `${fmtDollars(Math.abs(remaining))} Over` : `${fmtDollars(remaining)} Sweep`}
                    rightClassName={remaining < 0 ? "text-sm text-rose-600" : "text-sm text-slate-700"}
                  />
                )
              })}
              {unassignedSpent > 0 ? (
                <Leader
                  left="! Unassigned"
                  meta="uncategorized swipes stay in liability"
                  right={fmtDollars(unassignedSpent)}
                  rightClassName="text-sm font-semibold text-rose-600"
                />
              ) : null}
              <Leader
                left="Credit card payments"
                meta="additional funds beyond reserve"
                right={fmtDollars(additionalFundsNeededForCards)}
                rightClassName="text-sm text-slate-800"
              />
              <Leader
                left="Expected Cashout"
                meta="if every planned dollar is spent"
                right={fmtSignedDollars(expectedNet)}
                rightClassName="text-sm font-semibold text-slate-900"
              />
              <Leader
                left="STASH projection"
                meta={`today ${fmtDollars(STASH_BALANCE)} + cashout ${fmtSignedDollars(projectedCashout)}`}
                right={fmtSignedDollars(stashAfter)}
                rightClassName="text-sm font-bold text-slate-900"
              />
            </article>

            <div className="flex min-w-0 flex-col gap-4">
              <article className={CARD_CLASS} aria-label={`${nextMonthLabel} Starting Funds Rollover`}>
                <div className={SECTION_RULE}>
                  <h3 className="text-sm font-bold text-slate-900">{nextMonthLabel} Starting Funds Rollover</h3>
                  <span className="font-mono text-xs tabular-nums text-slate-500">{fmtDollars(incomeTotal)}</span>
                </div>
                <p className="mb-2 text-xs italic text-slate-400">
                  Income Dock · {monthName} paychecks become {nextMonthLabel} Starting Funds
                </p>
                {incomeLines.map((line) => (
                  <Leader
                    key={line.id}
                    left={line.label}
                    meta={line.cleared ? line.expectedDate : `${line.expectedDate} · pending`}
                    right={fmtDollars(line.amount)}
                    rightClassName="text-sm text-slate-800"
                  />
                ))}
              </article>

              <article className={CARD_CLASS} aria-label="Escrow and settlement log">
                <div className={SECTION_RULE}>
                  <h3 className="text-sm font-bold text-slate-900">Escrow & Settlement Log (Outside P&L)</h3>
                </div>
                <p className="mb-2 text-xs italic text-slate-400">
                  Executed card settlements. These transfers do not change {monthName} profit.
                </p>
                {ESCROW_SETTLEMENTS.map((row) => (
                  <Leader
                    key={row.id}
                    left={`${row.when} · ${row.card}`}
                    meta={row.note}
                    right={fmtDollars(row.amount)}
                    rightClassName="text-sm text-slate-700"
                  />
                ))}
              </article>

              <article className={CARD_CLASS} aria-label="Lock month pre-flight">
                <div className={SECTION_RULE}>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lock {monthName} & Advance to {nextMonthLabel} &raquo;
                  </h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border text-[9px]",
                        categorizationClear
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-rose-300 bg-rose-50 text-rose-600",
                      )}
                      aria-hidden
                    >
                      {categorizationClear ? "✓" : "!"}
                    </span>
                    <span>
                      Every {monthName} transaction has a category
                      <span className="mt-0.5 block text-xs italic text-slate-400">
                        {categorizationClear
                          ? "Clear"
                          : `${uncategorized.length} still unassigned on Activity`}
                      </span>
                    </span>
                  </li>
                  <li>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={billsReviewed}
                        onChange={(event) => setBillsReviewed(event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded-[2px] border-slate-300"
                      />
                      <span>
                        Bills checklist reviewed
                        <span className="mt-0.5 block text-xs italic text-slate-400">
                          {PLAN_BILLS.length} items · {fmtDollars(planBillTotals.unpaid)} unpaid
                        </span>
                      </span>
                    </label>
                  </li>
                  <li>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={tier1Short.length === 0 || shortfallAck}
                        disabled={tier1Short.length === 0}
                        onChange={(event) => setShortfallAck(event.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded-[2px] border-slate-300"
                      />
                      <span>
                        Tier 1 minimums covered or acknowledged
                        <span className="mt-0.5 block text-xs italic text-slate-400">
                          {tier1Short.length === 0
                            ? "Every closed statement meets its minimum"
                            : tier1Short
                                .map((cycle) => {
                                  const status = tier1Status(cycle)
                                  return `${cycle.cardLabel} ${fmtDollars(status.amount)} ${status.label}`
                                })
                                .join(" · ")}
                        </span>
                      </span>
                    </label>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-emerald-600 bg-emerald-50 text-[9px] text-emerald-700"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>
                      Income Dock staged for {nextMonthLabel}
                      <span className="mt-0.5 block text-xs italic text-slate-400">
                        {fmtDollars(incomeTotal)} rolls forward
                      </span>
                    </span>
                  </li>
                </ul>
                {lockNote ? (
                  <p className="mt-3 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {lockNote}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!readyToLock}
                    onClick={() => {
                      if (activityRows.some((txn) => countsTowardMonth(txn) && !displayCategory(txn))) return
                      setLockNote(`${monthName} locked. ${nextMonthLabel} is now the open month.`)
                      setSelectedMonth(MONTH_LABELS[(selectedMonthIndex + 1) % 12] as MonthLabel)
                    }}
                    className={cn(
                      "mt-4 w-full rounded-[2px] border px-3 py-2 text-center text-xs font-bold uppercase tracking-wide",
                      readyToLock
                        ? "cursor-pointer border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                    )}
                  >
                    Lock {monthName} & Advance to {nextMonthLabel} &raquo;
                  </button>
                )}
              </article>
            </div>
          </div>
          </div>
        ) : null}
      </div>

      <PlanDetailsDialog
        open={planDetailsOpen}
        onOpenChange={setPlanDetailsOpen}
        monthName={monthName}
        prevMonthName={prevMonthName}
        livingLines={livingLines}
        creditPayments={creditPaymentRows.map((cycle) => ({
          id: cycle.id,
          label: `${cycle.cardLabel} · ${cycle.lastFour}`,
          additionalNeeded: cycle.additionalNeeded,
        }))}
        expectedCashout={expectedNet}
        daysToCashout={daysToCashout}
      />

      <CreditPaymentDetailsDialog
        open={creditPaymentDetailsOpen}
        onOpenChange={setCreditPaymentDetailsOpen}
        monthName={monthName}
      />

      <Dialog open={!!editingLiving} onOpenChange={(open) => !open && closeLivingEdit()}>
        <DialogContent
          className="gap-3 rounded-[2px] border border-slate-300 p-4 shadow-md sm:max-w-md"
          showCloseButton
        >
          {editingLiving ? (
            <>
              <DialogHeader className="gap-1.5">
                <DialogTitle className="sr-only">
                  {monthName} {livingNameDraft || editingLiving.name}
                </DialogTitle>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pr-6 font-sans">
                  <span className="text-base font-bold text-slate-900">{monthName}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-800">
                    {editingLivingGlyph ? (
                      <editingLivingGlyph.Icon
                        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", editingLivingGlyph.className)}
                        aria-hidden
                      />
                    ) : null}
                    {renamingLiving ? (
                      <input
                        autoFocus
                        value={livingNameDraft}
                        aria-label="Category name"
                        onChange={(event) => setLivingNameDraft(event.target.value)}
                        onBlur={() => setRenamingLiving(false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            setRenamingLiving(false)
                          }
                        }}
                        className="h-6 w-40 min-w-0 rounded-[2px] border border-slate-300 bg-white px-1.5 text-sm font-medium text-slate-800 outline-none focus:border-[#0087D2]"
                      />
                    ) : (
                      <span className="min-w-0 truncate">{livingNameDraft || editingLiving.name}</span>
                    )}
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        if (renamingLiving) setRenamingLiving(false)
                      }}
                      onClick={() => {
                        if (!renamingLiving) setRenamingLiving(true)
                      }}
                      aria-label={renamingLiving ? "Close rename" : "Rename category"}
                      className={cn(
                        "shrink-0 cursor-pointer",
                        renamingLiving
                          ? "text-rose-400 hover:text-rose-600"
                          : "text-[11px] font-normal text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-[#0087D2] hover:decoration-[#0087D2]",
                      )}
                    >
                      {renamingLiving ? (
                        <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      ) : (
                        "rename"
                      )}
                    </button>
                  </span>
                </div>
              </DialogHeader>
              <div className="flex flex-col gap-1">
                <label className={livingEditCols}>
                  <span className="font-sans text-[13px] text-slate-700">Total Funded</span>
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    aria-label="Total Funded"
                    value={livingTargetDraft}
                    onChange={(event) => setLivingTargetDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        saveLivingEdit()
                      }
                    }}
                    className={cn(
                      "h-7 w-full rounded-[2px] border border-slate-300 bg-white px-1.5 text-right text-[11px] font-medium tabular-nums text-slate-900 outline-none [appearance:textfield] focus:border-[#0087D2] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                      amountInter.className,
                    )}
                  />
                </label>
                <div className={livingEditCols}>
                  <span className="font-sans text-[13px] text-slate-600">Spent</span>
                  <span
                    className={cn(
                      "flex h-7 items-center justify-end border border-transparent px-1.5 text-[11px] font-medium tabular-nums text-slate-700",
                      amountInter.className,
                    )}
                  >
                    {fmtDollars(editingLiving.spent)}
                  </span>
                </div>
                <div className={livingEditCols}>
                  <span className="font-sans text-[13px] text-slate-600">Remaining</span>
                  <span
                    className={cn(
                      "flex h-7 items-center justify-end border border-transparent px-1.5 text-[11px] tabular-nums",
                      amountInter.className,
                      editingLivingRemaining < 0 ? "font-semibold text-rose-700" : "font-medium text-slate-500",
                    )}
                  >
                    {editingLivingRemaining < 0
                      ? `-${fmtDollars(editingLivingRemaining)}`
                      : fmtDollars(editingLivingRemaining)}
                  </span>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <button
                  type="button"
                  onClick={() => setLivingDeleteOpen(true)}
                  className="cursor-pointer self-start rounded-[2px] px-1 py-1.5 font-sans text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeLivingEdit}
                    className="cursor-pointer rounded-[2px] border border-slate-300 px-3 py-1.5 font-sans text-xs font-semibold text-slate-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveLivingEdit}
                    className="cursor-pointer rounded-[2px] border border-[#0087D2] bg-[#0087D2] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[#006BB3]"
                  >
                    Save
                  </button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={livingDeleteOpen} onOpenChange={setLivingDeleteOpen}>
        <AlertDialogContent className="rounded-[2px] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-base">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-sm leading-relaxed text-slate-600">
              {editingLiving?.id.startsWith("added-living-") ? (
                <>
                  This removes{" "}
                  <span className="font-medium text-slate-800">
                    {livingNameDraft || editingLiving?.name}
                  </span>{" "}
                  from {monthName}. It was added for this month only and is not on your template
                  list.
                </>
              ) : (
                <>
                  This removes{" "}
                  <span className="font-medium text-slate-800">
                    {livingNameDraft || editingLiving?.name}
                  </span>{" "}
                  from {monthName} only. You can go to the{" "}
                  <Link
                    href="/bills-and-income"
                    className="font-medium text-[#0087D2] underline-offset-2 hover:underline"
                    onClick={() => setLivingDeleteOpen(false)}
                  >
                    Bills &amp; Income
                  </Link>{" "}
                  tab to remove{" "}
                  <span className="font-medium text-slate-800">
                    {livingNameDraft || editingLiving?.name}
                  </span>{" "}
                  from your template list.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer rounded-[2px] font-sans text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer rounded-[2px] bg-rose-600 font-sans text-xs text-white hover:bg-rose-700"
              onClick={confirmLivingDelete}
            >
              Remove from {monthName}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent
          className="gap-3 rounded-[2px] border border-slate-300 p-4 shadow-md sm:max-w-sm"
          showCloseButton
        >
          <DialogHeader className="gap-1">
            <DialogTitle className="font-sans text-base font-bold text-slate-900">
              New Expense Category
            </DialogTitle>
            <p className="font-sans text-xs leading-relaxed text-slate-500">
              Adds an expense category to {monthName} only. Use Bills &amp; Income to change your
              recurring template.
            </p>
          </DialogHeader>
          <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Name
            <input
              autoFocus
              type="text"
              value={newExpenseName}
              onChange={(event) => setNewExpenseName(event.target.value)}
              className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-sans text-sm text-slate-900 outline-none focus:border-[#0087D2]"
            />
          </label>
          <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Total Funded
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={newExpenseFunded}
              onChange={(event) => setNewExpenseFunded(event.target.value)}
              className={cn(
                "mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]",
                amountInter.className,
              )}
            />
          </label>
          <DialogFooter className="gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setNewExpenseOpen(false)}
              className="cursor-pointer rounded-[2px] border border-slate-300 px-3 py-1.5 font-sans text-xs font-semibold text-slate-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewExpense}
              disabled={!newExpenseName.trim()}
              className="cursor-pointer rounded-[2px] border border-[#0087D2] bg-[#0087D2] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[#006BB3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newBillOpen} onOpenChange={setNewBillOpen}>
        <DialogContent
          className="gap-3 rounded-[2px] border border-slate-300 p-4 shadow-md sm:max-w-sm"
          showCloseButton
        >
          <DialogHeader className="gap-1">
            <DialogTitle className="font-sans text-base font-bold text-slate-900">New Bill</DialogTitle>
          </DialogHeader>
          <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Name
            <input
              autoFocus
              type="text"
              value={newBillName}
              onChange={(event) => setNewBillName(event.target.value)}
              className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-sans text-sm text-slate-900 outline-none focus:border-[#0087D2]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Amount
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={newBillAmount}
                onChange={(event) => setNewBillAmount(event.target.value)}
                className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]"
              />
            </label>
            <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Due day
              <input
                type="number"
                min={1}
                max={28}
                step={1}
                inputMode="numeric"
                value={newBillDue}
                onChange={(event) => setNewBillDue(event.target.value)}
                className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-slate-700">
            <input
              type="checkbox"
              checked={newBillRecurring}
              onChange={(event) => setNewBillRecurring(event.target.checked)}
              className="h-3.5 w-3.5 rounded-[2px] border-slate-300"
            />
            Recurring autodraft
          </label>
          <DialogFooter className="gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setNewBillOpen(false)}
              className="cursor-pointer rounded-[2px] border border-slate-300 px-3 py-1.5 font-sans text-xs font-semibold text-slate-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewBill}
              disabled={!newBillName.trim()}
              className="cursor-pointer rounded-[2px] border border-[#0087D2] bg-[#0087D2] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[#006BB3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBill} onOpenChange={(open) => !open && setBillEditId(null)}>
        <DialogContent
          className="gap-3 rounded-[2px] border border-slate-300 p-4 shadow-md sm:max-w-sm"
          showCloseButton
        >
          {editingBill ? (
            <>
              <DialogHeader className="gap-1">
                <DialogTitle className="font-sans text-base font-bold text-slate-900">
                  {editingBill.listName}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={billAmountDraft}
                    onChange={(event) => setBillAmountDraft(event.target.value)}
                    className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]"
                  />
                </label>
                <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Due day
                  <input
                    type="number"
                    min={1}
                    max={28}
                    step={1}
                    inputMode="numeric"
                    value={billDueDraft}
                    onChange={(event) => setBillDueDraft(event.target.value)}
                    className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]"
                  />
                </label>
              </div>
              <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={billRecurringDraft}
                  onChange={(event) => setBillRecurringDraft(event.target.checked)}
                  className="h-3.5 w-3.5 rounded-[2px] border-slate-300"
                />
                Recurring autodraft
              </label>
              <DialogFooter className="gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBillEditId(null)}
                  className="cursor-pointer rounded-[2px] border border-slate-300 px-3 py-1.5 font-sans text-xs font-semibold text-slate-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBillEdit}
                  className="cursor-pointer rounded-[2px] border border-[#0087D2] bg-[#0087D2] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[#006BB3]"
                >
                  Save
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {cardModals.dialogs}
    </div>
  )
}
