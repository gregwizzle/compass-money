"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import { RoadmapCategoriesGrid } from "@/components/roadmap-categories-grid"
import { RoadmapFullScreenDialog } from "@/components/roadmap-full-screen-dialog"

export type MonthRoadmapPanelProps = {
  /** e.g. "March" */
  monthTitle: string
  categories: TimelineCategory[]
  className?: string
}

/**
 * Timeline roadmap card: categories with expandable line items + full-screen overlay link.
 */
export function MonthRoadmapPanel({ monthTitle, categories, className }: MonthRoadmapPanelProps) {
  const [fullOpen, setFullOpen] = useState(false)

  return (
    <>
      <section
        className={cn(
          "flex w-full flex-col rounded-sm border border-slate-200 bg-white shadow-sm",
          className,
        )}
        aria-labelledby="month-roadmap-heading"
      >
        <header className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <h2
            id="month-roadmap-heading"
            className="min-w-0 truncate text-sm font-black tracking-tight text-slate-950"
          >
            {monthTitle} Roadmap
          </h2>
          <button
            type="button"
            onClick={() => setFullOpen(true)}
            className="shrink-0 text-[11px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
          >
            Full screen
          </button>
        </header>

        <div className="p-3">
          <RoadmapCategoriesGrid categories={categories} variant="compact" />
        </div>
      </section>

      <RoadmapFullScreenDialog
        open={fullOpen}
        onOpenChange={setFullOpen}
        monthTitle={monthTitle}
        categories={categories}
      />
    </>
  )
}
