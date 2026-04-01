export type ProjectRole = "editor" | "viewer"
export type ProjectPermission = "owner" | ProjectRole

export const DEFAULT_PROJECT_ROLE: ProjectRole = "editor"
export const PROJECT_ROLE_MIGRATION_PATH = "lib/supabase/migrations/014_project_member_roles.sql"
export const PROJECT_PERMISSION_HELPER_MIGRATION_PATH =
  "lib/supabase/migrations/016_fix_project_permission_helper_functions_plpgsql.sql"
export const PROJECT_ROLE_MIGRATION_ERROR =
  `Project permissions need a database migration before this feature can be used. Run ${PROJECT_ROLE_MIGRATION_PATH} in Supabase.`
export const PROJECT_PERMISSION_HELPER_MIGRATION_ERROR =
  `Project permissions need a follow-up database migration before this feature can be used. Run ${PROJECT_PERMISSION_HELPER_MIGRATION_PATH} in Supabase.`

export const PROJECT_ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: "editor", label: "Can edit" },
  { value: "viewer", label: "Can view only" },
]

type MemberLike = {
  id: string
  role?: string | null
}

type DatabaseErrorLike = {
  code?: string
  message?: string
  details?: string | null
}

function getDatabaseErrorHaystack(error: unknown) {
  if (!error || typeof error !== "object") return ""

  const candidate = error as DatabaseErrorLike
  return `${candidate.message ?? ""} ${candidate.details ?? ""}`.toLowerCase()
}

export function isProjectRole(value: string | null | undefined): value is ProjectRole {
  return value === "editor" || value === "viewer"
}

export function isMissingProjectRoleSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as DatabaseErrorLike
  const haystack = getDatabaseErrorHaystack(error)

  return candidate.code === "42703"
    || candidate.code === "PGRST204"
    || haystack.includes("project_members.role")
    || haystack.includes("project_invitations.role")
}

export function isProjectPermissionHelperError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as DatabaseErrorLike
  const haystack = getDatabaseErrorHaystack(error)

  return candidate.code === "57014"
    || candidate.code === "54001"
    || candidate.code === "42P17"
    || haystack.includes("statement timeout")
    || haystack.includes("stack depth")
    || haystack.includes("statement is too complex")
    || haystack.includes("infinite recursion")
}

export function normalizeProjectRole(value: string | null | undefined): ProjectRole {
  return value === "viewer" ? "viewer" : DEFAULT_PROJECT_ROLE
}

export function assertProjectRole(value: string | null | undefined): ProjectRole {
  if (!isProjectRole(value)) {
    throw new Error("Invalid project role")
  }

  return value
}

export function getProjectPermission({
  ownerId,
  userId,
  members,
}: {
  ownerId: string
  userId: string
  members: MemberLike[]
}): ProjectPermission | null {
  if (ownerId === userId) return "owner"

  const member = members.find((entry) => entry.id === userId)
  if (!member) return null

  return normalizeProjectRole(member.role)
}

export function canWriteProject(permission: ProjectPermission | null | undefined) {
  return permission === "owner" || permission === "editor"
}

export function canManageProjectSharing(permission: ProjectPermission | null | undefined) {
  return permission === "owner"
}

export function getProjectPermissionLabel(permission: ProjectPermission) {
  switch (permission) {
    case "owner":
      return "Full access"
    case "viewer":
      return "Can view only"
    default:
      return "Can edit"
  }
}
