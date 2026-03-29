import { ThePulse } from "@/components/the-pulse"
import { IncomeTank } from "@/components/income-tank"
import { ActivityLedger } from "@/components/activity-ledger"

export default function SnapshotPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 bg-stone-100 px-4 pb-4 pt-3 lg:flex-row lg:items-stretch">
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[400px]">
        <ThePulse />
        <IncomeTank />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <ActivityLedger />
      </div>
    </main>
  )
}
