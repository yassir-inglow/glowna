import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type AcceptInvitationResult = {
  projectId?: string
  error?: string
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
    revalidatePath("/")
    revalidatePath(`/projects/${result.project_id}`)
    return { projectId: result.project_id }
  }

  return { error: "Something went wrong" }
}
