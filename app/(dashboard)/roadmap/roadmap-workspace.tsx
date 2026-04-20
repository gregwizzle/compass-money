"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, List, Map } from "lucide-react"
import { MonthStrip, useMonthSelection } from "@/components/month-strip"
import { ReceivedCheckIcon } from "@/components/received-check-icon"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  SNAPSHOT_ACTIVITY_ROWS,
  SNAPSHOT_AS_OF_DAY,
  SNAPSHOT_BILLS,
  SNAPSHOT_LIVING,
} from "@/lib/snapshot-demo-data"
import { amountInter } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { monthLongNameFromLabel, type MonthLabel } from "@/lib/budget-month"

type RoadmapWorkspaceProps = {
  initialMonth?: MonthLabel
}

type BillDraft = {
  id: string
  listName: string
  dueDay: number
  estimate: number
  actual: number
}

type LivingDraft = {
  id: string
  name: string
  funded: number
  spent: number
}

type ActivityDraft = {
  id: string
  dateLabel: string
  source: string
  category: string
  amount: number
  budgetMonthLabel: MonthLabel
}

function fmtDollars(n: number) {
  return `$${Math.abs(n).toLocaleString()}`
}

export function RoadmapWorkspace({ initialMonth }: RoadmapWorkspaceProps) {
  const { selectedMonth, setSelectedMonth } = useMonthSelection()
  const activeMonth = selectedMonth

  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth)
    }
  }, [initialMonth, setSelectedMonth])

  const [billDraft, setBillDraft] = useState<BillDraft[]>(() =>
    SNAPSHOT_BILLS.map((b) => ({
      id: b.id,
      listName: b.listName,
      dueDay: b.dueDay,
      estimate: b.amount,
      actual: b.dueDay <= SNAPSHOT_AS_OF_DAY ? b.amount : 0,
    })),
  )
  const [livingDraft, setLivingDraft] = useState<LivingDraft[]>(() =>
    SNAPSHOT_LIVING.map((line) => ({
      id: line.id,
      name: line.name,
      funded: line.target,
      spent: line.spent,
    })),
  )
  const [activityDraft, setActivityDraft] = useState<ActivityDraft[]>(() =>
    SNAPSHOT_ACTIVITY_ROWS.map((row) => ({
      id: row.id,
      dateLabel: row.dateLabel,
      source: row.source,
      category: row.category,
      amount: row.actual,
      budgetMonthLabel: row.budgetMonthLabel,
    })),
  )

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(activityDraft.map((row) => row.category))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [activityDraft])

  const monthActivity = useMemo(() => {
    return activityDraft.filter((row) => row.budgetMonthLabel === activeMonth)
  }, [activityDraft, activeMonth])

  const billsClearedCount = billDraft.filter((b) => b.dueDay <= SNAPSHOT_AS_OF_DAY).length
  const billsUnclearedCount = billDraft.length - billsClearedCount
  const livingFundedTotal = livingDraft.reduce((sum, line) => sum + line.funded, 0)

  return (
    <div className="relative flex flex-col">
      <div className="px-4 pb-1 pt-3">
        <MonthStrip value={activeMonth} onValueChange={setSelectedMonth} />
      </div>

      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 pt-2 lg:flex-row lg:items-start">
        <section
          className="flex w-full min-w-0 flex-col overflow-hidden rounded-sm border border-slate-300 bg-white shadow-sm lg:max-w-[min(100%,50%)]"
          aria-labelledby="roadmap-budget-heading"
        >
          <header className="shrink-0 border-b border-slate-300 bg-white px-3 py-2.5">
            <h2
              id="roadmap-budget-heading"
              className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-slate-600"
            >
              <Map className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
              <span className="min-w-0 truncate">{monthLongNameFromLabel(activeMonth)} Roadmap</span>
            </h2>
          </header>

          <div className="space-y-4 p-3">
            <div className="px-2.5 sm:px-3">
              <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2">
                <h3 className="text-[12px] font-semibold text-slate-700">Bills</h3>
                <div className="inline-flex items-center gap-3">
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium text-emerald-700">{billsClearedCount} cleared</span>
                    <span className="px-1.5 text-slate-300">|</span>
                    <span className="font-medium text-slate-500">{billsUnclearedCount} estimated</span>
                  </p>
                  <div className="grid grid-cols-[5.5rem_5.5rem] gap-1 pr-9 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    <span className="text-right">Est</span>
                    <span className="text-right">Actual</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 pl-3 sm:pl-4">
                {billDraft.map((bill) => {
                  const isCleared = bill.dueDay <= SNAPSHOT_AS_OF_DAY
                  return (
                    <li key={bill.id} className="flex min-w-0 items-center gap-2 text-[12px]">
                      <span
                        className={`w-[1.5rem] shrink-0 text-[11px] tabular-nums text-slate-500 ${amountInter.className}`}
                      >
                        {bill.dueDay}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{bill.listName}</span>
                      <div className="grid grid-cols-[5.5rem_5.5rem] items-center gap-1">
                        <Input
                          value={String(bill.estimate)}
                          onChange={(e) => {
                            const raw = Number.parseInt(e.target.value || "0", 10)
                            const next = Number.isFinite(raw) ? Math.max(0, raw) : 0
                            setBillDraft((prev) =>
                              prev.map((row) => (row.id === bill.id ? { ...row, estimate: next } : row)),
                            )
                          }}
                          inputMode="numeric"
                          className={`h-7 w-[5.5rem] rounded-sm border-slate-200 px-2 text-right text-[11px] tabular-nums ${amountInter.className}`}
                          aria-label={`${bill.listName} estimated amount`}
                        />
                        <span
                          className={cn(
                            `w-[5.5rem] text-right text-[11px] font-medium tabular-nums ${amountInter.className}`,
                            isCleared ? "text-emerald-700" : "text-slate-400",
                          )}
                        >
                          {bill.actual > 0 ? fmtDollars(bill.actual) : "-"}
                        </span>
                      </div>
                      <span className="inline-flex w-6 justify-center">
                        {isCleared ? <ReceivedCheckIcon /> : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="px-2.5 sm:px-3">
              <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2">
                <h3 className="text-[12px] font-semibold text-slate-700">Living Funds</h3>
                <div className="grid grid-cols-[5.25rem_5.25rem_5rem] gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  <span className="text-right">Funded</span>
                  <span className="text-right">Spent</span>
                  <span className="text-right">Left</span>
                </div>
              </div>
              <ul className="space-y-2 pl-3 sm:pl-4">
                {livingDraft.map((line) => (
                  <li key={line.id} className="flex min-w-0 items-center gap-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{line.name}</span>
                    <div className="grid grid-cols-[5.25rem_5.25rem_5rem] items-center gap-1">
                      <Input
                        value={String(line.funded)}
                        onChange={(e) => {
                          const raw = Number.parseInt(e.target.value || "0", 10)
                          const next = Number.isFinite(raw) ? Math.max(0, raw) : 0
                          setLivingDraft((prev) =>
                            prev.map((row) => (row.id === line.id ? { ...row, funded: next } : row)),
                          )
                        }}
                        inputMode="numeric"
                        className={`h-7 w-[5.25rem] rounded-sm border-slate-200 px-2 text-right text-[11px] tabular-nums ${amountInter.className}`}
                        aria-label={`${line.name} funded amount`}
                      />
                      <span className={`w-[5.25rem] text-right text-[11px] tabular-nums text-slate-500 ${amountInter.className}`}>
                        {fmtDollars(line.spent)}
                      </span>
                      <span
                        className={cn(
                          `w-[5rem] text-right text-[11px] tabular-nums ${amountInter.className}`,
                          line.funded - line.spent < 0 ? "text-rose-700" : "text-slate-500",
                        )}
                      >
                        {line.funded - line.spent < 0 ? "-" : ""}{fmtDollars(line.funded - line.spent)}
                      </span>
                    </div>
                  </li>
                ))}
                <li className="mt-1 border-t border-slate-200 pt-2">
                  <div className="flex min-w-0 items-center gap-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">Total Funded</span>
                    <div className="grid grid-cols-[5.25rem_5.25rem_5rem] items-center gap-1">
                      <span className={`w-[5.25rem] text-right text-[11px] font-semibold tabular-nums text-slate-700 ${amountInter.className}`}>
                        {fmtDollars(livingFundedTotal)}
                      </span>
                      <span className="w-[5.25rem]" aria-hidden />
                      <span className="w-[5rem]" aria-hidden />
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-slate-300 bg-white shadow-sm"
          aria-labelledby="roadmap-transactions-heading"
        >
          <header className="shrink-0 border-b border-slate-300 bg-white px-3 py-2.5">
            <h2
              id="roadmap-transactions-heading"
              className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-slate-600"
            >
              <List className="h-4 w-4 shrink-0 stroke-[1.75] text-[#0087D2]" aria-hidden />
              <span className="min-w-0 truncate">Full {monthLongNameFromLabel(activeMonth)} Transactions</span>
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
                {monthActivity.map((row) => (
                  <TableRow key={row.id} className="border-slate-100">
                    <TableCell className="px-2 py-1.5 text-[11px] tabular-nums text-slate-500">
                      {row.dateLabel}
                    </TableCell>
                    <TableCell className="max-w-[13rem] truncate px-2 py-1.5 text-[11px] text-slate-700">
                      {row.source}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Select
                        value={row.category}
                        onValueChange={(next) => {
                          setActivityDraft((prev) =>
                            prev.map((entry) =>
                              entry.id === row.id ? { ...entry, category: next } : entry,
                            ),
                          )
                        }}
                      >
                        <SelectTrigger className="h-7 w-[11rem] rounded-sm border-slate-200 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-[11px]">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={`px-2 py-1.5 text-right text-[11px] tabular-nums text-slate-700 ${amountInter.className}`}>
                      -{fmtDollars(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-2 border-t border-slate-100 pt-2 text-center">
              <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                <Check className="h-3.5 w-3.5 stroke-[2] text-emerald-600/80" aria-hidden />
                {monthActivity.length} transactions loaded for {monthLongNameFromLabel(activeMonth)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
