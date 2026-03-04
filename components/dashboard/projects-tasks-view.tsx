"use client"

import * as React from "react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/dashboard/project-card"
import { ProjectTabs, type ProjectTabValue } from "@/components/dashboard/project-tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

function getInitials(email: string | null | undefined): string {
  if (!email) return "?"
  const name = email.split("@")[0]
  return name.slice(0, 2).toUpperCase()
}

type ProjectsTasksViewProps = {
  projects: ProjectWithMembers[]
  tasks: TaskWithProject[]
}

export function ProjectsTasksView({ projects, tasks }: ProjectsTasksViewProps) {
  const [activeTab, setActiveTab] = React.useState<ProjectTabValue>("project")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <ProjectTabs value={activeTab} onValueChange={setActiveTab} taskCount={tasks.length} />

        <div className="flex items-center gap-2">
          <SearchButton />
          <Button type="button" variant="primary" size="md" className="text-text-sm" leadingIcon={Add01Icon}>
            New Project
          </Button>
        </div>
      </div>

      {activeTab === "project" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              description={project.description ?? undefined}
              compactAvatars={project.compact_avatars}
              members={project.members}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              id={task.id}
              title={task.title}
              completed={task.completed}
              showAddons={!!(task.sub_task_total || task.add_text || task.label_text || task.comment_count)}
              subTaskCurrent={task.sub_task_current}
              subTaskTotal={task.sub_task_total}
              addText={task.add_text ?? undefined}
              labelText={task.label_text ?? undefined}
              commentCount={task.comment_count}
              projectName={task.projects?.title}
              avatars={task.task_assignees.map((a) => ({
                fallback: getInitials(a.profiles?.email),
              }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
