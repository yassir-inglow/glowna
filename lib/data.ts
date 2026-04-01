import { createClient } from "@/lib/supabase/server"
import {
  isMissingProjectRoleSchemaError,
  isProjectPermissionHelperError,
  PROJECT_PERMISSION_HELPER_MIGRATION_ERROR,
} from "@/lib/project-permissions"
import type { Tables } from "@/lib/supabase/database.types"

export type Project = Tables<"projects">

export type ProjectMember = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: "editor" | "viewer"
}

export type ProjectWithMembers = Project & {
  members: ProjectMember[]
}

type ProjectMemberProfile = Omit<ProjectMember, "role">

export type TaskWithProject = Tables<"tasks"> & {
  projects: Pick<Tables<"projects">, "title"> | null
  task_assignees: {
    profiles: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null
  }[]
}

type ProjectWithMemberJoin = Tables<"projects"> & {
  project_members: {
    role?: Tables<"project_members">["role"]
    profiles: ProjectMemberProfile | null
  }[]
}

function extractMembers(project: ProjectWithMemberJoin): ProjectWithMembers {
  const members: ProjectMember[] = []
  const seen = new Set<string>()

  for (const pm of project.project_members ?? []) {
    const profile = pm.profiles
    if (profile && !seen.has(profile.id)) {
      seen.add(profile.id)
      members.push({
        ...profile,
        role: pm.role === "viewer" ? "viewer" : "editor",
      })
    }
  }

  const { project_members, ...rest } = project
  void project_members
  return { ...rest, members }
}

const PROJECT_WITH_MEMBERS_QUERY = `
  *,
  project_members(
    role,
    profiles(id, email, full_name, avatar_url)
  )
`

const LEGACY_PROJECT_WITH_MEMBERS_QUERY = `
  *,
  project_members(
    profiles(id, email, full_name, avatar_url)
  )
`

export async function getProjects(): Promise<ProjectWithMembers[]> {
  const supabase = await createClient()
  const primary = await supabase
    .from("projects")
    .select(PROJECT_WITH_MEMBERS_QUERY)
    .order("created_at", { ascending: false })

  let rows = primary.data as unknown as ProjectWithMemberJoin[] | null
  let error = primary.error

  if (error && isMissingProjectRoleSchemaError(error)) {
    const fallback = await supabase
      .from("projects")
      .select(LEGACY_PROJECT_WITH_MEMBERS_QUERY)
      .order("created_at", { ascending: false })

    rows = fallback.data as unknown as ProjectWithMemberJoin[] | null
    error = fallback.error
  }

  if (error) {
    if (isProjectPermissionHelperError(error)) {
      throw new Error(PROJECT_PERMISSION_HELPER_MIGRATION_ERROR)
    }

    throw error
  }

  return (rows ?? []).map(extractMembers)
}

export async function getProjectById(id: string): Promise<ProjectWithMembers | null> {
  const supabase = await createClient()
  const primary = await supabase
    .from("projects")
    .select(PROJECT_WITH_MEMBERS_QUERY)
    .eq("id", id)
    .single()

  let row = primary.data as unknown as ProjectWithMemberJoin | null
  let error = primary.error

  if (error && isMissingProjectRoleSchemaError(error)) {
    const fallback = await supabase
      .from("projects")
      .select(LEGACY_PROJECT_WITH_MEMBERS_QUERY)
      .eq("id", id)
      .single()

    row = fallback.data as unknown as ProjectWithMemberJoin | null
    error = fallback.error
  }

  if (error && error.code !== "PGRST116") {
    if (isProjectPermissionHelperError(error)) {
      throw new Error(PROJECT_PERMISSION_HELPER_MIGRATION_ERROR)
    }

    throw error
  }
  if (!row) return null

  return extractMembers(row)
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
    .order("id", { ascending: false })

  if (error) throw error
  return data as TaskWithProject[]
}

export async function getAllTasks() {
  const supabase = await createClient()

  // Only fetch tasks assigned to the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: assigned } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("profile_id", user.id)

  const taskIds = assigned?.map((a) => a.task_id) ?? []
  if (taskIds.length === 0) return []

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      projects!inner(title),
      task_assignees(profiles(id, full_name, email, avatar_url))
    `)
    .in("id", taskIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })

  if (error) throw error
  return data as TaskWithProject[]
}
