import { TaskRowSkeleton } from "@/components/dashboard/task-row"
import { AvatarGroupSkeleton } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLoading() {
  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48 rounded-md" />
        <div className="flex items-center gap-3">
          <AvatarGroupSkeleton count={2} size="xs" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-18 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl">
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    </div>
  )
}
