import { TimelineWorkspace } from "@/app/(dashboard)/timeline/timeline-workspace"

export default function TimelineBetaPage() {
  return (
    <TimelineWorkspace
      visualVariant="lab-soft-slate"
      topLeftLinkHref="/timeline"
      topLeftLinkLabel="Back to Timeline"
    />
  )
}
