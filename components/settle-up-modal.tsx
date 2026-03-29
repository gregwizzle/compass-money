"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { amountInter, myJourneyNav } from "@/lib/fonts"
import { Sparkles, Wallet } from "lucide-react"

type SettleUpModalProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentMonth?: string
  nextMonth?: string
  startingFunds?: number
  totalExpenses?: number
  cashoutAmount?: number
  currentStashAmount?: number
  isReadyToCashOut?: boolean
}

export function SettleUpModal({
  isOpen,
  onOpenChange,
  currentMonth = "March",
  nextMonth = "April",
  startingFunds = 6000,
  totalExpenses = 5250,
  cashoutAmount = 750,
  currentStashAmount = 2450,
  isReadyToCashOut = false, // Default to false so it acts as a preview
}: SettleUpModalProps) {
  const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden bg-white border-slate-200">
        <div className="px-6 py-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
              {isReadyToCashOut ? `Settle Up ${currentMonth}` : "How Cash Out Works"}
            </DialogTitle>
            {isReadyToCashOut && (
              <DialogDescription className="text-slate-500 mt-1">
                Finalize this month's activity and prepare your Stash for what's next.
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {isReadyToCashOut ? (
          // --- ACTUAL CASHOUT MODE (MATH) ---
          <div className="px-6 py-5 bg-slate-50 border-y border-slate-100 flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Starting Funds</span>
                <span className={`text-sm font-medium text-slate-700 tabular-nums ${amountInter.className}`}>
                  {fmtCurrency(startingFunds)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Actual Expenses</span>
                <span className={`text-sm font-medium text-slate-700 tabular-nums ${amountInter.className}`}>
                  -{fmtCurrency(totalExpenses)}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-1 w-full" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Remaining Cashout</span>
                <span className={`text-lg font-bold text-emerald-700 tabular-nums ${amountInter.className}`}>
                  +{fmtCurrency(cashoutAmount)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col p-4 bg-[#0087D2]/5 rounded-lg border border-[#0087D2]/20 gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-white p-1.5 rounded-md shadow-sm border border-[#0087D2]/10">
                  <Wallet className="w-4 h-4 text-[#0087D2]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#006BB3] tracking-tight">Moving to your Stash</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your cashout is secured. You are starting {nextMonth} with a clean slate!
                  </p>
                </div>
              </div>
              
              <div className="mt-1 flex flex-col gap-1.5 pt-3 border-t border-[#0087D2]/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Current Stash</span>
                  <span className={`text-xs font-medium text-slate-600 tabular-nums ${amountInter.className}`}>
                    {fmtCurrency(currentStashAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{currentMonth} Cashout</span>
                  <span className={`text-xs font-medium text-emerald-600 tabular-nums ${amountInter.className}`}>
                    +{fmtCurrency(cashoutAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-700">New Stash Balance</span>
                  <span className={`text-sm font-bold text-[#0087D2] tabular-nums ${amountInter.className}`}>
                    {fmtCurrency(currentStashAmount + cashoutAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // --- EDUCATIONAL PREVIEW MODE (NO MATH) ---
          <div className="px-6 py-6 bg-slate-50 border-y border-slate-100 flex flex-col gap-6">
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Finalize {currentMonth}</h4>
                <p className="text-sm text-slate-600 mt-1">We tally up your actual expenses and subtract them from your Starting Funds.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0087D2]/20 text-[#0087D2] font-bold shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0087D2]">Sweep the Cashout</h4>
                <p className="text-sm text-slate-600 mt-1">
                  The remaining amount becomes your Cashout and is safely added to your Stash.
                  <span className="block mt-1.5 text-[13px] italic text-slate-500">
                    (If you overspent, the difference will be deducted from your Stash instead.)
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-700">Start Fresh</h4>
                <p className="text-sm text-slate-600 mt-1">Your {currentMonth} Income rolls over to become your Starting Funds for {nextMonth}!</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 bg-white sm:justify-between items-center sm:items-center border-t border-slate-100 flex-col sm:flex-row gap-3 sm:gap-0">
          <p className={`text-lg italic font-medium text-orange-700/90 ${myJourneyNav.className} flex items-center gap-1.5`}>
            {isReadyToCashOut ? `Ready for ${nextMonth}?` : "Keep it up!"}
            <Sparkles className="w-4 h-4 text-orange-700/80" />
          </p>
          <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
            {!isReadyToCashOut && (
              <span className="text-[11px] font-medium text-slate-500 italic">
                Unlocks {nextMonth} 1st
              </span>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors uppercase tracking-wide"
              >
                {isReadyToCashOut ? "Cancel" : "Close"}
              </button>
              <button
                onClick={() => isReadyToCashOut && onOpenChange(false)}
                disabled={!isReadyToCashOut}
                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white rounded shadow-sm uppercase tracking-wide transition-all ${
                  isReadyToCashOut 
                    ? "bg-[#0087D2] hover:bg-[#006BB3]" 
                    : "bg-slate-300 cursor-not-allowed opacity-90"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
