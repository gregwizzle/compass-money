import type { LucideIcon } from "lucide-react"
import { Car, Coffee, HeartPulse, Sparkles, UtensilsCrossed } from "lucide-react"

/**
 * Icons for the five snapshot “Living expenses” lines (distinct from each other; colors align with roadmap category accents).
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
}
