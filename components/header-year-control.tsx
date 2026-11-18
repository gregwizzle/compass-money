"use client"

import { useMemo } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getArchivedBudgetYears,
  getLiveBudgetYear,
} from "@/lib/budget-month"
import { cn } from "@/lib/utils"

type HeaderYearControlProps = {
  /** Compact single-line `2026 ▾` for Timeline2 month strip. */
  variant?: "default" | "compact"
}

export function HeaderYearControl({ variant = "default" }: HeaderYearControlProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const liveYear = useMemo(() => getLiveBudgetYear(), [])
  const archivedYears = useMemo(
    () => getArchivedBudgetYears(liveYear),
    [liveYear],
  )

  const { displayYear, isArchiveView } = useMemo(() => {
    const raw = searchParams.get("year")
    if (raw === null || raw === "") {
      return { displayYear: liveYear, isArchiveView: false }
    }
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) {
      return { displayYear: liveYear, isArchiveView: false }
    }
    if (n === liveYear) {
      return { displayYear: liveYear, isArchiveView: false }
    }
    if (archivedYears.includes(n)) {
      return { displayYear: n, isArchiveView: true }
    }
    return { displayYear: liveYear, isArchiveView: false }
  }, [searchParams, liveYear, archivedYears])

  const pushParams = (params: URLSearchParams) => {
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname)
  }

  const selectArchiveYear = (y: number) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("year", String(y))
    pushParams(next)
  }

  const returnToCurrentYear = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete("year")
    pushParams(next)
  }

  const archivesMenu = (
    <DropdownMenuContent
      align={variant === "compact" ? "start" : "end"}
      className="min-w-[9rem] font-sans"
    >
      <DropdownMenuItem
        className="flex cursor-pointer items-center gap-2 text-sm"
        onSelect={returnToCurrentYear}
      >
        <span>{liveYear}</span>
        {!isArchiveView ? (
          <Check className="ml-auto size-4 opacity-70" aria-hidden />
        ) : null}
      </DropdownMenuItem>
      {archivedYears.length > 0 ? (
        archivedYears.map((y) => (
          <DropdownMenuItem
            key={y}
            className="flex cursor-pointer items-center gap-2 text-sm"
            onSelect={() => selectArchiveYear(y)}
          >
            <span>{y}</span>
            {y === displayYear && isArchiveView ? (
              <Check className="ml-auto size-4 opacity-70" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))
      ) : (
        <DropdownMenuItem disabled className="text-xs text-slate-500">
          No archived years yet
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  )

  if (variant === "compact") {
    return (
      <div
        className="flex shrink-0 items-center gap-1 font-sans"
        role="navigation"
        aria-label="Budget year"
      >
        {isArchiveView ? (
          <button
            type="button"
            onClick={returnToCurrentYear}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-stone-200/80 hover:text-slate-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Return to current year"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-1 text-sm font-semibold tabular-nums text-slate-700",
                "outline-none transition-colors hover:bg-stone-100 hover:text-slate-900",
                "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
              )}
              aria-label="Open budget year archives"
            >
              {displayYear}
              <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          {archivesMenu}
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div
      className="flex shrink-0 items-end justify-end gap-1.5 font-sans"
      role="navigation"
      aria-label="Budget year"
    >
      {isArchiveView ? (
        <button
          type="button"
          onClick={returnToCurrentYear}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-stone-200/80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Return to current year"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      ) : null}

      <div className="inline-grid min-w-0 max-w-full grid-cols-1 gap-1.5 justify-items-stretch py-0.5 leading-tight">
        <div className="flex min-w-0 w-full items-center justify-end gap-0.5">
          <span
            className={cn(
              "text-base font-medium tabular-nums tracking-normal text-slate-700",
              "antialiased",
            )}
          >
            {displayYear}
          </span>
          <ChevronDown
            className="size-3 shrink-0 opacity-0"
            aria-hidden
          />
        </div>

        <div className="min-w-0 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-w-0 w-full cursor-pointer items-center justify-end gap-0.5 text-[10px] font-medium text-slate-500",
                  "underline-offset-2 hover:text-slate-700 hover:underline",
                  "outline-none focus-visible:text-slate-700 focus-visible:underline",
                  "focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
                )}
                aria-label="Open archived budget years"
              >
                Archives
                <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            {archivesMenu}
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
