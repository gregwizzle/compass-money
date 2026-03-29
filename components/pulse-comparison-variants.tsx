"use client"

import { Layers, Receipt, Sparkles, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const STARTING_FUNDS = 6000
const EXPECTED_AFTER_PLAN = 3170

type Category = {
  name: string
  icon: LucideIcon
  iconColor: string
  budget: number
  remaining: number
}

function daysLeftInMonth(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  const day = date.getDate()
  return Math.max(1, lastDay - day + 1)
}

const CATEGORIES: Category[] = [
  {
    name: "Fixed Essentials",
    icon: Layers,
    iconColor: "text-sky-600",
    budget: 1830,
    remaining: 0,
  },
  {
    name: "Variable Living",
    icon: Receipt,
    iconColor: "text-yellow-700",
    budget: 700,
    remaining: 400,
  },
  {
    name: "My Vibe",
    icon: Sparkles,
    iconColor: "text-purple-500",
    budget: 300,
    remaining: 145,
  },
]

/** Label stack — matches Pulse snapshot; used in comparison cards 1–4. */
function MarchStartingFundsLine() {
  return (
    <div className="flex items-center justify-between px-0.5">
      <div className="flex flex-col leading-none">
        <span className="text-xl font-black tracking-tight text-slate-800">March</span>
        <span className="mt-1 text-[11px] font-bold leading-tight text-slate-600">Starting Funds</span>
      </div>
      <span className="w-[70px] self-center text-right text-sm font-bold tabular-nums text-slate-600 font-mono">
        ${STARTING_FUNDS.toLocaleString()}
      </span>
    </div>
  )
}

/** Same component — keeps stale HMR / cached bundles that still reference the old name from crashing. */
const MarchPoolHeader = MarchStartingFundsLine

function PulseCardShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function FooterExpected({ noDivider }: { noDivider?: boolean }) {
  return (
    <div className={cn("pt-2", !noDivider && "border-t border-slate-100")}>
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs font-medium text-slate-400">Expected Profit</span>
        <span className="text-lg font-black tabular-nums text-emerald-600">
          ${EXPECTED_AFTER_PLAN.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

/** Shell = full budget capacity; flat fill = remaining (site vibe: sharp corners, slate frame). */
function VerticalDrainTank({
  budget,
  remaining,
}: {
  budget: number
  remaining: number
}) {
  const pctRemaining = budget > 0 ? (remaining / budget) * 100 : 0

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1.5 text-center">
        <p className="text-sm font-bold tabular-nums leading-tight text-slate-800">
          ${budget.toLocaleString()}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">reserved</p>
      </div>

      <div
        className="relative mx-auto h-[7.5rem] w-[3.5rem] overflow-hidden rounded-sm border border-slate-200 bg-slate-50"
        title="Shell = full bucket; fill drains down as you spend"
      >
        <div className="absolute inset-px bg-slate-100">
          {pctRemaining > 0 ? (
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col justify-center bg-[#0087D2]/18 transition-[height] duration-500 ease-out"
              style={{ height: `${pctRemaining}%`, minHeight: 4 }}
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-center">
                <span className="text-[10px] font-bold tabular-nums leading-tight text-slate-800">
                  ${remaining.toLocaleString()}
                </span>
                <span className="text-[7px] font-semibold uppercase tracking-wide text-slate-600">
                  left
                </span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <span className="text-[10px] font-bold tabular-nums text-slate-500">$0</span>
              <span className="text-[7px] font-medium uppercase text-slate-400">left</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SIGHT_GLASS_TICKS = [0.25, 0.5, 0.75, 1] as const

/** Rectangular sight glass — flat liquid, surface line, etched tick scale. */
function VerticalDrainTankSightGlass({
  budget,
  remaining,
}: {
  budget: number
  remaining: number
}) {
  const pctRemaining = budget > 0 ? (remaining / budget) * 100 : 0

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1.5 text-center font-mono">
        <p className="text-sm font-bold tabular-nums leading-tight text-slate-800">
          ${budget.toLocaleString()}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">reserved</p>
      </div>

      <div
        className="relative mx-auto h-[7.5rem] w-[3.5rem] overflow-hidden rounded-sm border border-slate-300 bg-slate-50"
        title="Sight glass — flat fill; ticks at 25 / 50 / 75 / 100%"
      >
        <div className="absolute inset-px overflow-hidden rounded-sm bg-slate-100">
          {pctRemaining > 0 ? (
            <div
              className="absolute bottom-0 left-0 right-0 box-border flex flex-col border-t-2 border-emerald-500 bg-emerald-600 transition-[height] duration-500 ease-out"
              style={{ height: `${pctRemaining}%`, minHeight: 4 }}
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-center font-mono">
                <span className="text-[10px] font-bold tabular-nums leading-tight text-white drop-shadow-sm">
                  ${remaining.toLocaleString()}
                </span>
                <span className="text-[7px] font-semibold uppercase tracking-wide text-white/90">left</span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center font-mono">
              <span className="text-[10px] font-bold tabular-nums text-slate-500">$0</span>
              <span className="text-[7px] font-medium uppercase text-slate-400">left</span>
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-2"
          aria-hidden
        >
          {SIGHT_GLASS_TICKS.map((fromBottom) => (
            <div
              key={fromBottom}
              className="absolute right-0 h-px w-2 bg-slate-500/90"
              style={{ bottom: `${fromBottom * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Trunk + bar + three drops — reads as starting funds flowing into each bucket. */
function StartingFundsFlowSvg() {
  return (
    <svg
      viewBox="0 0 300 40"
      className="h-10 w-full text-[#0087D2]"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sf-flow-trunk" x1="150" y1="0" x2="150" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Source dot — ties to the total above */}
      <circle cx="150" cy="2" r="2.5" className="fill-[#0087D2]" opacity={0.85} />
      {/* Trunk */}
      <path
        d="M 150 4 L 150 11"
        stroke="url(#sf-flow-trunk)"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
      {/* Distributor bar */}
      <path
        d="M 56 11 L 244 11"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />
      {/* Into each column */}
      <path
        d="M 56 11 L 56 38 M 150 11 L 150 38 M 244 11 L 244 38"
        stroke="currentColor"
        strokeOpacity={0.5}
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** Same geometry as StartingFundsFlowSvg, vertically flipped — flows up from buckets toward Expected Profit. */
function EndingFundsFlowSvg() {
  return (
    <svg
      viewBox="0 0 300 40"
      className="h-10 w-full text-[#0087D2]"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sf-flow-trunk-end" x1="150" y1="0" x2="150" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g transform="translate(0,40) scale(1,-1)">
        <circle cx="150" cy="2" r="2.5" className="fill-[#0087D2]" opacity={0.85} />
        <path
          d="M 150 4 L 150 11"
          stroke="url(#sf-flow-trunk-end)"
          strokeWidth="2.25"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 56 11 L 244 11"
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 56 11 L 56 38 M 150 11 L 150 38 M 244 11 L 244 38"
          stroke="currentColor"
          strokeOpacity={0.5}
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}

/** 1px orthogonal flow — sharp 90° joins, no gradients. */
function StartingFundsFlowSvgThin() {
  const s = "#0087D2"
  return (
    <svg
      viewBox="0 0 300 40"
      className="h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="149" y="0" width="2" height="2" fill={s} />
      <path d="M 150 2 L 150 11" stroke={s} strokeWidth={1} strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
      <path
        d="M 56 11 L 244 11"
        stroke={s}
        strokeOpacity={0.5}
        strokeWidth={1}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M 56 11 L 56 38 M 150 11 L 150 38 M 244 11 L 244 38"
        stroke={s}
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  )
}

function EndingFundsFlowSvgThin() {
  const s = "#0087D2"
  return (
    <svg
      viewBox="0 0 300 40"
      className="h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g transform="translate(0,40) scale(1,-1)">
        <rect x="149" y="0" width="2" height="2" fill={s} />
        <path d="M 150 2 L 150 11" stroke={s} strokeWidth={1} strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
        <path
          d="M 56 11 L 244 11"
          stroke={s}
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          fill="none"
        />
        <path
          d="M 56 11 L 56 38 M 150 11 L 150 38 M 244 11 L 244 38"
          stroke={s}
          strokeOpacity={0.55}
          strokeWidth={1}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          fill="none"
        />
      </g>
    </svg>
  )
}

function VerticalTanksCard() {
  return (
    <PulseCardShell
      title="Vertical draining tanks"
      subtitle="Starting funds total above the buckets. Labels sit under each tank with icon + name."
    >
      <div className="flex flex-col gap-0">
        <span className="mb-1 self-start text-xl font-black leading-none tracking-tight text-slate-800">
          March
        </span>
        <div className="flex flex-wrap items-baseline justify-center gap-2 pb-2 text-center">
          <span className="text-[11px] font-bold leading-tight text-slate-600">Starting Funds</span>
          <span className="text-sm font-bold tabular-nums text-slate-600 font-mono">
            ${STARTING_FUNDS.toLocaleString()}
          </span>
        </div>
        <div className="relative -mx-1 px-1">
          <StartingFundsFlowSvg />
        </div>
        <div className="mt-1 flex flex-row flex-wrap items-end justify-center gap-4 px-1 sm:gap-5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="flex w-[8rem] min-w-[8rem] shrink-0 flex-col items-center gap-2"
            >
              <VerticalDrainTank budget={cat.budget} remaining={cat.remaining} />
              <div className="flex w-full items-center justify-center gap-1.5">
                <cat.icon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", cat.iconColor)} />
                <span className="text-[10px] font-semibold leading-tight text-slate-800">{cat.name}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="relative -mx-1 mt-1 px-1">
          <EndingFundsFlowSvg />
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-2 pb-2 pt-1 text-center">
          <span className="text-[11px] font-bold leading-tight text-slate-600">Expected Profit</span>
          <span className="text-sm font-bold tabular-nums text-slate-600 font-mono">
            ${EXPECTED_AFTER_PLAN.toLocaleString()}
          </span>
        </div>
      </div>
    </PulseCardShell>
  )
}

function VerticalTanksCardSightGlass() {
  const days = daysLeftInMonth()
  const variable = CATEGORIES.find((c) => c.name === "Variable Living")
  const avgPerDay =
    variable && days > 0 ? Math.round((variable.remaining / days) * 10) / 10 : 0

  return (
    <PulseCardShell
      title="Vertical tanks · sight glass"
      subtitle="Machined sight glasses with flat liquid, surface line, scale ticks, and thin orthogonal flow lines."
    >
      <div className="flex flex-col gap-0 font-mono">
        <span className="mb-1 self-start text-xl font-black leading-none tracking-tight text-slate-800">
          March
        </span>
        <div className="flex flex-wrap items-baseline justify-center gap-2 pb-2 text-center">
          <span className="text-[11px] font-bold leading-tight text-slate-600">Starting Funds</span>
          <span className="text-sm font-bold tabular-nums text-slate-600">
            ${STARTING_FUNDS.toLocaleString()}
          </span>
        </div>
        <div className="relative -mx-1 px-1">
          <StartingFundsFlowSvgThin />
        </div>
        <div className="mt-1 flex flex-row flex-wrap items-end justify-center gap-4 px-1 sm:gap-5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="flex w-[8rem] min-w-[8rem] shrink-0 flex-col items-center gap-2"
            >
              <VerticalDrainTankSightGlass budget={cat.budget} remaining={cat.remaining} />
              <div className="flex w-full flex-col items-center gap-0.5">
                <div className="flex items-center justify-center gap-1.5">
                  <cat.icon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", cat.iconColor)} />
                  <span className="text-[10px] font-semibold leading-tight text-slate-800">{cat.name}</span>
                </div>
                {cat.name === "Variable Living" && (
                  <p className="text-[8px] font-medium tabular-nums text-slate-500">
                    AVG ${avgPerDay.toLocaleString()}/DAY
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="relative -mx-1 mt-1 px-1">
          <EndingFundsFlowSvgThin />
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-2 pb-2 pt-1 text-center">
          <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-600">
            profit
          </span>
          <span className="text-base font-black tabular-nums text-emerald-600 drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]">
            ${EXPECTED_AFTER_PLAN.toLocaleString()}
          </span>
        </div>
      </div>
    </PulseCardShell>
  )
}

/** Option 1: Thin strip — track = full budget; remaining (left) drains toward the right as spent grows */
function RowThinStrip({ cat }: { cat: Category }) {
  const spent = cat.budget - cat.remaining
  const pctRemaining = cat.budget > 0 ? (cat.remaining / cat.budget) * 100 : 0

  return (
    <div className="rounded-sm px-1.5 py-2 hover:bg-slate-50/60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
          <div>
            <span className="text-sm font-medium text-slate-700">{cat.name}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-lg font-bold tabular-nums text-slate-800">
            ${cat.budget.toLocaleString()}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            reserved
          </span>
        </div>
      </div>
      <div className="mt-2 pl-6">
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-sm bg-slate-200/90"
          title="Remaining drains left → right"
        >
          <div
            className="h-full origin-left rounded-sm bg-gradient-to-r from-emerald-500/85 to-emerald-400/70 transition-[width] duration-500"
            style={{ width: `${pctRemaining}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span className="text-emerald-800/80">${cat.remaining.toLocaleString()} left in bucket</span>
          <span>${spent.toLocaleString()} spent</span>
        </div>
      </div>
    </div>
  )
}

/** Option 2: Ring — track = full loop; blue arc length = remaining (shortens as you spend = draining) */
function RingGauge({
  budget,
  remaining,
}: {
  budget: number
  remaining: number
}) {
  const r = 15
  const c = 2 * Math.PI * r
  const pct = budget > 0 ? remaining / budget : 0
  const dash = c * pct

  return (
    <div className="relative h-14 w-14 shrink-0" title="Arc drains clockwise as spending uses the bucket">
      <svg viewBox="0 0 36 36" className="-rotate-90" width={56} height={56}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="#0087D2"
          strokeWidth="3"
          strokeOpacity={0.55}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-0.5">
        <span className="max-w-[3rem] text-center text-[9px] font-bold leading-tight tabular-nums text-slate-800">
          ${budget.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function RowRingArc({ cat }: { cat: Category }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm px-1.5 py-2 hover:bg-slate-50/60">
      <div className="flex min-w-0 items-center gap-2">
        <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
        <div>
          <span className="text-sm font-medium text-slate-700">{cat.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-lg font-bold tabular-nums text-slate-800">
            ${cat.budget.toLocaleString()}
          </span>
          <p className="text-[10px] text-slate-500">${cat.remaining.toLocaleString()} left</p>
        </div>
        <RingGauge budget={cat.budget} remaining={cat.remaining} />
      </div>
    </div>
  )
}

/** Option 3: Segmented — remaining blocks stay on the left; spent eats from the right (draining) */
function RowSegmentedTicks({ cat }: { cat: Category }) {
  const segments = 10
  const remainingSeg =
    cat.budget > 0 ? Math.min(segments, Math.round((cat.remaining / cat.budget) * segments)) : 0

  return (
    <div className="rounded-sm px-1.5 py-2 hover:bg-slate-50/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
          <span className="text-sm font-medium text-slate-700">{cat.name}</span>
        </div>
        <span className="text-lg font-bold tabular-nums text-slate-800">
          ${cat.budget.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 flex gap-0.5 pl-6">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-[1px]",
              i < remainingSeg
                ? "bg-emerald-500/55"
                : "bg-slate-300/80",
            )}
            title={i < remainingSeg ? "Still in bucket" : "Spent / committed"}
          />
        ))}
      </div>
      <p className="mt-1 pl-6 text-[10px] text-slate-500">
        {remainingSeg}/{segments} of bucket left · ${cat.remaining.toLocaleString()} remaining
      </p>
    </div>
  )
}

/** Option 4: Two-line — full track = budget; hairline fill = remaining (shrinks rightward = draining) */
function RowTwoLineNumeric({ cat }: { cat: Category }) {
  const pctLeft = cat.budget > 0 ? (cat.remaining / cat.budget) * 100 : 0

  return (
    <div className="rounded-sm px-1.5 py-2 hover:bg-slate-50/60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
          <span className="text-sm font-medium text-slate-700">{cat.name}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold tabular-nums text-slate-800">
            ${cat.budget.toLocaleString()}
          </span>
          <p className="text-xs text-slate-500">
            <span className="font-medium text-emerald-700/90">${cat.remaining.toLocaleString()} left</span>
            <span className="text-slate-400"> · </span>
            <span>{pctLeft.toFixed(0)}% of bucket left</span>
          </p>
          <div
            className="ml-auto mt-1 h-0.5 w-[7.5rem] overflow-hidden rounded-full bg-slate-200"
            title="Fill drains to the right as you spend"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-400/55"
              style={{ width: `${pctLeft}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 5 · Reserved + left only — no bars; ledger columns + calm hierarchy (snapshot, not a fill). */
function RowReservedLeftStatement({ cat }: { cat: Category }) {
  const leftMuted = cat.remaining === 0
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-x-4 border-b border-slate-100/90 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
        <span className="truncate text-[13px] font-semibold leading-snug text-slate-800">{cat.name}</span>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-bold tabular-nums leading-none text-slate-800">
          ${cat.budget.toLocaleString()}
        </p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">reserved</p>
      </div>
      <div className="min-w-[4.25rem] text-right">
        <p
          className={cn(
            "font-mono text-lg font-bold tabular-nums leading-none",
            leftMuted ? "text-slate-400" : "text-emerald-700",
          )}
        >
          ${cat.remaining.toLocaleString()}
        </p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">left</p>
      </div>
    </div>
  )
}

function ReservedLeftStatementCard() {
  return (
    <PulseCardShell
      title="5 · Statement · reserved / left"
      subtitle="Numbers only — two columns, no progress bars. Reads as a ledger line, not a vessel filling."
    >
      <MarchStartingFundsLine />
      <div className="rounded-sm border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white px-3 py-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 border-b border-slate-200/80 pb-2.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Category</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Reserved
          </span>
          <span className="min-w-[4.25rem] text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Left
          </span>
        </div>
        {CATEGORIES.map((cat) => (
          <RowReservedLeftStatement key={cat.name} cat={cat} />
        ))}
      </div>
      <FooterExpected />
    </PulseCardShell>
  )
}

/** 6 · Receipt slip — monospace, dashed frame; paper metaphor, not a meter. */
function RowTicketSlip({ cat }: { cat: Category }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dotted border-slate-300/90 py-2.5 font-mono last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <cat.icon className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", cat.iconColor)} />
        <span className="truncate text-xs font-semibold text-slate-700">{cat.name}</span>
      </div>
      <div className="flex flex-wrap items-baseline justify-end gap-4 text-xs tabular-nums">
        <span className="text-slate-600">
          RSV <span className="font-bold text-slate-800">${cat.budget.toLocaleString()}</span>
        </span>
        <span className={cn(cat.remaining === 0 ? "text-slate-400" : "text-emerald-700")}>
          LFT <span className="font-bold">${cat.remaining.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}

function TicketSlipCard() {
  return (
    <PulseCardShell
      title="6 · Ticket slip"
      subtitle="Receipt-style layout: RSV / LFT abbreviations, dotted rules. Feels like a slip, not a gauge."
    >
      <MarchStartingFundsLine />
      <div className="rounded-sm border-2 border-dashed border-slate-300 bg-[#fafaf9] px-3 py-2 shadow-sm">
        <p className="mb-2 border-b border-dotted border-slate-300 pb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Allocation printout
        </p>
        {CATEGORIES.map((cat) => (
          <RowTicketSlip key={cat.name} cat={cat} />
        ))}
      </div>
      <FooterExpected />
    </PulseCardShell>
  )
}

/** 7 · Paired chips — two static badges per row (balance labels, not a filling track). */
function RowDualChips({ cat }: { cat: Category }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-slate-50/90 px-3 py-2.5 ring-1 ring-inset ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
        <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="inline-flex items-baseline gap-1.5 rounded-sm border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-sm">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">reserved</span>
          <span className="font-mono font-bold tabular-nums text-slate-800">${cat.budget.toLocaleString()}</span>
        </span>
        <span
          className={cn(
            "inline-flex items-baseline gap-1.5 rounded-sm border px-2.5 py-1 text-xs shadow-sm",
            cat.remaining === 0
              ? "border-slate-200 bg-slate-100/80 text-slate-500"
              : "border-emerald-200/90 bg-emerald-50/90 text-emerald-800",
          )}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500/90">left</span>
          <span className="font-mono font-bold tabular-nums">${cat.remaining.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}

function DualChipCard() {
  return (
    <PulseCardShell
      title="7 · Paired chips"
      subtitle="Two labeled badges per category — compares balances side by side, not a single filling strip."
    >
      <MarchStartingFundsLine />
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => (
          <RowDualChips key={cat.name} cat={cat} />
        ))}
      </div>
      <FooterExpected />
    </PulseCardShell>
  )
}

/** 8 · Spine + nodes — vertical spine reads as sequence / checklist, not accumulation. */
function TimelineNodesCard() {
  return (
    <PulseCardShell
      title="8 · Spine & nodes"
      subtitle="A vertical line with nodes: snapshot checklist energy. Numbers in plain blocks — no tanks or fills."
    >
      <MarchStartingFundsLine />
      <div className="relative pl-7">
        <div
          className="absolute bottom-1 left-[11px] top-1 w-px bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200"
          aria-hidden
        />
        <ul className="flex flex-col gap-0">
          {CATEGORIES.map((cat, i) => (
            <li key={cat.name} className="relative pb-6 last:pb-0">
              <span
                className="absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 shadow-sm"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="rounded-sm border border-slate-100 bg-white px-3 py-2 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <cat.icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", cat.iconColor)} />
                    <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-right font-mono text-sm font-bold tabular-nums">
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        reserved
                      </span>
                      <span className="text-slate-800">${cat.budget.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        left
                      </span>
                      <span className={cat.remaining === 0 ? "text-slate-400" : "text-emerald-700"}>
                        ${cat.remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <FooterExpected />
    </PulseCardShell>
  )
}

/** 9 · Editorial type — oversized numerals, lots of air; magazine spread, not a gauge. */
function RowEditorialType({ cat }: { cat: Category }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <cat.icon className={cn("mt-0.5 h-5 w-5 shrink-0 stroke-[1.5]", cat.iconColor)} />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{cat.name}</p>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums leading-none tracking-tight text-slate-900">
            ${cat.budget.toLocaleString()}
            <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-widest text-slate-400">
              reserved
            </span>
          </p>
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">left</p>
        <p
          className={cn(
            "mt-1 font-mono text-3xl font-black tabular-nums leading-none tracking-tight",
            cat.remaining === 0 ? "text-slate-400" : "text-emerald-600",
          )}
        >
          ${cat.remaining.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

function EditorialTypeCard() {
  return (
    <PulseCardShell
      title="9 · Editorial type"
      subtitle="Big type + whitespace — reads like a spread, not a widget filling toward 100%."
    >
      <MarchStartingFundsLine />
      <div className="rounded-sm bg-slate-50/50 px-1">
        {CATEGORIES.map((cat) => (
          <RowEditorialType key={cat.name} cat={cat} />
        ))}
      </div>
      <FooterExpected />
    </PulseCardShell>
  )
}

export function PulseComparisonGrid() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <VerticalTanksCard />
      <VerticalTanksCardSightGlass />
      <PulseCardShell
        title="1 · Thin remainder strip"
        subtitle="Hero: reserved. Track = full bucket; green = remaining anchored left, drains toward the right."
      >
        <MarchStartingFundsLine />
        <div className="flex flex-col divide-y divide-slate-100">
          {CATEGORIES.map((cat) => (
            <RowThinStrip key={cat.name} cat={cat} />
          ))}
        </div>
        <FooterExpected />
      </PulseCardShell>

      <PulseCardShell
        title="2 · Ring / arc"
        subtitle="Gray ring = full bucket; blue arc length = remaining (shortens as you spend — drains, not fills)."
      >
        <MarchStartingFundsLine />
        <div className="flex flex-col divide-y divide-slate-100">
          {CATEGORIES.map((cat) => (
            <RowRingArc key={cat.name} cat={cat} />
          ))}
        </div>
        <FooterExpected />
      </PulseCardShell>

      <PulseCardShell
        title="3 · Segmented ticks"
        subtitle="Green blocks = still in bucket (left); gray = spent — spending eats from the right."
      >
        <MarchStartingFundsLine />
        <div className="flex flex-col divide-y divide-slate-100">
          {CATEGORIES.map((cat) => (
            <RowSegmentedTicks key={cat.name} cat={cat} />
          ))}
        </div>
        <FooterExpected />
      </PulseCardShell>

      <PulseCardShell
        title="4 · Two-line + hairline"
        subtitle="Hairline fill = remaining; shrinks from the right — same depleting read as option 1."
      >
        <MarchStartingFundsLine />
        <div className="flex flex-col divide-y divide-slate-100">
          {CATEGORIES.map((cat) => (
            <RowTwoLineNumeric key={cat.name} cat={cat} />
          ))}
        </div>
        <FooterExpected />
      </PulseCardShell>

      <ReservedLeftStatementCard />
      <TicketSlipCard />
      <DualChipCard />
      <TimelineNodesCard />
      <EditorialTypeCard />
    </div>
  )
}
