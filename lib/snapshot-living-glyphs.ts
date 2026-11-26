import type { LucideIcon } from "lucide-react"
import { Car, Coffee, Dices, HeartPulse, Sparkles, UtensilsCrossed } from "lucide-react"

/**
 * Icons for snapshot living-fund lines. Colors stay distinct from each other
 * and align with the roadmap category accents. Curveballs is the catch-all
 * for surprises that do not belong in any other living expense.
 */
export const SNAPSHOT_LIVING_GLYPH: Record<
  string,
  { Icon: LucideIcon; className: string }
> = {
  groceries: { Icon: UtensilsCrossed, className: "text-yellow-700" },
  dining: { Icon: Coffee, className: "text-amber-900" },
  gas: { Icon: Car, className: "text-slate-600" },
  personal: { Icon: HeartPulse, className: "text-emerald-600" },
  vibe: { Icon: Sparkles, className: "text-purple-500" },
  curveballs: { Icon: Dices, className: "text-orange-600" },
}
