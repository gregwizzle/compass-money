import Link from "next/link"
import {
  myJourneyNav,
  myJourneyNavArchitectsDaughter,
  myJourneyNavComfortaa,
  myJourneyNavHandlee,
  myJourneyNavKalam,
  myJourneyNavManrope,
  myJourneyNavNunito,
  myJourneyNavPatrickHand,
  myJourneyNavPlusJakarta,
  myJourneyNavQuicksand,
  myJourneyNavRubik,
  myJourneyNavVarelaRound,
} from "@/lib/fonts"

const sample = "My Journey"
const sentence = "Review your path and celebrate small wins."

type Row = {
  label: string
  font: { className: string }
  titleWeight: string
  /** Script/hand fonts usually look better without wide tracking */
  titleTracking?: "tracking-wide" | "tracking-normal"
}

const sansRows: Row[] = [
  { label: "Quicksand — previous default", font: myJourneyNavQuicksand, titleWeight: "font-semibold" },
  { label: "Nunito", font: myJourneyNavNunito, titleWeight: "font-semibold" },
  { label: "Kalam", font: myJourneyNavKalam, titleWeight: "font-bold" },
  { label: "Manrope", font: myJourneyNavManrope, titleWeight: "font-semibold" },
  { label: "Plus Jakarta Sans", font: myJourneyNavPlusJakarta, titleWeight: "font-semibold" },
  { label: "Comfortaa", font: myJourneyNavComfortaa, titleWeight: "font-semibold" },
  {
    label: "Varela Round (400 only)",
    font: myJourneyNavVarelaRound,
    titleWeight: "font-normal",
  },
  { label: "Rubik", font: myJourneyNavRubik, titleWeight: "font-semibold" },
]

const handwritingRows: Row[] = [
  {
    label: "Caveat — current (My Journey nav + title)",
    font: myJourneyNav,
    titleWeight: "font-semibold",
    titleTracking: "tracking-normal",
  },
  {
    label: "Patrick Hand — print handwriting",
    font: myJourneyNavPatrickHand,
    titleWeight: "font-normal",
    titleTracking: "tracking-normal",
  },
  {
    label: "Architects Daughter — loose hand",
    font: myJourneyNavArchitectsDaughter,
    titleWeight: "font-normal",
    titleTracking: "tracking-normal",
  },
  {
    label: "Handlee — neat hand",
    font: myJourneyNavHandlee,
    titleWeight: "font-normal",
    titleTracking: "tracking-normal",
  },
]

function FontBlock({ row }: { row: Row }) {
  const tracking = row.titleTracking ?? "tracking-wide"
  return (
    <section>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {row.label}
      </p>
      <p
        className={`text-2xl text-orange-900 ${tracking} ${row.titleWeight} ${row.font.className}`}
      >
        {sample}
      </p>
      <p className={`mt-2 text-sm font-medium text-slate-600 ${row.font.className}`}>
        {sentence}
      </p>
    </section>
  )
}

export default function FontPreviewPage() {
  return (
    <div className="min-h-screen bg-stone-100 p-8 text-slate-900">
      <p className="mb-6 text-sm text-slate-500">
        <Link href="/" className="text-[#0087D2] underline-offset-2 hover:underline">
          ← Back to app
        </Link>
      </p>
      <h1 className="mb-2 font-sans text-xl font-semibold text-slate-800">
        My Journey — font comparison
      </h1>
      <p className="mb-10 max-w-lg text-sm text-slate-600">
        Sans & rounded first; handwriting-style fonts below. Orange title + sample sentence.
      </p>

      <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-500">
        Sans & rounded
      </h2>
      <div className="flex max-w-2xl flex-col gap-10">
        {sansRows.map((row) => (
          <FontBlock key={row.label} row={row} />
        ))}
      </div>

      <h2 className="mb-6 mt-14 text-xs font-bold uppercase tracking-widest text-slate-500">
        Handwriting-style
      </h2>
      <p className="mb-8 max-w-lg text-sm text-slate-600">
        Titles use <code className="rounded bg-slate-200/80 px-1 py-0.5 text-xs">tracking-normal</code>{" "}
        so letter spacing doesn’t fight the script.
      </p>
      <div className="flex max-w-2xl flex-col gap-10">
        {handwritingRows.map((row) => (
          <FontBlock key={row.label} row={row} />
        ))}
      </div>
    </div>
  )
}
