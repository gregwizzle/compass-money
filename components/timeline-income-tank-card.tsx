"use client"

import { useState } from "react"
import type { ExpectedIncomeLine } from "@/lib/timeline-roadmap-data"
import { Check, Sprout } from "lucide-react"
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

type IncomeCardItem = ExpectedIncomeLine & {
  markedForDeletion?: boolean
}

type TimelineIncomeTankCardProps = {
  items: IncomeCardItem[]
  editMode?: boolean
  muted?: boolean
  elevated?: boolean
  headerTheme?: "default" | "sample" | "softSlate"
  onStartEdit?: () => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  onAmountChange?: (itemId: string, nextAmount: number) => void
  onLabelChange?: (itemId: string, nextLabel: string) => void
  onToggleDelete?: (itemId: string) => void
  onAddItem?: (draft: { label: string; expectedDate: string; amount: number }) => void
}

/**
 * Timeline column card: expected income lines for April planning.
 */
export function TimelineIncomeTankCard({
  items,
  editMode = false,
  muted = false,
  elevated = false,
  headerTheme = "default",
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAmountChange,
  onLabelChange,
  onToggleDelete,
  onAddItem,
}: TimelineIncomeTankCardProps) {
  const sampleTheme = headerTheme === "sample"
  const softSlateTheme = headerTheme === "softSlate"
  const [showIncomeAddRow, setShowIncomeAddRow] = useState(false)
  const [newIncomeLabel, setNewIncomeLabel] = useState("")
  const [newIncomeDate, setNewIncomeDate] = useState("Mar --")
  const [newIncomeAmount, setNewIncomeAmount] = useState(0)

  const dateToSortable = (value: string) => {
    const d = new Date(`${value}, 2026`)
    return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime()
  }

  const sortedItems = [...items].sort(
    (a, b) => dateToSortable(a.expectedDate) - dateToSortable(b.expectedDate),
  )

  const visibleItems = sortedItems.filter((line) => !line.markedForDeletion)
  const total = visibleItems.reduce((sum, line) => sum + line.amount, 0)
  const received = visibleItems.reduce((sum, line) => sum + (line.cleared ? line.amount : 0), 0)
  const fillPct = total > 0 ? Math.min(100, (received / total) * 100) : 0
  const headerClass = sampleTheme
    ? "shrink-0 border-b border-[#D7C7B7] bg-[#E9DED2] px-3 py-2.5"
    : softSlateTheme
      ? "shrink-0 border-b border-slate-300 bg-white px-3 py-2.5"
      : "shrink-0 border-b border-slate-700 bg-slate-700/80 px-3 py-2.5"
  const titleClass = sampleTheme
    ? "text-sm font-semibold tracking-tight text-slate-800"
    : softSlateTheme
      ? "text-[15px] font-bold tracking-tight text-slate-500"
      : "text-sm font-semibold tracking-tight text-slate-50"
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
      className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border bg-white shadow-sm transition-opacity ${
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
      aria-labelledby="timeline-income-tank-heading"
    >
      <header className={headerClass}>
        <div className="relative z-20 flex min-w-0 items-center">
          <h2
            id="timeline-income-tank-heading"
            className={titleClass}
          >
            Income
          </h2>
          {editMode ? (
            <span className="ml-auto mr-8 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Editing
            </span>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className={editBtnClass}
            >
              Edit
            </button>
          )}
          {editMode && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm bg-rose-600/95 text-white transition-colors hover:bg-rose-700"
              aria-label="Cancel income editing"
              title="Cancel"
            >
              <span className="text-[14px] font-bold leading-none">x</span>
            </button>
          )}
        </div>
      </header>

      <div className="min-w-0 p-3">
        <div className="flex min-w-0 items-stretch gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <ul className="pl-2">
              {sortedItems.map((line, i) => (
                <li
                  key={line.id}
                  className={
                    i > 0 ? "border-t border-slate-100 pt-2.5 mt-2.5" : undefined
                  }
                >
                  <div
                    className={`relative grid grid-cols-[3.5rem_minmax(0,1fr)_4.25rem_1rem_1rem] items-baseline gap-1.5 px-1 py-0.5 text-left ${
                      line.cleared ? "opacity-100" : "opacity-75"
                    }`}
                  >
                    {line.markedForDeletion ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-0 right-[3rem] top-1/2 -translate-y-1/2 border-t border-slate-500/80"
                      />
                    ) : null}
                    <span className={`text-left text-[10px] font-semibold uppercase tracking-wide ${line.cleared ? "text-slate-400" : "text-slate-300"}`}>
                      {line.expectedDate}
                    </span>
                    <span className="min-w-0 text-left text-[12px] font-medium">
                      {editMode && !line.cleared && !line.markedForDeletion ? (
                        <input
                          type="text"
                          value={line.label}
                          onChange={(e) => onLabelChange?.(line.id, e.target.value)}
                          className="w-full rounded-sm border border-slate-300 bg-white px-1 py-0.5 text-left text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          aria-label={`Income label for ${line.expectedDate}`}
                        />
                      ) : (
                        <span
                          className={`block truncate ${
                            line.markedForDeletion
                              ? "text-slate-400"
                              : line.cleared
                                ? "text-slate-700"
                                : "text-slate-400"
                          }`}
                        >
                          {line.label}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-right text-[12px] font-medium tabular-nums ${
                        line.cleared ? "text-slate-800" : "text-slate-400"
                      } ${amountInter.className}`}
                    >
                      {editMode && !line.cleared && !line.markedForDeletion ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={line.amount}
                          onChange={(e) => onAmountChange?.(line.id, Number(e.target.value) || 0)}
                          disabled={!!line.markedForDeletion}
                          className={`w-[4rem] rounded-sm border border-slate-300 bg-white px-1 py-0.5 text-right text-[12px] font-medium tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 ${amountInter.className}`}
                          aria-label={`Income amount for ${line.label}`}
                        />
                      ) : (
                        <span className={line.markedForDeletion ? "text-slate-400" : ""}>
                          {fmt(line.amount)}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex w-4 shrink-0 justify-center">
                      {line.cleared ? (
                        <Check
                          className="h-4 w-4 -rotate-3 stroke-[3] text-emerald-600"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Cleared"
                          title="Cleared"
                        />
                      ) : null}
                    </span>
                    <span className="inline-flex w-4 shrink-0 justify-center">
                      {editMode && !line.cleared ? (
                        <button
                          type="button"
                          onClick={() => onToggleDelete?.(line.id)}
                          className="rounded-sm px-1 py-0.5 font-semibold text-rose-600 transition-all hover:bg-rose-600 hover:text-white hover:shadow-sm"
                          aria-label={line.markedForDeletion ? "Restore income item" : "Delete income item"}
                          title={line.markedForDeletion ? "Restore (applies on save)" : "Delete (applies on save)"}
                        >
                          x
                        </button>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
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
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-[15px] italic font-medium text-slate-500">
                    Received
                  </p>
                  <div
                    className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
                  >
                    {fmt(received)}
                  </div>
                  <p className={`ml-3 inline-flex items-center gap-1.5 text-xl italic font-semibold text-orange-700/90 ${myJourneyNav.className}`}>
                    <span>
                      getting ready for April
                    </span>
                    <Sprout className="ml-0.5 h-4 w-4 shrink-0 text-orange-700/80" aria-hidden />
                  </p>
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
          {!editMode && (
            <div className="relative w-10 shrink-0 self-stretch">
              <p className="absolute right-0 top-0 z-10 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Expected
              </p>
              <p
                className={`absolute right-0 top-3 z-10 text-[11px] font-semibold tabular-nums text-slate-700 ${amountInter.className}`}
              >
                {fmt(total)}
              </p>
              <p
                className={`absolute right-0 z-10 text-[11px] font-semibold italic leading-none tabular-nums text-emerald-800 ${amountInter.className}`}
                style={{
                  bottom: `clamp(0.125rem, calc(${fillPct}% + 0.0625rem), calc(100% - 1.75rem))`,
                }}
              >
                {fmt(received)}
              </p>
              <div className="absolute bottom-0 left-1/2 top-7 w-2 -translate-x-1/2 overflow-hidden rounded-[3px] bg-slate-200/70 ring-1 ring-slate-300/50">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ height: `${fillPct}%` }}
                />
                {fillPct > 0 ? (
                  <span
                    aria-hidden
                    className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-200 ring-1 ring-emerald-500/60"
                    style={{ bottom: `calc(${fillPct}% - 3px)` }}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
        {!editMode && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-[15px] italic font-medium text-slate-500">
                Received
              </p>
              <div
                className={`text-[1.05rem] font-semibold leading-none tabular-nums text-slate-700 ${amountInter.className}`}
              >
                {fmt(received)}
              </div>
              <p className={`ml-3 inline-flex items-center gap-1.5 text-xl italic font-semibold text-orange-700/90 ${myJourneyNav.className}`}>
                <span>
                  getting ready for April
                </span>
                <Sprout className="ml-0.5 h-4 w-4 shrink-0 text-orange-700/80" aria-hidden />
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
