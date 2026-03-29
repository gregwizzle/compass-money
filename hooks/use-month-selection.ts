"use client"

import { useCallback, useMemo, useState } from "react"
import {
  DEFAULT_BUDGET_YEAR,
  getDefaultSelectedMonthLabel,
  getMonthStripFlags,
  getSnapshotViewForMonth,
  labelFromMonthIndex,
  monthIndexFromLabel,
  MONTH_LABELS,
  type MonthLabel,
  type MonthStateOptions,
  type MonthStripFlags,
  type SnapshotView,
} from "@/lib/budget-month"

export type MonthSelection = {
  /** Short labels Jan … Dec */
  monthLabels: readonly MonthLabel[]
  budgetYear: number
  selectedMonth: MonthLabel
  selectedIndex: number
  setSelectedMonth: (month: MonthLabel) => void
  /** Flags for each month index 0–11 (for strip or debugging). */
  flagsByIndex: MonthStripFlags[]
  getFlags: (monthIndex: number) => MonthStripFlags
  /** Snapshot page mode for the current selection. */
  snapshotView: SnapshotView
}

function buildFlagsByYear(budgetYear: number, now?: Date): MonthStripFlags[] {
  const opts: MonthStateOptions = { budgetYear, now }
  return MONTH_LABELS.map((_, i) => getMonthStripFlags(i, opts))
}

export function useMonthSelection(
  budgetYear: number = DEFAULT_BUDGET_YEAR,
  options: { now?: Date } = {}
): MonthSelection {
  const now = options.now
  const [selectedMonth, setSelectedMonthState] = useState<MonthLabel>(() =>
    getDefaultSelectedMonthLabel({ budgetYear, now })
  )

  const selectedIndex = useMemo(
    () => monthIndexFromLabel(selectedMonth) ?? 0,
    [selectedMonth]
  )

  const setSelectedMonth = useCallback((month: MonthLabel) => {
    setSelectedMonthState(month)
  }, [])

  const flagsByIndex = useMemo(
    () => buildFlagsByYear(budgetYear, now),
    [budgetYear, now]
  )

  const getFlags = useCallback(
    (monthIndex: number) => flagsByIndex[monthIndex] ?? getMonthStripFlags(monthIndex, { budgetYear, now }),
    [flagsByIndex, budgetYear, now]
  )

  const snapshotView = useMemo(
    () => getSnapshotViewForMonth(selectedIndex, { budgetYear, now }),
    [selectedIndex, budgetYear, now]
  )

  return {
    monthLabels: MONTH_LABELS,
    budgetYear,
    selectedMonth,
    selectedIndex,
    setSelectedMonth,
    flagsByIndex,
    getFlags,
    snapshotView,
  }
}

export { labelFromMonthIndex, monthIndexFromLabel }
