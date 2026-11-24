"use client"

import { useMemo, useState, type ReactNode } from "react"
import { BookOpen, ChevronsRight, Lock, RefreshCw, Star } from "lucide-react"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import {
  TimelineCreditPaymentsCard,
  TimelineRecentActivityCard,
  TimelineSnapshotCard,
} from "@/components/timeline-snapshot-cards"
import { useLogbookCardModals, type LogbookActivitySave } from "@/components/logbook-timeline-modals"
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
  monthLongNameFromIndex,
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
import { myJourneyNav } from "@/lib/fonts"
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
                ? "border-[#0087D2] bg-sky-100/80 font-semibold text-slate-900"
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
            ? "border-[#0087D2] bg-sky-100/80 font-semibold text-slate-900"
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
        Draft
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
  const [shortfallAck, setShortfallAck] = useState(false)
  const [lockNote, setLockNote] = useState<string | null>(null)
  const [billPaidOverrides, setBillPaidOverrides] = useState<Record<string, boolean>>({})
  const [billAmountOverrides, setBillAmountOverrides] = useState<Record<string, number>>({})
  const [billDueOverrides, setBillDueOverrides] = useState<Record<string, number>>({})
  const [billModeOverrides, setBillModeOverrides] = useState<
    Record<string, SnapshotBill["paymentMode"]>
  >({})
  const [livingEditId, setLivingEditId] = useState<string | null>(null)
  const [livingTargetDraft, setLivingTargetDraft] = useState("")
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
  const prevMonthLabel = monthLongNameFromIndex((selectedMonthIndex + 11) % 12)
  const nextMonthLabel = monthLongNameFromLabel(
    MONTH_LABELS[(selectedMonthIndex + 1) % 12] as MonthLabel,
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
    return LIVING_FUNDS.map((line) => {
      let delta = 0
      for (const txn of MONTH_ACTIVITY) {
        const effective = countsTowardMonth(txn) ? displayCategory(txn) : null
        if (effective === line.id) delta += txn.amount
        if (txn.categoryId === line.id) delta -= txn.amount
      }
      const budgeted = budgets[line.id] ?? line.target
      return { ...line, target: budgeted, spent: line.spent + delta }
    })
  }, [activityOverrides, assignments, budgets, selectedMonth])

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
  const unassignedSpent = MONTH_ACTIVITY.reduce((sum, txn) => {
    if (!countsTowardMonth(txn)) return sum
    if (txn.billId || displayCategory(txn)?.startsWith("bill:")) return sum
    if (displayCategory(txn)) return sum
    return sum + txn.amount
  }, 0)
  const livingFundsEquation = livingLiability + unassignedSpent
  const expectedNet =
    SNAPSHOT_STARTING_FUNDS - snapshotBills.total - livingLiability - unassignedSpent
  const projectedCashout = expectedNet + livingUnspent
  const stashAfter = STASH_BALANCE + projectedCashout

  const tier1Due = cycles
    .filter((cycle) => cycle.tier === 1 && cycle.dueDateLabel)
    .sort((a, b) => creditDueSortKey(a.dueDateLabel!) - creditDueSortKey(b.dueDateLabel!))
  const tier2Open = cycles.filter((cycle) => cycle.tier === 2)
  const tier1Short = tier1Due.filter((cycle) => cycle.reservedPaymentFunds < cycle.minimumDue)

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
    return PLAN_BILLS.map((bill) => ({
      ...bill,
      amount: billAmountOverrides[bill.id] ?? bill.amount,
      dueDay: billDueOverrides[bill.id] ?? bill.dueDay,
      paymentMode: billModeOverrides[bill.id] ?? bill.paymentMode,
    }))
  }, [billAmountOverrides, billDueOverrides, billModeOverrides])

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

  const unpaidBudgetBills = useMemo(
    () =>
      budgetBills
        .filter((bill) => budgetBillStatus(bill) !== "paid")
        .sort((a, b) => a.dueDay - b.dueDay || a.listName.localeCompare(b.listName)),
    [budgetBills, billPaidOverrides, isArchivedMonth],
  )
  const paidBudgetBills = useMemo(
    () =>
      budgetBills
        .filter((bill) => budgetBillStatus(bill) === "paid")
        .sort((a, b) => a.dueDay - b.dueDay || a.listName.localeCompare(b.listName)),
    [budgetBills, billPaidOverrides, isArchivedMonth],
  )

  const editingLiving = livingLines.find((line) => line.id === livingEditId) ?? null
  const editingBill = budgetBills.find((bill) => bill.id === billEditId) ?? null

  const openLivingEdit = (line: SnapshotLivingLine) => {
    setLivingEditId(line.id)
    setLivingTargetDraft(String(line.target))
  }

  const saveLivingEdit = () => {
    if (!livingEditId) return
    setLivingBudget(livingEditId, Math.max(0, Number(livingTargetDraft) || 0))
    setLivingEditId(null)
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

  const toggleBillPaid = (billId: string, currentlyPaid: boolean) => {
    setBillPaidOverrides((current) => ({ ...current, [billId]: !currentlyPaid }))
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
            <BookOpen className="h-7 w-7 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
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
                totalCount={activeRecentRows.length}
                onOpenFullMonth={() => setActiveTab("activity")}
                onSelectRow={cardModals.openActivity}
              />
            </div>
          </div>
        ) : null}

        {!allYearSelected && activeTab === "plan" ? (
          <div className="grid grid-cols-[400px_640px] items-start gap-4">
            <div className="min-w-0">
              <article
                className="rounded-[2px] border border-slate-300 border-t-[3px] border-t-slate-900 bg-white"
                aria-label="Budget equation"
              >
                <div className="px-4 py-3 font-sans">
                  <div className="flex items-baseline justify-between gap-3 py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {monthName} Starting Funds
                      </p>
                      <p className="text-[11px] italic text-slate-400">
                        Staged from {prevMonthLabel}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-slate-900">
                      {fmtDollars(SNAPSHOT_STARTING_FUNDS)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200" />
                  <div className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-sm text-slate-700">Bills</span>
                    <span className="font-mono text-sm tabular-nums text-slate-800">
                      {fmtSignedDollars(-snapshotBills.total)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200" />
                  <div className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="text-sm text-slate-700">Living Funds</span>
                    <span className="font-mono text-sm tabular-nums text-slate-800">
                      {fmtSignedDollars(-livingLiability)}
                    </span>
                  </div>
                  {unassignedSpent > 0 ? (
                    <>
                      <div className="border-t border-slate-200" />
                      <div className="flex items-baseline justify-between gap-3 py-1.5">
                        <span className="text-sm font-medium text-amber-700">
                          ! Unassigned ({uncategorized.length} transaction
                          {uncategorized.length === 1 ? "" : "s"})
                        </span>
                        <span className="font-mono text-sm tabular-nums text-amber-700">
                          {fmtSignedDollars(-unassignedSpent)}
                        </span>
                      </div>
                    </>
                  ) : null}
                  <div className="mt-1 flex items-baseline justify-between gap-3 border-t-2 border-slate-400 bg-slate-50 px-1 py-2.5">
                    <span className="text-sm font-semibold text-slate-800">
                      Expected Cashout
                      <span className="ml-1.5 font-normal text-slate-500">
                        · in {daysToCashout} day{daysToCashout === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-slate-900">
                      {fmtDollars(expectedNet)}
                    </span>
                  </div>
                </div>
              </article>

              <article
                className="mt-4 rounded-[2px] border border-stone-200 bg-white"
                aria-label="Living Funds"
              >
                <div className="border-b border-stone-200 px-3 py-2.5">
                  <h3 className="font-sans text-sm font-bold text-slate-900">Living Funds</h3>
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
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-50"
                        >
                          {Icon ? (
                            <Icon
                              className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-slate-500"
                              aria-hidden
                            />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-800">
                            {line.name}
                          </span>
                          {isOver ? (
                            <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-rose-600">
                              +{fmtDollars(Math.abs(remaining))} Over
                            </span>
                          ) : null}
                          <span className="shrink-0 font-mono text-sm tabular-nums text-slate-700">
                            {fmtDollars(line.target)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </article>
            </div>

            <article
              className="flex h-[calc(100vh-160px)] min-w-0 flex-col rounded-[2px] border border-stone-200 bg-white"
              aria-label="Bills"
            >
              <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-stone-200 px-3 py-2.5">
                <h3 className="font-sans text-sm font-bold text-slate-900">Bills</h3>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {fmtDollars(planBillTotals.total)} Total
                  <span className="px-1 text-slate-300" aria-hidden>
                    |
                  </span>
                  {fmtDollars(planBillTotals.unpaid)} Unpaid
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ul>
                  {unpaidBudgetBills.map((bill) => {
                    const status = budgetBillStatus(bill)
                    return (
                      <li key={bill.id} className="border-b border-stone-100">
                        <button
                          type="button"
                          onClick={() => openBillEdit(bill)}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-50"
                        >
                          <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                            {bill.dueDay}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-800">
                            {bill.listName}
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-slate-700">
                            {fmtDollars(bill.amount)}
                          </span>
                          {status === "pay" || status === "pending" || status === "autodraft" ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleBillPaid(bill.id, false)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  toggleBillPaid(bill.id, false)
                                }
                              }}
                              className="inline-flex w-[4.5rem] shrink-0 cursor-pointer items-center justify-end font-mono text-[10px] font-semibold uppercase tracking-wide text-[#0087D2]"
                            >
                              {status === "autodraft" ? "Draft" : "Pay"}
                            </span>
                          ) : (
                            <BillStatusGutter status={status} />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {paidBudgetBills.length > 0 ? (
                  <>
                    <div className="border-t border-stone-300" aria-hidden />
                    <ul>
                      {paidBudgetBills.map((bill) => (
                        <li key={bill.id} className="border-b border-stone-100">
                          <button
                            type="button"
                            onClick={() => openBillEdit(bill)}
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-50"
                          >
                            <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                              {bill.dueDay}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-800">
                              {bill.listName}
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-700">
                              {fmtDollars(bill.amount)}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleBillPaid(bill.id, true)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  toggleBillPaid(bill.id, true)
                                }
                              }}
                              className="inline-flex w-[4.5rem] shrink-0 cursor-pointer items-center justify-end gap-1 font-mono text-[10px] uppercase tracking-wide text-emerald-700"
                            >
                              <ReceivedCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                              Paid
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
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
                <h4 className="text-sm font-semibold text-slate-900">Living Funds & The Sweep</h4>
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

      <Dialog open={!!editingLiving} onOpenChange={(open) => !open && setLivingEditId(null)}>
        <DialogContent
          className="gap-3 rounded-[2px] border border-slate-300 p-4 shadow-md sm:max-w-sm"
          showCloseButton
        >
          {editingLiving ? (
            <>
              <DialogHeader className="gap-1">
                <DialogTitle className="font-sans text-base font-bold text-slate-900">
                  {editingLiving.name}
                </DialogTitle>
                <p className="font-mono text-xs tabular-nums text-slate-500">
                  {fmtDollars(editingLiving.spent)} spent ·{" "}
                  {editingLiving.target - editingLiving.spent < 0
                    ? `${fmtDollars(Math.abs(editingLiving.target - editingLiving.spent))} over`
                    : `${fmtDollars(editingLiving.target - editingLiving.spent)} left`}
                </p>
              </DialogHeader>
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Target
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={livingTargetDraft}
                  onChange={(event) => setLivingTargetDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      saveLivingEdit()
                    }
                  }}
                  className="mt-1.5 h-9 w-full rounded-[2px] border border-slate-300 bg-white px-2.5 font-mono text-sm tabular-nums text-slate-900 outline-none focus:border-[#0087D2]"
                />
              </label>
              <DialogFooter className="gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLivingEditId(null)}
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
              </DialogFooter>
            </>
          ) : null}
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
