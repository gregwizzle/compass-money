# Credit Card Flow & Architecture

This document finalizes the core logic for handling credit card spending, reserve funds, monthly cashouts, and the Credit Outpost UI.

## The Core Problem Addressed
Budgeting works on **calendar months** (e.g., April 1 - April 30). Credit card billing works on **statement cycles** (e.g., April 21 - May 20) that do not align with calendar months. 

To prevent cashflow blind spots (the "float" problem), the app separates the **Budget Impact** (which happens instantly in the calendar month) from the **Cashflow Logistics** (which are dictated by the bank's billing cycle).

---

## 1. The 12 Cycle Buckets (The Math Engine)
Instead of a single "Credit Card Slush Fund," the app creates 12 distinct holding buckets per credit card, tied strictly to the card's statement periods (Cycle 1, Cycle 2, etc.).

### Lifecycle of a Purchase
1. **The Spend (e.g., April 23)**
   - User spends $200 on groceries using Visa.
   - **Budget Impact:** April's Grocery envelope drops by $200 immediately.
   - **Cycle Allocation:** The app looks at the date (April 23) and assigns this to Visa Cycle 4 (Apr 21 - May 20).
   - `Visa Cycle 4 Spending` increases by $200.

2. **The Calendar Cashout (April 30)**
   - April closes. The app calculates Cashout (`Income - Bills - Envelopes`).
   - The app explicitly withholds the $200 from the user's expected "profit" (Stash).
   - It moves $200 of actual cash into the **`Visa Cycle 4 Reserve Bucket`**.
   - *Fallback:* If there is not enough income to cover the month's spending, the app forces a withdrawal from Stash to fill the reserve bucket. If Stash is empty, it forces the user to convert the shortfall into Long-Term Debt (`OWE`).

3. **The Cycle Closes (May 20)**
   - Visa Cycle 4 ends.
   - The app looks at the `Visa Cycle 4 Reserve Bucket`. Because the app diligently funded this bucket during the April (and May) cashouts, the bucket is completely full and matches the total cycle spending.

---

## 2. The Credit Outpost (The UI Layer)

The Credit Outpost is where the user manages their credit card payments. It strictly separates **mature action items** from **ongoing spending**.

### Rule: The Outpost is Post-Cashout Only
A credit card cycle does not become actionable (you cannot transfer a payment) until:
1. The statement cycle has closed.
2. The calendar month(s) containing that spending have been **Cashed Out**.
This guarantees the app has physically secured the cash in the reserve bucket before asking the user to send money to the bank.

### Two-Tiered UI Layout

#### Tier 1: Action Required (Mature Cycles)
These are closed, fully funded cycles ready for payment, OR debt cycles requiring a minimum payment.

**The "Good Path" (Fully Funded)**
*   **Row:** `Visa (Apr 21 - May 20)` | `New Spending: $500` | `Reserved: $500` | `[TRANSFER PAYMENT]`
*   **Modal Action:** "Your budget successfully secured these funds during cashout. Complete the bank transfer to Visa to clear this cycle."

**The "Bad Path" (Unfunded / Converted to Debt at Cashout)**
*   If the user ran out of money during cashout, the cycle was converted to debt. "New Spending" disappears, replaced by the bank's reality.
*   **Row:** `Visa (Jan 12 - Feb 11)` | `Min Due: $45` | `Reserved: $0` | `[PAY MINIMUM]`
*   **Modal Action:** The user must explicitly choose where to find the $45 to satisfy the bank:
    *   `[Pay from Current Month Income]` (Reduces current month's Expected Cashout)
    *   `[Pay from My Stash]` (Reduces Stash directly)

#### Tier 2: Building Up (Current Unclosed Cycles)
These are active cycles right now. They represent spending that has hit the budget but hasn't been locked in by a Cashout yet.

*   **Visuals:** Muted styling, subtle divider. NO action buttons.
*   **Row:** `Visa (May 21 - Jun 20)` | `Current Spend: $150`
*   *Why this exists:* Proves to the user that the app sees their spending and hasn't lost their money, while preventing them from paying it prematurely before the cashout math is settled.

---

## 3. Early Ad-Hoc Payments

If a user logs into their bank and pays $200 to their credit card *before* the cycle closes or cashes out:
1. The app imports the $200 outbound transfer.
2. **Waterfall Logic:** The app applies the payment to the "newest hole" first:
   - First: Applies to active `Current Spend` (unclosed cycle).
   - Second: Applies to mature Unfunded cycles in the Outpost.
   - Third: Applies to `OWE` (Long-Term Debt).
3. The active cycle's `Current Spend` drops instantly. When the month eventually cashes out, the app requires less (or no) money to fill the reserve bucket for that cycle.

---

## Summary of the "Home Run" Model

1. **It Never Lies:** If a user is broke, the app doesn't pretend they have a "reserve." The Cashout process forces them to face the math and convert to debt *before* the credit card bill arrives.
2. **It Kills "Double Charge" Anxiety:** By explicitly showing `Reserved Payment Funds` right next to `New Spending`, the user knows the money was safely withheld from their budget and is ready to transfer.
3. **It Prevents Float Errors:** By completely isolating the 12 cycle reserve buckets from the calendar month math, the budget engine works perfectly on calendar months, while the Outpost works perfectly on statement dates.
