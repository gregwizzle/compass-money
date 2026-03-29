/**
 * Monthly roadmap: category → line items (budget / spent / left).
 * Replace MOCK with API / store when wired.
 */

/** Expected inflows for the month (paychecks, etc.); `cleared` = already posted. */
export type ExpectedIncomeLine = {
  id: string
  label: string
  expectedDate: string
  amount: number
  cleared: boolean
}

export const MOCK_EXPECTED_INCOME: ExpectedIncomeLine[] = [
  { id: "pay-1", label: "Employer — direct deposit", expectedDate: "Mar 1", amount: 2800, cleared: true },
  { id: "pay-2", label: "Employer — direct deposit", expectedDate: "Mar 15", amount: 2800, cleared: true },
  { id: "pay-3", label: "Employer — direct deposit", expectedDate: "Mar 29", amount: 2800, cleared: false },
  { id: "rental", label: "Rental income", expectedDate: "Mar 5", amount: 450, cleared: true },
  { id: "side", label: "Freelance (invoice)", expectedDate: "Mar 26", amount: 600, cleared: false },
]

export type RoadmapLineItem = {
  id: string
  name: string
  /** Mock posting date for transaction-style views. */
  postedDate?: string
  budget: number
  actual: number
  /** Typically budget − spent; can be negative if over. */
  left: number
}

/** Top-level category keys — maps to icon + accent in the timeline UI. */
export type CategoryGlyph =
  | "housing"
  | "utilities"
  | "transportation"
  | "commitments"
  | "subscriptions"
  | "food"
  | "wellness"
  | "vibe"

export type TimelineCategory = {
  id: string
  name: string
  glyph: CategoryGlyph
  items: RoadmapLineItem[]
}

let mockPostedDayCursor = 0

function nextMockPostedDate() {
  const day = 1 + (mockPostedDayCursor % 28)
  mockPostedDayCursor += 1
  return `Mar ${day}`
}

function row(
  id: string,
  name: string,
  budget: number,
  actual: number,
  postedDate?: string,
): RoadmapLineItem {
  return {
    id,
    name,
    postedDate: postedDate ?? nextMockPostedDate(),
    budget,
    actual,
    left: budget - actual,
  }
}

/** Sample data: typical U.S. household-style monthly budget (rounded, illustrative). */
export const MOCK_TIMELINE_CATEGORIES: TimelineCategory[] = [
  {
    id: "housing",
    name: "Housing",
    glyph: "housing",
    items: [
      row("rent", "Rent", 1650, 1650),
      row("renters-ins", "Renters insurance", 22, 22),
      row("hoa", "HOA or condo fee", 85, 85),
      row("storage", "Storage unit or parking (rented)", 55, 55),
    ],
  },
  {
    id: "utilities",
    name: "Utilities",
    glyph: "utilities",
    items: [
      row("electric", "Electric", 118, 109, "Feb 27"),
      row("gas-ut", "Natural gas", 44, 41),
      row("water", "Water & sewer", 52, 52),
      row("trash", "Trash & recycling", 24, 24),
    ],
  },
  {
    id: "transportation",
    name: "Transportation",
    glyph: "transportation",
    items: [
      row("auto-ins", "Auto insurance", 138, 138),
      row("gas", "Gas / fuel", 105, 78),
      row("parking", "Parking & tolls", 38, 38),
      row("transit", "Public transit / rideshare", 45, 32),
      row("car-maint", "Car maintenance fund", 65, 0),
      row("registration", "Registration & fees (monthly)", 12, 12),
    ],
  },
  {
    id: "commitments",
    name: "Commitments",
    glyph: "commitments",
    items: [
      row("auto-loan", "Auto loan", 335, 335),
      row("student", "Student loan", 195, 195),
      row("life", "Life insurance", 38, 38),
      row("umbrella", "Umbrella insurance", 22, 22),
      row("childcare", "Childcare / daycare", 640, 640),
    ],
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    glyph: "subscriptions",
    items: [
      row("internet", "Internet", 72, 72),
      row("mobile", "Mobile phone", 92, 92),
      row("streaming", "Streaming & digital", 48, 48),
    ],
  },
  {
    id: "food",
    name: "Food & Groceries",
    glyph: "food",
    items: [
      row("groceries", "Groceries", 540, 412),
      row("dining", "Dining out", 165, 98),
      row("coffee", "Coffee & quick meals", 48, 36),
      row("work-lunch", "Work lunches", 80, 62),
    ],
  },
  {
    id: "wellness",
    name: "Wellness",
    glyph: "wellness",
    items: [
      row("gym", "Gym / fitness", 52, 52),
      row("pharmacy", "Pharmacy & OTC", 45, 38),
      row("copays", "Copays & medical", 55, 0),
      row("personal", "Personal care", 52, 44),
      row("clothing", "Clothing & shoes", 90, 140),
      row("pets", "Pet food & supplies", 88, 71),
      row("vet", "Pet vet & meds", 45, 0),
    ],
  },
  {
    id: "vibe",
    name: "My Vibe",
    glyph: "vibe",
    items: [
      row("events", "Events & outings", 110, 64),
      row("hobbies", "Hobbies & projects", 95, 58),
      row("kids-activities", "Kids activities & school", 75, 62),
      row("travel", "Travel savings (monthly)", 120, 80),
      row("gifts", "Gifts & celebrations", 65, 40),
      row("charity", "Charity & donations", 40, 40),
      row("buffer", "Fun money / buffer", 85, 52),
      row("games", "Games & media", 35, 22),
    ],
  },
]
