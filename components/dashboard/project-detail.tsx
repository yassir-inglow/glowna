"use client"

import * as React from "react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"
import { TaskContextMenu } from "@/components/dashboard/task-context-menu"
import { NewTaskRow } from "@/components/dashboard/new-task-row"
import { InvitePopover } from "@/components/dashboard/invite-popover"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type ProjectDetailProps = {
  project: ProjectWithMembers
  tasks: TaskWithProject[]
}

export function ProjectDetail({ project, tasks }: ProjectDetailProps) {
  const [activeView, setActiveView] = React.useState("overview")
  const [isCreating, setIsCreating] = React.useState(false)

  useRealtimeRefresh({ table: "tasks", filter: `project_id=eq.${project.id}` })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-1 text-display-xs font-medium text-gray-cool-800"
        >
          {project.title}
          <ChevronDownIcon />
        </button>
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
          <InvitePopover projectId={project.id} />
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

      <div className="overflow-hidden rounded-xl border border-gray-cool-100">
        {tasks.map((task) => (
          <TaskContextMenu key={task.id} taskId={task.id} projectId={task.project_id}>
            <TaskRow
              id={task.id}
              title={task.title}
              completed={task.completed}
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
        {isCreating && (
          <NewTaskRow
            projectId={project.id}
            onDone={() => setIsCreating(false)}
          />
        )}
      </div>
    </div>
  )
}
