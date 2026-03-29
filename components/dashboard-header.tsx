"use client"

import { Suspense } from "react"
import { CalendarDays } from "lucide-react"
import { usePathname } from "next/navigation"
import { HeaderYearControl } from "@/components/header-year-control"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import { resolveDashboardRoute } from "@/lib/dashboard-nav"
import { cn } from "@/lib/utils"

/** Single grey rule between Stash / Owe / Savings — spans full cell height. */
function MetricsDivider() {
  return (
    <span
      className="w-px shrink-0 self-stretch bg-slate-300"
      aria-hidden
    />
  )
}

function MetricsStrip() {
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

  const cell = (
    label: string,
    value: number,
    valueClass: string,
  ) => (
    <div className="flex flex-col items-end gap-[2px] px-1.5 py-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span
        className={`text-sm font-bold tabular-nums ${amountInter.className} ${valueClass}`}
      >
        {fmtCurrency(value)}
      </span>
    </div>
  )

  return (
    <div
      className="inline-flex items-stretch gap-2"
      aria-label="Balances overview"
    >
      {cell("Stash", 4200, "text-slate-600")}
      <MetricsDivider />
      {cell("Owe", 1850, "text-[#C07A6E]")}
      <MetricsDivider />
      {cell("Savings", 12500, "text-emerald-600")}
    </div>
  )
}

export function DashboardHeader() {
  const pathname = usePathname()
  const { title, icon: PageIcon } = resolveDashboardRoute(pathname)
  const isMyJourney =
    pathname === "/my-journey" || pathname.startsWith("/my-journey/")

  return (
    <header className="flex min-h-[60px] w-full shrink-0 items-end gap-4 rounded-tr-xl bg-stone-100 px-4 pb-2 pt-2">
      <div className="min-w-0 flex-1 basis-0">
        <h1
          className={cn(
            "flex min-w-0 items-center gap-2.5 font-sans text-2xl font-semibold leading-[1.15] tracking-[-0.02em]",
            isMyJourney ? "text-orange-900" : "text-slate-600",
          )}
        >
          <PageIcon
            className={cn(
              "shrink-0 stroke-[1.5]",
              isMyJourney ? "h-8 w-8 text-current" : "h-7 w-7 text-[#0087D2]",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "min-w-0 truncate",
              isMyJourney && myJourneyNav.className,
              isMyJourney &&
                "text-[1.75rem] leading-[1.18] tracking-normal sm:text-[1.8125rem] md:text-[1.875rem]",
            )}
          >
            {title}
          </span>
        </h1>
      </div>

      <div className="flex shrink-0 items-end">
        <MetricsStrip />
        <CalendarDays
          className="ml-7 mr-2.5 h-4 w-4 shrink-0 self-center text-slate-400"
          strokeWidth={1.5}
          aria-hidden
        />
        <Suspense
          fallback={
            <span className={`text-base font-medium tabular-nums text-slate-400 ${amountInter.className}`}>
              …
            </span>
          }
        >
          <HeaderYearControl />
        </Suspense>
      </div>
    </header>
  )
}
