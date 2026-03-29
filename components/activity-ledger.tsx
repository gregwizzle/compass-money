"use client"

import { useState } from "react"
import { TransactionEditModal, Transaction } from "./transaction-edit-modal"

const initialTransactions: Transaction[] = [
  { id: "1", month: "Mar", day: 27, description: "Employer (Direct Deposit)", category: "Income", amount: 3200, type: "income", sourceType: "bank_import" },
  { id: "2", month: "Mar", day: 25, description: "Kroger", category: "Groceries", amount: 85, type: "expense", sourceType: "bank_import" },
  { id: "3", month: "Mar", day: 24, description: "Pizza Hut", category: "Dining Out", amount: 45, type: "expense", sourceType: "manual" },
  { id: "4", month: "Mar", day: 22, description: "CC payment", category: "Transfer", amount: 150, type: "transfer", sourceType: "manual" },
  { id: "5", month: "Mar", day: 20, description: "Shell", category: "Gas & Transport", amount: 120, type: "expense", sourceType: "bank_import" },
  { id: "6", month: "Mar", day: 15, description: "Employer (Direct Deposit)", category: "Income", amount: 2800, type: "income", sourceType: "bank_import" },
  { id: "7", month: "Mar", day: 10, description: "Landlord", category: "Rent", amount: 1500, type: "expense", sourceType: "bank_import" },
  { id: "8", month: "Mar", day: 8, description: "Friend dinner", category: "Dining Out", amount: 60, type: "expense", sourceType: "manual" },
]

export function ActivityLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleSaveTransaction = (updated: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    )
  }

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
            {transactions.map((transaction) => (
              <tr 
                key={transaction.id} 
                className="border-b border-slate-50 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(transaction)}
              >
                <td className="px-5 py-1.5 text-slate-400 text-xs tabular-nums font-mono whitespace-nowrap">
                  {transaction.month} {transaction.day}
                </td>
                <td className="px-5 py-1.5 text-slate-600 font-medium text-xs">
                  {transaction.description}
                  {transaction.sourceType === "manual" && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500">
                      Manual
                    </span>
                  )}
                </td>
                <td className="px-5 py-1.5 text-slate-400 text-xs">
                  {transaction.category}
                </td>
                <td
                  className={`px-5 py-1.5 text-right tabular-nums font-mono text-xs ${
                    transaction.type === "income"
                      ? "text-emerald-600 font-bold"
                      : transaction.type === "transfer"
                      ? "text-slate-500"
                      : "text-slate-600"
                  }`}
                >
                  {transaction.type === "income" ? "+" : transaction.type === "transfer" ? "" : "−"}
                  ${transaction.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionEditModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        transaction={selectedTransaction}
        onSave={handleSaveTransaction}
      />
    </div>
  )
}
