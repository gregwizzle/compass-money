"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, Check, ChevronsUpDown, CirclePlus, FileText, Lock, Receipt, Zap } from "lucide-react"
import { CATEGORY_GLYPH } from "@/components/roadmap-categories-grid"
import { DottedLeaderRow } from "@/components/dotted-leader-row"
import { SettleUpModal } from "@/components/settle-up-modal"
import { TIMELINE_CREDIT_CYCLES } from "@/components/timeline-snapshot-cards"
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
import { amountInter } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  formatMonthStripTooltip,
  getMonthStripFlags,
  monthIndexFromLabel,
  monthLongNameFromIndex,
  monthLongNameFromLabel,
  type MonthLabel,
  type MonthStripFlags,
} from "@/lib/budget-month"
import {
  partitionBillsByPaid,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_EXPECTED_INCOME,
  SNAPSHOT_GLYPH_LOOKUP,
  SNAPSHOT_STARTING_FUNDS,
  type SnapshotActivityRow,
  type SnapshotBill,
  type SnapshotLivingLine,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH as LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import type { ExpectedIncomeLine, TimelineCategory } from "@/lib/timeline-roadmap-data"
import { cn } from "@/lib/utils"

const STASH_APPLIED_KEY = "stash:direct"
const STASH_INCOME_APPLIED_KEY = "income:stash"
const OTHER_INCOME_APPLIED_KEY = "income:other"
const TRANSFER_KEY = "transfer:general"

type FundedBySlot = "prev" | "current" | "next" | "stash"
type StatementMonthSlot = "prev" | "current" | "next"

export type LogbookActivitySave = {
  categoryId: string | null
  fromStash: boolean
  budgetMonthLabel: MonthLabel
  appliedToKey: string
  category: string
  flow: SnapshotActivityRow["flow"]
}

function fmtDollars(n: number) {
  return `$${Math.abs(n).toLocaleString()}`
}

function fmtCreditCardName(cardLabel: string, lastFour: string) {
  return `${cardLabel} · ${lastFour}`
}

function fmtCreditDueDisplay(dueDateLabel: string) {
  const parts = dueDateLabel.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase()
    return `${month} ${parts[1]}`
  }
  return dueDateLabel
}

function isStashAppliedKey(key: string) {
  return key === STASH_APPLIED_KEY || key.startsWith("stash:")
}

function statementSlotMonthIndex(slot: StatementMonthSlot, viewMonth: MonthLabel) {
  const viewIndex = monthIndexFromLabel(viewMonth) ?? 0
  if (slot === "prev") return (viewIndex + 11) % 12
  if (slot === "next") return (viewIndex + 1) % 12
  return viewIndex
}

function fundedStatementMonthOptions(viewMonth: MonthLabel) {
  const viewIndex = monthIndexFromLabel(viewMonth) ?? 0
  const prevMonth = MONTH_LABELS[(viewIndex + 11) % 12]
  const nextMonth = MONTH_LABELS[(viewIndex + 1) % 12]
  return [
    { value: "prev" as const, shortLabel: prevMonth },
    { value: "current" as const, shortLabel: viewMonth },
    { value: "next" as const, shortLabel: nextMonth },
  ]
}

function classNameForStatementMonthChipUnselected(flags: MonthStripFlags) {
  if (flags.isFuture) {
    return "border border-dashed border-slate-300 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-100 hover:text-orange-950"
  }
  if (flags.isArchived) {
    return "border border-slate-300 bg-white text-slate-400 hover:bg-slate-50"
  }
  return "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
}

function fundedByFromRow(row: SnapshotActivityRow, viewMonth: MonthLabel): FundedBySlot {
  if (row.fromStash) return "stash"
  if (row.budgetMonthLabel === viewMonth) return "current"
  const viewIndex = monthIndexFromLabel(viewMonth) ?? 0
  if (row.budgetMonthLabel === MONTH_LABELS[(viewIndex + 11) % 12]) return "prev"
  if (row.budgetMonthLabel === MONTH_LABELS[(viewIndex + 1) % 12]) return "next"
  return "current"
}

