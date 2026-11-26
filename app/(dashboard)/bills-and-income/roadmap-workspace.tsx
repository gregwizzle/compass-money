"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { HelpCircle, Map } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  getMonthStripFlags,
  monthLongNameFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"
import { amountInter } from "@/lib/fonts"
import { SNAPSHOT_LIVING } from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import { cn } from "@/lib/utils"

type RoadmapTab = "my-bills" | "my-income"

function isClosedBudgetMonth(monthIndex: number) {
  return getMonthStripFlags(monthIndex, { budgetYear: DEFAULT_BUDGET_YEAR }).isArchived
}

function firstOpenBudgetMonth(): MonthLabel {
  const index = MONTH_LABELS.findIndex((_, monthIndex) => !isClosedBudgetMonth(monthIndex))
  return MONTH_LABELS[index === -1 ? 0 : index]!
}

type BillApplyTo = "timeline-bill" | "direct-stash"
type IncomeApplyTo = "starting-funds" | "direct-stash"

type RecurringBill = {
  id: string
  name: string
  amount: number
  day: number
  /** Empty = every month; otherwise specific month indexes. */
  months: number[]
  applyTo: BillApplyTo
}

type LivingFund = {
  id: string
  name: string
  amount: number
}

type PlannedPurchase = {
  id: string
  name: string
  amount: number
  monthIndex: number
  day: number
  applyTo: BillApplyTo
}

type RecurringIncome = {
  id: string
  name: string
  amount: number
  day: number
  months: number[]
  applyTo: IncomeApplyTo
}

type PlannedWindfall = {
  id: string
  name: string
  amount: number
  monthIndex: number
  day: number
  applyTo: IncomeApplyTo
}

type BlueprintKind = "bill" | "living" | "purchase" | "income" | "windfall"

type FormSession =
  | { mode: "add"; kind: BlueprintKind }
  | { mode: "edit"; kind: BlueprintKind; id: string }

const TABS: { id: RoadmapTab; label: string }[] = [
  { id: "my-bills", label: "My Bills" },
  { id: "my-income", label: "My Income" },
]

const planInnerCardClass =
  "flex min-w-0 flex-col overflow-hidden rounded-sm border border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"

/** Matches Logbook / Snapshot activity row hover. */
const ROW_INTERACTIVE_CLASS =
  "cursor-pointer transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)] focus-visible:outline-none focus-visible:bg-sky-50/90 focus-visible:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"

const BLUEPRINT_INFO: Record<
  BlueprintKind,
  { title: string; body: string }
> = {
  bill: {
    title: "My Recurring Bills",
    body: "Your baseline bill blueprint. These bills automatically populate each new month on your Timeline as it opens, and carry forward into next year when you archive 2026.",
  },
  living: {
    title: "My Living Expenses",
    body: "Your monthly lifestyle allowances. These buckets are automatically funded at the start of every new Timeline month and carry forward year-to-year.",
  },
  purchase: {
    title: "Planned Single Purchases",
    body: "One-time expenses for 2026 only. Choose whether each purchase comes directly out of your Stash or hits a specific month's Timeline budget. These do not carry over into 2027.",
  },
  income: {
    title: "My Recurring Income",
    body: "Your predictable paychecks and payouts. Income collected during a month sits in your Income Dock and populates Starting Funds for the following month.",
  },
  windfall: {
    title: "Planned Extra Cash",
    body: "One-time expected inflows for 2026 only (like bonuses or tax refunds). Route them directly into your Stash or into next month's Starting Funds. These do not carry over into 2027.",
  },
}

const FORM_TITLES: Record<
  BlueprintKind,
  { add: string; edit: string }
> = {
  bill: { add: "New Bill", edit: "Edit Bill" },
  living: { add: "New Living Expense", edit: "Edit Living Expense" },
  purchase: { add: "Planned Purchase", edit: "Edit Purchase" },
  income: { add: "New Income", edit: "Edit Income" },
  windfall: { add: "Extra Cash", edit: "Edit Extra Cash" },
}

const INITIAL_RECURRING_BILLS: RecurringBill[] = [
  { id: "rent", name: "Rent or Mortgage", amount: 1650, day: 1, months: [], applyTo: "timeline-bill" },
  { id: "auto-ins", name: "Auto Insurance", amount: 138, day: 5, months: [], applyTo: "timeline-bill" },
  { id: "internet", name: "Internet", amount: 75, day: 10, months: [], applyTo: "timeline-bill" },
  { id: "electric", name: "Electric", amount: 120, day: 12, months: [], applyTo: "timeline-bill" },
  { id: "water", name: "Water & Trash", amount: 60, day: 15, months: [], applyTo: "timeline-bill" },
  { id: "netflix", name: "Netflix", amount: 25, day: 18, months: [], applyTo: "timeline-bill" },
  { id: "gym", name: "Gym Membership", amount: 55, day: 19, months: [], applyTo: "timeline-bill" },
  { id: "mobile", name: "Mobile Phone", amount: 90, day: 22, months: [], applyTo: "timeline-bill" },
  { id: "auto-loan", name: "Auto Loan", amount: 450, day: 28, months: [], applyTo: "timeline-bill" },
  {
    id: "hoa",
    name: "HOA Special Assessment",
    amount: 200,
    day: 15,
    months: [5, 7, 8],
    applyTo: "timeline-bill",
  },
  {
    id: "property-tax",
    name: "Property Tax",
    amount: 1200,
    day: 10,
    months: [3, 9],
    applyTo: "timeline-bill",
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime",
    amount: 139,
    day: 14,
    months: [6],
    applyTo: "timeline-bill",
  },
  {
    id: "car-registration",
    name: "Car Registration",
    amount: 120,
    day: 1,
    months: [10],
    applyTo: "timeline-bill",
  },
]

