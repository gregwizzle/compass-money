"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { RoadmapCategoriesGrid } from "@/components/roadmap-categories-grid"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import { cn } from "@/lib/utils"

export type RoadmapFullScreenDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  monthTitle: string
  categories: TimelineCategory[]
}

/**
 * Nearly full-viewport overlay for the category roadmap (sample layout).
 */
export function RoadmapFullScreenDialog({
  open,
  onOpenChange,
  monthTitle,
  categories,
}: RoadmapFullScreenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!fixed !inset-3 flex !h-[calc(100vh-1.5rem)] !max-h-[calc(100vh-1.5rem)] !w-[calc(100vw-1.5rem)] !max-w-none !translate-x-0 !translate-y-0 !gap-0 !p-0 flex-col overflow-hidden rounded-xl border-2 border-slate-500 bg-stone-50 shadow-2xl",
          "sm:!inset-6 sm:!h-[calc(100vh-3rem)] sm:!max-h-[calc(100vh-3rem)] sm:!w-[calc(100vw-3rem)]",
          "[&>button]:text-slate-600 [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-900",
        )}
      >
        <div className="flex shrink-0 items-center border-b border-slate-200 bg-slate-50/95 px-4 py-3 pr-14">
          <DialogTitle className="text-base font-black tracking-tight text-slate-950">
            {monthTitle} Roadmap
          </DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {open ? (
            <RoadmapCategoriesGrid
              key={monthTitle}
              categories={categories}
              variant="overlay"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