function applyFundedBySelection(slot: FundedBySlot, viewMonth: MonthLabel) {
  if (slot === "stash") return { budgetMonthLabel: viewMonth, fromStash: true }
  const viewIndex = monthIndexFromLabel(viewMonth) ?? 0
  if (slot === "prev") return { budgetMonthLabel: MONTH_LABELS[(viewIndex + 11) % 12]!, fromStash: false }
  if (slot === "next") return { budgetMonthLabel: MONTH_LABELS[(viewIndex + 1) % 12]!, fromStash: false }
  return { budgetMonthLabel: viewMonth, fromStash: false }
}

function flowFromAppliedKey(key: string): SnapshotActivityRow["flow"] {
  if (key === TRANSFER_KEY) return "Transfer"
  if (key.startsWith("income:")) return "Income"
  return "Expense"
}

function resolveAppliedLabel(key: string, incomeLines: ExpectedIncomeLine[], livingLines: SnapshotLivingLine[]) {
  if (key === TRANSFER_KEY) return "Transfer"
  if (isStashAppliedKey(key) || key === STASH_INCOME_APPLIED_KEY) return "My Stash"
  if (key === OTHER_INCOME_APPLIED_KEY) return "Other income"
  if (key.startsWith("income:")) {
    return incomeLines.find((line) => line.id === key.slice("income:".length))?.label ?? "Income"
  }
  if (key.startsWith("bill:")) {
    return SNAPSHOT_BILLS.find((bill) => bill.id === key.slice("bill:".length))?.listName ?? key
  }
  if (key.startsWith("living:")) {
    const id = key.slice("living:".length)
    return livingLines.find((line) => line.id === id)?.name ?? id
  }
  return key
}

function resolveCategory(key: string, livingLines: SnapshotLivingLine[]) {
  if (key === TRANSFER_KEY) return "Transfer"
  if (isStashAppliedKey(key)) return "Stash"
  if (key.startsWith("income:")) return "Income"
  if (key.startsWith("bill:")) return "Bills"
  if (key.startsWith("living:")) {
    const id = key.slice("living:".length)
    return livingLines.find((line) => line.id === id)?.name ?? ""
  }
  return ""
}

export function categoryIdFromActivitySave(appliedToKey: string, fromStash: boolean): string | null {
  if (fromStash) return "stash"
  if (appliedToKey.startsWith("living:")) return appliedToKey.slice("living:".length)
  if (appliedToKey.startsWith("bill:")) return appliedToKey
  if (appliedToKey.startsWith("reserve:")) return appliedToKey
  return null
}

function renderCategoryGlyph(
  displayCategory: string,
  flow: SnapshotActivityRow["flow"],
  roadmapCategories: TimelineCategory[],
) {
  if (displayCategory === "Stash") {
    return <Receipt className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-600" aria-hidden />
  }
  if (displayCategory === "Bills") {
    return <FileText className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-600" aria-hidden />
  }
  const matched = roadmapCategories.find((category) => category.name === displayCategory)
  if (matched) {
    const { Icon, className: iconClass } = CATEGORY_GLYPH[matched.glyph]
    return <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass)} aria-hidden />
  }
  if (flow === "Income") {
    return <CirclePlus className="h-4 w-4 shrink-0 stroke-[1.5] text-emerald-600" aria-hidden />
  }
  const { Icon, className: iconClass } = CATEGORY_GLYPH.vibe
  return <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass)} aria-hidden />
}

function renderAssignGlyph(appliedKey: string, livingLines: SnapshotLivingLine[]) {
  if (appliedKey.startsWith("living:")) {
    const id = appliedKey.slice("living:".length)
    if (id === "curveballs") {
      return (
        <span className="inline-flex w-4 justify-center text-[13px] leading-none" aria-hidden>
          ⚡
        </span>
      )
    }
    const glyph = LIVING_GLYPH[id]
    if (glyph) {
      return <glyph.Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", glyph.className)} aria-hidden />
    }
  }
  return renderCategoryGlyph(resolveCategory(appliedKey, livingLines), flowFromAppliedKey(appliedKey), SNAPSHOT_GLYPH_LOOKUP)
}