const INITIAL_LIVING_FUNDS: LivingFund[] = SNAPSHOT_LIVING.map((line) => ({
  id: line.id,
  name: line.name,
  amount: line.target,
}))

const INITIAL_PURCHASES: PlannedPurchase[] = [
  {
    id: "vacation",
    name: "Vacation",
    amount: 1500,
    monthIndex: 6,
    day: 10,
    applyTo: "direct-stash",
  },
  {
    id: "car-repair",
    name: "Car Repair",
    amount: 800,
    monthIndex: 3,
    day: 12,
    applyTo: "direct-stash",
  },
]

const INITIAL_RECURRING_INCOME: RecurringIncome[] = [
  {
    id: "pay-1",
    name: "Paycheck (1st)",
    amount: 2800,
    day: 1,
    months: [],
    applyTo: "starting-funds",
  },
  {
    id: "pay-2",
    name: "Paycheck (15th)",
    amount: 2800,
    day: 15,
    months: [],
    applyTo: "starting-funds",
  },
  {
    id: "rental",
    name: "Rental Income",
    amount: 450,
    day: 5,
    months: [],
    applyTo: "starting-funds",
  },
  {
    id: "quarterly",
    name: "Quarterly Dividend",
    amount: 320,
    day: 20,
    months: [2, 5, 8, 11],
    applyTo: "direct-stash",
  },
]

const INITIAL_WINDFALLS: PlannedWindfall[] = [
  {
    id: "tax-refund",
    name: "Tax Refund",
    amount: 400,
    monthIndex: 0,
    day: 20,
    applyTo: "direct-stash",
  },
  {
    id: "bonus",
    name: "Year-End Bonus",
    amount: 5000,
    monthIndex: 11,
    day: 15,
    applyTo: "direct-stash",
  },
]

function dayOrdinal(day: number) {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

function formatWhenOneOff(monthIndex: number, day: number) {
  return `${MONTH_LABELS[monthIndex]} ${day}, ${DEFAULT_BUDGET_YEAR}`
}

function DayBadge({ day }: { day: number }) {
  return (
    <span className="inline-flex rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-sky-700 ring-1 ring-inset ring-sky-100">
      {dayOrdinal(day)}
    </span>
  )
}

function MonthBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-100/80">
      {label}
    </span>
  )
}

function WhenRecurringCell({ day, months }: { day: number; months: number[] }) {
  if (months.length === 0) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] text-slate-600">
        <span>Every month on the</span>
        <DayBadge day={day} />
      </span>
    )
  }

  const labels = [...months]
    .sort((a, b) => a - b)
    .map((i) => MONTH_LABELS[i]!)

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] text-slate-600">
      {labels.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="text-slate-400">,</span> : null}
          <MonthBadge label={label} />
        </span>
      ))}
      <span>on the</span>
      <DayBadge day={day} />
    </span>
  )
}

function RecurringGroupSubtotal({
  kind,
  total,
  colSpan,
}: {
  kind: "monthly" | "occasional"
  /** Kept for call-site clarity; pill copy is driven by `kind`. */
  label?: string
  total: number
  colSpan: number
}) {
  const isMonthly = kind === "monthly"
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "bg-white px-0 py-0",
          isMonthly
            ? "shadow-[inset_0_1px_0_0_rgb(226,232,240)]"
            : "shadow-[inset_0_1px_0_0_rgb(253,230,138)]",
        )}
      >
        <div className="flex justify-end px-1 py-2">
          <span
            className={cn(
              "inline-flex items-baseline gap-2 rounded-md border px-2.5 py-1",
              isMonthly
                ? "border-slate-200/90 bg-slate-100"
                : "border-amber-200/80 bg-amber-50/90",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider",
                isMonthly ? "text-slate-500" : "text-amber-800/80",
              )}
            >
              {isMonthly ? "Monthly Total" : "Occasional Total"}
            </span>
            <span
              className={cn(
                `whitespace-nowrap text-[12px] font-bold tabular-nums ${amountInter.className}`,
                isMonthly ? "text-slate-800" : "text-amber-950",
              )}
            >
              {isMonthly
                ? `${fmtDollars(total)} / mo`
                : `${fmtDollars(total)} / yr`}
            </span>
          </span>
        </div>
      </td>
    </tr>
  )
}

function AmountCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td
      className={cn(
        `whitespace-nowrap bg-slate-50/40 px-3 py-2 text-right text-[12px] font-bold tabular-nums text-slate-800 ${amountInter.className}`,
        className,
      )}
    >
      {children}
    </td>
  )
}

function partitionRecurring<T extends { months: number[]; amount: number }>(
  items: T[],
) {
  const monthly = items.filter((item) => item.months.length === 0)
  const occasional = items.filter((item) => item.months.length > 0)
  const monthlyTotal = monthly.reduce((s, item) => s + item.amount, 0)
  const occasionalAnnual = occasional.reduce(
    (s, item) => s + item.amount * item.months.length,
    0,
  )
  return { monthly, occasional, monthlyTotal, occasionalAnnual }
}

function fmtDollars(n: number) {
  const sign = n < 0 ? "-" : ""
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`
}

function sortRecurringByWhen<T extends { day: number; months: number[] }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aEvery = a.months.length === 0
    const bEvery = b.months.length === 0
    if (aEvery !== bEvery) return aEvery ? -1 : 1
    if (aEvery && bEvery) return a.day - b.day
    const aFirst = Math.min(...a.months)
    const bFirst = Math.min(...b.months)
    if (aFirst !== bFirst) return aFirst - bFirst
    return a.day - b.day
  })
}

type RoadmapWorkspaceProps = {
  initialMonth?: MonthLabel
}

function BlueprintInfoButton({
  onInfo,
  label,
}: {
  onInfo: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onInfo()
      }}
      className="inline-flex cursor-pointer rounded-sm p-0.5 text-slate-400 outline-none transition-colors hover:text-[#0087D2] focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1"
      aria-label={label}
      title={label}
    >
      <HelpCircle className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
    </button>
  )
}

function ApplyToBadge({
  label,
  tone,
}: {
  label: string
  tone: "sky" | "emerald"
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        tone === "sky" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800",
      )}
    >
      {label}
    </span>
  )
}

function SectionCard({
  title,
  actionLabel,
  onAction,
  onInfo,
  infoLabel,
  children,
  footer,
}: {
  title: string
  actionLabel: string
  onAction: () => void
  onInfo: () => void
  infoLabel: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <article className={planInnerCardClass}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2.5">
        <h3 className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
          {title}
          <BlueprintInfoButton onInfo={onInfo} label={infoLabel} />
        </h3>
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer rounded-lg bg-[#0087D2]/10 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0087D2] transition-colors hover:bg-[#0087D2]/15"
        >
          {actionLabel}
        </button>
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer ? <div className="border-t border-slate-100 px-3 py-2.5">{footer}</div> : null}
    </article>
  )
}

function PlanTable({
  children,
  compact = false,
}: {
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className="px-5">
      <table
        className={cn(
          "w-full border-collapse text-left",
          "[&_tbody_tr:not(:last-child)>td]:shadow-[inset_0_-1px_0_0_rgb(241,245,249)]",
          compact ? "min-w-0" : "min-w-[36rem]",
        )}
      >
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/**
 * Bills & Income: timeless My Bills / My Income blueprints.
 */
export function RoadmapWorkspace(_props: RoadmapWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<RoadmapTab>("my-bills")
  const [infoKind, setInfoKind] = useState<BlueprintKind | null>(null)
  const [formSession, setFormSession] = useState<FormSession | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftBaseline, setDraftBaseline] = useState("")
  const [pendingBaseline, setPendingBaseline] = useState(false)

  const [recurringBills, setRecurringBills] =
    useState<RecurringBill[]>(INITIAL_RECURRING_BILLS)
  const [livingFunds, setLivingFunds] = useState<LivingFund[]>(INITIAL_LIVING_FUNDS)
  const [purchases, setPurchases] = useState<PlannedPurchase[]>(INITIAL_PURCHASES)
  const [recurringIncome, setRecurringIncome] =
    useState<RecurringIncome[]>(INITIAL_RECURRING_INCOME)
  const [windfalls, setWindfalls] = useState<PlannedWindfall[]>(INITIAL_WINDFALLS)

  const [draftName, setDraftName] = useState("")
  const [draftAmount, setDraftAmount] = useState("")
  const [draftDay, setDraftDay] = useState("1")
  const [draftMonth, setDraftMonth] = useState<MonthLabel>("Jan")
  const [draftEveryMonth, setDraftEveryMonth] = useState(true)
  const [draftBillApplyTo, setDraftBillApplyTo] =
    useState<BillApplyTo>("timeline-bill")
  const [draftIncomeApplyTo, setDraftIncomeApplyTo] =
    useState<IncomeApplyTo>("starting-funds")

  const sortedBills = useMemo(
    () => sortRecurringByWhen(recurringBills),
    [recurringBills],
  )
  const sortedIncome = useMemo(
    () => sortRecurringByWhen(recurringIncome),
    [recurringIncome],
  )
  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort((a, b) =>
        a.monthIndex !== b.monthIndex
          ? a.monthIndex - b.monthIndex
          : a.day - b.day,
      ),
    [purchases],
  )
  const sortedWindfalls = useMemo(
    () =>
      [...windfalls].sort((a, b) =>
        a.monthIndex !== b.monthIndex
          ? a.monthIndex - b.monthIndex
          : a.day - b.day,
      ),
    [windfalls],
  )

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        draftName,
        draftAmount,
        draftDay,
        draftMonth,
        draftEveryMonth,
        draftBillApplyTo,
        draftIncomeApplyTo,
      }),
    [
      draftName,
      draftAmount,
      draftDay,
      draftMonth,
      draftEveryMonth,
      draftBillApplyTo,
      draftIncomeApplyTo,
    ],
  )

  const isEditDirty =
    formSession?.mode === "edit" && draftSnapshot !== draftBaseline

  const formKind = formSession?.kind ?? null

  const resetDraftDefaults = (kind: BlueprintKind) => {
    setDraftName("")
    setDraftAmount("")
    setDraftDay("1")
    setDraftMonth(kind === "purchase" ? firstOpenBudgetMonth() : "Jan")
    setDraftEveryMonth(kind === "bill" || kind === "income")
    setDraftBillApplyTo(kind === "purchase" ? "direct-stash" : "timeline-bill")
    setDraftIncomeApplyTo(kind === "windfall" ? "direct-stash" : "starting-funds")
  }

  const closeForm = () => {
    setFormSession(null)
    setConfirmDelete(false)
    setDraftBaseline("")
    setPendingBaseline(false)
    resetDraftDefaults("bill")
  }

  const openAddModal = (kind: BlueprintKind) => {
    setConfirmDelete(false)
    setPendingBaseline(false)
    resetDraftDefaults(kind)
    setFormSession({ mode: "add", kind })
  }

  const loadDraftFromItem = (kind: BlueprintKind, id: string) => {
    if (kind === "bill") {
      const item = recurringBills.find((b) => b.id === id)
      if (!item) return false
      setDraftName(item.name)
      setDraftAmount(String(item.amount))
      setDraftDay(String(item.day))
      setDraftEveryMonth(item.months.length === 0)
      setDraftMonth(
        item.months.length > 0
          ? MONTH_LABELS[Math.min(...item.months)]!
          : "Jan",
      )
      setDraftBillApplyTo(item.applyTo)
      return true
    }
    if (kind === "living") {
      const item = livingFunds.find((b) => b.id === id)
      if (!item) return false
      setDraftName(item.name)
      setDraftAmount(String(item.amount))
      return true
    }
    if (kind === "purchase") {
      const item = purchases.find((b) => b.id === id)
      if (!item) return false
      setDraftName(item.name)
      setDraftAmount(String(item.amount))
      setDraftDay(String(item.day))
      setDraftMonth(MONTH_LABELS[item.monthIndex]!)
      setDraftBillApplyTo(item.applyTo)
      return true
    }
    if (kind === "income") {
      const item = recurringIncome.find((b) => b.id === id)
      if (!item) return false
      setDraftName(item.name)
      setDraftAmount(String(item.amount))
      setDraftDay(String(item.day))
      setDraftEveryMonth(item.months.length === 0)
      setDraftMonth(
        item.months.length > 0
          ? MONTH_LABELS[Math.min(...item.months)]!
          : "Jan",
      )
      setDraftIncomeApplyTo(item.applyTo)
      return true
    }
    const item = windfalls.find((b) => b.id === id)
    if (!item) return false
    setDraftName(item.name)
    setDraftAmount(String(item.amount))
    setDraftDay(String(item.day))
    setDraftMonth(MONTH_LABELS[item.monthIndex]!)
    setDraftIncomeApplyTo(item.applyTo)
    return true
  }

  const openEditModal = (kind: BlueprintKind, id: string) => {
    setConfirmDelete(false)
    if (!loadDraftFromItem(kind, id)) return
    setPendingBaseline(true)
    setFormSession({ mode: "edit", kind, id })
  }

  useEffect(() => {
    if (pendingBaseline && formSession?.mode === "edit") {
      setDraftBaseline(draftSnapshot)
      setPendingBaseline(false)
    }
  }, [pendingBaseline, formSession, draftSnapshot])

  const parseAmount = () => {
    const n = Number.parseInt(draftAmount || "0", 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }

  const parseDay = () => {
    const n = Number.parseInt(draftDay || "1", 10)
    return Math.min(31, Math.max(1, Number.isFinite(n) ? n : 1))
  }

  const handleSaveForm = () => {
    if (!formSession) return
    const name = draftName.trim()
    const amount = parseAmount()
    if (!name || amount <= 0) return
    const day = parseDay()
    const monthIndex = MONTH_LABELS.indexOf(draftMonth)
    const m = monthIndex < 0 ? 0 : monthIndex
    const { kind, mode } = formSession
    if (kind === "purchase" && isClosedBudgetMonth(m)) {
      const original =
        mode === "edit" ? purchases.find((item) => item.id === formSession.id) : undefined
      if (!original || original.monthIndex !== m) return
    }

    if (mode === "add") {
      const id = `${kind}-${Date.now()}`
      if (kind === "bill") {
        setRecurringBills((prev) => [
          ...prev,
          {
            id,
            name,
            amount,
            day,
            months: draftEveryMonth ? [] : [m],
            applyTo: draftBillApplyTo,
          },
        ])
      } else if (kind === "living") {
        setLivingFunds((prev) => [...prev, { id, name, amount }])
      } else if (kind === "purchase") {
        setPurchases((prev) => [
          ...prev,
          { id, name, amount, monthIndex: m, day, applyTo: draftBillApplyTo },
        ])
      } else if (kind === "income") {
        setRecurringIncome((prev) => [
          ...prev,
          {
            id,
            name,
            amount,
            day,
            months: draftEveryMonth ? [] : [m],
            applyTo: draftIncomeApplyTo,
          },
        ])
      } else {
        setWindfalls((prev) => [
          ...prev,
          {
            id,
            name,
            amount,
            monthIndex: m,
            day,
            applyTo: draftIncomeApplyTo,
          },
        ])
      }
      closeForm()
      return
    }

    if (!isEditDirty) return
    const id = formSession.id

    if (kind === "bill") {
      setRecurringBills((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name,
                amount,
                day,
                months: draftEveryMonth ? [] : [m],
                applyTo: draftBillApplyTo,
              }
            : item,
        ),
      )
    } else if (kind === "living") {
      setLivingFunds((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, name, amount } : item,
        ),
      )
    } else if (kind === "purchase") {
      setPurchases((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name,
                amount,
                monthIndex: m,
                day,
                applyTo: draftBillApplyTo,
              }
            : item,
        ),
      )
    } else if (kind === "income") {
      setRecurringIncome((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name,
                amount,
                day,
                months: draftEveryMonth ? [] : [m],
                applyTo: draftIncomeApplyTo,
              }
            : item,
        ),
      )
    } else {
      setWindfalls((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name,
                amount,
                monthIndex: m,
                day,
                applyTo: draftIncomeApplyTo,
              }
            : item,
        ),
      )
    }
    closeForm()
  }

  const handleConfirmDelete = () => {
    if (!formSession || formSession.mode !== "edit") return
    const { kind, id } = formSession
    if (kind === "bill") {
      setRecurringBills((prev) => prev.filter((item) => item.id !== id))
    } else if (kind === "living") {
      setLivingFunds((prev) => prev.filter((item) => item.id !== id))
    } else if (kind === "purchase") {
      setPurchases((prev) => prev.filter((item) => item.id !== id))
    } else if (kind === "income") {
      setRecurringIncome((prev) => prev.filter((item) => item.id !== id))
    } else {
      setWindfalls((prev) => prev.filter((item) => item.id !== id))
    }
    closeForm()
  }

  const formTitle = formKind
    ? formSession?.mode === "edit"
      ? FORM_TITLES[formKind].edit
      : FORM_TITLES[formKind].add
    : ""

  const purchaseMonthBlocked =
    formKind === "purchase" &&
    isClosedBudgetMonth(MONTH_LABELS.indexOf(draftMonth)) &&
    !(
      formSession?.mode === "edit" &&
      purchases.find((item) => item.id === formSession.id)?.monthIndex ===
        MONTH_LABELS.indexOf(draftMonth)
    )

  const canSaveAdd =
    formSession?.mode === "add" &&
    draftName.trim().length > 0 &&
    parseAmount() > 0 &&
    !purchaseMonthBlocked


  return (
    <div className="relative flex flex-col">
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 pt-7">
        <header aria-labelledby="roadmap-heading">
          <h1
            id="roadmap-heading"
            className="flex min-w-0 items-center gap-2.5 font-sans text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-600"
          >
            <Map className="h-7 w-7 shrink-0 stroke-[1.5] text-[#0087D2]" aria-hidden />
            <span className="min-w-0 truncate">Bills &amp; Income</span>
          </h1>

          <div
            className="mt-3 flex items-end gap-1 border-b border-[#0087D2]"
            role="tablist"
            aria-label="Bills and Income sections"
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
                      : "rounded-t-[2px] text-slate-500 hover:text-slate-800",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </header>

        <div className="relative z-10 min-w-0 space-y-4">
          {activeTab === "my-bills" ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:items-start">
              <SectionCard
                title="My Recurring Bills"
                actionLabel="+ New Bill"
                onAction={() => openAddModal("bill")}
                onInfo={() => setInfoKind("bill")}
                infoLabel="About My Recurring Bills"
              >
                <PlanTable compact>
                  {(() => {
                    const { monthly, occasional, monthlyTotal, occasionalAnnual } =
                      partitionRecurring(sortedBills)
                    return (
                      <>
                        {monthly.map((bill) => (
                          <tr
                            key={bill.id}
                            tabIndex={0}
                            className={ROW_INTERACTIVE_CLASS}
                            onClick={() => openEditModal("bill", bill.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openEditModal("bill", bill.id)
                              }
                            }}
                          >
                            <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                              {bill.name}
                            </td>
                            <td className="px-3 py-2">
                              <WhenRecurringCell
                                day={bill.day}
                                months={bill.months}
                              />
                            </td>
                            <AmountCell>{fmtDollars(bill.amount)}</AmountCell>
                          </tr>
                        ))}
                        {monthly.length > 0 ? (
                          <RecurringGroupSubtotal
                            kind="monthly"
                            label="Monthly Bills Total"
                            total={monthlyTotal}
                            colSpan={3}
                          />
                        ) : null}
                        {occasional.map((bill) => (
                          <tr
                            key={bill.id}
                            tabIndex={0}
                            className={ROW_INTERACTIVE_CLASS}
                            onClick={() => openEditModal("bill", bill.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openEditModal("bill", bill.id)
                              }
                            }}
                          >
                            <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                              {bill.name}
                            </td>
                            <td className="px-3 py-2">
                              <WhenRecurringCell
                                day={bill.day}
                                months={bill.months}
                              />
                            </td>
                            <AmountCell>{fmtDollars(bill.amount)}</AmountCell>
                          </tr>
                        ))}
                        {occasional.length > 0 ? (
                          <RecurringGroupSubtotal
                            kind="occasional"
                            label="Occasional Bills Total"
                            total={occasionalAnnual}
                            colSpan={3}
                          />
                        ) : null}
                      </>
                    )
                  })()}
                </PlanTable>
              </SectionCard>

              <div className="flex min-w-0 flex-col gap-4">
                <SectionCard
                  title="My Living Expenses"
                  actionLabel="+ New Living Expense"
                  onAction={() => openAddModal("living")}
                  onInfo={() => setInfoKind("living")}
                  infoLabel="About My Living Expenses"
                >
                  <PlanTable compact>
                    {livingFunds.map((fund) => {
                      const glyph = SNAPSHOT_LIVING_GLYPH[fund.id]
                      return (
                        <tr
                          key={fund.id}
                          tabIndex={0}
                          className={ROW_INTERACTIVE_CLASS}
                          onClick={() => openEditModal("living", fund.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openEditModal("living", fund.id)
                            }
                          }}
                        >
                          <td className="px-3 py-2 text-[12px] font-medium text-slate-800">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              {glyph ? (
                                <glyph.Icon
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 stroke-[1.5]",
                                    glyph.className,
                                  )}
                                  aria-hidden
                                />
                              ) : null}
                              <span className="truncate">{fund.name}</span>
                            </span>
                          </td>
                          <AmountCell>{fmtDollars(fund.amount)}</AmountCell>
                        </tr>
                      )
                    })}
                  </PlanTable>
                </SectionCard>

                <SectionCard
                  title="Planned Single Purchases"
                  actionLabel="+ Planned Purchase"
                  onAction={() => openAddModal("purchase")}
                  onInfo={() => setInfoKind("purchase")}
                  infoLabel="About Planned Single Purchases"
                >
                  <PlanTable compact>
                    {sortedPurchases.map((item) => (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        className={ROW_INTERACTIVE_CLASS}
                        onClick={() => openEditModal("purchase", item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openEditModal("purchase", item.id)
                          }
                        }}
                      >
                        <td className="max-w-[10rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[12px] text-slate-600">
                          {formatWhenOneOff(item.monthIndex, item.day)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                          <ApplyToBadge
                            label={
                              item.applyTo === "timeline-bill"
                                ? "Timeline (Bills)"
                                : "Direct Stash"
                            }
                            tone={
                              item.applyTo === "timeline-bill"
                                ? "sky"
                                : "emerald"
                            }
                          />
                        </td>
                        <AmountCell>{fmtDollars(item.amount)}</AmountCell>
                      </tr>
                    ))}
                  </PlanTable>
                </SectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === "my-income" ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:items-start">
              <SectionCard
                title="My Recurring Income"
                actionLabel="+ New Income"
                onAction={() => openAddModal("income")}
                onInfo={() => setInfoKind("income")}
                infoLabel="About My Recurring Income"
                footer={
                  <p className="text-[11.5px] leading-relaxed text-slate-500">
                    Monthly / timeline income collected in a given month populates{" "}
                    <span className="font-medium text-slate-600">Starting Funds</span>{" "}
                    for the following month on the Forecast tab.
                  </p>
                }
              >
                <PlanTable>
                  {(() => {
                    const { monthly, occasional, monthlyTotal, occasionalAnnual } =
                      partitionRecurring(sortedIncome)
                    return (
                      <>
                        {monthly.map((item) => (
                          <tr
                            key={item.id}
                            tabIndex={0}
                            className={ROW_INTERACTIVE_CLASS}
                            onClick={() => openEditModal("income", item.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openEditModal("income", item.id)
                              }
                            }}
                          >
                            <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                              {item.name}
                            </td>
                            <td className="px-3 py-2">
                              <WhenRecurringCell
                                day={item.day}
                                months={item.months}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                              <ApplyToBadge
                                label={
                                  item.applyTo === "starting-funds"
                                    ? "Starting Funds"
                                    : "Direct Stash"
                                }
                                tone={
                                  item.applyTo === "starting-funds"
                                    ? "sky"
                                    : "emerald"
                                }
                              />
                            </td>
                            <AmountCell className="text-emerald-700">
                              +{fmtDollars(item.amount)}
                            </AmountCell>
                          </tr>
                        ))}
                        {monthly.length > 0 ? (
                          <RecurringGroupSubtotal
                            kind="monthly"
                            label="Monthly Income Total"
                            total={monthlyTotal}
                            colSpan={4}
                          />
                        ) : null}
                        {occasional.map((item) => (
                          <tr
                            key={item.id}
                            tabIndex={0}
                            className={ROW_INTERACTIVE_CLASS}
                            onClick={() => openEditModal("income", item.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openEditModal("income", item.id)
                              }
                            }}
                          >
                            <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                              {item.name}
                            </td>
                            <td className="px-3 py-2">
                              <WhenRecurringCell
                                day={item.day}
                                months={item.months}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                              <ApplyToBadge
                                label={
                                  item.applyTo === "starting-funds"
                                    ? "Starting Funds"
                                    : "Direct Stash"
                                }
                                tone={
                                  item.applyTo === "starting-funds"
                                    ? "sky"
                                    : "emerald"
                                }
                              />
                            </td>
                            <AmountCell className="text-emerald-700">
                              +{fmtDollars(item.amount)}
                            </AmountCell>
                          </tr>
                        ))}
                        {occasional.length > 0 ? (
                          <RecurringGroupSubtotal
                            kind="occasional"
                            label="Occasional Income Total"
                            total={occasionalAnnual}
                            colSpan={4}
                          />
                        ) : null}
                      </>
                    )
                  })()}
                </PlanTable>
              </SectionCard>

              <div className="flex min-w-0 flex-col gap-4">
                <SectionCard
                  title="Planned Extra Cash"
                  actionLabel="+ Extra Cash"
                  onAction={() => openAddModal("windfall")}
                  onInfo={() => setInfoKind("windfall")}
                  infoLabel="About Planned Extra Cash"
                >
                  <PlanTable>
                    {sortedWindfalls.map((item) => (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        className={ROW_INTERACTIVE_CLASS}
                        onClick={() => openEditModal("windfall", item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openEditModal("windfall", item.id)
                          }
                        }}
                      >
                        <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[12px] text-slate-600">
                          {formatWhenOneOff(item.monthIndex, item.day)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[12px]">
                          <ApplyToBadge
                            label={
                              item.applyTo === "starting-funds"
                                ? "Starting Funds"
                                : "Direct Stash"
                            }
                            tone={
                              item.applyTo === "starting-funds"
                                ? "sky"
                                : "emerald"
                            }
                          />
                        </td>
                        <AmountCell className="text-emerald-700">
                          +{fmtDollars(item.amount)}
                        </AmountCell>
                      </tr>
                    ))}
                  </PlanTable>
                </SectionCard>
              </div>
            </div>
          ) : null}

        </div>
      </div>

      <Dialog
        open={infoKind !== null}
        onOpenChange={(open) => {
          if (!open) setInfoKind(null)
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          {infoKind ? (
            <>
              <DialogHeader>
                <DialogTitle>{BLUEPRINT_INFO[infoKind].title}</DialogTitle>
              </DialogHeader>
              <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {BLUEPRINT_INFO[infoKind].body}
                </p>
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={formSession !== null}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          {formSession && formKind ? (
            <>
              <DialogHeader>
                <DialogTitle>{formTitle}</DialogTitle>
              </DialogHeader>

              {confirmDelete ? (
                <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
                  <p className="text-[14px] font-semibold text-slate-800">
                    Are you sure?
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                    Deleting this blueprint item will remove it from future months,
                    but will not affect any past or closed months on your Timeline.
                  </p>
                  <div className="mt-4 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="cursor-pointer rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="cursor-pointer rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                    <div className="flex flex-col gap-3.5">
                      <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                        <label className="text-right text-[12px] font-medium text-slate-500">
                          Name
                        </label>
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-800 outline-none focus:border-[#0087D2] focus:ring-1 focus:ring-[#0087D2]"
                          placeholder="Name"
                        />
                      </div>

                      <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                        <label className="text-right text-[12px] font-medium text-slate-500">
                          Amount
                        </label>
                        <input
                          value={draftAmount}
                          onChange={(e) =>
                            setDraftAmount(e.target.value.replace(/[^\d]/g, ""))
                          }
                          inputMode="numeric"
                          className={`h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-[15px] font-semibold tabular-nums text-slate-800 outline-none focus:border-[#0087D2] focus:ring-1 focus:ring-[#0087D2] ${amountInter.className}`}
                          placeholder="0"
                        />
                      </div>

                      {formKind === "bill" || formKind === "income" ? (
                        <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-start gap-4">
                          <span className="pt-1.5 text-right text-[12px] font-medium text-slate-500">
                            When
                          </span>
                          <div className="min-w-0 space-y-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                              <button
                                type="button"
                                onClick={() => setDraftEveryMonth(true)}
                                className={cn(
                                  "cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium",
                                  draftEveryMonth
                                    ? "bg-[#0087D2] font-semibold text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700",
                                )}
                              >
                                Every month
                              </button>
                              <button
                                type="button"
                                onClick={() => setDraftEveryMonth(false)}
                                className={cn(
                                  "cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium",
                                  !draftEveryMonth
                                    ? "bg-[#0087D2] font-semibold text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700",
                                )}
                              >
                                Occasional
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={draftMonth}
                                onChange={(e) =>
                                  setDraftMonth(e.target.value as MonthLabel)
                                }
                                disabled={draftEveryMonth}
                                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                              >
                                {MONTH_LABELS.map((m) => (
                                  <option key={m} value={m}>
                                    {monthLongNameFromLabel(m)}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={draftDay}
                                onChange={(e) =>
                                  setDraftDay(
                                    e.target.value.replace(/[^\d]/g, "").slice(0, 2),
                                  )
                                }
                                inputMode="numeric"
                                className={`h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] tabular-nums text-slate-800 outline-none ${amountInter.className}`}
                                placeholder="Day"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {formKind === "purchase" || formKind === "windfall" ? (
                        <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                          <span className="text-right text-[12px] font-medium text-slate-500">
                            Date
                          </span>
                          <div className="grid min-w-0 grid-cols-2 gap-2">
                            <select
                              value={draftMonth}
                              onChange={(e) =>
                                setDraftMonth(e.target.value as MonthLabel)
                              }
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 outline-none"
                            >
                              {MONTH_LABELS.map((m, monthIndex) => {
                                const closed = formKind === "purchase" && isClosedBudgetMonth(monthIndex)
                                return (
                                  <option
                                    key={m}
                                    value={m}
                                    disabled={closed}
                                    className={closed ? "text-slate-400" : undefined}
                                  >
                                    {monthLongNameFromLabel(m)}
                                  </option>
                                )
                              })}
                            </select>
                            <input
                              value={draftDay}
                              onChange={(e) =>
                                setDraftDay(
                                  e.target.value.replace(/[^\d]/g, "").slice(0, 2),
                                )
                              }
                              inputMode="numeric"
                              className={`h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] tabular-nums text-slate-800 outline-none ${amountInter.className}`}
                              placeholder="Day"
                            />
                          </div>
                        </div>
                      ) : null}

                      {formKind === "bill" || formKind === "purchase" ? (
                        <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                          <span className="text-right text-[12px] font-medium text-slate-500">
                            Apply To
                          </span>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                            {(
                              [
                                ["timeline-bill", "Timeline Bill"],
                                ["direct-stash", "Direct Stash"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setDraftBillApplyTo(value)}
                                className={cn(
                                  "cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium",
                                  draftBillApplyTo === value
                                    ? "bg-[#0087D2] font-semibold text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {formKind === "income" || formKind === "windfall" ? (
                        <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                          <span className="text-right text-[12px] font-medium text-slate-500">
                            Apply To
                          </span>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                            {(
                              [
                                ["starting-funds", "Starting Funds"],
                                ["direct-stash", "Direct Stash"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setDraftIncomeApplyTo(value)}
                                className={cn(
                                  "cursor-pointer rounded-md px-2.5 py-1.5 text-[12px] font-medium",
                                  draftIncomeApplyTo === value
                                    ? "bg-[#0087D2] font-semibold text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <div className="flex shrink-0 items-center justify-between gap-1.5 border-t border-slate-200 pt-3">
                    {formSession.mode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="cursor-pointer rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={closeForm}
                        className="cursor-pointer rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveForm}
                        disabled={
                          formSession.mode === "edit" ? !isEditDirty : !canSaveAdd
                        }
                        className={cn(
                          "rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
                          (
                            formSession.mode === "edit"
                              ? isEditDirty
                              : canSaveAdd
                          )
                            ? "cursor-pointer bg-[#0087D2] text-white hover:bg-[#006BB3]"
                            : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none",
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
