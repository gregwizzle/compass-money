"use client"

import { Suspense, useMemo, useState } from "react"
import { Lock, Star } from "lucide-react"
import { ArchiveYearModal } from "@/components/archive-year-modal"
import { HeaderYearControl } from "@/components/header-year-control"
import {
  DEFAULT_BUDGET_YEAR,
  MONTH_LABELS,
  type MonthLabel,
} from "@/lib/budget-month"
import { amountInter } from "@/lib/fonts"
import { SNAPSHOT_LIVING } from "@/lib/snapshot-demo-data"
import { cn } from "@/lib/utils"

type BillApplyTo = "timeline-bill" | "direct-stash"
type IncomeApplyTo = "starting-funds" | "direct-stash"

type RecurringBill = {
  id: string
  name: string
  amount: number
  day: number
  months: number[]
  applyTo: BillApplyTo
}

type LivingFund = { id: string; name: string; amount: number }

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

type StashEvent = { label: string; amount: number }

type ForecastMonth = {
  month: MonthLabel
  monthIndex: number
  startingFunds: number
  bills: number
  livingFunds: number
  cashout: number
  stashEvents: StashEvent[]
  stashBalance: number
  isClosed: boolean
  isActive: boolean
}

/** Demo “today” month for lock / star column states (Nov). */
const ACTIVE_MONTH_INDEX = 10
const STARTING_STASH = 14200
const JAN_STARTING_FUNDS = 6000

const DEMO_BILLS: RecurringBill[] = [
  { id: "rent", name: "Rent or Mortgage", amount: 1650, day: 1, months: [], applyTo: "timeline-bill" },
  { id: "auto-ins", name: "Auto Insurance", amount: 138, day: 5, months: [], applyTo: "timeline-bill" },
  { id: "internet", name: "Internet", amount: 75, day: 10, months: [], applyTo: "timeline-bill" },
  { id: "electric", name: "Electric", amount: 120, day: 12, months: [], applyTo: "timeline-bill" },
  { id: "water", name: "Water & Trash", amount: 60, day: 15, months: [], applyTo: "timeline-bill" },
  { id: "netflix", name: "Netflix", amount: 25, day: 18, months: [], applyTo: "timeline-bill" },
  { id: "gym", name: "Gym Membership", amount: 55, day: 19, months: [], applyTo: "timeline-bill" },
  { id: "mobile", name: "Mobile Phone", amount: 90, day: 22, months: [], applyTo: "timeline-bill" },
  { id: "auto-loan", name: "Auto Loan", amount: 450, day: 28, months: [], applyTo: "timeline-bill" },
  { id: "hoa", name: "HOA Special Assessment", amount: 200, day: 15, months: [5, 7, 8], applyTo: "timeline-bill" },
  { id: "property-tax", name: "Property Tax", amount: 1200, day: 10, months: [3, 9], applyTo: "timeline-bill" },
  { id: "amazon-prime", name: "Amazon Prime", amount: 139, day: 14, months: [6], applyTo: "timeline-bill" },
  { id: "car-registration", name: "Car Registration", amount: 120, day: 1, months: [10], applyTo: "timeline-bill" },
]

const DEMO_LIVING: LivingFund[] = SNAPSHOT_LIVING.map((line) => ({
  id: line.id,
  name: line.name,
  amount: line.target,
}))

const DEMO_PURCHASES: PlannedPurchase[] = [
  { id: "vacation", name: "Vacation", amount: 1500, monthIndex: 6, day: 10, applyTo: "direct-stash" },
  { id: "car-repair", name: "Car Repair", amount: 800, monthIndex: 3, day: 12, applyTo: "direct-stash" },
]

const DEMO_INCOME: RecurringIncome[] = [
  { id: "pay-1", name: "Paycheck (1st)", amount: 2800, day: 1, months: [], applyTo: "starting-funds" },
  { id: "pay-2", name: "Paycheck (15th)", amount: 2800, day: 15, months: [], applyTo: "starting-funds" },
  { id: "rental", name: "Rental Income", amount: 450, day: 5, months: [], applyTo: "starting-funds" },
  { id: "quarterly", name: "Quarterly Dividend", amount: 320, day: 20, months: [2, 5, 8, 11], applyTo: "direct-stash" },
]

