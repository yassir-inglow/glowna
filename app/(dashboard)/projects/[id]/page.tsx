import { ProjectDetail } from "@/components/dashboard/project-detail"
import { getProjectById, getTasksByProjectId } from "@/lib/data"
import { notFound } from "next/navigation"

type Params = { id: string }

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const project = await getProjectById(id)

  if (!project) notFound()

  const tasks = await getTasksByProjectId(id)

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] flex-1 p-6">
        <ProjectDetail project={project} tasks={tasks} />
      </div>
    </div>
  )
}
