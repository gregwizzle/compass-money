"use client"

export function IncomeTank() {
  const expectedAmount = 3200
  const percentFilled = 53

  return (
    <div className="bg-white rounded-sm border border-slate-200 p-5">
      {/* Header */}
      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
        Income Tank
      </h2>

      {/* Content */}
      <div>
        {/* Progress bar */}
        <div className="h-4 rounded-sm bg-slate-100 mb-2.5 overflow-hidden">
          <div
            className="h-full bg-[#0087D2] transition-all duration-500"
            style={{ width: `${percentFilled}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium text-sm">Expected for April</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm tabular-nums font-mono">{percentFilled}% Filled</span>
            <span className="text-emerald-600 font-bold text-base tabular-nums font-mono">
              ${expectedAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
