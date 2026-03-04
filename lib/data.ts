import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export type Project = Tables<"projects">

export type ProjectMember = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

export type ProjectWithMembers = Project & {
  members: ProjectMember[]
}

export type TaskWithProject = Tables<"tasks"> & {
  projects: Pick<Tables<"projects">, "title"> | null
  task_assignees: {
    profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null
  }[]
}

type ProjectWithMemberJoin = Tables<"projects"> & {
  project_members: {
    profiles: ProjectMember | null
  }[]
}

function extractMembers(project: ProjectWithMemberJoin): ProjectWithMembers {
  const members: ProjectMember[] = []
  const seen = new Set<string>()

  for (const pm of project.project_members ?? []) {
    const profile = pm.profiles
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id)
      members.push(profile)
    }
  }

  const { project_members: _pm, ...rest } = project
  return { ...rest, members }
}

const PROJECT_WITH_MEMBERS_QUERY = `
  *,
  project_members(
    profiles(id, email, full_name, avatar_url)
  )
`

export async function getProjects(): Promise<ProjectWithMembers[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_WITH_MEMBERS_QUERY)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map(extractMembers)
}

export async function getProjectById(id: string): Promise<ProjectWithMembers | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_WITH_MEMBERS_QUERY)
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") throw error
  if (!data) return null

  return extractMembers(data)
}

export async function getTasksByProjectId(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects!inner(title),
      task_assignees(profiles(id, full_name, email, avatar_url))
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as TaskWithProject[]
}

export async function getAllTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects!inner(title),
      task_assignees(profiles(id, full_name, email, avatar_url))
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as TaskWithProject[]
}
