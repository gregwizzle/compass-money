"use client"

import type { ComponentProps } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type ReceivedCheckIconProps = Omit<ComponentProps<typeof Check>, "strokeLinecap" | "strokeLinejoin">

/**
 * “Received” checkmark — matches Income Dock scheduled-pay rows (soft emerald stroke).
 */
export function ReceivedCheckIcon({ className, ...props }: ReceivedCheckIconProps) {
  return (
    <Check
      className={cn("h-4 w-4 -rotate-3 stroke-[2.5] text-emerald-600/45", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}