export function useLogbookCardModals({
  selectedMonth,
  activityRows,
  livingLines,
  billsTotal,
  expectedNet,
  unassignedSpent,
  onSaveActivity,
}: {
  selectedMonth: MonthLabel
  activityRows: SnapshotActivityRow[]
  livingLines: SnapshotLivingLine[]
  billsTotal: number
  expectedNet: number
  unassignedSpent: number
  onSaveActivity: (rowId: string, patch: LogbookActivitySave) => void
}) {
  const [selectedBill, setSelectedBill] = useState<SnapshotBill | null>(null)
  const [selectedLivingLine, setSelectedLivingLine] = useState<SnapshotLivingLine | null>(null)
  const [cashoutInfoOpen, setCashoutInfoOpen] = useState(false)
  const [settleUpOpen, setSettleUpOpen] = useState(false)
  const [creditAboutOpen, setCreditAboutOpen] = useState(false)
  const [selectedCreditCycleId, setSelectedCreditCycleId] = useState<string | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [activityFundedByDraft, setActivityFundedByDraft] = useState<FundedBySlot>("current")
  const [statementMonthSlot, setStatementMonthSlot] = useState<StatementMonthSlot>("current")
  const [activityAppliedToKeyDraft, setActivityAppliedToKeyDraft] = useState("")
  const [appliedToOpen, setAppliedToOpen] = useState(false)
  const prevActivityIdRef = useRef<string | null>(null)
  const prevFundedByRef = useRef<FundedBySlot | null>(null)

  const incomeLines = SNAPSHOT_EXPECTED_INCOME
  const { upcoming } = useMemo(() => partitionBillsByPaid(SNAPSHOT_AS_OF_DAY), [])
  const selectedActivity = activityRows.find((row) => row.id === selectedActivityId) ?? null
  const selectedCreditCycle = TIMELINE_CREDIT_CYCLES.find((cycle) => cycle.id === selectedCreditCycleId) ?? null
  const nextMonthLabel = monthLongNameFromLabel(MONTH_LABELS[((monthIndexFromLabel(selectedMonth) ?? 0) + 1) % 12]!)
  const livingOverageLines = livingLines
    .filter((line) => line.spent > line.target)
    .map((line) => ({ id: line.id, label: line.name, overage: line.spent - line.target }))
  const livingBudget = livingLines.reduce((sum, line) => sum + line.target, 0)
  const livingOverage = livingOverageLines.reduce((sum, line) => sum + line.overage, 0)

  const appliedToPickerItems = useMemo(() => {
    const billsAppliedToOptions = upcoming.map((bill) => ({
      key: `bill:${bill.id}`,
      label: bill.listName,
    }))
    if (activityAppliedToKeyDraft.startsWith("bill:")) {
      const id = activityAppliedToKeyDraft.slice("bill:".length)
      if (!billsAppliedToOptions.some((option) => option.key === activityAppliedToKeyDraft)) {
        const bill = SNAPSHOT_BILLS.find((item) => item.id === id)
        if (bill) billsAppliedToOptions.unshift({ key: `bill:${bill.id}`, label: bill.listName })
      }
    }
    return {
      scheduledIncome: incomeLines.map((line) => ({ key: `income:${line.id}`, label: line.label })),
      otherIncome: { key: OTHER_INCOME_APPLIED_KEY, label: "Other income" },
      livingItems: livingLines.map((line) => ({ key: `living:${line.id}`, label: line.name })),
      billsAppliedToOptions,
    }
  }, [activityAppliedToKeyDraft, incomeLines, livingLines, upcoming])

  useEffect(() => {
    if (selectedActivityId === prevActivityIdRef.current) return
    prevActivityIdRef.current = selectedActivityId
    if (!selectedActivityId) return
    const row = activityRows.find((item) => item.id === selectedActivityId)
    if (!row) return
    const fundedSlot = fundedByFromRow(row, selectedMonth)
    setActivityFundedByDraft(fundedSlot)
    setStatementMonthSlot(fundedSlot === "stash" ? "current" : fundedSlot)
    if (row.flow === "Expense" && row.fromStash) setActivityAppliedToKeyDraft(STASH_APPLIED_KEY)
    else if (row.flow === "Income" && row.fromStash) setActivityAppliedToKeyDraft(STASH_INCOME_APPLIED_KEY)
    else setActivityAppliedToKeyDraft(row.appliedToKey)
  }, [activityRows, selectedActivityId, selectedMonth])

  useEffect(() => {
    if (!selectedActivityId) prevFundedByRef.current = null
  }, [selectedActivityId])

  useEffect(() => {
    if (!selectedActivityId) return
    const row = activityRows.find((item) => item.id === selectedActivityId)
    if (!row) return
    if (row.flow !== "Expense" && row.flow !== "Income") {
      prevFundedByRef.current = activityFundedByDraft
      return
    }
    if (activityFundedByDraft === "stash") {
      setActivityAppliedToKeyDraft(row.flow === "Expense" ? STASH_APPLIED_KEY : STASH_INCOME_APPLIED_KEY)
      setAppliedToOpen(false)
    } else if (prevFundedByRef.current === "stash") {
      const key = row.appliedToKey
      if (row.flow === "Expense" && (isStashAppliedKey(key) || key === "")) setActivityAppliedToKeyDraft("")
      else if (row.flow === "Income" && (key === STASH_INCOME_APPLIED_KEY || key === "")) setActivityAppliedToKeyDraft("")
      else setActivityAppliedToKeyDraft(key)
    }
    prevFundedByRef.current = activityFundedByDraft
  }, [activityFundedByDraft, activityRows, selectedActivityId])

  const activityFlowDraft = flowFromAppliedKey(activityAppliedToKeyDraft)
  const stashExpenseModal = Boolean(selectedActivity && selectedActivity.flow === "Expense" && activityFundedByDraft === "stash")
  const stashIncomeModal = Boolean(selectedActivity && selectedActivity.flow === "Income" && activityFundedByDraft === "stash")
  const statementArchivedMonthModal = Boolean(
    selectedActivity &&
      activityFundedByDraft !== "stash" &&
      getMonthStripFlags(statementSlotMonthIndex(statementMonthSlot, selectedMonth), { budgetYear: DEFAULT_BUDGET_YEAR }).isArchived,
  )
  const selectedStatementMonthLongName = monthLongNameFromIndex(statementSlotMonthIndex(statementMonthSlot, selectedMonth))
  const hasPendingActivityChanges = Boolean(
    selectedActivity &&
      (activityFundedByDraft !== fundedByFromRow(selectedActivity, selectedMonth) ||
        (stashExpenseModal
          ? selectedActivity.fromStash === false || !isStashAppliedKey(selectedActivity.appliedToKey)
          : stashIncomeModal
            ? selectedActivity.fromStash === false || selectedActivity.appliedToKey !== STASH_INCOME_APPLIED_KEY
            : activityAppliedToKeyDraft !== selectedActivity.appliedToKey || activityFlowDraft !== selectedActivity.flow)),
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
    onSaveActivity(selectedActivityId, {
      categoryId: categoryIdFromActivitySave(appliedToKey, funded.fromStash),
      fromStash: funded.fromStash,
      budgetMonthLabel: funded.budgetMonthLabel,
      appliedToKey,
      category: stashExpenseSave || stashIncomeSave ? (stashExpenseSave ? "Stash" : "Income") : resolveCategory(appliedToKey, livingLines),
      flow: flowFromAppliedKey(appliedToKey),
    })
    setSelectedActivityId(null)
  }

  const dialogs: ReactNode = (
    <>
      <Dialog open={selectedBill !== null} onOpenChange={(open) => !open && setSelectedBill(null)}>
        <DialogContent className="max-w-md font-sans">
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
                  <p className="mb-2 text-[11px] text-slate-500">Jump to Accounts to record or complete payment.</p>
                  <Link href="/accounts" className="inline-flex text-[12px] font-semibold text-[#0087D2] underline-offset-2 hover:underline">
                    Pay from Accounts
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedLivingLine !== null} onOpenChange={(open) => !open && setSelectedLivingLine(null)}>
        <DialogContent className="max-w-md font-sans">
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
                  <p>{fmtDollars(selectedLivingLine.target - selectedLivingLine.spent)} left in envelope</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={cashoutInfoOpen} onOpenChange={setCashoutInfoOpen}>
        <DialogContent className="font-sans sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Expected Cashout</DialogTitle>
            <DialogDescription className="text-left text-[12px] leading-relaxed text-slate-600">
              Your &ldquo;Profit&rdquo; for the month. If all goes according to plan, this Cashout will be leftover
              money from the month that gets added to your STASH.
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3 text-[12px] text-slate-700 ${amountInter.className}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-600">Starting funds</span>
              <span className="font-medium tabular-nums text-slate-800">{fmtDollars(SNAPSHOT_STARTING_FUNDS)}</span>
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
                const glyph = LIVING_GLYPH[line.id]
                return (
                  <div key={line.id} className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex min-w-0 flex-1 flex-wrap items-baseline gap-1 text-slate-600">
                      <span>
                        − {line.label} <span className="text-slate-500">(overage)</span>
                      </span>
                      {glyph ? <glyph.Icon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", glyph.className)} aria-hidden /> : line.id === "curveballs" ? <span aria-hidden>⚡</span> : null}
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
                <span className="font-medium tabular-nums text-slate-800">−{fmtDollars(livingOverage)}</span>
              </div>
            ) : null}
            {unassignedSpent > 0 ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-slate-600">− Unassigned</span>
                <span className="tabular-nums text-rose-700">−{fmtDollars(unassignedSpent)}</span>
              </div>
            ) : null}
            <div className="border-t border-slate-200 pt-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-800">Expected cashout</span>
                <span className="font-semibold tabular-nums text-slate-800">{fmtDollars(expectedNet)}</span>
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

      <Dialog open={creditAboutOpen} onOpenChange={setCreditAboutOpen}>
        <DialogContent className="font-sans sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>About Credit Card Payments</DialogTitle>
          </DialogHeader>
          <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-600">
                Each card row represents a <span className="font-semibold">closed statement cycle</span>. The due date
                is when the issuer expects payment.
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
                  Reserved funds do not fully cover the minimum due yet. Choose how to fund the remaining amount in
                  the modal.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">Tip: click any card to manage funding for that cycle.</p>
            </div>
          </section>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCreditCycle} onOpenChange={(open) => !open && setSelectedCreditCycleId(null)}>
        <DialogContent className="font-sans sm:max-w-[560px]">
          {selectedCreditCycle ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Settle {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)}
                </DialogTitle>
              </DialogHeader>
              <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                {selectedCreditCycle.reservedPaymentFunds < selectedCreditCycle.minimumDue ? (
                  <div className="space-y-3">
                    <p className="text-[14px] font-semibold text-slate-700">
                      {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)} (
                      {selectedCreditCycle.cycleLabel})
                    </p>
                    <div className="space-y-1.5">
                      <DottedLeaderRow left={<span>Converted to Debt</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.newSpending)}</span>} />
                      <DottedLeaderRow left={<span>Reserved Payment Funds</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.reservedPaymentFunds)}</span>} />
                      <DottedLeaderRow left={<span>Minimum Due</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.minimumDue)}</span>} />
                    </div>
                    <div className="rounded border border-amber-200 bg-amber-50/50 px-3 py-2">
                      <p className="text-[11px] font-medium text-amber-900">
                        Your reserved funds do not cover the bank&apos;s minimum payment. Choose how to fund the remaining{" "}
                        {fmtDollars(Math.max(0, selectedCreditCycle.minimumDue - selectedCreditCycle.reservedPaymentFunds))}.
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link href="/accounts" className="inline-flex rounded bg-slate-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-slate-700">
                        Pay from {monthLongNameFromLabel(selectedMonth)} Income
                      </Link>
                      <Link href="/accounts" className="inline-flex rounded bg-slate-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-300">
                        Pay from My Stash
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[14px] font-semibold text-slate-700">
                      {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)} (
                      {selectedCreditCycle.cycleLabel})
                    </p>
                    <div className="space-y-1.5">
                      <DottedLeaderRow left={<span>New Spending</span>} right={<span className={`font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.newSpending)}</span>} />
                      <DottedLeaderRow left={<span>Reserved Payment Funds</span>} right={<span className={`font-semibold tabular-nums text-emerald-700 ${amountInter.className}`}>{fmtDollars(selectedCreditCycle.reservedPaymentFunds)}</span>} />
                    </div>
                    <div className="rounded border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium text-slate-600">
                        Your budget successfully secured these funds during cashout. Complete the bank transfer to{" "}
                        {fmtCreditCardName(selectedCreditCycle.cardLabel, selectedCreditCycle.lastFour)} to clear this cycle.
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link href="/accounts" className="inline-flex rounded bg-[#0087D2] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-[#00487A]">
                        Transfer Payment
                      </Link>
                    </div>
                    <p className={`text-[10px] font-medium text-slate-400 ${amountInter.className}`}>
                      Side note: Minimum due from issuer is {fmtDollars(selectedCreditCycle.minimumDue)} by{" "}
                      {fmtCreditDueDisplay(selectedCreditCycle.dueDateLabel)}.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivityId(null)}>
        <DialogContent className="font-sans sm:max-w-[540px]">
          {selectedActivity ? (
            <>
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
              </DialogHeader>
              <section className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Date</label>
                    <span className="text-[14px] font-medium tabular-nums text-slate-800">
                      {selectedActivity.dateLabel}, {DEFAULT_BUDGET_YEAR}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <span className="text-right text-[12px] font-medium text-slate-500" id="logbook-statement-slider-label">
                      Statement
                    </span>
                    <div className="flex min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-1.5" role="radiogroup" aria-labelledby="logbook-statement-slider-label">
                      <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
                        {fundedStatementMonthOptions(selectedMonth).map((option) => {
                          const monthSelected = activityFundedByDraft !== "stash" && statementMonthSlot === option.value
                          const slotFlags = getMonthStripFlags(statementSlotMonthIndex(option.value, selectedMonth), {
                            budgetYear: DEFAULT_BUDGET_YEAR,
                          })
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={monthSelected}
                              title={formatMonthStripTooltip(slotFlags, monthSelected)}
                              onClick={() => {
                                setStatementMonthSlot(option.value)
                                setActivityFundedByDraft(option.value)
                              }}
                              className={cn(
                                "min-w-[2.75rem] flex-1 cursor-pointer rounded-md px-2 py-1.5 text-center text-[12px] font-semibold tabular-nums transition-colors",
                                monthSelected
                                  ? "border border-transparent bg-[#0087D2] text-white shadow-sm hover:bg-[#006BB3]"
                                  : classNameForStatementMonthChipUnselected(slotFlags),
                              )}
                            >
                              <span className="flex items-center justify-center gap-1 leading-none">
                                {slotFlags.isArchived ? (
                                  <Lock className={cn("h-3 w-3 shrink-0 stroke-[1.5]", monthSelected ? "text-white" : "text-slate-400")} aria-hidden />
                                ) : null}
                                <span className={slotFlags.isArchived ? "italic" : undefined}>{option.shortLabel}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <span className="shrink-0 px-0.5 text-[12px] italic text-slate-500" aria-hidden>
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
                        <Receipt className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", activityFundedByDraft === "stash" ? "text-white" : "text-slate-600")} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {stashExpenseModal ? (
                    <p className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                      This expense will be paid for directly from your Stash funds. It will not affect your monthly bills, living funds, or final Cashout.
                    </p>
                  ) : stashIncomeModal ? (
                    <p className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                      This income will be credited directly to your Stash. It will not be assigned to scheduled pay or other income lines for this budget month.
                    </p>
                  ) : (
                    <>
                      {statementArchivedMonthModal ? (
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                          <p className="font-semibold text-slate-700">Amending the {selectedStatementMonthLongName} Statement</p>
                          <p className="mt-1.5">An amendment will be added to your {selectedStatementMonthLongName} Statement.</p>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                        <label className="text-right text-[12px] font-medium text-slate-500">Assign To</label>
                        <Popover open={appliedToOpen} onOpenChange={setAppliedToOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="h-8 w-full justify-between border-slate-300 px-2 py-1 text-[13px] font-medium text-slate-800 shadow-none hover:bg-slate-50">
                              {activityAppliedToKeyDraft ? (
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  {renderAssignGlyph(activityAppliedToKeyDraft, livingLines)}
                                  <span className="truncate">{resolveAppliedLabel(activityAppliedToKeyDraft, incomeLines, livingLines)}</span>
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
                                <CommandEmpty className="py-2 text-center text-[12px] text-slate-500">No match.</CommandEmpty>
                                {selectedActivity.flow === "Income" ? (
                                  <>
                                    <CommandGroup heading="Scheduled pay">
                                      {appliedToPickerItems.scheduledIncome.map((option) => (
                                        <CommandItem key={option.key} value={`${option.label} ${option.key}`} onSelect={() => { setActivityAppliedToKeyDraft(option.key); setAppliedToOpen(false) }} className="text-[13px]">
                                          <Check className={cn("mr-2 h-4 w-4", activityAppliedToKeyDraft === option.key ? "opacity-100" : "opacity-0")} />
                                          {renderCategoryGlyph("Income", "Income", SNAPSHOT_GLYPH_LOOKUP)}
                                          <span className="ml-2">{option.label}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                    <CommandGroup heading="Other income">
                                      <CommandItem value={`${appliedToPickerItems.otherIncome.label} ${appliedToPickerItems.otherIncome.key}`} onSelect={() => { setActivityAppliedToKeyDraft(appliedToPickerItems.otherIncome.key); setAppliedToOpen(false) }} className="text-[13px]">
                                        <Check className={cn("mr-2 h-4 w-4", activityAppliedToKeyDraft === appliedToPickerItems.otherIncome.key ? "opacity-100" : "opacity-0")} />
                                        {renderCategoryGlyph("Income", "Income", SNAPSHOT_GLYPH_LOOKUP)}
                                        <span className="ml-2">{appliedToPickerItems.otherIncome.label}</span>
                                      </CommandItem>
                                    </CommandGroup>
                                  </>
                                ) : (
                                  <>
                                    <CommandGroup heading="Living funds">
                                      {appliedToPickerItems.livingItems.map((option) => (
                                        <CommandItem key={option.key} value={`${option.label} ${option.key}`} onSelect={() => { setActivityAppliedToKeyDraft(option.key); setAppliedToOpen(false) }} className="text-[13px]">
                                          <Check className={cn("mr-2 h-4 w-4", activityAppliedToKeyDraft === option.key ? "opacity-100" : "opacity-0")} />
                                          {renderAssignGlyph(option.key, livingLines)}
                                          <span className="ml-2">{option.label}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                    {appliedToPickerItems.billsAppliedToOptions.length > 0 ? (
                                      <CommandGroup heading="Bills">
                                        {appliedToPickerItems.billsAppliedToOptions.map((option) => (
                                          <CommandItem key={option.key} value={`${option.label} ${option.key}`} onSelect={() => { setActivityAppliedToKeyDraft(option.key); setAppliedToOpen(false) }} className="text-[13px]">
                                            <Check className={cn("mr-2 h-4 w-4", activityAppliedToKeyDraft === option.key ? "opacity-100" : "opacity-0")} />
                                            {renderCategoryGlyph("Bills", "Expense", SNAPSHOT_GLYPH_LOOKUP)}
                                            <span className="ml-2">{option.label}</span>
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
                    </>
                  )}
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Amount</label>
                    <span className={`text-[15px] font-semibold tabular-nums ${amountInter.className} ${selectedActivity.flow === "Income" ? "text-emerald-700" : "text-slate-800"}`}>
                      {selectedActivity.flow === "Income" ? "+" : "-"}
                      {fmtDollars(selectedActivity.actual)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Description</label>
                    <span className="block truncate text-[15px] font-semibold tracking-tight text-slate-800">{selectedActivity.source}</span>
                  </div>
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Account</label>
                    <span className="block truncate text-[14px] font-medium text-slate-800">{selectedActivity.accountLabel ?? "Linked Checking"}</span>
                  </div>
                </div>
              </section>
              <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-200 pt-3">
                <button type="button" onClick={() => setSelectedActivityId(null)} className="cursor-pointer rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveActivityDetails}
                  disabled={!hasPendingActivityChanges || (!stashExpenseModal && !stashIncomeModal && !activityAppliedToKeyDraft.trim())}
                  className={cn(
                    "rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
                    hasPendingActivityChanges && (stashExpenseModal || stashIncomeModal || activityAppliedToKeyDraft.trim())
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

      <SettleUpModal
        isOpen={settleUpOpen}
        onOpenChange={setSettleUpOpen}
        currentMonth={monthLongNameFromLabel(selectedMonth)}
        nextMonth={nextMonthLabel}
        startingFunds={SNAPSHOT_STARTING_FUNDS}
        totalExpenses={SNAPSHOT_STARTING_FUNDS - expectedNet}
        cashoutAmount={expectedNet}
        currentStashAmount={4200}
        isReadyToCashOut={false}
      />
    </>
  )

  return {
    openBill: setSelectedBill,
    openLiving: setSelectedLivingLine,
    openCashoutInfo: () => setCashoutInfoOpen(true),
    openSettleUp: () => setSettleUpOpen(true),
    openCreditAbout: () => setCreditAboutOpen(true),
    openCreditCycle: setSelectedCreditCycleId,
    openActivity: setSelectedActivityId,
    dialogs,
  }
}
