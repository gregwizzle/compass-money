import { ActivityLedger } from "@/components/activity-ledger"

export default function ActivityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-100 px-4 pb-4 pt-3">
      <ActivityLedger />
    </div>
  )
}
