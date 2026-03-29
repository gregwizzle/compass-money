"use client"

import { useCallback, useState } from "react"
import {
  Car,
  CreditCard,
  ChevronRight,
  HeartPulse,
  Home,
  Landmark,
  Sparkles,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CategoryGlyph, RoadmapLineItem, TimelineCategory } from "@/lib/timeline-roadmap-data"
import { amountInter } from "@/lib/fonts"

type EditableRoadmapLineItem = RoadmapLineItem & { markedForDeletion?: boolean }
type EditableTimelineCategory = Omit<TimelineCategory, "items"> & { items: EditableRoadmapLineItem[] }

/** Same icons + accent colors as category headers in this grid — reuse in Activity table etc. */
export const CATEGORY_GLYPH: Record<
  CategoryGlyph,
  { Icon: LucideIcon; className: string }
> = {
  housing: { Icon: Home, className: "text-sky-600" },
  utilities: { Icon: Zap, className: "text-amber-600" },
  transportation: { Icon: Car, className: "text-slate-600" },
  commitments: { Icon: Landmark, className: "text-rose-700/90" },
  subscriptions: { Icon: CreditCard, className: "text-violet-600" },
  food: { Icon: UtensilsCrossed, className: "text-yellow-700" },
  wellness: { Icon: HeartPulse, className: "text-emerald-600" },
  vibe: { Icon: Sparkles, className: "text-purple-500" },
}

const CATEGORY_LINE: Record<CategoryGlyph, string> = {
  housing: "border-sky-400",
  utilities: "border-amber-400",
  transportation: "border-slate-400",
  commitments: "border-rose-400",
  subscriptions: "border-violet-400",
  food: "border-yellow-600",
  wellness: "border-emerald-400",
  vibe: "border-purple-400",
}

const COL_HEADER =
  "text-right text-[9px] font-semibold uppercase leading-tight tracking-wider text-slate-400"

const AMOUNT_CELL = `text-right text-xs font-medium tabular-nums text-slate-600 ${amountInter.className}`

const amountWrap = "flex shrink-0 items-baseline gap-x-3 sm:gap-x-3.5"
const amountCol =
  "w-[3.5rem] min-w-[3.25rem] text-right sm:w-[3.875rem] sm:min-w-[3.5rem]"

const amountWrapOverlay = "flex shrink-0 items-baseline gap-x-3.5 sm:gap-x-4"
const amountColOverlay = "w-[3.75rem] min-w-[3.5rem] text-right sm:w-[4rem] sm:min-w-[3.75rem]"

function fmt(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n).toLocaleString()
  const negative = n < 0
  return (
    <span className="inline-flex items-baseline">
      <span
        className={cn(
          "text-[0.9em]",
          negative ? "text-current" : "text-slate-500",
        )}
      >
        {sign}$
      </span>
      <span className="ml-[0.14em]">{abs}</span>
    </span>
  )
}

function buildInitialOpen(
  categories: TimelineCategory[],
  variant: "compact" | "overlay",
): Record<string, boolean> {
  if (variant !== "overlay") return {}
  const o: Record<string, boolean> = {}
  for (const c of categories) {
    o[c.id] = true
  }
  return o
}

function sumItems(items: RoadmapLineItem[]) {
  return items.reduce(
    (acc, item) => ({
      budget: acc.budget + item.budget,
      spent: acc.spent + item.actual,
      left: acc.left + item.left,
    }),
    { budget: 0, spent: 0, left: 0 },
  )
}

function LeftCell({ value, muted }: { value: number; muted?: boolean }) {
  const over = value < 0
  if (muted) {
    return (
      <span
        className={cn(
          `text-right text-[11px] font-medium tabular-nums leading-none ${amountInter.className}`,
          over ? "text-rose-600/90" : value === 0 ? "text-slate-400" : "text-slate-600",
        )}
      >
        {fmt(value)}
      </span>
    )
  }
  return (
    <span
      className={cn(
        `text-right text-xs font-medium tabular-nums leading-none ${amountInter.className}`,
        over && "text-rose-600",
        !over && value === 0 && "text-slate-400",
        !over && value > 0 && "text-slate-700",
      )}
    >
      {fmt(value)}
    </span>
  )
}

