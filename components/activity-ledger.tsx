"use client"

const transactions = [
  { month: "Mar", day: 27, description: "Employer (Direct Deposit)", category: "Income", amount: 3200, type: "income" },
  { month: "Mar", day: 25, description: "Kroger", category: "Groceries", amount: 85, type: "expense" },
  { month: "Mar", day: 24, description: "Pizza Hut", category: "Dining Out", amount: 45, type: "expense" },
  { month: "Mar", day: 22, description: "CC payment", category: "Transfer", amount: 150, type: "expense" },
  { month: "Mar", day: 20, description: "Shell", category: "Gas & Transport", amount: 120, type: "expense" },
  { month: "Mar", day: 15, description: "Employer (Direct Deposit)", category: "Income", amount: 2800, type: "income" },
  { month: "Mar", day: 10, description: "Landlord", category: "Rent", amount: 1500, type: "expense" },
  { month: "Mar", day: 8, description: "Friend dinner", category: "Dining Out", amount: 60, type: "expense" },
]

export function ActivityLedger() {
  return (
    <div className="flex w-full flex-col rounded-sm border border-slate-200 bg-white p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shrink-0">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Recent Activity
        </h2>
        <button className="text-[#0087D2] text-[11px] hover:text-[#006BB3]">
          Full Year
        </button>
      </div>

      {/* Table */}
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="px-5 py-1.5 text-left text-[9px] font-semibold text-slate-400 uppercase tracking-wider w-16">Date</th>
              <th className="px-5 py-1.5 text-left text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-5 py-1.5 text-left text-[9px] font-semibold text-slate-400 uppercase tracking-wider w-28">Category</th>
              <th className="px-5 py-1.5 text-right text-[9px] font-semibold text-slate-400 uppercase tracking-wider w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index} className="border-b border-slate-50 bg-white">
                <td className="px-5 py-1.5 text-slate-400 text-xs tabular-nums font-mono whitespace-nowrap">
                  {transaction.month} {transaction.day}
                </td>
                <td className="px-5 py-1.5 text-slate-600 font-medium text-xs">
                  {transaction.description}
                </td>
                <td className="px-5 py-1.5 text-slate-400 text-xs">
                  {transaction.category}
                </td>
                <td
                  className={`px-5 py-1.5 text-right tabular-nums font-mono text-xs ${
                    transaction.type === "income"
                      ? "text-emerald-600 font-bold"
                      : "text-slate-600"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "−"}${transaction.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
