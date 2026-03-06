"use client"

import * as React from "react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"

import { LayoutGroup, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"
import { TaskContextMenu } from "@/components/dashboard/task-context-menu"
import { NewTaskRow } from "@/components/dashboard/new-task-row"
import { SharePopover } from "@/components/dashboard/invite-popover"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useProjectPresence } from "@/hooks/use-project-presence"
import { useUser } from "@/components/dashboard/user-provider"
import type { ProjectMember, ProjectWithMembers, TaskWithProject } from "@/lib/data"

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
  /** Called when a task row is clicked to open the detail panel. */
  onTaskSelect?: (taskId: string) => void
}

export function ProjectDetail({ project, tasks, onDeleteTask, onTaskToggle, onTaskCreated, enableRealtimeRefresh = true, onTaskSelect }: ProjectDetailProps) {
  const [activeView, setActiveView] = React.useState("overview")
  const [optimisticTasks, removeOptimisticTask] = React.useOptimistic(
    tasks,
    (state, deletedId: string) => state.filter((t) => t.id !== deletedId),
  )

  const user = useUser()
  const activeUserIds = useProjectPresence(project.id, user.id)

  const { activeMembers, inactiveMembers } = React.useMemo(() => {
    const ownerId = project.user_id
    const ownerFirst = (a: ProjectMember, b: ProjectMember) => {
      if (a.id === ownerId) return -1
      if (b.id === ownerId) return 1
      return 0
    }
    const active: ProjectMember[] = []
    const inactive: ProjectMember[] = []
    for (const m of project.members) {
      if (activeUserIds.has(m.id)) active.push(m)
      else inactive.push(m)
    }
    active.sort(ownerFirst)
    inactive.sort(ownerFirst)
    return { activeMembers: active, inactiveMembers: inactive }
  }, [project.members, project.user_id, activeUserIds])

  useRealtimeRefresh({ table: "tasks", filter: `project_id=eq.${project.id}`, enabled: enableRealtimeRefresh })
  useRealtimeRefresh({ table: "task_assignees", enabled: enableRealtimeRefresh })
  useRealtimeRefresh({ table: "project_members", filter: `project_id=eq.${project.id}`, enabled: enableRealtimeRefresh })

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
            <LayoutGroup>
              <div className="flex items-center gap-2">
                {activeMembers.length > 0 && (
                  <AvatarGroup>
                    {activeMembers.map((member) => (
                      <motion.div key={member.id} layoutId={`presence-${member.id}`} data-slot="avatar" className="inline-flex" transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <Avatar size="xs" active>
                          {member.avatar_url ? (
                            <AvatarImage src={member.avatar_url} alt="" />
                          ) : (
                            <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                          )}
                        </Avatar>
                      </motion.div>
                    ))}
                  </AvatarGroup>
                )}
                {inactiveMembers.length > 0 && (
                  <AvatarGroup>
                    {inactiveMembers.map((member) => (
                      <motion.div key={member.id} layoutId={`presence-${member.id}`} data-slot="avatar" className="inline-flex" transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                        <Avatar size="xs" active={false}>
                          {member.avatar_url ? (
                            <AvatarImage src={member.avatar_url} alt="" />
                          ) : (
                            <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                          )}
                        </Avatar>
                      </motion.div>
                    ))}
                  </AvatarGroup>
                )}
              </div>
            </LayoutGroup>
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

        <SearchButton />
      </div>

      <div className="overflow-hidden">
        <NewTaskRow
          projectId={project.id}
          members={project.members}
          onCreated={onTaskCreated}
        />
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
              members={project.members}
              assignedIds={task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[]}
              initialDueDate={task.due_date}
              initialDueDateEnd={task.due_date_end}
              onSelect={onTaskSelect ? () => onTaskSelect(task.id) : undefined}
            />
          </TaskContextMenu>
        ))}
      </div>
    </div>
  )
}
