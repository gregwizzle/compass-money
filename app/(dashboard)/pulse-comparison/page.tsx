import { PulseComparisonGrid } from "@/components/pulse-comparison-variants"

export default function PulseComparisonPage() {
  return (
    <main className="bg-stone-100 px-4 pb-6 pt-3">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-5">
          <h1 className="text-lg font-bold text-slate-800">Pulse layout comparison</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Lead: <strong>vertical tanks</strong> — shell = bucket size, green = remaining (drains from the top
            of the liquid as you spend). Budget sits on the shell; remaining sits on the waterline. Below:
            earlier horizontal / ring explorations for comparison. Same mock data everywhere.
          </p>
        </header>
        <PulseComparisonGrid />
      </div>
    </main>
  )
}
