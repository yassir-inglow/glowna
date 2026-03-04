import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export type Project = Tables<"projects">

export type ProjectMember = {
  id: string
  email: string | null
  full_name: string | null
}

export type ProjectWithMembers = Project & {
  members: ProjectMember[]
}

export type TaskWithProject = Tables<"tasks"> & {
  projects: Pick<Tables<"projects">, "title"> | null
  task_assignees: {
    profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null
  }[]
}

export async function getProjects(): Promise<ProjectWithMembers[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      tasks(
        task_assignees(
          profiles(id, email, full_name)
        )
      )
    `)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((project) => {
    const seen = new Set<string>()
    const members: ProjectMember[] = []

    for (const task of project.tasks ?? []) {
      for (const assignee of task.task_assignees ?? []) {
        const profile = assignee.profiles
        if (profile && !seen.has(profile.id)) {
          seen.add(profile.id)
          members.push(profile)
        }
      }
    }

    const { tasks: _tasks, ...rest } = project
    return { ...rest, members }
  })
}

export async function getProjectById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data
}

export async function getTasksByProjectId(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects!inner(title),
      task_assignees(profiles(id, full_name, email))
    `)
    .eq("project_id", projectId)
    .order("position", { ascending: true })

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
      task_assignees(profiles(id, full_name, email))
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as TaskWithProject[]
}
