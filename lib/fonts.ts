import {
  Architects_Daughter,
  Caveat,
  Comfortaa,
  Handlee,
  Kalam,
  Inter,
  Manrope,
  Nunito,
  Outfit,
  Patrick_Hand,
  Plus_Jakarta_Sans,
  Quicksand,
  Rubik,
  Varela_Round,
} from "next/font/google"

/** Sidebar wordmark — distinct from body sans, not decorative */
export const compassWordmark = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** My Journey — casual script (nav + page title) */
export const myJourneyNav = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

/** Font preview only — previous My Journey face */
export const myJourneyNavQuicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview / optional — rounded, flowing sans */
export const myJourneyNavNunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview / optional — neat handwriting sans */
export const myJourneyNavKalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
})

/** Preview — soft geometric */
export const myJourneyNavManrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview — friendly UI sans */
export const myJourneyNavPlusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview — rounded geometric */
export const myJourneyNavComfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview — rounded, single weight family */
export const myJourneyNavVarelaRound = Varela_Round({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

/** Preview — soft grotesk */
export const myJourneyNavRubik = Rubik({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

/** Preview — print handwriting */
export const myJourneyNavPatrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

/** Preview — loose architectural hand */
export const myJourneyNavArchitectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

/** Preview — neat small caps hand */
export const myJourneyNavHandlee = Handlee({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

/** Numeric UI amounts — softer than monospace but still clear/aligned. */
export const amountInter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})
