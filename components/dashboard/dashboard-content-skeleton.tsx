import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCardSkeleton } from "@/components/dashboard/project-card"

export function DashboardContentSkeleton() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-[260px] rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 gap-6 md:grid-cols-3 auto-rows-min">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    </div>
  )
}
