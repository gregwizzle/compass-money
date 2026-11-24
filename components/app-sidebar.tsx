"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CompassRoseLogo } from "@/components/compass-rose-logo"
import { CATEGORY_GLYPH } from "@/components/roadmap-categories-grid"
import { amountInter, compassWordmark, myJourneyNav } from "@/lib/fonts"
import {
  dashboardBetaFooterNav,
  dashboardPrimaryNav,
  dashboardReferNav,
  dashboardSecondaryNav,
} from "@/lib/dashboard-nav"
import { cn } from "@/lib/utils"
import { ChevronRight, Landmark, LogOut, Receipt, type LucideIcon } from "lucide-react"

/** Demo balances — same figures + glyphs as the top-right header MetricsStrip. */
const SIDEBAR_SCOREBOARD: {
  id: string
  label: string
  value: number
  href: string
  valueClass: string
  icon: LucideIcon
}[] = [
  {
    id: "stash",
    label: "Stash",
    value: 4200,
    href: "/accounts",
    valueClass: "text-slate-700",
    icon: Receipt,
  },
  {
    id: "owe",
    label: "Owe",
    value: 1850,
    href: "/activity",
    valueClass: "text-[#C07A6E]",
    icon: CATEGORY_GLYPH.subscriptions.Icon,
  },
  {
    id: "savings",
    label: "Savings",
    value: 12500,
    href: "/accounts",
    valueClass: "text-emerald-600",
    icon: Landmark,
  },
]

function fmtSidebarCurrency(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n).toLocaleString()
  return (
    <span className="inline-flex items-baseline">
      <span className="text-[0.9em] opacity-70">{sign}$</span>
      <span className="ml-[0.12em]">{abs}</span>
    </span>
  )
}

/** Replace with session user when auth exists */
const DISPLAY_NAME = "First LastName"

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AppSidebarProps = {
  /** Tighter width + divider; used for `/timeline-beta` hybrid shell (see dashboard-shell). */
  variant?: "default" | "hybrid" | "surgical"
}

