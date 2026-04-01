"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, CircleDollarSign, RefreshCw, Wallet } from "lucide-react"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { CATEGORY_GLYPH } from "@/components/roadmap-categories-grid"
import { TimelineIncomeTankCard } from "@/components/timeline-income-tank-card"
import { SettleUpModal } from "@/components/settle-up-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import type { ExpectedIncomeLine } from "@/lib/timeline-roadmap-data"
import {
  getSnapshotExpectedCashout,
  partitionBillsByPaid,
  SNAPSHOT_ACTIVITY_ROWS,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_EXPECTED_INCOME,
  SNAPSHOT_GLYPH_LOOKUP,
  SNAPSHOT_LIVING,
  SNAPSHOT_STARTING_FUNDS,
  SNAPSHOT_UPCOMING_PREVIEW,
} from "@/lib/snapshot-demo-data"
import { SNAPSHOT_LIVING_GLYPH } from "@/lib/snapshot-living-glyphs"
import { cn } from "@/lib/utils"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  monthIndexFromLabel,
  monthLongNameFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"

type IncomeDraftItem = ExpectedIncomeLine & { markedForDeletion?: boolean }

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

const categoryGlyphClass =
  "shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-within:opacity-70"

function renderCategoryGlyph(
  displayCategory: string,
  flow: "Income" | "Expense" | "Transfer",
  roadmapCategories: TimelineCategory[],
  options?: { alwaysVisible?: boolean },
) {
  const glyphClass = options?.alwaysVisible ? "shrink-0 opacity-100" : categoryGlyphClass
  if (displayCategory === "Bills") {
    return (
      <Check
        className={cn("h-4 w-4 shrink-0 stroke-[2] text-emerald-600", glyphClass)}
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
      <CircleDollarSign
        className={cn("h-4 w-4 shrink-0 stroke-[1.5]", "text-emerald-600", glyphClass)}
        aria-hidden
      />
    )
  }
  const { Icon, className: iconClass } = CATEGORY_GLYPH.vibe
  return <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass, glyphClass)} aria-hidden />
}

function DottedLeaderRow({
  left,
  right,
  afterRight,
}: {
  left: React.ReactNode
  right: React.ReactNode
  afterRight?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-0.5 text-[12px] leading-snug">
      <div className="min-w-0 shrink font-semibold text-slate-700">{left}</div>
      <div
        className="min-h-[1em] min-w-[2rem] flex-1 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
        aria-hidden
      />
      <div className="shrink-0 text-right text-[11px] text-slate-500">{right}</div>
      {afterRight ? <div className="shrink-0">{afterRight}</div> : null}
    </div>
  )
}

/**
 * Snapshot route: Bills + Living envelopes + income dock + activity (demo data).
 */
