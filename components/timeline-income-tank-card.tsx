"use client"

import { useState, type KeyboardEvent } from "react"
import type { ExpectedIncomeLine } from "@/lib/timeline-roadmap-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CirclePlus, Maximize2, RefreshCw, Sprout, Wallet } from "lucide-react"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import {
  DEFAULT_BUDGET_YEAR,
  type MonthLabel,
  nextMonthLongNameFromLabel,
} from "@/lib/budget-month"
import { cn } from "@/lib/utils"
import { amountInter, myJourneyNav } from "@/lib/fonts"

function fmt(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n).toLocaleString()
  return (
    <span className="inline-flex items-baseline">
      <span className="text-[0.9em] text-slate-500">{sign}$</span>
      <span className="ml-[0.14em]">{abs}</span>
    </span>
  )
}

function fmtDollarsPlain(n: number) {
  return `$${n.toLocaleString()}`
}

function parseIncomeDateParts(
  expectedDate: string,
  year: number,
): { monthKey: string; day: string; monthAbbrev: string } | null {
  const trimmed = expectedDate.trim()
  if (!trimmed) return null
  const d = new Date(`${trimmed}, ${year}`)
  if (Number.isNaN(d.getTime())) return null
  const monthKey = `${d.getFullYear()}-${d.getMonth()}`
  const monthAbbrev = d.toLocaleString("en-US", { month: "short" })
  const day = String(d.getDate())
  return { monthKey, day, monthAbbrev }
}

/** First row of each month: "Apr 5"; later rows same month: day only. */
function incomeDockDateLabel(
  expectedDate: string,
  prevExpectedDate: string | null,
  year: number,
): string {
  const cur = parseIncomeDateParts(expectedDate, year)
  if (!cur) return expectedDate.trim() || "—"
  if (prevExpectedDate == null) {
    return `${cur.monthAbbrev} ${cur.day}`
  }
  const prev = parseIncomeDateParts(prevExpectedDate, year)
  if (!prev || cur.monthKey !== prev.monthKey) {
    return `${cur.monthAbbrev} ${cur.day}`
  }
  return cur.day
}

/** Dot leader strip — must sit in a flex row with flex-1 basis-0 min-w-0 (see Scheduled Pay). */
const incomeRowDotFill =
  "min-h-[1em] min-w-0 flex-1 basis-0 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"

/** Hover-only highlight + thin sky inset edge (no default border — avoids persistent ring). */
const scheduledPayRowHoverClass =
  "transition-colors duration-150 hover:bg-sky-50/90 hover:shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]"

/** Same surface + hover as snapshot Credit Card Payments rows (`CREDIT_OUTPOST_ROW_BUTTON_CLASS`). */
const otherIncomePanelClass =
  "group min-w-0 w-full cursor-pointer rounded-lg border border-slate-200/80 border-l-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-2 py-3 text-left shadow-sm transition-colors duration-150 hover:border-slate-300/90 hover:from-sky-50 hover:to-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1 sm:px-3"

type IncomeCardItem = ExpectedIncomeLine & {
  markedForDeletion?: boolean
}

type TimelineIncomeTankCardProps = {
  items: IncomeCardItem[]
  /** Month strip selection — footer copy uses the following month (“getting ready for …”). */
  selectedMonth: MonthLabel
  editMode?: boolean
  muted?: boolean
  elevated?: boolean
  headerTheme?: "default" | "sample" | "softSlate"
  /** Shown under "Other Income" as $n. */
  otherIncomeAmount?: number
  onStartEdit?: () => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  onAmountChange?: (itemId: string, nextAmount: number) => void
  onLabelChange?: (itemId: string, nextLabel: string) => void
  onToggleDelete?: (itemId: string) => void
  onAddItem?: (draft: { label: string; expectedDate: string; amount: number }) => void
}

/**
 * Timeline Income Dock: expected income lines for the selected budget month.
 */
