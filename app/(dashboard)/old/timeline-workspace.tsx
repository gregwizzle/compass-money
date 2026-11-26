"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  ChevronsUpDown,
  CirclePlus,
  List,
  Lock,
  Maximize2,
  Wallet,
  X,
} from "lucide-react"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { CATEGORY_GLYPH, RoadmapCategoriesGrid } from "@/components/roadmap-categories-grid"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import { MOCK_EXPECTED_INCOME, MOCK_TIMELINE_CATEGORIES } from "@/lib/timeline-roadmap-data"
import { cn } from "@/lib/utils"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  formatMonthAbbrevDisplay,
  getMonthStripFlags,
  MONTH_LABELS,
  monthIndexFromLabel,
  monthLongNameFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"

import { SettleUpModal } from "@/components/settle-up-modal"

type IncomeDraftItem = (typeof MOCK_EXPECTED_INCOME)[number] & {
  markedForDeletion?: boolean
}
type BudgetDraftItem = (typeof MOCK_TIMELINE_CATEGORIES)[number]["items"][number] & {
  markedForDeletion?: boolean
}
type BudgetDraftCategory = Omit<(typeof MOCK_TIMELINE_CATEGORIES)[number], "items"> & {
  items: BudgetDraftItem[]
}

type TimelineWorkspaceProps = {
  visualVariant?: "default" | "sample" | "lab-soft-slate"
  topLeftLinkHref?: string
  topLeftLinkLabel?: string
}

type ActivityRow = {
  id: string
  sourceType: "bank_import" | "manual"
  dateLabel: string
  postedDateLabel?: string
  source: string
  merchant: string
  accountLabel: string
  category: string
  flow: "Income" | "Expense" | "Transfer"
  planned: number
  actual: number
  status: "Posted" | "Processing" | "Over"
  budgetMonthLabel?: string
  transferToAccountLabel?: string
}

const DEFAULT_ACTIVITY_ROW_LIMIT = 14

/** Virtual id: form-only row for “add manual transaction” until saved. */
const NEW_MANUAL_ACTIVITY_ID = "__new_manual_activity__"

const categoryGlyphClass =
  "shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-within:opacity-70"

/** Match roadmap category headers (`CATEGORY_GLYPH`); income without a mapped category uses a simple inflow icon. */
function renderCategoryGlyph(
  displayCategory: string,
  flow: ActivityRow["flow"],
  roadmapCategories: TimelineCategory[],
  options?: { alwaysVisible?: boolean },
) {
  const glyphClass = options?.alwaysVisible
    ? "shrink-0 opacity-100"
    : categoryGlyphClass
  const matched = roadmapCategories.find((c) => c.name === displayCategory)
  if (matched) {
    const { Icon, className: iconClass } = CATEGORY_GLYPH[matched.glyph]
    return (
      <Icon
        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)}
        aria-hidden
      />
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
  return (
    <Icon
      className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)}
      aria-hidden
    />
  )
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
 * Timeline route body: month strip + left roadmap + right pane (future: calendar / events).
 */
