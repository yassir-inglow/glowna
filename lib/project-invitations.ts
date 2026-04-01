import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type AcceptInvitationResult = {
  projectId?: string
  error?: string
}

type InvitationContextPayload = Database["public"]["Functions"]["get_invitation_context"]["Returns"]

export type InvitationContext = {
  hasAccount: boolean
  invitedEmail: string
  inviterName: string
  isExpired: boolean
  projectId: string
  projectName: string
  status: string
}

export type InvitationContextResult =
  | { context: InvitationContext; error?: undefined; reason?: undefined }
  | { context?: undefined; error: string; reason?: "not_found" | "lookup_unavailable" }

function normalizeInvitationContext(
  payload: InvitationContextPayload,
): InvitationContextResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Invitation not found" }
  }

  const record = payload as Record<string, unknown>

  if (typeof record.error === "string" && record.error.length > 0) {
    return { error: record.error }
  }

  if (
    typeof record.invited_email !== "string" ||
    typeof record.inviter_name !== "string" ||
    typeof record.project_id !== "string" ||
    typeof record.project_name !== "string" ||
    typeof record.status !== "string" ||
    typeof record.is_expired !== "boolean"
  ) {
    return { error: "Invitation not found" }
  }

  return {
    context: {
      hasAccount: typeof record.has_account === "boolean" ? record.has_account : false,
      invitedEmail: record.invited_email,
      inviterName: record.inviter_name,
      isExpired: record.is_expired,
      projectId: record.project_id,
      projectName: record.project_name,
      status: record.status,
    },
  }
}

export async function getInvitationContext(
  token: string,
): Promise<InvitationContextResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_invitation_context", {
    p_token: token,
  })

  if (error) {
    if (error.code === "PGRST202") {
      return {
        error: "Invitation lookup is not available yet",
        reason: "lookup_unavailable",
      }
    }

    return { error: "Invitation not found", reason: "not_found" }
  }

  return normalizeInvitationContext(data)
}

export async function acceptInvitationForCurrentUser(
  token: string,
): Promise<AcceptInvitationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase.rpc("accept_project_invitation", {
    p_token: token,
  })

  if (error) {
    return { error: "Failed to join the project" }
  }

  const result = data as { project_id?: string; error?: string } | null

  if (result?.error) {
    return { error: result.error }
  }

  if (result?.project_id) {
    return { projectId: result.project_id }
  }

  return { error: "Something went wrong" }
}
