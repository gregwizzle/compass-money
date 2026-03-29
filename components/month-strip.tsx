"use client"

import { useMemo } from "react"
import { Lock, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DEFAULT_BUDGET_YEAR,
  formatMonthStripTooltip,
  getSnapshotViewForMonth,
  monthIndexFromLabel,
  type MonthLabel,
} from "@/lib/budget-month"
import { useMonthSelection } from "@/hooks/use-month-selection"

export type MonthStripProps = {
  budgetYear?: number
  now?: Date
  className?: string
  /** Controlled: parent owns selected month */
  value?: MonthLabel
  onValueChange?: (month: MonthLabel) => void
}

export function MonthStrip({
  budgetYear,
  now,
  className,
  value,
  onValueChange,
}: MonthStripProps) {
  const internal = useMonthSelection(budgetYear ?? DEFAULT_BUDGET_YEAR, { now })

  const selectedMonth = value ?? internal.selectedMonth
  const setSelectedMonth = (month: MonthLabel) => {
    onValueChange?.(month)
    if (value === undefined) internal.setSelectedMonth(month)
  }

  const snapshotView = useMemo(() => {
    const idx = monthIndexFromLabel(selectedMonth) ?? 0
    return getSnapshotViewForMonth(idx, { budgetYear: internal.budgetYear, now })
  }, [selectedMonth, internal.budgetYear, now])

  return (
    <div
      className={cn(
        "w-full rounded-lg border p-1.5 flex items-stretch gap-1.5",
        "border-slate-200 bg-white",
        className,
      )}
      data-snapshot-view={snapshotView}
    >
      {internal.monthLabels.map((month) => {
        const monthIndex = monthIndexFromLabel(month) ?? 0
        const state = internal.getFlags(monthIndex)
        const isSelected = selectedMonth === month

        const base =
          "relative z-0 flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-xs font-medium transition-colors"

        let surface = "text-slate-600"
        if (state.isArchived) {
          surface = "text-slate-400 italic bg-transparent hover:bg-slate-100"
        } else if (state.isFuture) {
          surface =
            "text-slate-500 border border-dashed border-slate-300 bg-white hover:bg-orange-100 hover:border-orange-200 hover:text-orange-950"
        } else if (state.isLive) {
          surface = "text-white bg-[#0087D2] hover:bg-[#006BB3] not-italic shadow-sm"
        }

        const selectedRing =
          isSelected && state.isLive
            ? "ring-2 ring-white ring-offset-2 ring-offset-[#0087D2] z-10"
            : isSelected
              ? "ring-2 ring-[#0087D2] ring-offset-2 ring-offset-white z-10"
              : ""

        return (
          <button
            key={month}
            type="button"
            title={formatMonthStripTooltip(state, isSelected)}
            onClick={() => setSelectedMonth(month)}
            className={`${base} ${surface} ${selectedRing}`}
            data-phase={state.isLive ? "live" : state.isArchived ? "archived" : "future"}
            data-selected={isSelected}
          >
            <span className="flex items-center justify-center gap-1.5 leading-none">
              {state.isArchived && (
                <Lock className="h-3 w-3 shrink-0 text-slate-400 stroke-[1.5]" aria-hidden />
              )}
              {state.isLive && (
                <Star
                  className="h-3 w-3 shrink-0 fill-orange-100 text-orange-50 stroke-orange-100/90 stroke-[1.5]"
                  aria-hidden
                />
              )}
              <span>{month}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Re-export for pages that share selection logic without importing two paths. */
export { useMonthSelection } from "@/hooks/use-month-selection"
