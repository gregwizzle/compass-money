"use client"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { myJourneyNav } from "@/lib/fonts"
import { Sparkles } from "lucide-react"

type ArchiveYearModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  year?: number
  nextYear?: number
  /** When true, archive action is available. Demo stays locked. */
  isReadyToArchive?: boolean
}

export function ArchiveYearModal({
  isOpen,
  onOpenChange,
  year = 2026,
  nextYear = 2027,
  isReadyToArchive = false,
}: ArchiveYearModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-slate-200 bg-white p-0">
        <div className="px-6 py-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
              {isReadyToArchive ? `Archive ${year}` : "How Archiving Works"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-6 border-y border-slate-100 bg-slate-50 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
              1
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Close out {year}
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                After you Cash Out December, archiving locks that year&apos;s
                Timeline as read-only history you can revisit anytime.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0087D2]/20 font-bold text-[#0087D2]">
              2
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0087D2]">
                Carry forward your blueprint
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Recurring bills, living funds, and income from your Roadmap roll
                into {nextYear} so you don&apos;t rebuild from scratch.
                <span className="mt-1.5 block text-[13px] italic text-slate-500">
                  (One-time purchases stay with {year} only.)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              3
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-700">
                Start {nextYear} fresh
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Your ending Stash becomes the Starting Stash for {nextYear}, and
                a new live year opens on your Timeline.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col items-center gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <p
            className={`flex items-center gap-1.5 text-lg font-medium italic text-orange-700/90 ${myJourneyNav.className}`}
          >
            {isReadyToArchive ? `Ready for ${nextYear}?` : "Keep planning!"}
            <Sparkles className="h-4 w-4 text-orange-700/80" />
          </p>
          <div className="flex w-full flex-col items-center gap-1.5 sm:w-auto sm:items-end">
            {!isReadyToArchive ? (
              <span className="text-[11px] font-medium italic text-slate-500">
                Unlocks after Dec Cashout
              </span>
            ) : null}
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50 sm:flex-none"
              >
                {isReadyToArchive ? "Cancel" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => isReadyToArchive && onOpenChange(false)}
                disabled={!isReadyToArchive}
                className={`flex-1 rounded px-6 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all sm:flex-none ${
                  isReadyToArchive
                    ? "bg-[#0087D2] hover:bg-[#006BB3]"
                    : "cursor-not-allowed bg-slate-300 opacity-90"
                }`}
              >
                Archive
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
