import type { LucideIcon } from "lucide-react"
import {
  CalendarRange,
  Camera,
  CircleQuestionMark,
  Footprints,
  Gift,
  Landmark,
  List as ListIcon,
  Map,
  Settings,
  User,
} from "lucide-react"

/** Primary sidebar routes (order preserved for nav UI) */
export const dashboardPrimaryNav = [
  { name: "Snapshot", href: "/", icon: Camera },
  { name: "Timeline", href: "/timeline", icon: CalendarRange },
  { name: "Roadmap", href: "/roadmap", icon: Map },
  { name: "Activity", href: "/activity", icon: ListIcon },
  { name: "Accounts", href: "/accounts", icon: Landmark },
  { name: "My Journey", href: "/my-journey", icon: Footprints },
] as const

export const dashboardSecondaryNav = [
  { name: "My Account", href: "/my-account", icon: User },
  { name: "Support", href: "/support", icon: CircleQuestionMark },
  { name: "Settings", href: "/settings", icon: Settings },
] as const

export const dashboardReferNav = {
  name: "Refer a friend",
  href: "/refer",
  icon: Gift,
} as const

type RouteEntry = { href: string; title: string; icon: LucideIcon }

const ROUTE_INDEX: RouteEntry[] = [
  { href: "/", title: "Snapshot", icon: Camera },
  { href: "/timeline", title: "Timeline", icon: CalendarRange },
  { href: "/roadmap", title: "Roadmap", icon: Map },
  { href: "/activity", title: "Activity", icon: ListIcon },
  { href: "/accounts", title: "Accounts", icon: Landmark },
  { href: "/my-journey", title: "My Journey", icon: Footprints },
  { href: "/my-account", title: "My Account", icon: User },
  { href: "/support", title: "Support", icon: CircleQuestionMark },
  { href: "/settings", title: "Settings", icon: Settings },
  { href: "/refer", title: "Refer a friend", icon: Gift },
]

/**
 * Title + icon for the current dashboard page (matches sidebar / route).
 * Longest href wins so nested paths resolve to the parent section.
 */
export function resolveDashboardRoute(pathname: string): {
  title: string
  icon: LucideIcon
} {
  const normalized = pathname || "/"
  if (normalized === "/") {
    return { title: "Snapshot", icon: Camera }
  }
  const sorted = ROUTE_INDEX.filter((r) => r.href !== "/").sort(
    (a, b) => b.href.length - a.href.length,
  )
  for (const r of sorted) {
    if (normalized === r.href || normalized.startsWith(`${r.href}/`)) {
      return { title: r.title, icon: r.icon }
    }
  }
  return { title: "Snapshot", icon: Camera }
}
