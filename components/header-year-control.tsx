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

export function HeaderYearControl() {
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
                  "flex min-w-0 w-full items-center justify-end gap-0.5 text-[10px] font-medium text-slate-500",
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
            <DropdownMenuContent align="end" className="min-w-[9rem] font-sans">
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
                <DropdownMenuItem
                  disabled
                  className="text-xs text-slate-500"
                >
                  No archived years yet
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
