import { ProjectDetail } from "@/components/dashboard/project-detail"
import { getProjectById, getTasksByProjectId } from "@/lib/data"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

type Params = { id: string }

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const project = await getProjectById(id)

  if (!project) notFound()

  const isOwner = project.user_id === user.id
  const isMember = project.members.some((m) => m.id === user.id)
  if (!isOwner && !isMember) notFound()

  const tasks = await getTasksByProjectId(id)

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] flex-1 p-6">
        <ProjectDetail project={project} tasks={tasks} />
      </div>
    </div>
  )
}