const DEMO_WINDFALLS: PlannedWindfall[] = [
  { id: "tax-refund", name: "Tax Refund", amount: 400, monthIndex: 0, day: 20, applyTo: "direct-stash" },
  { id: "bonus", name: "Year-End Bonus", amount: 5000, monthIndex: 11, day: 15, applyTo: "direct-stash" },
]

function appliesInMonth(months: number[], monthIndex: number) {
  return months.length === 0 || months.includes(monthIndex)
}

function fmtDollars(n: number) {
  const sign = n < 0 ? "-" : ""
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`
}

function fmtCurrencyPlain(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(Math.round(n)).toLocaleString()
  return (
    <span className="inline-flex items-baseline">
      <span className="text-[0.9em] text-slate-500">{sign}$</span>
      <span className="ml-[0.14em]">{abs}</span>
    </span>
  )
}

function fmtSignedStash(n: number) {
  const abs = Math.abs(Math.round(n)).toLocaleString()
  if (n >= 0) return `+$${abs}`
  return `-$${abs}`
}

function buildForecast(args: {
  recurringBills: RecurringBill[]
  livingFunds: LivingFund[]
  purchases: PlannedPurchase[]
  recurringIncome: RecurringIncome[]
  windfalls: PlannedWindfall[]
}): ForecastMonth[] {
  const livingTotal = args.livingFunds.reduce((s, l) => s + l.amount, 0)
  const timelineIncomeByMonth = Array.from({ length: 12 }, () => 0)
  const timelineBillsByMonth = Array.from({ length: 12 }, () => 0)
  const stashEventsByMonth: StashEvent[][] = Array.from({ length: 12 }, () => [])

  for (const bill of args.recurringBills) {
    for (let m = 0; m < 12; m++) {
      if (!appliesInMonth(bill.months, m)) continue
      if (bill.applyTo === "timeline-bill") {
        timelineBillsByMonth[m]! += bill.amount
      } else {
        stashEventsByMonth[m]!.push({
          label: `−$${bill.amount.toLocaleString()} ${bill.name}`,
          amount: -bill.amount,
        })
      }
    }
  }

  for (const purchase of args.purchases) {
    const m = purchase.monthIndex
    if (purchase.applyTo === "timeline-bill") {
      timelineBillsByMonth[m]! += purchase.amount
    } else {
      stashEventsByMonth[m]!.push({
        label: `−$${purchase.amount.toLocaleString()} ${purchase.name}`,
        amount: -purchase.amount,
      })
    }
  }

  for (const income of args.recurringIncome) {
    for (let m = 0; m < 12; m++) {
      if (!appliesInMonth(income.months, m)) continue
      if (income.applyTo === "starting-funds") {
        timelineIncomeByMonth[m]! += income.amount
      } else {
        stashEventsByMonth[m]!.push({
          label: `+$${income.amount.toLocaleString()} ${income.name}`,
          amount: income.amount,
        })
      }
    }
  }

  for (const windfall of args.windfalls) {
    const m = windfall.monthIndex
    if (windfall.applyTo === "starting-funds") {
      timelineIncomeByMonth[m]! += windfall.amount
    } else {
      stashEventsByMonth[m]!.push({
        label: `+$${windfall.amount.toLocaleString()} ${windfall.name}`,
        amount: windfall.amount,
      })
    }
  }

  const rows: ForecastMonth[] = []
  let stash = STARTING_STASH

  for (let m = 0; m < 12; m++) {
    const startingFunds = m === 0 ? JAN_STARTING_FUNDS : timelineIncomeByMonth[m - 1]!
    const bills = timelineBillsByMonth[m]!
    const livingFunds = livingTotal
    const cashout = startingFunds - bills - livingFunds
    const events = stashEventsByMonth[m]!
    const eventTotal = events.reduce((s, e) => s + e.amount, 0)
    stash = stash + cashout + eventTotal

    rows.push({
      month: MONTH_LABELS[m]!,
      monthIndex: m,
      startingFunds,
      bills,
      livingFunds,
      cashout,
      stashEvents: events,
      stashBalance: stash,
      isClosed: m < ACTIVE_MONTH_INDEX,
      isActive: m === ACTIVE_MONTH_INDEX,
    })
  }

  return rows
}

/**
 * Full-year forecast for Captain's Chair “All {year}” time scope:
 * Starting Stash → Dec 31 banner with Archives + Archive CTA, then 12-month matrix.
 */
export function YearForecastPanel({ budgetYear = DEFAULT_BUDGET_YEAR }: { budgetYear?: number }) {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)

  const forecastMonths = useMemo(
    () =>
      buildForecast({
        recurringBills: DEMO_BILLS,
        livingFunds: DEMO_LIVING,
        purchases: DEMO_PURCHASES,
        recurringIncome: DEMO_INCOME,
        windfalls: DEMO_WINDFALLS,
      }),
    [],
  )

  const dec31Projection = forecastMonths[11]?.stashBalance ?? STARTING_STASH

  return (
    <div className="flex min-w-0 flex-col gap-4 font-sans">
      <div
        className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        aria-label="Year-end stash trajectory"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3.5">
          <div className="flex flex-col items-center">
            <span className="mb-1 whitespace-nowrap text-[11.5px] font-medium italic leading-none tracking-wide text-slate-400">
              Starting Stash
            </span>
            <span
              className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-800 ${amountInter.className}`}
            >
              {fmtCurrencyPlain(STARTING_STASH)}
            </span>
          </div>
          <span
            className="select-none self-center text-[15px] font-medium leading-none text-slate-400"
            aria-hidden
          >
            ➔
          </span>
          <div className="flex flex-col items-center">
            <span className="mb-1 whitespace-nowrap text-[11.5px] font-semibold italic leading-none tracking-wide text-slate-600">
              Dec 31 Projection
            </span>
            <span
              className={`whitespace-nowrap text-[15.5px] font-bold leading-none tabular-nums text-slate-900 ${amountInter.className}`}
            >
              {fmtCurrencyPlain(dec31Projection)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Suspense
            fallback={
              <span className="text-[10px] font-medium text-slate-400">Archives</span>
            }
          >
            <HeaderYearControl variant="archives" />
          </Suspense>
          <button
            type="button"
            onClick={() => setIsArchiveOpen(true)}
            aria-label={`How archiving ${budgetYear} works`}
            className="group inline-flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg bg-slate-200 px-3.5 py-1.5 text-slate-400 transition-all duration-300 hover:bg-gradient-to-b hover:from-sky-100 hover:to-sky-200/90 hover:text-sky-700/80"
          >
            <span className="whitespace-nowrap text-[12.5px] font-bold leading-tight">
              ARCHIVE {budgetYear} &raquo;
            </span>
            <span className="text-[10px] font-medium italic leading-tight text-slate-500 transition-colors duration-300 group-hover:text-sky-600/80">
              Unlocks after Dec Cashout
            </span>
          </button>
        </div>
      </div>

      <article
        className="flex min-w-0 flex-col overflow-hidden rounded-sm border border-slate-300/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
        aria-labelledby="year-forecast-heading"
      >
        <div className="border-b border-slate-200 px-3 py-2.5">
          <h3 id="year-forecast-heading" className="text-[12px] font-semibold text-slate-700">
            12-Month Forecast
          </h3>
        </div>

        <div className="px-2 py-3 sm:px-3">
          <div
            className="grid w-full grid-cols-[5.75rem_repeat(12,minmax(0,1fr))] gap-x-1"
            role="table"
            aria-label="Year forecast by month"
          >
            <div className="pb-2" aria-hidden />
            {forecastMonths.map((col) => (
              <div
                key={`h-${col.month}`}
                className={cn(
                  "flex items-center justify-center gap-0.5 rounded-t-md pb-2 pt-1 text-center text-[10px] font-semibold tracking-wide sm:text-[11px]",
                  col.isClosed && "bg-slate-100/80 text-slate-400",
                  col.isActive && "bg-sky-50 text-sky-800",
                  !col.isClosed && !col.isActive && "text-slate-500",
                )}
                role="columnheader"
              >
                {col.isClosed ? (
                  <Lock className="h-2.5 w-2.5 shrink-0 stroke-[2] text-slate-400" aria-label="Closed month" />
                ) : null}
                {col.isActive ? (
                  <Star
                    className="h-2.5 w-2.5 shrink-0 fill-amber-400 stroke-amber-500"
                    aria-label="Active month"
                  />
                ) : null}
                <span>{col.month}</span>
              </div>
            ))}

            {(
              [
                ["Starting Funds", "startingFunds"],
                ["Bills", "bills"],
                ["Living Expenses", "livingFunds"],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="contents">
                <div className="flex items-center py-1.5 pr-1 text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px]">
                  {label}
                </div>
                {forecastMonths.map((col) => (
                  <div
                    key={`${key}-${col.month}`}
                    className={cn(
                      `px-0.5 py-1.5 text-center text-[10px] font-medium tabular-nums text-slate-700 sm:text-[11px] ${amountInter.className}`,
                      col.isClosed && "bg-slate-100/80 text-slate-400",
                      col.isActive && "bg-sky-50/90",
                    )}
                  >
                    {fmtDollars(col[key])}
                  </div>
                ))}
              </div>
            ))}

            <div className="contents">
              <div className="flex flex-col justify-center border-t border-slate-200 py-1.5 pr-1">
                <span className="text-[10px] font-semibold leading-tight text-slate-700 sm:text-[11px]">
                  Cashout
                </span>
                <span className="text-[8px] font-medium leading-tight text-slate-400 sm:text-[9px]">
                  (added to your Stash)
                </span>
              </div>
              {forecastMonths.map((col) => (
                <div
                  key={`cashout-${col.month}`}
                  className={cn(
                    `border-t border-slate-200 px-0.5 py-1.5 text-center text-[10px] font-bold tabular-nums text-slate-800 sm:text-[11px] ${amountInter.className}`,
                    col.isClosed && "bg-slate-100/80 text-slate-400",
                    col.isActive && "bg-sky-50/90",
                  )}
                >
                  {fmtDollars(col.cashout)}
                </div>
              ))}
            </div>

            <div className="col-span-full my-2 border-t border-slate-300" />

            <div className="flex flex-col justify-center py-1.5 pr-1">
              <span className="text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px]">
                Additional Events
              </span>
              <span className="text-[8px] font-medium leading-tight text-slate-400 sm:text-[9px]">
                (directly to/from your Stash)
              </span>
            </div>
            {forecastMonths.map((col) => {
              const net = col.stashEvents.reduce((s, e) => s + e.amount, 0)
              return (
                <div
                  key={`events-${col.month}`}
                  className={cn(
                    `flex items-center justify-center px-0.5 py-1.5 text-center text-[10px] font-semibold tabular-nums sm:text-[11px] ${amountInter.className}`,
                    col.isClosed && "bg-slate-100/80",
                    col.isActive && "bg-sky-50/90",
                    net === 0
                      ? "text-slate-300"
                      : net < 0
                        ? col.isClosed
                          ? "text-rose-400"
                          : "text-rose-600"
                        : col.isClosed
                          ? "text-emerald-500/70"
                          : "text-emerald-700",
                  )}
                >
                  {net === 0 ? "—" : fmtSignedStash(net)}
                </div>
              )
            })}

            <div className="flex flex-col justify-center border-t border-slate-300 pt-2.5 pr-1">
              <span className="text-[10px] font-bold leading-tight text-slate-800 sm:text-[11px]">
                Ending Stash
              </span>
              <span className="text-[8px] font-semibold leading-tight text-slate-500 sm:text-[9px]">
                Balance
              </span>
            </div>
            {forecastMonths.map((col) => (
              <div
                key={`stash-${col.month}`}
                className={cn(
                  `border-t border-slate-300 px-0.5 pt-2.5 text-center text-[11px] font-bold tabular-nums text-slate-900 sm:text-[12px] ${amountInter.className}`,
                  col.isClosed && "bg-slate-100/80 text-slate-400",
                  col.isActive && "bg-sky-50/90 text-slate-900",
                )}
              >
                {fmtDollars(col.stashBalance)}
              </div>
            ))}
          </div>
        </div>
      </article>

      <ArchiveYearModal
        isOpen={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
        year={budgetYear}
        nextYear={budgetYear + 1}
        isReadyToArchive={false}
      />
    </div>
  )
}
