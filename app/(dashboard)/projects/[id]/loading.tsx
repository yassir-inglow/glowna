import { TaskRowSkeleton } from "@/components/dashboard/task-row"
import { AvatarGroupSkeleton } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLoading() {
  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] flex-1 p-6">
        <div className="h-full space-y-6">
          {/* Header: title + avatars + share */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <div className="flex items-center gap-3">
              <AvatarGroupSkeleton count={2} size="xs" />
              <Skeleton className="h-[26px] w-[72px] rounded-full" />
            </div>
          </div>

          {/* Toolbar: tabs + search button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-12 rounded-full" />
              <Skeleton className="h-8 w-14 rounded-full" />
              <Skeleton className="h-8 w-18 rounded-full" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>

          {/* Task list */}
          <div className="overflow-hidden">
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
            <TaskRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
