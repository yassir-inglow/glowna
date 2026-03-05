"use client"

import * as React from "react"
import { Add01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"
import { TaskContextMenu } from "@/components/dashboard/task-context-menu"
import { NewTaskRow } from "@/components/dashboard/new-task-row"
import { SharePopover } from "@/components/dashboard/invite-popover"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

type ProjectDetailProps = {
  project: ProjectWithMembers
  tasks: TaskWithProject[]
  onDeleteTask?: (taskId: string) => void
  /** Called when a task's completed state is toggled (for local-state sync in the drawer). */
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  /** Called after a new task is created (so the parent can re-fetch). */
  onTaskCreated?: () => void
  /** Disable the built-in Realtime refresh (e.g. when a parent already subscribes). */
  enableRealtimeRefresh?: boolean
}

export function ProjectDetail({ project, tasks, onDeleteTask, onTaskToggle, onTaskCreated, enableRealtimeRefresh = true }: ProjectDetailProps) {
  const [activeView, setActiveView] = React.useState("overview")
  const [isCreating, setIsCreating] = React.useState(false)
  const [optimisticTasks, removeOptimisticTask] = React.useOptimistic(
    tasks,
    (state, deletedId: string) => state.filter((t) => t.id !== deletedId),
  )

  useRealtimeRefresh({ table: "tasks", filter: `project_id=eq.${project.id}`, enabled: enableRealtimeRefresh })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          trailingIcon={ArrowDown01Icon}
          className="text-display-xs font-medium text-gray-cool-800 hover:bg-transparent"
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
          <SharePopover projectId={project.id} members={project.members} ownerId={project.user_id} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="h-auto gap-0 rounded-full bg-transparent p-0">
            {["Overview", "List", "Board", "Timeline"].map((tab) => (
              <TabsTrigger
                key={tab.toLowerCase()}
                value={tab.toLowerCase()}
                className="rounded-full px-3 py-1.5 text-text-sm font-medium text-gray-cool-400 transition-colors data-[state=active]:bg-alpha-900 data-[state=active]:text-gray-cool-700"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <SearchButton />
          <Button
            type="button"
            variant="primary"
            size="xs"
            leadingIcon={Add01Icon}
            onClick={() => setIsCreating(true)}
          >
            New Task
          </Button>
        </div>
      </div>

      <div className="overflow-hidden">
        {isCreating && (
          <NewTaskRow
            projectId={project.id}
            onDone={() => setIsCreating(false)}
            onCreated={onTaskCreated}
          />
        )}
        {optimisticTasks.map((task) => (
          <TaskContextMenu key={task.id} taskId={task.id} projectId={task.project_id} onDelete={() => { removeOptimisticTask(task.id); onDeleteTask?.(task.id) }}>
            <TaskRow
              id={task.id}
              title={task.title}
              completed={task.completed}
              onCompletedChange={onTaskToggle ? (checked) => onTaskToggle(task.id, checked) : undefined}
              showAddons={!!(task.sub_task_total || task.add_text || task.label_text || task.comment_count)}
              subTaskCurrent={task.sub_task_current}
              subTaskTotal={task.sub_task_total}
              addText={task.add_text ?? undefined}
              labelText={task.label_text ?? undefined}
              commentCount={task.comment_count}
              avatars={task.task_assignees.map((a) => ({
                src: a.profiles?.avatar_url ?? undefined,
                fallback: getInitials(a.profiles?.full_name ?? a.profiles?.email),
                value: a.profiles?.full_name ?? a.profiles?.email ?? undefined,
              }))}
            />
          </TaskContextMenu>
        ))}
      </div>
    </div>
  )
}
