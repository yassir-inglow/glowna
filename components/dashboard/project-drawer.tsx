"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { TaskRowSkeleton } from "@/components/dashboard/task-row"
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
            <DrawerSkeleton title={project.title} />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DrawerSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-display-xs font-medium text-gray-cool-800">
          {title}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-cool-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