export function TimelineWorkspace({
  visualVariant = "default",
  topLeftLinkHref,
  topLeftLinkLabel,
}: TimelineWorkspaceProps) {
  const { selectedMonth, setSelectedMonth } = useMonthSelection()
  const [expenseOpenCats, setExpenseOpenCats] = useState<Record<string, boolean>>({})
  const [categories, setCategories] = useState(MOCK_TIMELINE_CATEGORIES)
  const [editDraft, setEditDraft] = useState<BudgetDraftCategory[]>(
    MOCK_TIMELINE_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, markedForDeletion: false })),
    })),
  )
  const [isEditingBudgets, setIsEditingBudgets] = useState(false)
  const [showBudgetAddRow, setShowBudgetAddRow] = useState(false)
  const [newBudgetItemName, setNewBudgetItemName] = useState("")
  const [newBudgetItemCategoryId, setNewBudgetItemCategoryId] = useState("")
  const [newBudgetItemAmount, setNewBudgetItemAmount] = useState(0)
  const [incomeItems, setIncomeItems] = useState(MOCK_EXPECTED_INCOME)
  const [incomeEditDraft, setIncomeEditDraft] = useState<IncomeDraftItem[]>(MOCK_EXPECTED_INCOME)
  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const [activityCategoryOverrides, setActivityCategoryOverrides] = useState<Record<string, string>>({})
  const [activityBudgetMonthOverrides, setActivityBudgetMonthOverrides] = useState<
    Record<string, MonthLabel>
  >({})
  const [activityFieldOverrides, setActivityFieldOverrides] = useState<
    Record<string, Partial<Pick<ActivityRow, "dateLabel" | "source" | "accountLabel" | "actual" | "flow">>>
  >({})
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [activityCategoryDraft, setActivityCategoryDraft] = useState("")
  const [activityBudgetMonthDraft, setActivityBudgetMonthDraft] = useState<MonthLabel>(selectedMonth)
  const [activityDateDraft, setActivityDateDraft] = useState("")
  const [activitySourceDraft, setActivitySourceDraft] = useState("")
  const [activityAccountDraft, setActivityAccountDraft] = useState("")
  const [activityAmountDraft, setActivityAmountDraft] = useState(0)
  const [activityFlowDraft, setActivityFlowDraft] = useState<ActivityRow["flow"]>("Expense")
  const [isEditingActivityDetails, setIsEditingActivityDetails] = useState(false)
  const [isCategoryComboboxOpen, setIsCategoryComboboxOpen] = useState(false)
  const [showAllActivityRows, setShowAllActivityRows] = useState(false)
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false)
  const [fullMonthActivityOpen, setFullMonthActivityOpen] = useState(false)
  const [fullMonthActivityAnchor, setFullMonthActivityAnchor] = useState<{
    top: number
    left: number
    rightInset: number
  } | null>(null)
  const timelinePageCardsRef = useRef<HTMLDivElement>(null)
  const [fullActivityAccountFilter, setFullActivityAccountFilter] = useState<string>("all")
  const [fullActivityCategoryFilter, setFullActivityCategoryFilter] = useState<string>("all")
  const [fullActivitySearch, setFullActivitySearch] = useState("")
  const [manualActivityRows, setManualActivityRows] = useState<ActivityRow[]>([])
  
  // In a real app, this would check if today's date is past the end of the selected month
  const isReadyToCashOut = false 

  const STARTING_FUNDS = 6000

  const activityIds = categories.map((c) => c.id)
  const allExpanded =
    activityIds.length > 0 && activityIds.every((id) => expenseOpenCats[id])

  const setAllExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {}
    for (const id of activityIds) {
      next[id] = expanded
    }
    setExpenseOpenCats(next)
  }

  const toggleAllActivity = () => {
    setAllExpanded(!allExpanded)
  }

  const activeCategories = isEditingBudgets ? editDraft : categories

  const totals = activeCategories.reduce(
    (acc, cat) => {
      for (const item of cat.items) {
        if (item.markedForDeletion) continue
        acc.budget += item.budget
        acc.spent += item.actual
        acc.left += item.budget - item.actual
        acc.overage += Math.max(0, item.actual - item.budget)
      }
      return acc
    },
    { budget: 0, spent: 0, left: 0, overage: 0 },
  )

  const expectedNetCashflow = STARTING_FUNDS - totals.budget - totals.overage
  const expectedNetClass =
    expectedNetCashflow > 0
      ? "text-slate-700"
      : expectedNetCashflow < 0
        ? "text-slate-700"
        : "text-slate-600"
  const fmt = (n: number) => `$${n.toLocaleString()}`
  const fmtCurrency = (n: number) => {
    const sign = n < 0 ? "-" : ""
    const abs = Math.abs(n).toLocaleString()
    return (
      <span className="inline-flex items-baseline">
        <span className="text-[0.9em] text-slate-500">{sign}$</span>
        <span className="ml-[0.14em]">{abs}</span>
      </span>
    )
  }

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

  const activityRows = useMemo<ActivityRow[]>(() => {
    const shortMonth = (value?: string) => (value ? value.slice(0, 3).toLowerCase() : "")
    const selectedMonthShort = selectedMonth.slice(0, 3).toLowerCase()
    const toSortableDate = (value: string) => {
      const d = new Date(`${value}, ${DEFAULT_BUDGET_YEAR}`)
      return Number.isNaN(d.getTime()) ? -1 : d.getTime()
    }

    const incomeSource = isEditingIncome ? incomeEditDraft : incomeItems
    const budgetSource = isEditingBudgets ? editDraft : categories

    const incomeRows: ActivityRow[] = incomeSource
      .filter((line) => !line.markedForDeletion)
      .map((line) => ({
        id: `income-${line.id}`,
        sourceType: "manual",
        dateLabel: line.expectedDate,
        postedDateLabel: line.expectedDate,
        source: line.label,
        merchant: line.label,
        /** Mock: income lines have no linked account; header already shows “User entered”. */
        accountLabel: "Not linked",
        category: "Income",
        flow: "Income",
        planned: line.amount,
        actual: line.cleared ? line.amount : 0,
        status: line.cleared ? "Posted" : "Processing",
        budgetMonthLabel: selectedMonth,
      }))

    const expenseRows: ActivityRow[] = budgetSource.flatMap((cat) =>
      cat.items
        .filter((item) => !item.markedForDeletion)
        .map((item) => {
          const over = item.actual > item.budget
          return {
            id: `expense-${cat.id}-${item.id}`,
            sourceType: "bank_import",
            dateLabel: item.postedDate ?? "—",
            postedDateLabel: item.postedDate,
            source: item.name,
            merchant: item.name,
            accountLabel: "Linked Checking",
            category: cat.name,
            flow: "Expense",
            planned: item.budget,
            actual: item.actual,
            status: over ? "Over" : item.actual > 0 ? "Posted" : "Processing",
            budgetMonthLabel: selectedMonth,
          } satisfies ActivityRow
        }),
    )

    return [...incomeRows, ...expenseRows, ...manualActivityRows]
      .map((row) => ({
        ...row,
        ...activityFieldOverrides[row.id],
        budgetMonthLabel: activityBudgetMonthOverrides[row.id] ?? row.budgetMonthLabel ?? selectedMonth,
      }))
      .sort((a, b) => toSortableDate(b.dateLabel) - toSortableDate(a.dateLabel))
  }, [
    activityFieldOverrides,
    activityBudgetMonthOverrides,
    categories,
    editDraft,
    incomeItems,
    incomeEditDraft,
    isEditingBudgets,
    isEditingIncome,
    manualActivityRows,
    selectedMonth,
  ])

  /** Calendar month ∪ rows assigned to this budget month (overrides included). */
  const fullMonthActivityRows = useMemo(() => {
    return activityRows.filter((row) => {
      const assigned =
        activityBudgetMonthOverrides[row.id] ?? row.budgetMonthLabel ?? selectedMonth
      if (assigned === selectedMonth) return true
      const dStr = row.postedDateLabel ?? row.dateLabel
      if (!dStr || dStr === "—") return false
      const d = new Date(`${dStr}, ${DEFAULT_BUDGET_YEAR}`)
      if (Number.isNaN(d.getTime())) return false
      const mIdx = monthIndexFromLabel(selectedMonth)
      return mIdx != null && d.getMonth() === mIdx
    })
  }, [activityRows, activityBudgetMonthOverrides, selectedMonth])

  const fullActivityCategoryOptions = useMemo(() => {
    const set = new Set<string>(["Income", "Transfer"])
    for (const c of categories) {
      set.add(c.name)
    }
    for (const row of fullMonthActivityRows) {
      set.add(activityCategoryOverrides[row.id] ?? row.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [categories, fullMonthActivityRows, activityCategoryOverrides])

  const fullActivityAccountOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of fullMonthActivityRows) {
      if (row.accountLabel) set.add(row.accountLabel)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [fullMonthActivityRows])

  const filteredFullMonthActivityRows = useMemo(() => {
    let rows = fullMonthActivityRows
    if (fullActivityAccountFilter !== "all") {
      rows = rows.filter((r) => r.accountLabel === fullActivityAccountFilter)
    }
    if (fullActivityCategoryFilter !== "all") {
      rows = rows.filter(
        (r) =>
          (activityCategoryOverrides[r.id] ?? r.category) === fullActivityCategoryFilter,
      )
    }
    const q = fullActivitySearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const cat = activityCategoryOverrides[r.id] ?? r.category
        return (
          r.source.toLowerCase().includes(q) ||
          r.merchant.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          r.accountLabel.toLowerCase().includes(q) ||
          r.flow.toLowerCase().includes(q) ||
          (r.postedDateLabel ?? "").toLowerCase().includes(q) ||
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
    activityCategoryOverrides,
  ])

  const newManualActivityPlaceholder = useMemo(
    (): ActivityRow => ({
      id: NEW_MANUAL_ACTIVITY_ID,
      sourceType: "manual",
      dateLabel: "",
      postedDateLabel: "",
      source: "",
      merchant: "",
      accountLabel: "",
      category: "",
      flow: "Expense",
      planned: 0,
      actual: 0,
      status: "Posted",
      budgetMonthLabel: selectedMonth,
    }),
    [selectedMonth],
  )

  const selectedActivity = useMemo(() => {
    if (selectedActivityId === NEW_MANUAL_ACTIVITY_ID) {
      return newManualActivityPlaceholder
    }
    return activityRows.find((row) => row.id === selectedActivityId) ?? null
  }, [activityRows, selectedActivityId, newManualActivityPlaceholder])

  const isNewManualActivity = selectedActivityId === NEW_MANUAL_ACTIVITY_ID
  const visibleActivityRows = useMemo(
    () =>
      showAllActivityRows ? activityRows : activityRows.slice(0, DEFAULT_ACTIVITY_ROW_LIMIT),
    [activityRows, showAllActivityRows],
  )
  const hasMoreActivityRows = activityRows.length > DEFAULT_ACTIVITY_ROW_LIMIT
  const categoryOptions = useMemo(() => categories.map((cat) => cat.name), [categories])
  /** Income rows use a single placeholder label until income categories exist. */
  const activityCategorySelectOptions = useMemo(
    () => (activityFlowDraft === "Income" ? ["Income"] : activityFlowDraft === "Transfer" ? ["Transfer"] : categoryOptions),
    [activityFlowDraft, categoryOptions],
  )
  const selectedActivityCategory = selectedActivity
    ? (activityCategoryOverrides[selectedActivity.id] ?? selectedActivity.category)
    : ""
  const selectedActivityIsTransfer =
    selectedActivityCategory.trim().toLowerCase() === "transfer"
  const selectedActivityAccountDisplay = selectedActivity
    ? selectedActivityIsTransfer
      ? `${selectedActivity.accountLabel} -> ${selectedActivity.transferToAccountLabel ?? "Linked Account"}`
      : selectedActivity.accountLabel
    : ""
  const selectedActivityBudgetMonth = selectedActivity?.budgetMonthLabel ?? selectedMonth
  const selectedActivityBudgetMonthIndex = monthIndexFromLabel(selectedActivityBudgetMonth) ?? 0
  const selectedActivityIsManual = selectedActivity?.sourceType === "manual"
  const timelineMonthOptions = useMemo<Array<{ value: MonthLabel; label: string; disabled: boolean }>>(() => {
    if (!selectedActivity) {
      return [
        {
          value: activityBudgetMonthDraft,
          label: `${monthLongNameFromLabel(activityBudgetMonthDraft)} Timeline`,
          disabled: false,
        },
      ]
    }

    const currentIdx = selectedActivityBudgetMonthIndex
    /** Same ±1 month window for bank-import and manual — keeps rollover rules consistent. */
    const optionMonths = [
      MONTH_LABELS[(currentIdx + 11) % 12],
      MONTH_LABELS[currentIdx],
      MONTH_LABELS[(currentIdx + 1) % 12],
    ]

    return optionMonths
      .filter((month, idx, arr) => arr.indexOf(month) === idx)
      .map((month) => {
        const monthIndex = monthIndexFromLabel(month) ?? 0
        const flags = getMonthStripFlags(monthIndex, { budgetYear: DEFAULT_BUDGET_YEAR })
        const disabled = flags.isArchived && month !== selectedActivityBudgetMonth
        return {
          value: month,
          label: `${monthLongNameFromLabel(month)} Timeline`,
          disabled,
        }
      })
  }, [activityBudgetMonthDraft, selectedActivity, selectedActivityBudgetMonth, selectedActivityBudgetMonthIndex])
  const canSaveNewManualActivity = Boolean(
    isNewManualActivity &&
      activityCategoryDraft.trim() &&
      activityDateDraft.trim() &&
      activitySourceDraft.trim() &&
      activityAccountDraft.trim() &&
      activityAmountDraft > 0,
  )
  const hasPendingActivityChanges = Boolean(
    selectedActivity &&
      (isNewManualActivity
        ? canSaveNewManualActivity
        : activityCategoryDraft !== selectedActivityCategory ||
          activityBudgetMonthDraft !== selectedActivityBudgetMonth ||
          (selectedActivityIsManual &&
            (activityDateDraft !== selectedActivity.dateLabel ||
              activitySourceDraft !== selectedActivity.source ||
              activityAccountDraft !== selectedActivity.accountLabel ||
              activityAmountDraft !== selectedActivity.actual ||
              activityFlowDraft !== selectedActivity.flow))),
  )
  const budgetMonthDraftIndex = monthIndexFromLabel(activityBudgetMonthDraft) ?? selectedActivityBudgetMonthIndex

  const isSample = visualVariant === "sample"
  const isLabSoftSlate = visualVariant === "lab-soft-slate"
  const monthStripWrapClass = isSample
    ? "shrink-0 bg-white px-4 pb-2 pt-3"
    : "shrink-0 bg-stone-100 px-4 pb-2 pt-3"
  const monthStripClass = isLabSoftSlate
    ? "border-slate-300/70 shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
    : undefined
  const layoutGapClass = isLabSoftSlate ? "gap-4" : "gap-3"
  const cardShellClass = isSample
    ? "border-stone-200 bg-stone-50/75"
    : isLabSoftSlate
      ? "border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
      : "border-slate-200 bg-white"
  const cardHeaderClass = isSample
    ? "shrink-0 border-b border-[#D7C7B7] bg-[#E9DED2] px-3 py-2.5"
    : isLabSoftSlate
      ? "shrink-0 border-b border-slate-300 bg-white px-3 py-2.5"
      : "shrink-0 border-b border-slate-700 bg-slate-700/80 px-3 py-2.5"
  const cardTitleClass = isSample
    ? "text-sm font-semibold tracking-tight text-slate-900"
    : isLabSoftSlate
      ? "text-[15px] font-bold tracking-tight text-slate-600"
      : "text-sm font-semibold tracking-tight text-slate-100"
  const cardEditBtnClass = isSample
    ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-white/50 hover:text-slate-900 active:bg-white/70"
    : isLabSoftSlate
      ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-0.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] underline-offset-2 transition-colors hover:text-[#006BB3] hover:underline active:text-[#005a96]"
      : "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-200 transition-colors hover:bg-white/10 hover:text-sky-100 active:bg-white/15"
  const cardCancelBtnClass = isSample || isLabSoftSlate
    ? "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-700 transition-colors hover:bg-rose-100 hover:text-rose-800"
    : "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-200 transition-colors hover:bg-rose-300/20 hover:text-rose-100"
  const activityDetailSourceBadgeClass = isSample
    ? "rounded-full border border-stone-400/60 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-800"
    : isLabSoftSlate
      ? "rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-800"
      : "rounded-full border border-white/45 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
  const activityDetailPendingBadgeClass = isSample
    ? "rounded-full border border-amber-400/70 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950"
    : isLabSoftSlate
      ? "rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950"
      : "rounded-full border border-amber-200/55 bg-amber-600/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-50 shadow-sm"
  const fmtAmount = (n: number) => `$${n.toLocaleString()}`

  useEffect(() => {
    setShowAllActivityRows(false)
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
    const el = timelinePageCardsRef.current
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

  const startBudgetEdit = () => {
    if (isEditingIncome) {
      setIsEditingIncome(false)
      setIncomeEditDraft(incomeItems.map((item) => ({ ...item, markedForDeletion: false })))
    }
    setEditDraft(
      categories.map((cat) => ({
        ...cat,
        items: cat.items.map((i) => ({ ...i, markedForDeletion: false })),
      })),
    )
    setIsEditingBudgets(true)
    setShowBudgetAddRow(false)
    setNewBudgetItemName("")
    setNewBudgetItemCategoryId(categories[0]?.id ?? "")
    setNewBudgetItemAmount(0)
  }

  const cancelBudgetEdit = () => {
    setIsEditingBudgets(false)
    setEditDraft(
      categories.map((cat) => ({
        ...cat,
        items: cat.items.map((i) => ({ ...i, markedForDeletion: false })),
      })),
    )
    setAllExpanded(false)
    setShowBudgetAddRow(false)
    setNewBudgetItemName("")
    setNewBudgetItemAmount(0)
  }

  const saveBudgetEdit = () => {
    setCategories(
      editDraft.map((cat) => ({
        ...cat,
        items: cat.items
          .filter((i) => !i.markedForDeletion)
          .map(({ markedForDeletion, ...i }) => ({ ...i })),
      })),
    )
    setIsEditingBudgets(false)
    setAllExpanded(false)
    setShowBudgetAddRow(false)
    setNewBudgetItemName("")
    setNewBudgetItemAmount(0)
  }

  const addBudgetItem = () => {
    if (!showBudgetAddRow) {
      setShowBudgetAddRow(true)
      if (!newBudgetItemCategoryId) {
        setNewBudgetItemCategoryId(editDraft[0]?.id ?? "")
      }
      return
    }
    if (!newBudgetItemCategoryId || !newBudgetItemName.trim()) return
    const newId = `new-${Date.now()}`
    setEditDraft((prev) =>
      prev.map((cat) =>
        cat.id === newBudgetItemCategoryId
          ? {
              ...cat,
              items: [
                ...cat.items,
                {
                  id: newId,
                  name: newBudgetItemName.trim(),
                  budget: Math.max(0, newBudgetItemAmount),
                  actual: 0,
                  left: Math.max(0, newBudgetItemAmount),
                },
              ],
            }
          : cat,
      ),
    )
    setExpenseOpenCats((prev) => ({ ...prev, [newBudgetItemCategoryId]: true }))
    setShowBudgetAddRow(false)
    setNewBudgetItemName("")
    setNewBudgetItemAmount(0)
  }

  const startIncomeEdit = () => {
    if (isEditingBudgets) {
      setIsEditingBudgets(false)
      setEditDraft(
        categories.map((cat) => ({
          ...cat,
          items: cat.items.map((i) => ({ ...i, markedForDeletion: false })),
        })),
      )
      setAllExpanded(false)
      setShowBudgetAddRow(false)
      setNewBudgetItemName("")
      setNewBudgetItemAmount(0)
    }
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

  const handleLineItemBudgetChange = (
    categoryId: string,
    itemId: string,
    nextBudget: number,
  ) => {
    setEditDraft((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId && !item.markedForDeletion
                  ? { ...item, budget: nextBudget, left: nextBudget - item.actual }
                  : item,
              ),
            }
          : cat,
      ),
    )
  }

  const handleLineItemNameChange = (
    categoryId: string,
    itemId: string,
    nextName: string,
  ) => {
    setEditDraft((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId && !item.markedForDeletion
                  ? { ...item, name: nextName }
                  : item,
              ),
            }
          : cat,
      ),
    )
  }

  const handleRoadmapToggleDelete = (categoryId: string, itemId: string) => {
    setEditDraft((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId && item.actual === 0
                  ? { ...item, markedForDeletion: !item.markedForDeletion }
                  : item,
              ),
            }
          : cat,
      ),
    )
  }

  const openActivityDetails = (row: ActivityRow) => {
    setSelectedActivityId(row.id)
    setActivityCategoryDraft(activityCategoryOverrides[row.id] ?? row.category)
    setActivityBudgetMonthDraft(
      activityBudgetMonthOverrides[row.id] ?? row.budgetMonthLabel ?? selectedMonth,
    )
    setActivityDateDraft(row.dateLabel)
    setActivitySourceDraft(row.source)
    setActivityAccountDraft(row.accountLabel)
    setActivityAmountDraft(row.actual)
    setActivityFlowDraft(row.flow)
    setIsEditingActivityDetails(false)
  }

  const openAddManualActivity = () => {
    setSelectedActivityId(NEW_MANUAL_ACTIVITY_ID)
    setActivityCategoryDraft("")
    setActivityBudgetMonthDraft(selectedMonth)
    setActivityDateDraft("")
    setActivitySourceDraft("")
    setActivityAccountDraft("")
    setActivityAmountDraft(0)
    setActivityFlowDraft("Expense")
    setIsEditingActivityDetails(true)
  }

  const closeActivityDetails = (open: boolean) => {
    if (!open) {
      setSelectedActivityId(null)
      setActivityCategoryDraft("")
      setActivityBudgetMonthDraft(selectedMonth)
      setActivityDateDraft("")
      setActivitySourceDraft("")
      setActivityAccountDraft("")
      setActivityAmountDraft(0)
      setActivityFlowDraft("Expense")
      setIsEditingActivityDetails(false)
    }
  }

  const openFullMonthActivity = () => {
    closeActivityDetails(false)
    const el = timelinePageCardsRef.current
    if (el) {
      setFullMonthActivityAnchor(getFullMonthOverlayRect(el))
    }
    setFullMonthActivityOpen(true)
  }

  const saveActivityDetails = () => {
    if (!selectedActivity || !activityCategoryDraft.trim() || !activityBudgetMonthDraft) return

    if (isNewManualActivity) {
      if (!canSaveNewManualActivity) return
      const id = `manual-${crypto.randomUUID()}`
      const amount = Math.max(0, activityAmountDraft)
      const newRow: ActivityRow = {
        id,
        sourceType: "manual",
        dateLabel: activityDateDraft.trim(),
        postedDateLabel: activityDateDraft.trim(),
        source: activitySourceDraft.trim(),
        merchant: activitySourceDraft.trim(),
        accountLabel: activityAccountDraft.trim(),
        category: activityCategoryDraft.trim(),
        flow: activityFlowDraft,
        planned: amount,
        actual: amount,
        status: "Posted",
        budgetMonthLabel: activityBudgetMonthDraft,
      }
      setManualActivityRows((prev) => [...prev, newRow])
      closeActivityDetails(false)
      return
    }

    setActivityCategoryOverrides((prev) => ({ ...prev, [selectedActivity.id]: activityCategoryDraft }))
    setActivityBudgetMonthOverrides((prev) => ({
      ...prev,
      [selectedActivity.id]: activityBudgetMonthDraft,
    }))
    if (selectedActivity.sourceType === "manual") {
      setActivityFieldOverrides((prev) => ({
        ...prev,
        [selectedActivity.id]: {
          dateLabel: activityDateDraft,
          source: activitySourceDraft,
          accountLabel: activityAccountDraft,
          actual: Math.max(0, activityAmountDraft),
          flow: activityFlowDraft,
        },
      }))
    }
    setSelectedActivityId(null)
    setActivityCategoryDraft("")
    setActivityBudgetMonthDraft(selectedMonth)
    setActivityDateDraft("")
    setActivitySourceDraft("")
    setActivityAccountDraft("")
    setActivityAmountDraft(0)
    setActivityFlowDraft("Expense")
    setIsEditingActivityDetails(false)
  }

  const cancelActivityEdit = () => {
    if (isNewManualActivity) {
      closeActivityDetails(false)
      return
    }
    if (!selectedActivity) return
    setActivityCategoryDraft(selectedActivityCategory)
    setActivityBudgetMonthDraft(selectedActivityBudgetMonth as MonthLabel)
    setActivityDateDraft(selectedActivity.dateLabel)
    setActivitySourceDraft(selectedActivity.source)
    setActivityAccountDraft(selectedActivity.accountLabel)
    setActivityAmountDraft(selectedActivity.actual)
    setActivityFlowDraft(selectedActivity.flow)
    setIsEditingActivityDetails(false)
  }

  return (
    <div className="relative flex flex-col">
      {topLeftLinkHref ? (
        <div className="fixed left-3 top-3 z-[70]">
          <Link
            href={topLeftLinkHref}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
          >
            {topLeftLinkLabel ?? "Open Sample"}
          </Link>
        </div>
      ) : null}
      {(isEditingBudgets || isEditingIncome || !!selectedActivity) && !fullMonthActivityOpen && (
        <div className="pointer-events-none fixed inset-0 z-10 bg-slate-900/20" />
      )}
      <div className={monthStripWrapClass}>
        <MonthStrip
          value={selectedMonth}
          onValueChange={setSelectedMonth}
          className={monthStripClass}
        />
      </div>

      <div
        ref={timelinePageCardsRef}
        className={cn(
          `flex min-w-0 flex-col ${layoutGapClass} px-4 pb-4 pt-2 lg:flex-row lg:items-start`,
          fullMonthActivityOpen &&
            "pointer-events-none invisible select-none opacity-0",
        )}
        aria-hidden={fullMonthActivityOpen}
      >
        <div className="relative flex w-full min-w-0 max-w-[min(100%,40rem)] shrink-0 flex-col gap-4 lg:max-w-[min(100%,50%)]">
        <div className="relative">
        <section
          className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border shadow-sm transition-opacity ${
            isEditingBudgets
              ? `${isSample ? "bg-stone-50/75" : "bg-white"} z-20 border-[#0087D2]/55 ring-1 ring-[#0087D2]/25`
              : cardShellClass
          } ${
            isEditingIncome || !!selectedActivity ? "opacity-45" : "opacity-100"
          }`}
          aria-labelledby="timeline-roadmap-heading"
        >
          {isEditingIncome && (
            <div className="pointer-events-none absolute inset-0 z-10 rounded-sm bg-white/55 backdrop-blur-[1px]" />
          )}
          <header className={cardHeaderClass}>
            <div className="relative z-20 flex min-w-0 items-center">
              <h2
                id="timeline-roadmap-heading"
                className={cardTitleClass}
              >
                March Roadmap
              </h2>
              {isEditingBudgets ? (
                <span className="ml-auto mr-8 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Editing
                </span>
              ) : (
                <button
                  type="button"
                  onClick={startBudgetEdit}
                  className={cardEditBtnClass}
                >
                  Edit
                </button>
              )}
              {isEditingBudgets && (
                <button
                  type="button"
                  onClick={cancelBudgetEdit}
                  className="absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm bg-rose-600/95 text-white transition-colors hover:bg-rose-700"
                  aria-label="Cancel budget editing"
                  title="Cancel"
                >
                  <span className="text-[14px] font-bold leading-none">x</span>
                </button>
              )}
            </div>
          </header>
          <div className="relative z-20 min-w-0 p-3">
            <div className="mb-1 flex justify-center pr-1.5 sm:pr-2">
              <div className="shrink-0">
                <p className="inline-flex items-baseline gap-2">
                  <span className="text-[15px] italic font-medium text-slate-500">Starting Funds</span>
                  <span className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}>
                    {fmtCurrency(STARTING_FUNDS)}
                  </span>
                  <span className={`ml-3 text-xl italic font-semibold text-orange-700/90 ${myJourneyNav.className}`}>
                    Let&apos;s do this
                  </span>
                </p>
              </div>
            </div>
            <div className={`mb-1 flex items-center justify-between gap-2 ${isEditingBudgets ? "pr-9" : ""}`}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleAllActivity}
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#0087D2] transition-colors hover:bg-[#0087D2]/10 hover:text-[#006BB3] active:bg-[#0087D2]/15"
                >
                  {allExpanded ? (
                    <ChevronsUp className="h-2.5 w-2.5 shrink-0 stroke-[1.8]" aria-hidden />
                  ) : (
                    <ChevronsDown className="h-2.5 w-2.5 shrink-0 stroke-[1.8]" aria-hidden />
                  )}
                  {allExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              <div className="ml-auto flex w-fit shrink-0 items-baseline gap-x-3 pr-1.5 sm:gap-x-3.5 sm:pr-2">
              <span className="w-[3.5rem] min-w-[3.25rem] text-right text-[9px] font-semibold uppercase leading-tight tracking-wider text-slate-400 sm:w-[3.875rem] sm:min-w-[3.5rem]">
                Budget
              </span>
              <span
                className="w-[3.5rem] min-w-[3.25rem] text-right text-[9px] font-semibold uppercase leading-tight tracking-wider text-slate-400 sm:w-[3.875rem] sm:min-w-[3.5rem]"
              >
                Spent
              </span>
              <span
                className="w-[3.5rem] min-w-[3.25rem] text-right text-[9px] font-semibold uppercase leading-tight tracking-wider text-slate-400 sm:w-[3.875rem] sm:min-w-[3.5rem]"
              >
                Available
              </span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-0">
              <RoadmapCategoriesGrid
                categories={activeCategories}
                variant="compact"
                layout="single"
                showCompactToolbar={false}
                wrapSingleInCard={false}
                openCats={expenseOpenCats}
                onOpenCatsChange={setExpenseOpenCats}
                editMode={isEditingBudgets}
                onLineItemBudgetChange={handleLineItemBudgetChange}
                onLineItemNameChange={handleLineItemNameChange}
                onLineItemToggleDelete={handleRoadmapToggleDelete}
              />
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {isEditingBudgets && showBudgetAddRow && (
                <div className="relative mb-2 rounded-sm border border-slate-200 bg-slate-50/70 p-2">
                  <button
                    type="button"
                    onClick={() => setShowBudgetAddRow(false)}
                    className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
                    aria-label="Close add budget item"
                    title="Close"
                  >
                    <span className="text-[11px] font-bold leading-none">x</span>
                  </button>
                  <div className="grid grid-cols-1 gap-1.5 pt-4 sm:grid-cols-[minmax(0,1fr)_8.25rem_6rem_auto] sm:items-center">
                    <input
                      type="text"
                      value={newBudgetItemName}
                      onChange={(e) => setNewBudgetItemName(e.target.value)}
                      placeholder="Item name"
                      className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <select
                      value={newBudgetItemCategoryId}
                      onChange={(e) => setNewBudgetItemCategoryId(e.target.value)}
                      className="rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      {editDraft.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={newBudgetItemAmount}
                      onChange={(e) => setNewBudgetItemAmount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Budget"
                      className={`rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-right text-[12px] tabular-nums text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 ${amountInter.className}`}
                    />
                    <button
                      type="button"
                      onClick={addBudgetItem}
                      className="justify-self-start text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] hover:underline"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-baseline justify-center gap-2">
                <p className="text-[15px] italic font-medium text-slate-500">
                  Expected Cashout
                </p>
                <div
                  className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                >
                  {fmtCurrency(expectedNetCashflow)}
                </div>
                <p className={`ml-3 inline-flex items-center gap-1.5 text-xl italic font-semibold text-orange-700/90 ${myJourneyNav.className}`}>
                  <span>
                    {expectedNetCashflow === 0 ? (
                      "payin' the bills"
                    ) : (
                      <>
                        {expectedNetCashflow < 0 ? "dipping in the stash in " : "available in "}
                        <span className="text-[1.3em] font-bold leading-none">{daysUntilNextMonth}</span>
                        {" days"}
                      </>
                    )}
                  </span>
                  <Wallet className="ml-1 h-4 w-4 shrink-0 stroke-[1.7] text-orange-700/80" aria-hidden />
                </p>
              </div>
              {isEditingBudgets && (
                <div className="mt-3 flex flex-col items-end">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowBudgetAddRow(true)}
                      className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      + Add Budget Item
                    </button>
                    <button
                      type="button"
                      onClick={cancelBudgetEdit}
                      className="ml-2 rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveBudgetEdit}
                      className="rounded-sm bg-[#0087D2] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#006BB3]"
                    >
                      Save
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] italic text-slate-500">
                    Edit budget categories in{" "}
                    <Link href="/bills-and-income" className="text-[#0087D2] underline-offset-2 hover:underline">
                      Roadmap
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
        <TimelineIncomeTankCard
          items={isEditingIncome ? incomeEditDraft : incomeItems}
          selectedMonth={selectedMonth}
          editMode={isEditingIncome}
          muted={isEditingBudgets || !!selectedActivity}
          elevated={isEditingIncome}
          headerTheme={isLabSoftSlate ? "softSlate" : isSample ? "sample" : "default"}
          onAmountChange={handleIncomeAmountChange}
          onLabelChange={handleIncomeLabelChange}
          onStartEdit={startIncomeEdit}
          onSaveEdit={saveIncomeEdit}
          onCancelEdit={cancelIncomeEdit}
          onToggleDelete={handleIncomeToggleDelete}
          onAddItem={addIncomeItem}
        />
        
        <div className="mt-3 mb-2 flex flex-col items-center justify-center gap-1">
          <button 
            type="button"
            onClick={() => setIsSettleUpOpen(true)}
            className={`group inline-flex cursor-pointer items-center justify-center gap-2.5 py-3 px-6 rounded shadow-sm transition-colors duration-300 ${
              isReadyToCashOut 
                ? "bg-[#0087D2] text-white hover:bg-[#00487A] active:bg-[#00365D]"
                : "bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-500"
            }`}
          >
            <span className="text-[13px] font-bold uppercase tracking-wide">
              Cash Out {monthLongNameFromLabel(selectedMonth)}
            </span>
            <span className={`text-[20px] font-black transition-colors duration-300 leading-none pb-0.5 ${
              isReadyToCashOut
                ? "text-amber-400 group-hover:text-amber-200"
                : "text-slate-300 group-hover:text-slate-400"
            }`} aria-hidden>
              &raquo;
            </span>
            <span className={`text-[17px] italic font-medium transition-colors ${myJourneyNav.className} ${
              isReadyToCashOut
                ? "text-white group-hover:text-white"
                : "text-slate-500 group-hover:text-slate-600"
            }`}>
              Advance to {MONTH_LABELS[(monthIndexFromLabel(selectedMonth) ?? 0 + 1) % 12] ? monthLongNameFromLabel(MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12]) : "Next Month"}
            </span>
          </button>
          
          {!isReadyToCashOut && (
            <span className="mt-1 text-[11px] font-medium text-slate-500 italic">
              Unlocks on {MONTH_LABELS[(monthIndexFromLabel(selectedMonth) ?? 0 + 1) % 12] ? monthLongNameFromLabel(MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12]) : "Next Month"} 1st
            </span>
          )}
        </div>
        </div>
        <section
          className={cn(
            "flex min-w-0 flex-1 flex-col overflow-hidden rounded-sm border shadow-sm transition-opacity",
            selectedActivity
              ? "relative z-20 min-h-[min(82vh,40rem)] border-[#0087D2]/55 ring-1 ring-[#0087D2]/25 lg:min-h-[36rem]"
              : "min-h-[12rem]",
            cardShellClass,
            (isEditingBudgets || isEditingIncome) && !selectedActivity ? "opacity-45" : "opacity-100",
          )}
          aria-labelledby="timeline-activity-heading"
        >
          <header className={cardHeaderClass}>
            <div className="relative z-20 flex min-w-0 items-center gap-2">
              <h2
                id="timeline-activity-heading"
                className={cn(
                  cardTitleClass,
                  !selectedActivity && "flex min-w-0 flex-1 items-center gap-2",
                )}
              >
                {selectedActivity ? (
                  isNewManualActivity ? (
                    "Add transaction"
                  ) : (
                    "Transaction Details"
                  )
                ) : (
                  <>
                    <List
                      className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">Recent Activity</span>
                  </>
                )}
              </h2>
              {!selectedActivity ? (
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={openFullMonthActivity}
                    className="inline-flex max-w-[min(100%,14rem)] cursor-pointer items-center gap-1 text-right text-[10px] font-semibold leading-snug text-[#0087D2] underline-offset-2 hover:underline sm:max-w-none"
                  >
                    <span className="leading-snug">
                      Full {monthLongNameFromLabel(selectedMonth)} Activity
                    </span>
                    <Maximize2 className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={openAddManualActivity}
                    className={cardEditBtnClass}
                  >
                    + Add
                  </button>
                </div>
              ) : null}
              {selectedActivity ? (
                <>
                  <div className="ml-auto mr-8 flex flex-wrap items-center justify-end gap-2">
                    <span className={activityDetailSourceBadgeClass}>
                      {isNewManualActivity || selectedActivity.sourceType === "manual"
                        ? "User entered"
                        : "Imported"}
                    </span>
                    {selectedActivity.status !== "Posted" ? (
                      <span className={activityDetailPendingBadgeClass}>
                        {selectedActivity.status === "Processing" ? "Pending" : selectedActivity.status}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => closeActivityDetails(false)}
                    className="absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm bg-rose-600/95 text-white transition-colors hover:bg-rose-700"
                    aria-label="Close transaction details"
                    title="Close"
                  >
                    <span className="text-[14px] font-bold leading-none">x</span>
                  </button>
                </>
              ) : null}
            </div>
          </header>
          <div className="relative min-h-0 flex-1 p-2">

          {selectedActivity ? (
            <div className="absolute inset-0 z-10 flex min-h-0 flex-col bg-white p-3 sm:p-4">
              <div className="min-h-0 flex-1 overflow-y-auto pb-2">
              <section className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:gap-3.5">
                  {/* Category */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">
                      Category
                    </label>
                    <div className="min-w-0">
                      {isEditingActivityDetails ? (
                        <Popover open={isCategoryComboboxOpen} onOpenChange={setIsCategoryComboboxOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCategoryComboboxOpen}
                              className="h-8 w-full justify-between border-slate-300 px-2 py-1 text-[13px] font-normal font-medium text-slate-800 shadow-none hover:bg-slate-50"
                            >
                              {activityCategoryDraft ? (
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  {renderCategoryGlyph(activityCategoryDraft, activityFlowDraft, activeCategories, { alwaysVisible: true })}
                                  <span className="truncate">{activityCategoryDraft}</span>
                                </span>
                              ) : (
                                <span className="font-normal text-slate-500">Select category...</span>
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search categories..." className="h-9 text-[13px]" />
                              <CommandList className="max-h-[min(52vh,420px)]">
                                <CommandEmpty className="py-2 text-center text-[12px] text-slate-500">
                                  No category found.
                                </CommandEmpty>

                                <CommandGroup heading="Inflow">
                                  <CommandItem
                                    value="Income"
                                    onSelect={() => {
                                      setActivityCategoryDraft("Income")
                                      setActivityFlowDraft("Income")
                                      setIsCategoryComboboxOpen(false)
                                    }}
                                    className="text-[13px]"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        activityCategoryDraft === "Income" ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {renderCategoryGlyph("Income", "Income", activeCategories, { alwaysVisible: true })}
                                    <span className="ml-2">Income</span>
                                  </CommandItem>
                                </CommandGroup>

                                <CommandGroup heading="Transfers & Debt">
                                  <CommandItem
                                    value="Transfer"
                                    onSelect={() => {
                                      setActivityCategoryDraft("Transfer")
                                      setActivityFlowDraft("Transfer")
                                      setIsCategoryComboboxOpen(false)
                                    }}
                                    className="text-[13px]"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        activityCategoryDraft === "Transfer" ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {renderCategoryGlyph("Transfer", "Transfer", activeCategories, { alwaysVisible: true })}
                                    <span className="ml-2">Transfer</span>
                                  </CommandItem>
                                </CommandGroup>

                                <CommandGroup heading="Expenses">
                                  {categoryOptions.map((option) => (
                                    <CommandItem
                                      key={option}
                                      value={option}
                                      onSelect={() => {
                                        setActivityCategoryDraft(option)
                                        setActivityFlowDraft("Expense")
                                        setIsCategoryComboboxOpen(false)
                                      }}
                                      className="text-[13px]"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          activityCategoryDraft === option ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      {renderCategoryGlyph(option, "Expense", activeCategories, { alwaysVisible: true })}
                                      <span className="ml-2">{option}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-800">
                          {renderCategoryGlyph(activityCategoryDraft, selectedActivity.flow, activeCategories, {
                            alwaysVisible: true,
                          })}
                          <span>{activityCategoryDraft}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Date</label>
                    <div className="min-w-0">
                      {isEditingActivityDetails && selectedActivityIsManual ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-8 w-full justify-start border-slate-300 px-2 text-left text-[13px] font-normal shadow-none",
                                !activityDateDraft && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                              {activityDateDraft ? (
                                (() => {
                                  const parts = activityDateDraft.split(" ")
                                  if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                                    return activityDateDraft
                                  }
                                  return activityDateDraft || "Pick a date"
                                })()
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={(() => {
                                try {
                                  if (!activityDateDraft) return new Date()
                                  const currentYear = new Date().getFullYear()
                                  const parsed = new Date(`${activityDateDraft} ${currentYear}`)
                                  return isNaN(parsed.getTime()) ? new Date() : parsed
                                } catch {
                                  return new Date()
                                }
                              })()}
                              onSelect={(date) => {
                                if (date) {
                                  setActivityDateDraft(format(date, "MMM d"))
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-[14px] font-medium tabular-nums text-slate-800">
                          {selectedActivity.postedDateLabel ?? "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Timeline</label>
                    <div className="min-w-0">
                      {isEditingActivityDetails ? (
                        <Select
                          value={activityBudgetMonthDraft}
                          onValueChange={(value) => setActivityBudgetMonthDraft(value as MonthLabel)}
                        >
                          <SelectTrigger className="h-8 w-full rounded-sm border-slate-300 bg-white text-[13px] font-medium text-slate-800">
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {timelineMonthOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {option.disabled ? (
                                    <Lock className="h-3 w-3 shrink-0 stroke-[1.8] text-slate-400" aria-hidden />
                                  ) : null}
                                  <span>{option.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[14px] font-medium text-slate-800">
                          {monthLongNameFromLabel(activityBudgetMonthDraft)} Timeline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Amount</label>
                    <div className="relative min-w-0">
                      {isEditingActivityDetails && selectedActivityIsManual ? (
                        <div className="relative w-full max-w-[min(100%,20rem)]">
                          {activityFlowDraft !== "Transfer" && (
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span
                                className={`text-[13px] font-semibold ${
                                  activityFlowDraft === "Income" ? "text-emerald-600" : "text-slate-500"
                                }`}
                              >
                                {activityFlowDraft === "Income" ? "+" : "-"}
                              </span>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-[26px]">
                            <span className="text-[13px] text-slate-400">$</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={activityAmountDraft || ""}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === "") {
                                setActivityAmountDraft(0)
                                return
                              }
                              setActivityAmountDraft(Math.abs(Number(val)))
                            }}
                            className={`h-8 w-full rounded-sm border border-slate-300 bg-white pr-2 text-[14px] font-semibold text-slate-800 tabular-nums ${
                              activityFlowDraft !== "Transfer" ? "pl-9" : "pl-7"
                            } ${amountInter.className}`}
                          />
                        </div>
                      ) : (
                        <span
                          className={`text-[15px] font-semibold tabular-nums ${amountInter.className} ${
                            selectedActivity.flow === "Income"
                              ? "text-emerald-700"
                              : selectedActivity.flow === "Transfer"
                                ? "text-slate-600"
                                : "text-slate-800"
                          }`}
                        >
                          {selectedActivity.flow === "Income" ? "+" : selectedActivity.flow === "Transfer" ? "" : "-"}
                          {fmtAmount(selectedActivity.actual)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Description</label>
                    <div className="min-w-0">
                      {isEditingActivityDetails && selectedActivityIsManual ? (
                        <input
                          type="text"
                          value={activitySourceDraft}
                          onChange={(e) => setActivitySourceDraft(e.target.value)}
                          className="h-8 w-full rounded-sm border border-slate-300 bg-white px-2 text-[14px] font-semibold text-slate-800"
                        />
                      ) : (
                        <span className="block truncate text-[15px] font-semibold tracking-tight text-slate-800">
                          {selectedActivity.source}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account */}
                  <div className="grid grid-cols-[minmax(4.5rem,6rem)_1fr] sm:grid-cols-[minmax(6rem,7.5rem)_1fr] items-center gap-3 sm:gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Account</label>
                    <div className="min-w-0">
                      {isEditingActivityDetails && selectedActivityIsManual ? (
                        <input
                          type="text"
                          value={activityAccountDraft}
                          onChange={(e) => setActivityAccountDraft(e.target.value)}
                          className="h-8 w-full rounded-sm border border-slate-300 bg-white px-2 text-[14px] font-semibold text-slate-800"
                        />
                      ) : (
                        <span className="block truncate text-[14px] font-medium text-slate-800">
                          {selectedActivityAccountDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-200 bg-white pt-3">
                {!isEditingActivityDetails ? (
                  <>
                    <button
                      type="button"
                      onClick={() => closeActivityDetails(false)}
                      className="rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingActivityDetails(true)}
                      className="rounded-sm bg-[#0087D2] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#006BB3]"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelActivityEdit}
                      className="rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveActivityDetails}
                      disabled={!hasPendingActivityChanges}
                      className={`rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
                        hasPendingActivityChanges
                          ? "bg-[#0087D2] text-white hover:bg-[#006BB3]"
                          : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                      }`}
                    >
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
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
                    className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"
                    tabIndex={0}
                    role="button"
                    onClick={() => openActivityDetails(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openActivityDetails(row)
                      }
                    }}
                  >
                    <TableCell
                      className={`px-2 py-1.5 text-[11px] tabular-nums ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      <span className="inline-flex flex-wrap items-center gap-1.5 leading-tight">
                        <span>{row.dateLabel}</span>
                        {row.postedDateLabel &&
                        row.budgetMonthLabel &&
                        row.postedDateLabel.slice(0, 3) !== row.budgetMonthLabel.slice(0, 3) ? (
                          <span className="rounded border border-slate-200 bg-slate-50 px-1 py-px text-[9px] font-semibold tabular-nums text-slate-500">
                            {formatMonthAbbrevDisplay(row.budgetMonthLabel)}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`max-w-[13rem] truncate px-2 py-1.5 text-[11px] ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="truncate">{row.source}</span>
                      </span>
                    </TableCell>
                    <TableCell
                      className={`max-w-[8rem] truncate px-2 py-1.5 text-[11px] ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                          {renderCategoryGlyph(
                            activityCategoryOverrides[row.id] ?? row.category,
                            row.flow,
                            activeCategories,
                          )}
                        <span className="truncate">
                          {activityCategoryOverrides[row.id] ?? row.category}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell
                      className={`px-2 py-1.5 text-right text-[11px] tabular-nums ${amountInter.className} ${
                        row.flow === "Income" ? "text-emerald-700" : row.flow === "Transfer" ? "text-slate-500" : "text-slate-700"
                      }`}
                    >
                      {row.flow === "Income" ? "+" : row.flow === "Transfer" ? "" : "-"}{fmtAmount(row.actual)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2 border-t border-slate-100 pt-2 text-center">
              <p className="inline-flex items-baseline gap-1.5">
                <span className={`text-sm font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>
                  {visibleActivityRows.length}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {showAllActivityRows
                    ? "Transactions this month"
                    : `of ${activityRows.length} transactions this month`}
                </span>
              </p>
              {hasMoreActivityRows ? (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllActivityRows((prev) => !prev)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] underline-offset-2 hover:underline"
                  >
                    {showAllActivityRows ? (
                      <>
                        Show less
                        <ChevronUp className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                      </>
                    ) : (
                      <>
                        Show all
                        <ChevronDown className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
            </>
          )}
          </div>
        </section>
      </div>

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
                  aria-labelledby="full-month-activity-title"
                  className="flex w-full min-w-0 flex-col"
                >
                  <div
                    className={cn(
                      "flex flex-col overflow-hidden rounded-sm",
                      cardShellClass,
                    )}
                  >
            <header
              className={cn(cardHeaderClass, "shrink-0 rounded-t-sm px-3 sm:px-4")}
            >
              <div className="relative flex min-w-0 items-center pr-10">
                <h2 id="full-month-activity-title" className={cardTitleClass}>
                  {monthLongNameFromLabel(selectedMonth)} Activity
                </h2>
                <button
                  type="button"
                  onClick={() => setFullMonthActivityOpen(false)}
                  className={cn(
                    "absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm transition-colors",
                    isLabSoftSlate || isSample
                      ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      : "border border-white/30 bg-white/10 text-white hover:bg-white/20",
                  )}
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
                  htmlFor="full-activity-account"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Account
                </label>
                <Select
                  value={fullActivityAccountFilter}
                  onValueChange={setFullActivityAccountFilter}
                >
                  <SelectTrigger
                    id="full-activity-account"
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
                  htmlFor="full-activity-category"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Category (living expenses)
                </label>
                <Select
                  value={fullActivityCategoryFilter}
                  onValueChange={setFullActivityCategoryFilter}
                >
                  <SelectTrigger
                    id="full-activity-category"
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
                  htmlFor="full-activity-search"
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Search
                </label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    id="full-activity-search"
                    value={fullActivitySearch}
                    onChange={(e) => setFullActivitySearch(e.target.value)}
                    placeholder="Description, merchant…"
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
                <Table className="min-w-[64rem] max-w-full text-[11px]">
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Date
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Posted
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Timeline
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Transaction
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Merchant
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Category
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Account
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Source
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Planned
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Actual
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </TableHead>
                    <TableHead className="h-8 whitespace-nowrap px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Transfer to
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFullMonthActivityRows.map((row) => {
                    const displayCategory = activityCategoryOverrides[row.id] ?? row.category
                    const budgetMonth =
                      activityBudgetMonthOverrides[row.id] ?? row.budgetMonthLabel ?? selectedMonth
                    return (
                      <TableRow
                        key={row.id}
                        className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"
                        tabIndex={0}
                        role="button"
                        onClick={() => {
                          setFullMonthActivityOpen(false)
                          openActivityDetails(row)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setFullMonthActivityOpen(false)
                            openActivityDetails(row)
                          }
                        }}
                      >
                        <TableCell
                          className={`whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums ${
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          <span className="inline-flex flex-wrap items-center gap-1.5 leading-tight">
                            <span>{row.dateLabel}</span>
                            {row.postedDateLabel &&
                            budgetMonth &&
                            row.postedDateLabel.slice(0, 3) !== budgetMonth.slice(0, 3) ? (
                              <span className="rounded border border-slate-200 bg-slate-50 px-1 py-px text-[9px] font-semibold tabular-nums text-slate-500">
                                {formatMonthAbbrevDisplay(budgetMonth)}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums text-slate-600">
                          {row.postedDateLabel ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-700">
                          {monthLongNameFromLabel(budgetMonth)}
                        </TableCell>
                        <TableCell
                          className={`max-w-[14rem] truncate px-2 py-1.5 text-[11px] ${
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-700"
                          }`}
                        >
                          {row.source}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate px-2 py-1.5 text-[11px] text-slate-600">
                          {row.merchant}
                        </TableCell>
                        <TableCell
                          className={`max-w-[10rem] truncate px-2 py-1.5 text-[11px] ${
                            row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {renderCategoryGlyph(displayCategory, row.flow, activeCategories)}
                            <span className="truncate">{displayCategory}</span>
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate px-2 py-1.5 text-[11px] text-slate-700">
                          {row.accountLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-600">
                          {row.sourceType === "bank_import" ? "Imported" : "Manual"}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap px-2 py-1.5 text-right text-[11px] tabular-nums ${amountInter.className} text-slate-700`}
                        >
                          {fmtAmount(row.planned)}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap px-2 py-1.5 text-right text-[11px] tabular-nums ${amountInter.className} ${
                            row.flow === "Income"
                              ? "text-emerald-700"
                              : row.flow === "Transfer"
                                ? "text-slate-500"
                                : "text-slate-700"
                          }`}
                        >
                          {row.flow === "Income" ? "+" : row.flow === "Transfer" ? "" : "-"}
                          {fmtAmount(row.actual)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-600">
                          {row.status === "Processing" ? "Pending" : row.status}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate px-2 py-1.5 text-[11px] text-slate-600">
                          {row.flow === "Transfer" ? row.transferToAccountLabel ?? "Linked Account" : "—"}
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
        nextMonth={MONTH_LABELS[(monthIndexFromLabel(selectedMonth) ?? 0 + 1) % 12] ? monthLongNameFromLabel(MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12]) : "Next Month"}
        startingFunds={STARTING_FUNDS}
        totalExpenses={isReadyToCashOut ? totals.spent : totals.budget + totals.overage}
        cashoutAmount={isReadyToCashOut ? STARTING_FUNDS - totals.spent : expectedNetCashflow}
        currentStashAmount={2450} // In a real app this would come from the global stash state
        isReadyToCashOut={isReadyToCashOut}
      />
    </div>
  )
}
