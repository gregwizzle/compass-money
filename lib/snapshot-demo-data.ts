/**
 * Snapshot route demo data (timeline keeps `timeline-roadmap-data`).
 * Replace with API / store when wired.
 */

import type { ExpectedIncomeLine } from "@/lib/timeline-roadmap-data"
import type { TimelineCategory } from "@/lib/timeline-roadmap-data"
import { MOCK_EXPECTED_INCOME } from "@/lib/timeline-roadmap-data"
import type { MonthLabel } from "@/lib/budget-month"

/** Demo “today” is this day-of-month for paid vs upcoming bills. */
export const SNAPSHOT_AS_OF_DAY = 14

export type SnapshotBill = {
  id: string
  /** Shown in upcoming list (e.g. Netflix → Streaming & Subscriptions). */
  listName: string
  dueDay: number
  /** Whole dollars */
  amount: number
  paymentMode: "autodraft" | "manual"
}

/** Core monthly bills from spec + demo-only Gym + extra upcoming rows for “… N more …”. */
export const SNAPSHOT_BILLS: SnapshotBill[] = [
  { id: "rent", listName: "Rent or Mortgage", dueDay: 1, amount: 1650, paymentMode: "autodraft" },
  { id: "auto-ins", listName: "Auto Insurance", dueDay: 5, amount: 138, paymentMode: "autodraft" },
  { id: "internet", listName: "Internet", dueDay: 10, amount: 75, paymentMode: "autodraft" },
  { id: "electric", listName: "Electric", dueDay: 12, amount: 120, paymentMode: "autodraft" },
  { id: "water-trash", listName: "Water & Trash", dueDay: 15, amount: 60, paymentMode: "autodraft" },
  { id: "netflix", listName: "Netflix", dueDay: 18, amount: 25, paymentMode: "autodraft" },
  { id: "gym", listName: "Gym Membership", dueDay: 19, amount: 55, paymentMode: "autodraft" },
  { id: "mobile", listName: "Mobile Phone", dueDay: 22, amount: 90, paymentMode: "manual" },
  { id: "auto-loan", listName: "Auto Loan", dueDay: 28, amount: 450, paymentMode: "autodraft" },
  // Demo-only: pad upcoming list so “4 visible + 6 more” reads well
  { id: "hoa", listName: "HOA / Community", dueDay: 23, amount: 40, paymentMode: "autodraft" },
  { id: "pet", listName: "Pet insurance", dueDay: 24, amount: 35, paymentMode: "autodraft" },
  { id: "cloud", listName: "Cloud backup", dueDay: 25, amount: 28, paymentMode: "autodraft" },
  { id: "music", listName: "Music subscription", dueDay: 26, amount: 12, paymentMode: "autodraft" },
  { id: "software", listName: "Software license", dueDay: 27, amount: 33, paymentMode: "autodraft" },
]

export type SnapshotLivingLine = {
  id: string
  /** Full label */
  name: string
  /** Short label for the dotted row */
  shortName: string
  target: number
  spent: number
}

/** Spent chosen so remaining / over matches the snapshot mock. */
export const SNAPSHOT_LIVING: SnapshotLivingLine[] = [
  { id: "groceries", name: "Groceries", shortName: "Groceries", target: 500, spent: 372 },
  {
    id: "dining",
    name: "Dining Out & Coffee",
    shortName: "Dining Out & Coffee",
    target: 250,
    spent: 183,
  },
  { id: "gas", name: "Gas & Transit", shortName: "Gas & Transit", target: 150, spent: 108 },
  {
    id: "personal",
    name: "Health & Wellness",
    shortName: "Health & Wellness",
    target: 100,
    spent: 112,
  },
  { id: "vibe", name: "My Vibe", shortName: "My Vibe", target: 200, spent: 193 },
]

export const SNAPSHOT_STARTING_FUNDS = 6000

/** Same income dock as timeline for now (read-only feel in snapshot). */
export const SNAPSHOT_EXPECTED_INCOME: ExpectedIncomeLine[] = MOCK_EXPECTED_INCOME.map((x) => ({ ...x }))

export function partitionBillsByPaid(asOfDay: number) {
  const paid = SNAPSHOT_BILLS.filter((b) => b.dueDay <= asOfDay)
  const upcoming = SNAPSHOT_BILLS.filter((b) => b.dueDay > asOfDay).sort((a, b) => a.dueDay - b.dueDay)
  const paidTotal = paid.reduce((s, b) => s + b.amount, 0)
  return { paid, upcoming, paidTotal }
}

/** Net sum of (target − spent) across living envelopes; negative means slush is overdrawn overall. */
export function getSnapshotLivingNetRemaining() {
  return SNAPSHOT_LIVING.reduce((s, l) => s + (l.target - l.spent), 0)
}

/** Living envelopes where spent exceeds target (for Expected Cashout breakdown). */
export type SnapshotLivingOverageLine = {
  id: string
  /** Full envelope name (e.g. “Health & Wellness”). */
  label: string
  /** Dollars over target for this envelope. */
  overage: number
}

/** One row per living envelope with overage; empty if none. */
export function getSnapshotLivingOverageLines(): SnapshotLivingOverageLine[] {
  return SNAPSHOT_LIVING.filter((l) => l.spent > l.target).map((l) => ({
    id: l.id,
    label: l.name,
    overage: l.spent - l.target,
  }))
}

