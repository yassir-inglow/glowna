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

type ProjectWithOwnerAndTasks = Tables<"projects"> & {
  owner: ProjectMember | null
  tasks: {
    task_assignees: {
      profiles: ProjectMember | null
    }[]
  }[]
}

function extractMembers(project: ProjectWithOwnerAndTasks): ProjectWithMembers {
  const seen = new Set<string>()
  const members: ProjectMember[] = []

  const owner = project.owner
  if (owner) {
    seen.add(owner.id)
    members.push(owner)
  }

  for (const task of project.tasks ?? []) {
    for (const assignee of task.task_assignees ?? []) {
      const profile = assignee.profiles
      if (profile && !seen.has(profile.id)) {
        seen.add(profile.id)
        members.push(profile)
      }
    }
  }

  const { tasks: _tasks, owner: _owner, ...rest } = project
  return { ...rest, members }
}

const PROJECT_WITH_MEMBERS_QUERY = `
  *,
  owner:profiles!projects_user_id_profiles_fkey(id, email, full_name, avatar_url),
  tasks(
    task_assignees(
      profiles(id, email, full_name, avatar_url)
    )
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
