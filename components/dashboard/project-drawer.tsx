"use client"

import * as React from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { AnimatePresence, motion } from "motion/react"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { TaskDetailPanel } from "@/components/dashboard/task-detail-panel"
import { TaskRowSkeleton } from "@/components/dashboard/task-row"
import { Button } from "@/components/ui/button"
import { ButtonSkeleton } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchButtonSkeleton } from "@/components/dashboard/search-button"
import { createClient } from "@/lib/supabase/client"
import { hasRecentLocalMutation, markMutation } from "@/hooks/mutation-tracker"
import { onPeerChange } from "@/hooks/use-broadcast-sync"
import { toggleTaskCompleted } from "@/app/actions"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

type ProjectDrawerProps = {
  projects: ProjectWithMembers[]
  projectId: string | null
  onClose: () => void
}

export function ProjectDrawer({ projects, projectId, onClose }: ProjectDrawerProps) {
  const [tasks, setTasks] = React.useState<TaskWithProject[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)

  // Find the project from already-loaded data (instant)
  const project = React.useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) ?? null : null),
    [projectId, projects],
  )

  const isOpen = !!project

  // Task cache: show cached data immediately on reopen, refetch in background
  const taskCacheRef = React.useRef<Map<string, TaskWithProject[]>>(new Map())
  const cacheSet = React.useCallback((pid: string, data: TaskWithProject[]) => {
    const cache = taskCacheRef.current
    if (cache.size >= 20) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }
    cache.set(pid, data)
  }, [])

  // Refs for values accessed inside realtime callbacks (avoids effect re-subscription)
  const tasksRef = React.useRef(tasks)
  tasksRef.current = tasks
  const projectRef = React.useRef(project)
  projectRef.current = project

  const fetchProjectTasks = React.useCallback(async (pid: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `*,
        projects!inner(title),
        task_assignees(profiles(id, full_name, email, avatar_url))`,
      )
      .eq("project_id", pid)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
    if (error) return null
    return (data as TaskWithProject[]) ?? []
  }, [])

  // Fetch tasks client-side when project changes (cache-first)
  React.useEffect(() => {
    if (!projectId) {
      setTasks(null)
      setSelectedTaskId(null)
      return
    }

    setSelectedTaskId(null)

    // Cache hit: show cached data immediately, no skeleton
    const cached = taskCacheRef.current.get(projectId)
    if (cached) {
      setTasks(cached)
      setLoading(false)
    } else {
      setTasks(null)
      setLoading(true)
    }

    // Always refetch in background for fresh data
    let cancelled = false
    fetchProjectTasks(projectId).then((result) => {
      if (cancelled) return
      if (result) {
        setTasks(result)
        cacheSet(projectId, result)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [projectId, fetchProjectTasks, cacheSet])

  // Deduplication + version guard: skip redundant refetches within 300ms and
  // discard results if postgres_changes patched data while the fetch was in-flight.
  const lastRefetchRef = React.useRef(0)
  const patchVersionRef = React.useRef(0)

  const dedupedRefetch = React.useCallback(
    async (pid: string) => {
      const now = Date.now()
      if (now - lastRefetchRef.current < 300) return
      lastRefetchRef.current = now
      const vBefore = patchVersionRef.current
      const result = await fetchProjectTasks(pid)
      if (patchVersionRef.current > vBefore) return
      if (result) {
        setTasks(result)
        cacheSet(pid, result)
      }
    },
    [fetchProjectTasks, cacheSet],
  )

  // Realtime subscription: payload-patch for instant updates + background refetch
  React.useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    let urgentTimeout: ReturnType<typeof setTimeout> | null = null
    let bgTimeout: ReturnType<typeof setTimeout> | null = null

    const scheduleUrgentRefetch = (table: string) => {
      const delay = hasRecentLocalMutation(table) ? 2000 : 150
      if (urgentTimeout) clearTimeout(urgentTimeout)
      urgentTimeout = setTimeout(() => dedupedRefetch(projectId!), delay)
    }

    const scheduleBackgroundRefetch = () => {
      if (bgTimeout) clearTimeout(bgTimeout)
      bgTimeout = setTimeout(() => dedupedRefetch(projectId!), 2000)
    }

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
        (payload: any) => {
          if (hasRecentLocalMutation("tasks")) {
            scheduleBackgroundRefetch()
            return
          }

          const { eventType, new: newRow } = payload

          if (eventType === "UPDATE" && newRow) {
            patchVersionRef.current++
            setTasks((prev) =>
              prev?.map((t) =>
                t.id === newRow.id
                  ? { ...t, ...newRow, projects: t.projects, task_assignees: t.task_assignees }
                  : t,
              ) ?? null,
            )
            scheduleBackgroundRefetch()
          } else {
            // INSERT/DELETE — need full data, refetch fast
            scheduleUrgentRefetch("tasks")
          }
        },
      )
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "task_assignees",
        },
        (payload: any) => {
          if (hasRecentLocalMutation("task_assignees")) {
            scheduleBackgroundRefetch()
            return
          }

          const { eventType, new: newRow, old: oldRow } = payload
          const taskId = newRow?.task_id ?? oldRow?.task_id
          const profileId = newRow?.profile_id ?? oldRow?.profile_id

          // Ignore events for tasks not in this project
          if (!taskId) {
            scheduleUrgentRefetch("task_assignees")
            return
          }

          const isRelevant = tasksRef.current?.some((t) => t.id === taskId)
          if (!isRelevant) return

          if (eventType === "INSERT" && profileId) {
            const member = projectRef.current?.members.find((m) => m.id === profileId)
            if (member) {
              patchVersionRef.current++
              setTasks((prev) =>
                prev?.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        task_assignees: [
                          ...t.task_assignees,
                          { profiles: { id: member.id, full_name: member.full_name, email: member.email, avatar_url: member.avatar_url } },
                        ],
                      }
                    : t,
                ) ?? null,
              )
              scheduleBackgroundRefetch()
              return
            }
          }

          if (eventType === "DELETE" && profileId) {
            patchVersionRef.current++
            setTasks((prev) =>
              prev?.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      task_assignees: t.task_assignees.filter((a) => a.profiles?.id !== profileId),
                    }
                  : t,
              ) ?? null,
            )
            scheduleBackgroundRefetch()
            return
          }

          scheduleUrgentRefetch("task_assignees")
        },
      )
      .subscribe()

    return () => {
      if (urgentTimeout) clearTimeout(urgentTimeout)
      if (bgTimeout) clearTimeout(bgTimeout)
      supabase.removeChannel(channel)
    }
  }, [projectId, dedupedRefetch])

  // Broadcast fallback: delayed so the DB update completes before we query,
  // and the version guard in dedupedRefetch discards stale results if
  // postgres_changes already patched during the fetch.
  React.useEffect(() => {
    if (!projectId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = onPeerChange((payload) => {
      const table = payload?.table as string | undefined
      if (table && !["tasks", "task_assignees"].includes(table)) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => dedupedRefetch(projectId), 1500)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [projectId, dedupedRefetch])

  const handleTaskToggle = React.useCallback(async (taskId: string, completed: boolean) => {
    setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, completed } : t)) ?? null)
    markMutation("tasks")
    await toggleTaskCompleted(taskId, completed)
  }, [])

  const handleTaskTitleChange = React.useCallback((taskId: string, title: string) => {
    setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, title } : t)) ?? null)
  }, [])

  const handleTaskDateChange = React.useCallback((taskId: string, dueDate: string | null, dueDateEnd: string | null) => {
    setTasks((prev) =>
      prev?.map((t) =>
        t.id === taskId ? { ...t, due_date: dueDate, due_date_end: dueDateEnd } : t,
      ) ?? null,
    )
  }, [])

  const handleTaskPriorityChange = React.useCallback((taskId: string, priority: string) => {
    setTasks((prev) =>
      prev?.map((t) =>
        t.id === taskId ? { ...t, priority } : t,
      ) ?? null,
    )
  }, [])

  const handleTaskAssigneeChange = React.useCallback((taskId: string, assignedIds: string[]) => {
    setTasks((prev) =>
      prev?.map((t) => {
        if (t.id !== taskId) return t
        const projectMembers = projectRef.current?.members ?? []
        const newAssignees = assignedIds
          .map((pid) => projectMembers.find((m) => m.id === pid))
          .filter(Boolean)
          .map((m) => ({
            profiles: { id: m!.id, full_name: m!.full_name, email: m!.email, avatar_url: m!.avatar_url },
          }))
        return { ...t, task_assignees: newAssignees }
      }) ?? null,
    )
  }, [])

  const handleTaskCreated = React.useCallback(async () => {
    if (!projectId) return
    const result = await fetchProjectTasks(projectId)
    if (result) {
      setTasks(result)
      cacheSet(projectId, result)
    }
  }, [projectId, fetchProjectTasks, cacheSet])

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  const selectedTask = selectedTaskId && tasks ? tasks.find((t) => t.id === selectedTaskId) ?? null : null

  const observerRef = React.useRef<ResizeObserver | null>(null)
  const [hasRoom, setHasRoom] = React.useState(false)

  const containerRef = React.useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setHasRoom(entry.contentRect.width >= 1400)
    })
    observer.observe(el)
    observerRef.current = observer
  }, [])

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent open={isOpen}>
        <div ref={containerRef} className="relative flex-1 overflow-hidden">
          <motion.div
            className="h-full w-full overflow-y-auto scrollbar-hidden"
            animate={{ x: selectedTaskId && hasRoom ? -100 : 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={() => { if (selectedTaskId) setSelectedTaskId(null) }}
          >
            <div className="mx-auto w-full max-w-[1100px] p-6">
              {project && tasks !== null && !loading ? (
                <ProjectDetail
                  project={project}
                  tasks={tasks}
                  onDeleteTask={(taskId) => { setSelectedTaskId(null); setTasks((prev) => prev?.filter((t) => t.id !== taskId) ?? null) }}
                  onTaskToggle={handleTaskToggle}
                  onTaskCreated={handleTaskCreated}
                  enableRealtimeRefresh={false}
                  onTaskSelect={setSelectedTaskId}
                  selectedTaskId={selectedTaskId}
                  onTaskPriorityChange={handleTaskPriorityChange}
                />
              ) : project ? (
                <DrawerSkeleton project={project} />
              ) : null}
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedTask && project && (
              <TaskDetailPanel
                key="task-panel"
                task={selectedTask}
                members={project.members}
                onClose={() => setSelectedTaskId(null)}
                onTaskToggle={handleTaskToggle}
                onTitleChange={handleTaskTitleChange}
                onDateChange={handleTaskDateChange}
                onPriorityChange={handleTaskPriorityChange}
                onAssigneeChange={handleTaskAssigneeChange}
              />
            )}
          </AnimatePresence>
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
