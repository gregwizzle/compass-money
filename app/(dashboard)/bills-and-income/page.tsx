import { RoadmapWorkspace } from "@/app/(dashboard)/bills-and-income/roadmap-workspace"
import { MONTH_LABELS, type MonthLabel } from "@/lib/budget-month"

type RoadmapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function RoadmapPage({ searchParams }: RoadmapPageProps) {
  const params = (await searchParams) ?? {}
  const monthParamRaw = params.month
  const monthParam = Array.isArray(monthParamRaw) ? monthParamRaw[0] : monthParamRaw
  const month = MONTH_LABELS.includes(monthParam as MonthLabel)
    ? (monthParam as MonthLabel)
    : undefined

  return <RoadmapWorkspace initialMonth={month} />
}
