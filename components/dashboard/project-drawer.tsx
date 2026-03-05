"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { TaskRowSkeleton } from "@/components/dashboard/task-row"
import { Button } from "@/components/ui/button"
import { ButtonSkeleton } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchButtonSkeleton } from "@/components/dashboard/search-button"
import { createClient } from "@/lib/supabase/client"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

type ProjectDrawerProps = {
  projects: ProjectWithMembers[]
}

export function ProjectDrawer({ projects }: ProjectDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("project")

  const [tasks, setTasks] = React.useState<TaskWithProject[] | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Find the project from already-loaded data (instant)
  const project = React.useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) ?? null : null),
    [projectId, projects],
  )

  const isOpen = !!project

  // Fetch tasks client-side when project changes
  React.useEffect(() => {
    if (!projectId) {
      setTasks(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchTasks() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `*,
          projects!inner(title),
          task_assignees(profiles(id, full_name, email, avatar_url))`,
        )
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })

      if (!cancelled && !error) {
        setTasks((data as TaskWithProject[]) ?? [])
      }
      if (!cancelled) setLoading(false)
    }

    fetchTasks()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Realtime subscription: re-fetch tasks when they change
  React.useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`drawer-tasks-${projectId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Debounce re-fetch
          if (timeout) clearTimeout(timeout)
          timeout = setTimeout(async () => {
            const { data, error } = await supabase
              .from("tasks")
              .select(
                `*,
                projects!inner(title),
                task_assignees(profiles(id, full_name, email, avatar_url))`,
              )
              .eq("project_id", projectId!)
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })

            if (!error) {
              setTasks((data as TaskWithProject[]) ?? [])
            }
          }, 300)
        },
      )
      .subscribe()

    return () => {
      if (timeout) clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  }, [projectId])

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("project")
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : "/", { scroll: false })
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose()
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent open={isOpen}>
        <div className="mx-auto w-full max-w-[1100px] flex-1 overflow-y-auto p-6 scrollbar-hidden">
          {project && tasks !== null && !loading ? (
            <ProjectDetail project={project} tasks={tasks} />
          ) : project ? (
            <DrawerSkeleton project={project} />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DrawerSkeleton({ project }: { project: ProjectWithMembers }) {
  return (
    <div className="space-y-6">
      {/* Title row — mirrors ProjectDetail header exactly */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          trailingIcon={ArrowDown01Icon}
          className="text-display-xs font-medium text-gray-cool-800 hover:bg-transparent pointer-events-none"
        >
          {project.title}
        </Button>
        <div className="flex items-center gap-3">
          {project.members.length > 0 && (
            <AvatarGroup>
              {project.members.map((member) => (
                <Avatar key={member.id} size="xs" className="ring-[1.5px] ring-white">
                  {member.avatar_url ? (
                    <AvatarImage src={member.avatar_url} alt="" />
                  ) : (
                    <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                  )}
                </Avatar>
              ))}
            </AvatarGroup>
          )}
          <ButtonSkeleton size="xxs" width="w-[72px]" />
        </div>
      </div>

      {/* Tabs row — mirrors ProjectDetail tabs + action buttons */}
      <div className="flex items-center justify-between gap-4">
        <Tabs defaultValue="overview">
          <TabsList className="h-auto gap-0 rounded-full bg-transparent p-0">
            {["Overview", "List", "Board", "Timeline"].map((tab) => (
              <TabsTrigger
                key={tab.toLowerCase()}
                value={tab.toLowerCase()}
                className="pointer-events-none rounded-full px-3 py-1.5 text-text-sm font-medium text-gray-cool-400 transition-colors data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-700"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <SearchButtonSkeleton />
          <ButtonSkeleton size="xs" width="w-[108px]" />
        </div>
      </div>

      {/* Task list skeleton */}
      <div className="overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