export function AppSidebar({ variant = "default" }: AppSidebarProps) {
  const pathname = usePathname()
  const initials = initialsFromName(DISPLAY_NAME)
  const ReferIcon = dashboardReferNav.icon

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-full min-h-full shrink-0 flex-col",
        "bg-stone-100",
        variant === "hybrid"
          ? "w-[156px] rounded-l-[10px] border-r border-slate-300/80 shadow-[inset_-1px_0_0_rgba(15,23,42,0.06)]"
          : variant === "surgical"
            ? "w-[196px] rounded-l-[2px]"
            : "w-[196px] rounded-tl-xl",
      )}
    >
      <div className="flex min-h-[60px] shrink-0 items-end pl-4 pr-3 pb-2 pt-2">
        <Link
          href="/logbook"
          className="flex min-w-0 items-end gap-2.5 rounded-md pr-1 pb-0 pt-0 outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0087D2]"
          aria-label="Compass Money home"
        >
          <CompassRoseLogo className="h-9 w-9 shrink-0 text-slate-600" />
          <span className="inline-flex w-max min-w-0 flex-col items-center leading-none text-center">
            <span
              className={cn(
                compassWordmark.className,
                "text-[18px] font-bold uppercase tracking-[-0.02em] text-slate-600",
              )}
            >
              COMPASS
            </span>
            <span
              className={cn(
                compassWordmark.className,
                "mt-0.5 text-[11px] font-medium lowercase tracking-wide text-slate-600 [font-variant-ligatures:none]",
              )}
            >
              money
            </span>
          </span>
        </Link>
      </div>

      <div
        className="flex flex-col gap-0.5 border-b border-slate-200 px-2 pb-2.5 pt-0.5"
        aria-label="Balances overview"
      >
        {SIDEBAR_SCOREBOARD.map((row) => {
          const Icon = row.icon
          return (
            <Link
              key={row.id}
              href={row.href}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-r-lg py-1 pl-3 pr-2 transition-colors duration-150 hover:bg-stone-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0087D2]"
            >
              <span className="inline-flex min-w-0 items-center gap-3 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <Icon
                  className="h-4 w-4 shrink-0 stroke-[1.5] text-slate-500"
                  aria-hidden
                />
                {row.label}
              </span>
              <span
                className={cn(
                  `text-[12px] font-bold tabular-nums leading-none ${amountInter.className}`,
                  row.valueClass,
                )}
              >
                {fmtSidebarCurrency(row.value)}
              </span>
            </Link>
          )
        })}
      </div>

      <nav className="flex flex-col py-2">
        <ul className="flex flex-col gap-0.5 px-2">
          {dashboardPrimaryNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const isMyJourney = item.href === "/my-journey"
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-r-lg py-2.5 pl-3 pr-2 text-sm font-medium transition-[background-color,color] duration-200",
                    isMyJourney
                      ? isActive
                        ? "bg-orange-100/90 font-semibold text-orange-700/90"
                        : "text-orange-700/90 hover:bg-orange-100/70"
                      : isActive
                        ? "bg-[#0087D2]/10 font-semibold text-[#0087D2]"
                        : "text-stone-500 hover:bg-stone-200/60 hover:text-slate-700",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <item.icon
                      className={cn(
                        "shrink-0 stroke-[1.5]",
                        isMyJourney ? "h-[1.125rem] w-[1.125rem] text-orange-700/90" : "h-4 w-4",
                        !isMyJourney && isActive ? "text-[#0087D2]" : "",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        isMyJourney && myJourneyNav.className,
                        isMyJourney &&
                          "text-lg font-semibold leading-snug tracking-normal",
                      )}
                    >
                      {item.name}
                    </span>
                  </span>
                  {isActive && (
                    <ChevronRight
                      className={cn(
                        "pointer-events-none h-3.5 w-3.5 shrink-0 stroke-[1.75]",
                        isMyJourney ? "text-orange-700/90" : "text-[#004a73]",
                      )}
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 flex flex-col">
          <div className="px-2 pb-2.5">
            <Link
              href={dashboardReferNav.href}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md border border-slate-200/90 bg-white/70 px-2.5 py-2 text-left shadow-sm transition-[background-color,border-color,box-shadow] duration-200",
                pathname === "/refer" || pathname.startsWith("/refer/")
                  ? "border-[#0087D2]/35 bg-[#0087D2]/5 ring-1 ring-[#0087D2]/20"
                  : "hover:border-teal-200/90 hover:bg-teal-50/80 hover:shadow",
              )}
              aria-label="Refer a friend — share your link and earn rewards"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ReferIcon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 stroke-[1.5]",
                    pathname === "/refer" || pathname.startsWith("/refer/")
                      ? "text-[#0087D2]"
                      : "text-teal-600",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "min-w-0 text-[11px] font-semibold leading-tight",
                    pathname === "/refer" || pathname.startsWith("/refer/")
                      ? "text-[#0087D2]"
                      : "text-slate-600",
                  )}
                >
                  {dashboardReferNav.name}
                </span>
              </span>
              {(pathname === "/refer" || pathname.startsWith("/refer/")) && (
                <ChevronRight
                  className="pointer-events-none h-3.5 w-3.5 shrink-0 stroke-[1.75] text-[#004a73]"
                  aria-hidden
                />
              )}
            </Link>
          </div>

          <div className="border-t border-stone-200/90 pt-3">
            <div className="mb-2.5 flex items-center gap-2.5 px-2 pl-2.5 pr-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200/90 text-[10px] font-semibold tracking-tight text-slate-600"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-tight text-slate-600">{DISPLAY_NAME}</p>
              </div>
            </div>

            <ul className="flex flex-col gap-1 px-2">
              {dashboardSecondaryNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex w-full items-center justify-between gap-2 rounded-md py-2 pl-2.5 pr-2 text-xs font-medium transition-[background-color,color] duration-200 ${
                        isActive
                          ? "bg-stone-200/80 text-slate-800"
                          : "text-stone-600 hover:bg-stone-200/60 hover:text-slate-800"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <item.icon className="h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                        <span className="truncate">{item.name}</span>
                      </span>
                      {isActive && (
                        <ChevronRight
                          className="pointer-events-none h-3.5 w-3.5 shrink-0 stroke-[1.75] text-[#004a73]"
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
              <li className="mt-2 border-t border-dashed border-stone-300/80 pt-2">
                <button
                  type="button"
                  className="group flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-left text-[11px] font-normal text-stone-600 transition-[background-color,color] duration-200 hover:bg-rose-100 hover:text-rose-900"
                >
                  <LogOut className="h-3 w-3 shrink-0 stroke-[1.5] text-stone-500 transition-colors group-hover:text-rose-800" />
                  <span>Log out</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-stone-200/80 py-4 pl-6 pr-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-400">v1.0 Beta</div>
        <ul className="mt-2 flex flex-col gap-0.5">
          {dashboardBetaFooterNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md py-2 pl-2.5 pr-2 text-xs font-medium transition-[background-color,color] duration-200",
                    isActive
                      ? "bg-stone-200/80 text-slate-800"
                      : "text-stone-600 hover:bg-stone-200/60 hover:text-slate-800",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <item.icon className="h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                    <span className="truncate">{item.name}</span>
                  </span>
                  {isActive && (
                    <ChevronRight
                      className="pointer-events-none h-3.5 w-3.5 shrink-0 stroke-[1.75] text-[#004a73]"
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
