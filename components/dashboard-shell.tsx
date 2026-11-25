"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { cn } from "@/lib/utils"

/**
 * Layout shell for the dashboard. `/timeline-beta` uses a tighter “hybrid” chrome:
 * sidebar + main sit in one centered cluster (similar idea to sportsYou’s app shell —
 * see https://sportsyou.com/ ) instead of a very wide 1280px card with lots of empty flank.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBetaHybrid =
    pathname === "/timeline-beta" || pathname.startsWith("/timeline-beta/")
  const isSurgical =
    pathname === "/captains-chair" || pathname.startsWith("/captains-chair/")

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#B8D8EC] p-4">
      <div
        className={cn(
          "shrink-0",
          isBetaHybrid ? "w-full max-w-5xl" : "w-[1280px] max-w-full",
        )}
      >
        <div
          className={cn(
            "box-border flex w-full flex-row items-stretch overflow-hidden",
            isSurgical
              ? "w-[1280px] rounded-[2px] bg-stone-100 shadow-none ring-1 ring-slate-200"
              : "rounded-xl border-2 border-slate-500 bg-stone-100 shadow-xl",
            isBetaHybrid && !isSurgical && "max-w-5xl border-slate-400/90 shadow-lg",
          )}
        >
          <AppSidebar
            variant={isSurgical ? "surgical" : isBetaHybrid ? "hybrid" : "default"}
          />
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              isBetaHybrid && "min-w-0 rounded-r-[10px] bg-stone-50/80",
              isSurgical && "bg-stone-100",
            )}
          >
            <DashboardHeader />
            <div
              id="dashboard-main-pane"
              className={cn(
                "relative flex min-h-0 flex-1 flex-col",
                isSurgical && "bg-stone-100",
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="h-16 shrink-0" aria-hidden />
    </div>
  )
}
