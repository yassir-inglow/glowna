import { TaskRowSkeleton } from "@/components/dashboard/task-row"

export default function ProjectLoading() {
  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded-md bg-gray-cool-100" />
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            <div className="size-6 animate-pulse rounded-full bg-gray-cool-100" />
            <div className="size-6 animate-pulse rounded-full bg-gray-cool-100" />
          </div>
          <div className="h-9 w-20 animate-pulse rounded-full bg-gray-cool-100" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <div className="h-8 w-20 animate-pulse rounded-full bg-gray-cool-100" />
          <div className="h-8 w-12 animate-pulse rounded-full bg-gray-cool-100" />
          <div className="h-8 w-14 animate-pulse rounded-full bg-gray-cool-100" />
          <div className="h-8 w-18 animate-pulse rounded-full bg-gray-cool-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-cool-100" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-gray-cool-100" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-cool-100">
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    </div>
  )
}
