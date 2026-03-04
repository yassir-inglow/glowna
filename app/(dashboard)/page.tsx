import { createClient } from "@/lib/supabase/server"
import { ProjectsTasksView } from "@/components/dashboard/projects-tasks-view"
import { getProjects, getAllTasks } from "@/lib/data"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [projects, tasks] = await Promise.all([getProjects(), getAllTasks()])

  const displayName = user?.email?.split("@")[0] ?? "Jane"
  const firstName =
    displayName.charAt(0).toUpperCase() + displayName.slice(1)
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  return (
    <div className="flex w-full min-h-full flex-col items-center gap-32 pt-32">
      <section className="space-y-1.5 text-center">
        <p className="text-text-xl font-medium text-gray-cool-400">
          {currentDate}
        </p>
        <h1 className="text-[72px]/none italic text-gray-cool-800 [font-family:'PT_Serif',serif]">
          Good morning, {firstName}
        </h1>
      </section>

      <main className="w-full flex-1 rounded-t-[32px] rounded-b-none bg-bg-primary p-6">
        <ProjectsTasksView projects={projects} tasks={tasks} />
      </main>
    </div>
  )
}
