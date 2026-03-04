"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/dashboard/project-card"
import { NewProjectCard } from "@/components/dashboard/new-project-card"
import { NewTaskRow } from "@/components/dashboard/new-task-row"
import { ProjectTabs, type ProjectTabValue } from "@/components/dashboard/project-tabs"
import { SearchButton } from "@/components/dashboard/search-button"
import { TaskRow } from "@/components/dashboard/task-row"
import { TaskContextMenu } from "@/components/dashboard/task-context-menu"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

type ProjectsTasksViewProps = {
  projects: ProjectWithMembers[]
  tasks: TaskWithProject[]
}

export function ProjectsTasksView({ projects, tasks }: ProjectsTasksViewProps) {
  const [activeTab, setActiveTab] = React.useState<ProjectTabValue>("project")
  const [search, setSearch] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  useRealtimeRefresh({ table: "tasks" })

  const handleTabChange = (tab: ProjectTabValue) => {
    setActiveTab(tab)
    setSearch("")
    setIsCreating(false)
  }

  const q = search.toLowerCase().trim()

  const filteredProjects = React.useMemo(
    () =>
      q
        ? projects.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q),
          )
        : projects,
    [projects, q],
  )

  const filteredTasks = React.useMemo(
    () =>
      q
        ? tasks.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.projects?.title.toLowerCase().includes(q) ||
              t.label_text?.toLowerCase().includes(q),
          )
        : tasks,
    [tasks, q],
  )

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between gap-4">
        <ProjectTabs value={activeTab} onValueChange={handleTabChange} taskCount={filteredTasks.length} />

        <div className="flex items-center gap-2">
          <SearchButton
            value={search}
            onValueChange={setSearch}
            placeholder={activeTab === "project" ? "Search projects…" : "Search tasks…"}
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="text-text-sm"
            leadingIcon={Add01Icon}
            onClick={() => setIsCreating(true)}
          >
            {activeTab === "project" ? "New Project" : "New Task"}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "project" ? (
          <motion.div
            key="project"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden grid grid-cols-1 gap-6 md:grid-cols-3 auto-rows-min"
          >
            <AnimatePresence initial={false}>
              {isCreating && (
                <motion.div
                  key="new-project"
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <NewProjectCard onDone={() => setIsCreating(false)} />
                </motion.div>
              )}
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectCard
                    id={project.id}
                    title={project.title}
                    description={project.description ?? undefined}
                    compactAvatars={project.compact_avatars}
                    members={project.members}
                    ownerId={project.user_id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="task"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden rounded-xl"
          >
            {isCreating && (
              <NewTaskRow
                projects={projects.map((p) => ({ id: p.id, title: p.title }))}
                onDone={() => setIsCreating(false)}
              />
            )}
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskContextMenu taskId={task.id} projectId={task.project_id}>
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
                      projectName={task.projects?.title}
                      avatars={task.task_assignees.map((a) => ({
                        src: a.profiles?.avatar_url ?? undefined,
                        fallback: getInitials(a.profiles?.full_name ?? a.profiles?.email),
                        value: a.profiles?.full_name ?? a.profiles?.email ?? undefined,
                      }))}
                    />
                  </TaskContextMenu>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
