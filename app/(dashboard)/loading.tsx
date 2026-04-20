/** Shown while the dashboard route compiles or streams (first dev visit can take a bit). */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[min(100vh,32rem)] flex-col items-center justify-center gap-3 bg-[#B8D8EC] p-8">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-[#0087D2]"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-600">Loading dashboard…</p>
    </div>
  )
}
