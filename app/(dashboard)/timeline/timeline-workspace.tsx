"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  CircleDollarSign,
  Lock,
  Wallet,
} from "lucide-react"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { CATEGORY_GLYPH, RoadmapCategoriesGrid } from "@/components/roadmap-categories-grid"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
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
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import { MOCK_EXPECTED_INCOME, MOCK_TIMELINE_CATEGORIES } from "@/lib/timeline-roadmap-data"
import { cn } from "@/lib/utils"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
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
  flow: "Income" | "Expense"
  planned: number
  actual: number
  status: "Posted" | "Processing" | "Over"
  budgetMonthLabel?: string
  transferToAccountLabel?: string
}

const DEFAULT_ACTIVITY_ROW_LIMIT = 14

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
      <CircleDollarSign
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
    Record<string, Partial<Pick<ActivityRow, "dateLabel" | "source" | "accountLabel" | "actual">>>
  >({})
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [activityCategoryDraft, setActivityCategoryDraft] = useState("")
  const [activityBudgetMonthDraft, setActivityBudgetMonthDraft] = useState<MonthLabel>(selectedMonth)
  const [activityDateDraft, setActivityDateDraft] = useState("")
  const [activitySourceDraft, setActivitySourceDraft] = useState("")
  const [activityAccountDraft, setActivityAccountDraft] = useState("")
  const [activityAmountDraft, setActivityAmountDraft] = useState(0)
  const [isEditingActivityDetails, setIsEditingActivityDetails] = useState(false)
  const [showAllActivityRows, setShowAllActivityRows] = useState(false)
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false)
  
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

    return [...incomeRows, ...expenseRows]
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
    selectedMonth,
  ])
  const selectedActivity = useMemo(
    () => activityRows.find((row) => row.id === selectedActivityId) ?? null,
    [activityRows, selectedActivityId],
  )
  const visibleActivityRows = useMemo(
    () =>
      showAllActivityRows ? activityRows : activityRows.slice(0, DEFAULT_ACTIVITY_ROW_LIMIT),
    [activityRows, showAllActivityRows],
  )
  const hasMoreActivityRows = activityRows.length > DEFAULT_ACTIVITY_ROW_LIMIT
  const categoryOptions = useMemo(() => categories.map((cat) => cat.name), [categories])
  /** Income rows use a single placeholder label until income categories exist. */
  const activityCategorySelectOptions = useMemo(
    () => (selectedActivity?.flow === "Income" ? ["Income"] : categoryOptions),
    [selectedActivity?.flow, categoryOptions],
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
  const hasPendingActivityChanges = Boolean(
    selectedActivity &&
      (activityCategoryDraft !== selectedActivityCategory ||
        activityBudgetMonthDraft !== selectedActivityBudgetMonth ||
        (selectedActivityIsManual &&
          (activityDateDraft !== selectedActivity.dateLabel ||
            activitySourceDraft !== selectedActivity.source ||
            activityAccountDraft !== selectedActivity.accountLabel ||
            activityAmountDraft !== selectedActivity.actual))),
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
    ? "text-sm font-semibold tracking-tight text-slate-800"
    : isLabSoftSlate
      ? "text-[15px] font-bold tracking-tight text-slate-500"
      : "text-sm font-semibold tracking-tight text-slate-50"
  const cardEditBtnClass = isSample
    ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-white/50 hover:text-slate-900 active:bg-white/70"
    : isLabSoftSlate
      ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-0.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] underline-offset-2 transition-colors hover:text-[#006BB3] hover:underline active:text-[#005a96]"
      : "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-200 transition-colors hover:bg-white/10 hover:text-sky-100 active:bg-white/15"
  const cardCancelBtnClass = isSample || isLabSoftSlate
    ? "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-700 transition-colors hover:bg-rose-100 hover:text-rose-800"
    : "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-200 transition-colors hover:bg-rose-300/20 hover:text-rose-100"
  const fmtAmount = (n: number) => `$${n.toLocaleString()}`

  useEffect(() => {
    setShowAllActivityRows(false)
  }, [selectedMonth])

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
    setIsEditingActivityDetails(false)
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
      setIsEditingActivityDetails(false)
    }
  }

  const saveActivityDetails = () => {
    if (!selectedActivity || !activityCategoryDraft || !activityBudgetMonthDraft) return
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
    setIsEditingActivityDetails(false)
  }

  const cancelActivityEdit = () => {
    if (!selectedActivity) return
    setActivityCategoryDraft(selectedActivityCategory)
    setActivityBudgetMonthDraft(selectedActivityBudgetMonth)
    setActivityDateDraft(selectedActivity.dateLabel)
    setActivitySourceDraft(selectedActivity.source)
    setActivityAccountDraft(selectedActivity.accountLabel)
    setActivityAmountDraft(selectedActivity.actual)
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
      {(isEditingBudgets || isEditingIncome) && (
        <div className="pointer-events-none fixed inset-0 z-10 bg-slate-900/20" />
      )}
      <div className={monthStripWrapClass}>
        <MonthStrip
          value={selectedMonth}
          onValueChange={setSelectedMonth}
          className={monthStripClass}
        />
      </div>

      <div className={`flex min-w-0 flex-col ${layoutGapClass} px-4 pb-4 pt-2 lg:flex-row lg:items-start`}>
        <div className="relative flex w-full min-w-0 max-w-[min(100%,40rem)] shrink-0 flex-col gap-4 lg:max-w-[min(100%,50%)]">
        <div className="relative">
        <section
          className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border shadow-sm transition-opacity ${
            isEditingBudgets
              ? `${isSample ? "bg-stone-50/75" : "bg-white"} z-20 border-[#0087D2]/55 ring-1 ring-[#0087D2]/25`
              : cardShellClass
          } ${
            isEditingIncome ? "opacity-45" : "opacity-100"
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
                    <Link href="/roadmap" className="text-[#0087D2] underline-offset-2 hover:underline">
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
          editMode={isEditingIncome}
          muted={isEditingBudgets}
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
          className={`flex min-h-[12rem] min-w-0 flex-1 flex-col overflow-hidden rounded-sm border shadow-sm transition-opacity ${
            cardShellClass
          } ${isEditingBudgets || isEditingIncome ? "opacity-45" : "opacity-100"}`}
          aria-labelledby="timeline-activity-heading"
        >
          <header className={cardHeaderClass}>
            <h2
              id="timeline-activity-heading"
              className={cardTitleClass}
            >
              March Activity
            </h2>
          </header>
          <div className="min-h-0 flex-1 p-2">
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
                      <span className="inline-flex flex-col leading-tight">
                        <span>{row.dateLabel}</span>
                        {row.postedDateLabel &&
                        row.budgetMonthLabel &&
                        row.postedDateLabel.slice(0, 3) !== row.budgetMonthLabel.slice(0, 3) ? (
                          <span className="text-[9px] font-medium text-slate-400">
                            Applied to {row.budgetMonthLabel.slice(0, 3)}
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
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {row.flow === "Income" ? "+" : "-"}{fmtAmount(row.actual)}
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
          </div>
        </section>
      </div>
      <Dialog open={Boolean(selectedActivity)} onOpenChange={closeActivityDetails}>
        <DialogContent className="w-full max-w-2xl gap-0 border-slate-200 bg-white p-0 shadow-xl sm:max-w-2xl">
          <div className="bg-white px-5 pb-1 pt-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold tracking-tight text-slate-800">
                Transaction Details
              </DialogTitle>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {selectedActivity?.sourceType === "bank_import" ? "Imported from bank" : "User entered"}
              </span>
              {selectedActivity && selectedActivity.status !== "Posted" ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                  {selectedActivity.status === "Processing" ? "Pending" : selectedActivity.status}
                </span>
              ) : null}
            </div>
          </div>
          {selectedActivity ? (
            <div className="space-y-4 px-5 pb-5 pt-1">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2">
                  {/* Row 1: date | transaction | amount */}
                  <div className="pr-10 text-[11px] font-medium tabular-nums text-slate-500">
                    {isEditingActivityDetails && selectedActivityIsManual ? (
                      <input
                        type="text"
                        value={activityDateDraft}
                        onChange={(e) => setActivityDateDraft(e.target.value)}
                        className="h-7 w-[4.75rem] rounded-sm border border-slate-300 bg-white px-1.5 text-[11px] text-slate-700"
                      />
                    ) : (
                      selectedActivity.postedDateLabel ?? "—"
                    )}
                  </div>
                  <div className="min-w-0">
                    {isEditingActivityDetails && selectedActivityIsManual ? (
                      <input
                        type="text"
                        value={activitySourceDraft}
                        onChange={(e) => setActivitySourceDraft(e.target.value)}
                        className="h-8 w-full rounded-sm border border-slate-300 bg-white px-2 text-[14px] font-semibold text-slate-800"
                      />
                    ) : (
                      <p className="truncate text-[15px] font-semibold tracking-tight text-slate-800">
                        {selectedActivity.source}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    {isEditingActivityDetails && selectedActivityIsManual ? (
                      <input
                        type="number"
                        min={0}
                        value={activityAmountDraft}
                        onChange={(e) => setActivityAmountDraft(Math.max(0, Number(e.target.value) || 0))}
                        className={`h-8 w-[6.5rem] rounded-sm border border-slate-300 bg-white px-2 text-right text-[14px] font-semibold text-slate-800 ${amountInter.className}`}
                      />
                    ) : (
                      <p
                        className={`text-[1.05rem] font-semibold tabular-nums ${amountInter.className} ${
                          selectedActivity.flow === "Income" ? "text-emerald-700" : "text-slate-800"
                        }`}
                      >
                        {selectedActivity.flow === "Income" ? "+" : "-"}
                        {fmtAmount(selectedActivity.actual)}
                      </p>
                    )}
                  </div>

                  {/* Row 2: timeline under date | category | account */}
                  <div className="flex flex-col gap-0.5 pr-10">
                    {isEditingActivityDetails ? (
                      <Select
                        value={activityBudgetMonthDraft}
                        onValueChange={(value) => setActivityBudgetMonthDraft(value as MonthLabel)}
                      >
                        <SelectTrigger className="h-6 w-fit min-w-0 max-w-[9rem] rounded-md border-slate-200 bg-white px-2 text-left text-[11px] font-medium text-slate-500 [&>span]:truncate">
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
                                  <Lock className="h-3 w-3 shrink-0 text-slate-400 stroke-[1.8]" aria-hidden />
                                ) : null}
                                <span>{option.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500">
                        {monthLongNameFromLabel(activityBudgetMonthDraft)} Timeline
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 w-[12rem] max-w-full">
                    {isEditingActivityDetails && selectedActivity.flow === "Expense" ? (
                      <Select value={activityCategoryDraft} onValueChange={setActivityCategoryDraft}>
                        <SelectTrigger className="h-7 rounded-md border-slate-300 bg-white text-left text-[11px] text-slate-700">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityCategorySelectOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              <span className="inline-flex items-center gap-1.5">
                                {renderCategoryGlyph(option, selectedActivity.flow, activeCategories, {
                                  alwaysVisible: true,
                                })}
                                <span>{option}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="inline-flex max-w-full items-center gap-1.5 truncate text-[11px] text-slate-500">
                        {renderCategoryGlyph(activityCategoryDraft, selectedActivity.flow, activeCategories, {
                          alwaysVisible: true,
                        })}
                        <span className="truncate">{activityCategoryDraft}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-end">
                    {isEditingActivityDetails && selectedActivityIsManual ? (
                      <input
                        type="text"
                        value={activityAccountDraft}
                        onChange={(e) => setActivityAccountDraft(e.target.value)}
                        className="h-auto border-0 bg-transparent p-0 text-right text-[10px] font-medium text-slate-400 shadow-none outline-none ring-0 focus-visible:ring-0"
                      />
                    ) : (
                      <p className="text-[10px] font-medium text-slate-400">{selectedActivityAccountDisplay}</p>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-2 pt-1">
                {!isEditingActivityDetails ? (
                  <>
                    <button
                      type="button"
                      onClick={() => closeActivityDetails(false)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingActivityDetails(true)}
                      className="rounded-md bg-[#0087D2] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#006BB3]"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelActivityEdit}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveActivityDetails}
                      disabled={!hasPendingActivityChanges}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        hasPendingActivityChanges
                          ? "bg-[#0087D2] text-white hover:bg-[#006BB3]"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                      }`}
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
      <div className="h-16 shrink-0" aria-hidden />
    </div>
  )
}
