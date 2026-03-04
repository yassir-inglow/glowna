import { ProjectsTasksView } from "@/components/dashboard/projects-tasks-view"
import { getProjects, getAllTasks } from "@/lib/data"
import { HomeGreeting } from "@/components/dashboard/home-greeting"

export default async function HomePage() {
  const [projects, tasks] = await Promise.all([getProjects(), getAllTasks()])

  return (
    <div className="flex w-full h-full flex-col items-center pt-32">
      <HomeGreeting />

      <div className="h-32 shrink-0" />

      <main className="w-full flex-1 min-h-0 flex flex-col rounded-t-[32px] bg-bg-primary p-6">
        <ProjectsTasksView projects={projects} tasks={tasks} />
      </main>
    </div>
  )
}
