"use client"

import { useSearchParams } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { AvatarGroupSkeleton } from "@/components/ui/avatar"
import { ProjectCardSkeleton } from "@/components/dashboard/project-card"
import { TaskRowSkeleton } from "@/components/dashboard/task-row"

function DrawerOverlaySkeleton() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-[78px] z-50 flex flex-col rounded-t-[32px] bg-bg-primary shadow-[0px_-8px_32px_-4px_rgba(93,107,152,0.12)]">
      <div className="mx-auto w-full max-w-[1100px] flex-1 overflow-hidden p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48 rounded-md" />
            <div className="flex items-center gap-3">
              <AvatarGroupSkeleton count={2} size="xs" />
              <Skeleton className="h-6 w-[72px] rounded-full" />
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
              <Skeleton className="h-9 w-[108px] rounded-full" />
            </div>
          </div>

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

export function DashboardContentSkeleton() {
  const searchParams = useSearchParams()
  const hasProject = searchParams.has("project")

  return (
    <>
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

      {hasProject && <DrawerOverlaySkeleton />}
    </>
  )
}