export type RoadmapCategoriesGridProps = {
  categories: EditableTimelineCategory[]
  className?: string
  variant?: "compact" | "overlay"
  /** `single` = one outer card with sections; `cards` = each category is its own card (default). */
  layout?: "cards" | "single"
  /** Show compact toolbar row (Expand all + column labels). */
  showCompactToolbar?: boolean
  /** For `layout=\"single\"`, whether to render the outer card wrapper. */
  wrapSingleInCard?: boolean
  /** Optional controlled open state by category id. */
  openCats?: Record<string, boolean>
  /** Called when open state changes in controlled mode. */
  onOpenCatsChange?: (next: Record<string, boolean>) => void
  /** When true, budget cells render as editable inputs. */
  editMode?: boolean
  /** Called on budget changes for line items. */
  onLineItemBudgetChange?: (categoryId: string, itemId: string, nextBudget: number) => void
  /** Called on name changes for line items. */
  onLineItemNameChange?: (categoryId: string, itemId: string, nextName: string) => void
  /** Toggle soft-delete for line items in edit mode. */
  onLineItemToggleDelete?: (categoryId: string, itemId: string) => void
}

export function RoadmapCategoriesGrid({
  categories,
  className,
  variant = "compact",
  layout = "cards",
  showCompactToolbar = true,
  wrapSingleInCard = true,
  openCats: openCatsProp,
  onOpenCatsChange,
  editMode = false,
  onLineItemBudgetChange,
  onLineItemNameChange,
  onLineItemToggleDelete,
}: RoadmapCategoriesGridProps) {
  const wrap = variant === "overlay" ? amountWrapOverlay : amountWrap
  const col = variant === "overlay" ? amountColOverlay : amountCol
  const [openCatsState, setOpenCatsState] = useState<Record<string, boolean>>(() =>
    buildInitialOpen(categories, variant),
  )
  const openCats = openCatsProp ?? openCatsState
  const setOpenCats = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      const next = updater(openCats)
      if (onOpenCatsChange) onOpenCatsChange(next)
      if (!openCatsProp) setOpenCatsState(next)
    },
    [onOpenCatsChange, openCatsProp, openCats],
  )

  const toggle = useCallback((id: string) => {
    setOpenCats((o) => ({ ...o, [id]: !o[id] }))
  }, [setOpenCats])

  const toggleAll = useCallback((list: TimelineCategory[]) => {
    const keys = list.map((c) => c.id)
    if (keys.length === 0) return
    setOpenCats((o) => {
      const allOpen = keys.every((k) => o[k])
      const next = { ...o }
      for (const k of keys) {
        next[k] = !allOpen
      }
      return next
    })
  }, [setOpenCats])

  const lineNameClass =
    variant === "overlay"
      ? "min-w-0 break-words text-[12px] leading-snug text-slate-500"
      : "min-w-0 truncate text-[12px] leading-snug text-slate-500"

  const allKeys = categories.map((c) => c.id)
  const allExpanded =
    allKeys.length > 0 && allKeys.every((k) => openCats[k])

  const cardsGridClass =
    variant === "overlay"
      ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:items-start"
      : "flex flex-col gap-3"

  const toolbarRow =
    variant === "compact" && showCompactToolbar && categories.length > 0 ? (
      <div className="flex w-full min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1 border-b border-slate-100 px-2.5 pb-2 pt-1 sm:px-3">
        <button
          type="button"
          onClick={() => toggleAll(categories)}
          className="shrink-0 text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <div className={cn(wrap, "ml-auto")}>
          <span className={cn(col, COL_HEADER)}>Budget</span>
          <span className={cn(col, COL_HEADER)}>Spent</span>
          <span className={cn(col, COL_HEADER)}>Left</span>
        </div>
      </div>
    ) : null

  const overlayHeaderRow =
    variant === "overlay" ? (
      <div className="flex flex-wrap items-baseline justify-end gap-x-2 border-b border-slate-200 px-2 pb-2 pt-1 sm:px-3">
        <div className={cn(wrap, "ml-auto")}>
          <span className={cn(col, COL_HEADER)}>Budget</span>
          <span className={cn(col, COL_HEADER)}>Spent</span>
          <span className={cn(col, COL_HEADER)}>Left</span>
        </div>
      </div>
    ) : null

  const categoryBlocks = categories.map((cat) => {
    const { Icon, className: iconClass } = CATEGORY_GLYPH[cat.glyph]
    const open = !!openCats[cat.id]
    const totals = sumItems(cat.items)
    const hasLineOverage = cat.items.some((item) => item.actual > item.budget)

    const headerWrap = (
      <div
        className={cn(
          "flex min-w-0 flex-col px-1 py-0.5 sm:px-2",
          layout === "single" && "bg-transparent",
          layout === "cards" && variant === "overlay" && "border-b border-slate-100 bg-stone-100/90 py-2 sm:px-2.5",
        )}
      >
        <button
          type="button"
          onClick={() => toggle(cat.id)}
          aria-expanded={open}
          className={cn(
            "flex w-full min-w-0 items-baseline justify-between gap-x-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-slate-200/70 hover:shadow-sm active:bg-slate-200/90",
                layout === "single" && "py-0.5 hover:bg-slate-100/90",
          )}
        >
          <span className="flex min-w-0 items-center gap-1">
            <span className="inline-flex w-2.5 shrink-0 flex-col items-center justify-center self-center">
              {hasLineOverage ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/90"
                  aria-label="Contains over-budget line items"
                  title="Contains over-budget line items"
                />
              ) : null}
            </span>
            <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", iconClass)} aria-hidden />
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                open && "rotate-90",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate text-[12px] font-semibold text-slate-700">
              {cat.name}
            </span>
          </span>
          <div className={wrap}>
            <span className={cn(col, AMOUNT_CELL)}>{fmt(totals.budget)}</span>
            <span className={cn(col, AMOUNT_CELL)}>{fmt(totals.spent)}</span>
            <span className={cn(col)}>
              <LeftCell value={totals.left} />
            </span>
          </div>
        </button>
      </div>
    )

    const lines = open && (
      <ul
        className={cn(
          "ml-12 border-l-2 py-1 pl-2 pr-1 sm:ml-13 sm:pl-2 sm:pr-2",
          CATEGORY_LINE[cat.glyph],
          layout === "single" && "py-0.5",
        )}
      >
        {cat.items.map((item) => {
          const lineOverBudget = item.actual > item.budget
          return (
          <li
            key={item.id}
            className="flex w-full min-w-0 items-baseline justify-between gap-x-2 border-b border-slate-100/90 px-1.5 py-0.5 last:border-b-0"
          >
            <span className="flex min-w-0 flex-1 items-baseline gap-1 pr-1">
              <span className="inline-flex w-2.5 shrink-0 flex-col items-center justify-center self-center">
                {lineOverBudget ? (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500/90"
                    aria-label="This line is over budget"
                    title="This line is over budget"
                  />
                ) : null}
              </span>
              <span className={cn("min-w-0 flex-1", lineNameClass)}>
              {editMode && !item.markedForDeletion ? (
                <input
                  type="text"
                  value={item.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onLineItemNameChange?.(cat.id, item.id, e.target.value)}
                  className="w-full rounded-sm border border-slate-200 bg-white px-1 py-0.5 text-[12px] leading-snug text-slate-700 outline-none focus:border-[#0087D2]/60 focus:ring-1 focus:ring-[#0087D2]/30"
                  aria-label={`${cat.name} line item name`}
                />
              ) : (
                <span
                  className={cn(
                    lineNameClass,
                    item.markedForDeletion && "text-slate-400 line-through",
                  )}
                >
                  {item.name}
                </span>
              )}
              </span>
            </span>
            <div className={wrap}>
              <span className={cn(col)}>
                {editMode ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.budget}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const raw = Number.parseInt(e.target.value || "0", 10)
                      const next = Number.isFinite(raw) ? Math.max(0, raw) : 0
                      onLineItemBudgetChange?.(cat.id, item.id, next)
                    }}
                    disabled={!!item.markedForDeletion}
                    className={`w-full rounded-sm border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] font-medium tabular-nums text-slate-700 outline-none focus:border-[#0087D2]/60 focus:ring-1 focus:ring-[#0087D2]/30 ${amountInter.className}`}
                    aria-label={`${cat.name} ${item.name} budget`}
                  />
                ) : (
                  <span
                    className={cn(
                      `text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`,
                    )}
                  >
                    {fmt(item.budget)}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  col,
                  `text-[11px] font-medium tabular-nums text-slate-500 ${amountInter.className}`,
                  item.markedForDeletion && "line-through text-slate-400",
                )}
              >
                {fmt(item.actual)}
              </span>
              <span className={cn(col)}>
                <LeftCell value={item.left} muted />
              </span>
              {editMode && (
                <span className="inline-flex w-4 shrink-0 justify-center">
                  {item.actual === 0 ? (
                    <button
                      type="button"
                      onClick={() => onLineItemToggleDelete?.(cat.id, item.id)}
                      className="rounded-sm px-1 py-0.5 text-[11px] font-semibold text-rose-600 transition-all hover:bg-rose-600 hover:text-white hover:shadow-sm"
                      title={item.markedForDeletion ? "Restore line item" : "Delete line item"}
                      aria-label={item.markedForDeletion ? "Restore line item" : "Delete line item"}
                    >
                      x
                    </button>
                  ) : null}
                </span>
              )}
            </div>
          </li>
          )
        })}
      </ul>
    )

    if (layout === "single") {
      const singleRowPadClass = wrapSingleInCard
        ? "min-w-0 px-1 py-0 sm:px-2"
        : "min-w-0 py-0"
      return (
        <div key={cat.id} className={singleRowPadClass}>
          {headerWrap}
          {lines}
        </div>
      )
    }

    return (
      <div
        key={cat.id}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm"
      >
        {headerWrap}
        {lines}
      </div>
    )
  })

  if (layout === "single") {
    if (!wrapSingleInCard) {
      return (
        <div className={cn("flex flex-col gap-3", className)}>
          {variant === "overlay" ? overlayHeaderRow : toolbarRow}
          <div className={cn("divide-y divide-slate-100")}>{categoryBlocks}</div>
        </div>
      )
    }
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
          {variant === "overlay" ? overlayHeaderRow : toolbarRow}
          <div
            className={cn(
              "divide-y divide-slate-100",
              variant === "overlay" && "max-h-none",
            )}
          >
            {categoryBlocks}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {variant === "overlay" && (
        <div className="flex flex-wrap items-baseline justify-end gap-x-2 border-b border-slate-200 pb-2">
          <div className={cn(wrap, "ml-auto")}>
            <span className={cn(col, COL_HEADER)}>Budget</span>
            <span className={cn(col, COL_HEADER)}>Spent</span>
            <span className={cn(col, COL_HEADER)}>Left</span>
          </div>
        </div>
      )}

      {variant === "compact" && showCompactToolbar && categories.length > 0 && (
        <div className="flex w-full min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-1 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => toggleAll(categories)}
            className="shrink-0 text-[10px] font-semibold text-[#0087D2] underline-offset-2 hover:underline"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
          <div className={cn(wrap, "ml-auto")}>
            <span className={cn(col, COL_HEADER)}>Budget</span>
            <span className={cn(col, COL_HEADER)}>Spent</span>
            <span className={cn(col, COL_HEADER)}>Left</span>
          </div>
        </div>
      )}

      <div className={cardsGridClass}>{categoryBlocks}</div>
    </div>
  )
}
