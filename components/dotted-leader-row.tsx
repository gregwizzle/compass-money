"use client"

type DottedLeaderRowProps = {
  left: React.ReactNode
  right: React.ReactNode
  afterRight?: React.ReactNode
}

export function DottedLeaderRow({ left, right, afterRight }: DottedLeaderRowProps) {
  return (
    <div className="flex min-w-0 items-baseline gap-0.5 text-[12px] leading-snug">
      <div className="min-w-0 shrink overflow-hidden font-semibold text-slate-700">{left}</div>
      <div
        className="min-h-[1em] min-w-0 flex-1 basis-0 bg-[radial-gradient(circle,_currentColor_0.85px,_transparent_1.2px)] bg-[length:6px_3px] bg-repeat-x bg-bottom text-slate-300"
        aria-hidden
      />
      <div className="shrink-0 text-right text-[11px] text-slate-500">{right}</div>
      {afterRight ? <div className="shrink-0">{afterRight}</div> : null}
    </div>
  )
}
