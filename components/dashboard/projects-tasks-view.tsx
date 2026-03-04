"use client"

import * as React from "react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/dashboard/project-card"
import { ProjectTabs, type ProjectTabValue } from "@/components/dashboard/project-tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"

const TASK_ROWS = [
  {
    title: "Project name",
    subTaskCurrent: 1,
    subTaskTotal: 5,
    addText: "Text",
    labelText: "Label",
    commentCount: 2,
    projectName: "Project name",
    avatars: [{ fallback: "YO" }],
  },
  {
    title: "Project name",
    showAddons: false,
    projectName: "Project name",
    avatars: [{ fallback: "YO" }, { fallback: "AN" }],
  },
  {
    title: "Project name",
    subTaskCurrent: 1,
    subTaskTotal: 5,
    addText: "Text",
    labelText: "Label",
    commentCount: 2,
    projectName: "Project name",
    avatars: [{ fallback: "YO" }],
  },
]

export function ProjectsTasksView() {
  const [activeTab, setActiveTab] = React.useState<ProjectTabValue>("project")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <ProjectTabs value={activeTab} onValueChange={setActiveTab} taskCount={TASK_ROWS.length} />

        <div className="flex items-center gap-2">
          <SearchButton />
          <Button type="button" variant="primary" size="md" className="text-text-sm" leadingIcon={Add01Icon}>
            New Project
          </Button>
        </div>
      </div>

      {activeTab === "project" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ProjectCard
            title="Name Project"
            description="this is description on the project"
          />
          <ProjectCard title="Name Project" compactAvatars />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl">
          {TASK_ROWS.map((task, index) => (
            <TaskRow key={`${task.title}-${task.projectName}-${index}`} {...task} />
          ))}
        </div>
      )}
    </div>
  )
}