export function SnapshotWorkspace() {
  const { selectedMonth, setSelectedMonth } = useMonthSelection()
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
  const [roadmapCardMinHeight, setRoadmapCardMinHeight] = useState<number>(0)
  const isReadyToCashOut = false

  const monthShort = selectedMonth.slice(0, 3)
  const { paid, upcoming, paidTotal } = useMemo(
    () => partitionBillsByPaid(SNAPSHOT_AS_OF_DAY),
    [],
  )
  const sortedActivityRows = useMemo(() => {
    const toSortableDate = (value: string) => {
      const d = new Date(`${value}, 2026`)
      return Number.isNaN(d.getTime()) ? -1 : d.getTime()
    }
    const clearedIncomeRows = incomeItems
      .filter((line) => line.cleared && !line.markedForDeletion)
      .map((line) => ({
        id: `income-${line.id}`,
        dateLabel: line.expectedDate,
        source: line.label,
        category: "Income",
        flow: "Income" as const,
        actual: line.amount,
      }))
    return [...SNAPSHOT_ACTIVITY_ROWS, ...clearedIncomeRows].sort(
      (a, b) => toSortableDate(b.dateLabel) - toSortableDate(a.dateLabel),
    )
  }, [incomeItems])
  const visibleActivityRows = useMemo(() => sortedActivityRows.slice(0, 10), [sortedActivityRows])
  const selectedActivity = useMemo(
    () => sortedActivityRows.find((row) => row.id === selectedActivityId) ?? null,
    [selectedActivityId, sortedActivityRows],
  )
  const paidCount = paid.length
  const { expectedNet, totalBudget, livingOverage } = useMemo(() => getSnapshotExpectedCashout(), [])
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

  return (
    <div className="relative flex flex-col">
      <div className={monthStripWrapClass}>
        <MonthStrip value={selectedMonth} onValueChange={setSelectedMonth} className={monthStripClass} />
      </div>

      <div className={`flex min-w-0 flex-col ${layoutGapClass} px-4 pb-4 pt-2 lg:flex-row lg:items-start`}>
        <div className="relative flex w-full min-w-0 max-w-[min(100%,40rem)] shrink-0 flex-col gap-4 lg:max-w-[min(100%,50%)]">
          <section
            ref={roadmapCardRef}
            className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border shadow-sm ${cardShellClass}`}
            aria-labelledby="snapshot-budget-heading"
          >
            <header className={cardHeaderClass}>
              <div className="flex min-w-0 items-center gap-2">
                <h2 id="snapshot-budget-heading" className={cardTitleClass}>
                  {monthLongNameFromLabel(selectedMonth)} Roadmap
                </h2>
                <button
                  type="button"
                  className="ml-auto text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                  onClick={() => {
                    /* Overlay TBD */
                  }}
                >
                  Expand
                </button>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[12px] font-semibold text-slate-700">Bills</h3>
                </div>
                <div className="mb-2 pl-3 sm:pl-4">
                  <p className="inline-flex w-full items-baseline gap-1 text-[11px] text-slate-600">
                    <span className="font-medium">{monthLongNameFromLabel(selectedMonth)}</span>
                    <span
                      className="min-h-[1em] min-w-[1.5rem] flex-1 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
                      aria-hidden
                    />
                    <span className="font-medium italic tabular-nums">{paidCount} Paid Bills</span>
                    <span
                      className="min-h-[1em] min-w-[1.5rem] flex-1 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
                      aria-hidden
                    />
                    <span className={`font-medium tabular-nums text-slate-500 ${amountInter.className}`}>
                      {fmtDollars(paidTotal)}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      TOTAL
                    </span>
                    <span className="inline-flex w-[2.25rem] justify-center text-emerald-600" aria-hidden>
                      ✓
                    </span>
                  </p>
                </div>
                <ul className="space-y-2 pl-3 sm:pl-4">
                  {upcomingPreview.map((b) => (
                    <li key={b.id}>
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
                              <Link
                                href="/accounts"
                                className="text-[9px] font-semibold uppercase tracking-wide text-[#0087D2] underline-offset-2 hover:underline"
                              >
                                Pay
                              </Link>
                            ) : (
                              <RefreshCw
                                className="h-3 w-3 stroke-[1.8] text-slate-400"
                                aria-label="Auto drafted"
                                title="Auto drafted"
                              />
                            )}
                          </span>
                        }
                      />
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

              {/* Living expenses */}
              <div className="px-2.5 sm:px-3">
                <h3 className="mb-2 text-[12px] font-semibold text-slate-700">
                  Living Expenses
                </h3>
                <div className="space-y-2.5 pl-3 sm:pl-4">
                  {SNAPSHOT_LIVING.map((line) => {
                    const left = line.target - line.spent
                    const isOver = left < 0
                    const overAmt = isOver ? Math.abs(left) : 0
                    const leftAmt = !isOver ? left : 0
                    const g = SNAPSHOT_LIVING_GLYPH[line.id]
                    const GIcon = g?.Icon
                    return (
                      <DottedLeaderRow
                        key={line.id}
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
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-baseline justify-center gap-2">
                  <p className="text-[15px] font-medium italic text-slate-500">Expected Cashout</p>
                  <div
                    className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                  >
                    {fmtCurrencyPlain(expectedNet)}
                  </div>
                  <p
                    className={`ml-1 inline-flex items-center gap-1.5 text-xl font-semibold italic text-orange-700/90 ${myJourneyNav.className}`}
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
                    <Wallet className="ml-1 h-4 w-4 shrink-0 stroke-[1.7] text-orange-700/80" aria-hidden />
                  </p>
                </div>
              </div>
            </div>
          </section>

          <TimelineIncomeTankCard
            items={isEditingIncome ? incomeEditDraft : incomeItems}
            editMode={isEditingIncome}
            muted={false}
            elevated={isEditingIncome}
            headerTheme="softSlate"
            onAmountChange={handleIncomeAmountChange}
            onLabelChange={handleIncomeLabelChange}
            onStartEdit={startIncomeEdit}
            onSaveEdit={saveIncomeEdit}
            onCancelEdit={cancelIncomeEdit}
            onToggleDelete={handleIncomeToggleDelete}
            onAddItem={addIncomeItem}
          />

        </div>

        <div className="flex min-w-0 flex-1 flex-col">
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
                <h2 id="snapshot-activity-heading" className={cardTitleClass}>
                  Recent Activity
                </h2>
                <Link
                  href="/activity"
                  className="ml-auto text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
                >
                  View All
                </Link>
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
                    className="group cursor-pointer border-slate-100 transition-colors hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"
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
                      className={`px-2 py-1.5 text-[11px] tabular-nums ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {row.dateLabel}
                    </TableCell>
                    <TableCell
                      className={`max-w-[13rem] truncate px-2 py-1.5 text-[11px] ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {row.source}
                    </TableCell>
                    <TableCell
                      className={`max-w-[8rem] truncate px-2 py-1.5 text-[11px] ${
                        row.flow === "Income" ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {renderCategoryGlyph(row.category, row.flow, SNAPSHOT_GLYPH_LOOKUP)}
                        <span className="truncate">{row.category}</span>
                      </span>
                    </TableCell>
                    <TableCell
                      className={`px-2 py-1.5 text-right text-[11px] tabular-nums ${amountInter.className} ${
                        row.flow === "Income"
                          ? "text-emerald-700"
                          : row.flow === "Transfer"
                            ? "text-slate-500"
                            : "text-slate-700"
                      }`}
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
          <div className="mt-3 mb-2 flex flex-col items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setIsSettleUpOpen(true)}
              className={`group inline-flex cursor-pointer items-center justify-center gap-2.5 rounded px-6 py-3 shadow-sm transition-colors duration-300 ${
                isReadyToCashOut
                  ? "bg-[#0087D2] text-white hover:bg-[#00487A] active:bg-[#00365D]"
                  : "bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-500"
              }`}
            >
              <span className="text-[13px] font-bold uppercase tracking-wide">
                Cash Out {monthLongNameFromLabel(selectedMonth)}
              </span>
              <span
                className={`pb-0.5 text-[20px] font-black leading-none transition-colors duration-300 ${
                  isReadyToCashOut
                    ? "text-amber-400 group-hover:text-amber-200"
                    : "text-slate-300 group-hover:text-slate-400"
                }`}
                aria-hidden
              >
                &raquo;
              </span>
              <span
                className={`text-[17px] font-medium italic transition-colors ${myJourneyNav.className} ${
                  isReadyToCashOut
                    ? "text-white group-hover:text-white"
                    : "text-slate-500 group-hover:text-slate-600"
                }`}
              >
                Advance to {nextMonthLabel}
              </span>
            </button>
            {!isReadyToCashOut ? (
              <span className="mt-1 text-[11px] font-medium italic text-slate-500">
                Unlocks on {nextMonthLabel} 1st
              </span>
            ) : null}
          </div>
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
                    <label className="text-right text-[12px] font-medium text-slate-500">Category</label>
                    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-800">
                      {renderCategoryGlyph(selectedActivity.category, selectedActivity.flow, SNAPSHOT_GLYPH_LOOKUP, {
                        alwaysVisible: true,
                      })}
                      <span>{selectedActivity.category}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Date</label>
                    <span className="text-[14px] font-medium tabular-nums text-slate-800">
                      {selectedActivity.dateLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Amount</label>
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
                  <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] items-center gap-4">
                    <label className="text-right text-[12px] font-medium text-slate-500">Description</label>
                    <span className="block truncate text-[15px] font-semibold tracking-tight text-slate-800">
                      {selectedActivity.source}
                    </span>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
      <div className="h-16 shrink-0" aria-hidden />
    </div>
  )
}