export function TimelineIncomeTankCard({
  items,
  selectedMonth,
  editMode = false,
  muted = false,
  elevated = false,
  headerTheme = "default",
  otherIncomeAmount = 240,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAmountChange,
  onLabelChange,
  onToggleDelete,
  onAddItem,
}: TimelineIncomeTankCardProps) {
  const nextMonthName = nextMonthLongNameFromLabel(selectedMonth)
  const sampleTheme = headerTheme === "sample"
  const softSlateTheme = headerTheme === "softSlate"
  const [showIncomeAddRow, setShowIncomeAddRow] = useState(false)
  const [newIncomeLabel, setNewIncomeLabel] = useState("")
  const [newIncomeDate, setNewIncomeDate] = useState("Mar --")
  const [newIncomeAmount, setNewIncomeAmount] = useState(0)
  const [scheduledPayLine, setScheduledPayLine] = useState<IncomeCardItem | null>(null)
  const [otherIncomeOpen, setOtherIncomeOpen] = useState(false)

  const dateToSortable = (value: string) => {
    const d = new Date(`${value}, ${DEFAULT_BUDGET_YEAR}`)
    return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime()
  }

  const sortedItems = [...items].sort(
    (a, b) => dateToSortable(a.expectedDate) - dateToSortable(b.expectedDate),
  )

  const visibleItems = sortedItems.filter((line) => !line.markedForDeletion)
  const targetIncomeTotal = visibleItems.reduce((sum, line) => sum + line.amount, 0)
  const received = visibleItems.reduce((sum, line) => sum + (line.cleared ? line.amount : 0), 0)
  const headerClass = sampleTheme
    ? "shrink-0 border-b border-[#D7C7B7] bg-[#E9DED2] px-3 py-2.5"
    : softSlateTheme
      ? "shrink-0 border-b border-slate-300 bg-white px-3 py-2.5"
      : "shrink-0 border-b border-slate-700 bg-slate-700/80 px-3 py-2.5"
  const titleClass = sampleTheme
    ? "text-sm font-semibold tracking-tight text-slate-900"
    : softSlateTheme
      ? "text-[15px] font-bold tracking-tight text-slate-600"
      : "text-sm font-semibold tracking-tight text-slate-100"
  const editBtnClass = sampleTheme
    ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-white/50 hover:text-slate-900 active:bg-white/70"
    : softSlateTheme
      ? "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-0.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] underline-offset-2 transition-colors hover:text-[#006BB3] hover:underline active:text-[#005a96]"
      : "ml-auto inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-200 transition-colors hover:bg-white/10 hover:text-sky-100 active:bg-white/15"
  const cancelBtnClass = sampleTheme || softSlateTheme
    ? "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-700 transition-colors hover:bg-rose-100 hover:text-rose-800"
    : "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-rose-200 transition-colors hover:bg-rose-300/20 hover:text-rose-100"

  return (
    <section
      className={`relative flex w-full min-w-0 flex-col overflow-x-clip rounded-sm border bg-white shadow-sm transition-opacity ${
        editMode
          ? "border-[#0087D2]/55 ring-1 ring-[#0087D2]/25"
          : sampleTheme
            ? "border-stone-200 bg-stone-50/75"
            : softSlateTheme
              ? "border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
            : "border-slate-200"
      } ${
        muted ? "opacity-45" : "opacity-100"
      } ${elevated ? "z-20" : ""}`}
      aria-labelledby="timeline-income-dock-heading"
    >
      <header className={headerClass}>
        <div className="relative z-20 flex min-w-0 items-center">
          <h2
            id="timeline-income-dock-heading"
            className={cn(titleClass, "flex min-w-0 flex-1 items-center gap-2")}
          >
            <CirclePlus
              className="h-4 w-4 shrink-0 stroke-[1.75] text-emerald-600"
              aria-hidden
            />
            <span className="min-w-0 truncate">Income Dock</span>
          </h2>
          {editMode ? (
            <span className="ml-auto mr-8 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Editing
            </span>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className={cn(editBtnClass, "normal-case")}
            >
              Full Income Plan
              <Maximize2 className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
            </button>
          )}
          {editMode && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm bg-rose-600/95 text-white transition-colors hover:bg-rose-700"
              aria-label="Cancel Income Dock editing"
              title="Cancel"
            >
              <span className="text-[14px] font-bold leading-none">x</span>
            </button>
          )}
        </div>
      </header>

      <div className="min-w-0 p-3">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Match Snapshot roadmap “Starting Funds … Let’s do this” row */}
          <div className="mb-3 flex justify-center pr-1.5 sm:pr-2">
            <p className="inline-flex flex-wrap items-baseline justify-center gap-2">
              <span className="text-[15px] font-medium italic text-slate-500">Target Income</span>
              <span
                className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
              >
                {fmt(targetIncomeTotal)}
              </span>
              <span
                className={`ml-1 text-xl font-semibold italic text-orange-700/90 ${myJourneyNav.className}`}
              >
                Making Stacks
              </span>
            </p>
          </div>

          {/* Scheduled Pay — same rhythm as Snapshot Bills (banner + dated lines) */}
          <div className="px-2.5 sm:px-3">
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h3 className="text-[12px] font-semibold text-slate-700">Scheduled Pay</h3>
            </div>
            <ul className="min-w-0 space-y-2 pl-3 sm:pl-4">
              {sortedItems.map((line, index) => (
                <li key={line.id} className="min-w-0">
                  <div className="relative min-w-0">
                    {line.markedForDeletion ? (
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 border-t border-slate-500/80",
                          editMode ? "right-[4.5rem]" : "right-[2.75rem]",
                        )}
                      />
                    ) : null}
                      {/* Flex row: fixed date / amount / glyph widths; middle flex-1 basis-0 min-w-0 so dots reach the $ column */}
                      <div
                        className={cn(
                          "flex w-full min-w-0 items-baseline gap-x-0.5 rounded-md text-[12px] leading-snug",
                          !editMode &&
                            cn(
                              "-mx-1 cursor-pointer px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087D2] focus-visible:ring-offset-1",
                              scheduledPayRowHoverClass,
                            ),
                        )}
                        role={!editMode ? "button" : undefined}
                        tabIndex={!editMode ? 0 : undefined}
                        onClick={
                          !editMode ? () => setScheduledPayLine(line) : undefined
                        }
                        onKeyDown={
                          !editMode
                            ? (e: KeyboardEvent<HTMLDivElement>) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  setScheduledPayLine(line)
                                }
                              }
                            : undefined
                        }
                        aria-label={
                          !editMode
                            ? `Open Scheduled Pay details for ${line.label}`
                            : undefined
                        }
                      >
                        <div
                          className={cn(
                            "w-[3.35rem] shrink-0 whitespace-nowrap pr-2 text-right text-[11px] font-normal leading-tight tabular-nums",
                            amountInter.className,
                            line.markedForDeletion && "text-slate-400",
                            !line.markedForDeletion && line.cleared && "text-slate-400",
                            !line.markedForDeletion && !line.cleared && "text-slate-700",
                          )}
                        >
                          {incomeDockDateLabel(
                            line.expectedDate,
                            index > 0 ? sortedItems[index - 1]!.expectedDate : null,
                            DEFAULT_BUDGET_YEAR,
                          )}
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-baseline gap-0.5 overflow-hidden font-semibold text-slate-700">
                          {editMode && !line.cleared && !line.markedForDeletion ? (
                            <input
                              type="text"
                              value={line.label}
                              onChange={(e) => onLabelChange?.(line.id, e.target.value)}
                              className="min-w-0 max-w-[min(100%,18rem)] shrink rounded-sm border border-slate-300 bg-white px-1 py-0.5 text-left text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              aria-label={`Income label for ${line.expectedDate}`}
                            />
                          ) : (
                            <span
                              className={cn(
                                "min-w-0 shrink truncate",
                                line.markedForDeletion
                                  ? "text-slate-400"
                                  : line.cleared
                                    ? "text-slate-500"
                                    : "text-slate-800",
                              )}
                            >
                              {line.label}
                            </span>
                          )}
                          <span className={incomeRowDotFill} aria-hidden />
                        </div>
                        <div className="w-[5.25rem] shrink-0 text-right text-[11px] text-slate-500">
                          {editMode && !line.cleared && !line.markedForDeletion ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              value={line.amount}
                              onChange={(e) => onAmountChange?.(line.id, Number(e.target.value) || 0)}
                              disabled={!!line.markedForDeletion}
                              className={cn(
                                "w-[5.25rem] rounded-sm border border-slate-300 bg-white px-1 py-0.5 text-right text-[11px] font-medium tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500",
                                amountInter.className,
                              )}
                              aria-label={`Income amount for ${line.label}`}
                            />
                          ) : (
                            <span
                              className={cn(
                                `inline-block w-[5.25rem] text-right text-[11px] font-medium tabular-nums ${amountInter.className}`,
                                line.markedForDeletion && "text-slate-400",
                                !line.markedForDeletion && line.cleared && "text-slate-400",
                                !line.markedForDeletion && !line.cleared && "text-slate-800",
                              )}
                            >
                              {fmtDollarsPlain(line.amount)}
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "flex shrink-0 justify-center overflow-hidden",
                            editMode ? "w-[4.25rem]" : "w-[2.25rem]",
                          )}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            {line.cleared ? (
                              <ReceivedCheckIcon aria-label="Received" />
                            ) : (
                              <RefreshCw
                                className="h-3 w-3 shrink-0 stroke-[1.8] text-slate-500"
                                aria-label="Scheduled recurring"
                              />
                            )}
                            {editMode && !line.cleared ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleDelete?.(line.id)
                                }}
                                className="rounded-sm px-1 py-0.5 text-[11px] font-semibold text-rose-600 transition-all hover:bg-rose-600 hover:text-white"
                                aria-label={
                                  line.markedForDeletion ? "Restore income item" : "Delete income item"
                                }
                                title={
                                  line.markedForDeletion
                                    ? "Restore (applies on save)"
                                    : "Delete (applies on save)"
                                }
                              >
                                ×
                              </button>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          {/* Other Income — border spans full row (through glyph column); +$ stays in 5.25rem amount column like rows above */}
          <div className="mt-5 px-2.5 sm:px-3">
            <div className="pl-3 sm:pl-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOtherIncomeOpen(true)}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOtherIncomeOpen(true)
                  }
                }}
                aria-label="Open Other Income details"
                className={otherIncomePanelClass}
              >
                <div className="mb-2 flex min-w-0 items-baseline gap-0.5 border-b border-slate-200/90 pb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[12px] font-semibold text-slate-700">Other Income</h3>
                  </div>
                  <span
                    className={`inline-block w-[5.25rem] shrink-0 text-right text-[11px] font-medium tabular-nums text-emerald-700 ${amountInter.className}`}
                  >
                    {fmtDollarsPlain(otherIncomeAmount)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center",
                      editMode ? "w-[4.25rem]" : "w-[2.25rem]",
                    )}
                  >
                    <CirclePlus
                      className="h-3.5 w-3.5 shrink-0 stroke-[1.8] text-emerald-600/75"
                      aria-hidden
                    />
                    <span className="sr-only">Bonus and extra income</span>
                  </span>
                </div>
                <div className="flex min-w-0 gap-0.5">
                  <p className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px] leading-snug text-slate-600">
                    <span className="inline-flex w-[1.5rem] shrink-0 justify-center pt-0.5">
                      <Wallet className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-500" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      Side Hustle, refunds, gifts, venmo, freelance work …
                    </span>
                  </p>
                  <span className="w-[5.25rem] shrink-0" aria-hidden />
                  <span
                    className={cn("shrink-0", editMode ? "w-[4.25rem]" : "w-[2.25rem]")}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-2.5 sm:px-3">
            {editMode && showIncomeAddRow && (
              <div className="relative mt-3 rounded-sm border border-slate-200 bg-slate-50/70 p-2">
                <button
                  type="button"
                  onClick={() => setShowIncomeAddRow(false)}
                  className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
                  aria-label="Close add income item"
                  title="Close"
                >
                  <span className="text-[11px] font-bold leading-none">x</span>
                </button>
                <div className="grid grid-cols-1 gap-1.5 pt-4 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_auto] sm:items-center">
                  <input
                    type="text"
                    value={newIncomeLabel}
                    onChange={(e) => setNewIncomeLabel(e.target.value)}
                    placeholder="Income source"
                    className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    value={newIncomeDate}
                    onChange={(e) => setNewIncomeDate(e.target.value)}
                    placeholder="Mar --"
                    className="rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={newIncomeAmount}
                    onChange={(e) => setNewIncomeAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Amount"
                    className={`rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-right text-[12px] tabular-nums text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 ${amountInter.className}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newIncomeLabel.trim()) return
                      onAddItem?.({
                        label: newIncomeLabel.trim(),
                        expectedDate: newIncomeDate.trim() || "Mar --",
                        amount: Math.max(0, newIncomeAmount),
                      })
                      setShowIncomeAddRow(false)
                      setNewIncomeLabel("")
                      setNewIncomeDate("Mar --")
                      setNewIncomeAmount(0)
                    }}
                    className="justify-self-start text-[10px] font-semibold uppercase tracking-wide text-[#0087D2] hover:underline"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            {editMode && (
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowIncomeAddRow(true)}
                  className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  + Add Income Item
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="ml-2 rounded-sm bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-rose-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="rounded-sm bg-[#0087D2] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#006BB3]"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex justify-center pr-1.5 sm:pr-2">
              <div className="inline-flex flex-wrap items-baseline justify-center gap-2">
                <p className="text-[15px] font-medium italic text-slate-500">Received</p>
                <div
                  className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                >
                  {fmt(received)}
                </div>
                <p
                  className={`ml-1 inline-flex items-center gap-1.5 text-xl font-semibold italic text-orange-700/90 ${myJourneyNav.className}`}
                >
                  <span>getting ready for {nextMonthName}</span>
                  <Sprout className="ml-0.5 h-4 w-4 shrink-0 text-orange-700/80" aria-hidden />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={scheduledPayLine !== null}
        onOpenChange={(open) => {
          if (!open) setScheduledPayLine(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scheduled Pay</DialogTitle>
          </DialogHeader>
          {scheduledPayLine ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Source
                </p>
                <p className="text-base font-medium text-slate-900">
                  {scheduledPayLine.label}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Expected date
                </p>
                <p>{scheduledPayLine.expectedDate}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </p>
                <p
                  className={`text-base font-semibold tabular-nums text-slate-900 ${amountInter.className}`}
                >
                  {fmtDollarsPlain(scheduledPayLine.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </p>
                <p>{scheduledPayLine.cleared ? "Received" : "Scheduled"}</p>
              </div>
              {scheduledPayLine.markedForDeletion ? (
                <p className="text-xs text-amber-800">
                  Marked for deletion (applies when you save).
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={otherIncomeOpen} onOpenChange={setOtherIncomeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Other Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <p className="leading-relaxed text-slate-600">
              Side hustles, refunds, gifts, Venmo, freelance work, and other
              amounts not tied to a scheduled pay date.
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Budgeted amount
              </p>
              <p
                className={`text-lg font-semibold tabular-nums text-emerald-700 ${amountInter.className}`}
              >
                {fmtDollarsPlain(otherIncomeAmount)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
