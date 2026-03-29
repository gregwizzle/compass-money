"use client"

import { ExternalLink, Layers, Receipt, Sparkles, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const budgetCategories: {
  name: string
  icon: LucideIcon
  iconColor: string
  label: string | null
  available: number | null
  amount: number
}[] = [
  {
    name: "Fixed Essentials",
    icon: Layers,
    iconColor: "text-sky-600",
    label: null,
    available: null,
    amount: 1830,
  },
  {
    name: "Variable Living",
    icon: Receipt,
    iconColor: "text-yellow-700",
    label: null,
    available: 400,
    amount: 700,
  },
  {
    name: "My Vibe",
    icon: Sparkles,
    iconColor: "text-purple-500",
    label: null,
    available: 145,
    amount: 300,
  },
]

export function ThePulse() {
  return (
    <div className="bg-white rounded-sm border border-slate-200 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          The Pulse
        </h2>
        <button className="text-[#0087D2] text-[11px] flex items-center gap-1 hover:text-[#006BB3]">
          March Plan <ExternalLink className="h-3 w-3 stroke-[1.5]" />
        </button>
      </div>

      {/* Starting Funds - Tight layout, value right-aligned over amounts */}
      <div className="mb-3 flex items-center justify-between px-1.5">
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tight text-slate-800">March</span>
          <span className="mt-1 text-[11px] font-bold leading-tight text-slate-600">Starting Funds</span>
        </div>
        <span className="w-[70px] self-center text-right text-sm font-bold tabular-nums text-slate-600 font-mono">
          $6,000
        </span>
      </div>

      {/* Budget Categories - Dense rows */}
      <div className="flex flex-col gap-0">
        {budgetCategories.map((category) => (
          <div 
            key={category.name} 
            className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50/50 transition-colors rounded-sm"
          >
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-2">
              <category.icon className={`w-4 h-4 ${category.iconColor} stroke-[1.5]`} />
              <span className="text-slate-600 font-medium text-sm">{category.name}</span>
            </div>
            
            {/* Right: Tag + Amount (within 30px) */}
            <div className="flex items-center gap-2">
              {category.label && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-semibold uppercase tracking-wide rounded-sm">
                  {category.label}
                </span>
              )}
              {category.available && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-sm",
                    category.name === "Variable Living"
                      ? "bg-yellow-100 text-yellow-900"
                      : "bg-emerald-100 text-teal-700",
                  )}
                >
                  ${category.available} Left
                </span>
              )}
              <span className="text-slate-600 font-medium text-sm tabular-nums font-mono w-[70px] text-right">
                −${category.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summation Line */}
      <div className="border-t border-slate-100 mt-3 pt-2">
        <div className="flex items-center justify-end gap-4">
          <span className="text-slate-400 font-medium text-xs">Expected Profit</span>
          <span className="text-xl font-black text-emerald-600 tabular-nums font-mono">
            $3,170
          </span>
        </div>
      </div>
    </div>
  )
}