/** Timeline-style: starting − full plan − overage in living envelopes. */
export function getSnapshotExpectedCashout() {
  const billsTotal = SNAPSHOT_BILLS.reduce((s, b) => s + b.amount, 0)
  const livingBudget = SNAPSHOT_LIVING.reduce((s, l) => s + l.target, 0)
  const livingOverage = SNAPSHOT_LIVING.reduce(
    (s, l) => s + Math.max(0, l.spent - l.target),
    0,
  )
  const totalBudget = billsTotal + livingBudget
  const expectedNet = SNAPSHOT_STARTING_FUNDS - totalBudget - livingOverage
  return { billsTotal, livingBudget, totalBudget, livingOverage, expectedNet }
}

/** Days until cash is “available” per snapshot demo copy. */
export const SNAPSHOT_AVAILABLE_IN_DAYS = 2

export const SNAPSHOT_UPCOMING_PREVIEW = 4

/** For activity table glyphs (names must match row categories where possible). */
export const SNAPSHOT_GLYPH_LOOKUP: TimelineCategory[] = [
  { id: "g", name: "Groceries", glyph: "food", items: [] },
  { id: "d", name: "Dining Out & Coffee", glyph: "food", items: [] },
  { id: "gas", name: "Gas & Transit", glyph: "transportation", items: [] },
  { id: "p", name: "Health & Wellness", glyph: "wellness", items: [] },
  { id: "v", name: "My Vibe", glyph: "vibe", items: [] },
  { id: "h", name: "Housing", glyph: "housing", items: [] },
]

export type SnapshotActivityRow = {
  id: string
  dateLabel: string
  source: string
  category: string
  flow: "Income" | "Expense" | "Transfer"
  actual: number
  /** Budget month for this transaction (separate from calendar date on `dateLabel`). */
  budgetMonthLabel: MonthLabel
  /** When true, funded from My Stash instead of the monthly budget. */
  fromStash: boolean
  /** Bill, living envelope, income line, or transfer target. */
  appliedToKey: string
  accountLabel?: string
}

/** Read-only ledger preview for snapshot. */
export const SNAPSHOT_ACTIVITY_ROWS: SnapshotActivityRow[] = [
  {
    id: "a1",
    dateLabel: "Mar 12",
    source: "Electric",
    category: "Bills",
    flow: "Expense",
    actual: 120,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "bill:electric",
    accountLabel: "Linked Checking",
  },
  {
    id: "a2",
    dateLabel: "Mar 10",
    source: "Internet",
    category: "Bills",
    flow: "Expense",
    actual: 75,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "bill:internet",
    accountLabel: "Linked Checking",
  },
  {
    id: "a3",
    dateLabel: "Mar 5",
    source: "Auto Insurance",
    category: "Bills",
    flow: "Expense",
    actual: 138,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "bill:auto-ins",
    accountLabel: "Linked Checking",
  },
  {
    id: "a4",
    dateLabel: "Mar 1",
    source: "Rent or Mortgage",
    category: "Bills",
    flow: "Expense",
    actual: 1650,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "bill:rent",
    accountLabel: "Linked Checking",
  },
  {
    id: "a5",
    dateLabel: "Mar 14",
    source: "Whole Foods",
    category: "Groceries",
    flow: "Expense",
    actual: 84,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:groceries",
    accountLabel: "Linked Checking",
  },
  {
    id: "a6",
    dateLabel: "Mar 13",
    source: "Shell",
    category: "Gas & Transit",
    flow: "Expense",
    actual: 42,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:gas",
    accountLabel: "Linked Checking",
  },
  {
    id: "a7",
    dateLabel: "Mar 11",
    source: "Local Cafe",
    category: "Dining Out & Coffee",
    flow: "Expense",
    actual: 18,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:dining",
    accountLabel: "Linked Checking",
  },
  {
    id: "a8",
    dateLabel: "Mar 10",
    source: "Pharmacy",
    category: "Health & Wellness",
    flow: "Expense",
    actual: 24,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:personal",
    accountLabel: "Linked Checking",
  },
  {
    id: "a9",
    dateLabel: "Mar 9",
    source: "Concert tickets",
    category: "My Vibe",
    flow: "Expense",
    actual: 120,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:vibe",
    accountLabel: "Linked Checking",
  },
  {
    id: "a10",
    dateLabel: "Mar 8",
    source: "Kroger",
    category: "Groceries",
    flow: "Expense",
    actual: 112,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:groceries",
    accountLabel: "Linked Checking",
  },
  {
    id: "a11",
    dateLabel: "Mar 6",
    source: "Transit pass",
    category: "Gas & Transit",
    flow: "Expense",
    actual: 45,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:gas",
    accountLabel: "Linked Checking",
  },
  {
    id: "a12",
    dateLabel: "Mar 4",
    source: "Pizza night",
    category: "Dining Out & Coffee",
    flow: "Expense",
    actual: 38,
    budgetMonthLabel: "Mar",
    fromStash: false,
    appliedToKey: "living:dining",
    accountLabel: "Linked Checking",
  },
]
