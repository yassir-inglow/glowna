import { getProjects, getAllTasks } from "@/lib/data"
import { ProjectsTasksView } from "@/components/dashboard/projects-tasks-view"

export async function DashboardContent() {
  const [projects, tasks] = await Promise.all([getProjects(), getAllTasks()])

  return <ProjectsTasksView projects={projects} tasks={tasks} />
}
