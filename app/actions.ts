"use server"

import { createClient } from "@/lib/supabase/server"
import { getResendClient } from "@/lib/resend"
import { projectInviteEmail } from "@/lib/emails/project-invite"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return { supabase, user }
}

async function requireProjectAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const { count } = await supabase
    .from("project_members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("profile_id", userId)

  if (!count || count === 0) throw new Error("Access denied")
}

async function requireTaskAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
) {
  const { data: task } = await supabase
    .from("tasks")
    .select("user_id, project_id")
    .eq("id", taskId)
    .single()

  if (!task) throw new Error("Task not found")
  if (task.user_id === userId) return task

  await requireProjectAccess(supabase, userId, task.project_id)
  return task
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  const { supabase, user } = await requireUser()

  // Single query: update + return project_id. RLS ensures the user has access;
  // manual ownership check is a fallback if no row is returned.
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId)
    .select("project_id")
    .maybeSingle()

  if (error) throw error
  if (!data) {
    // Verify the task exists before throwing — could be an RLS denial vs missing row
    const { data: task } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("id", taskId)
      .single()
    if (!task) throw new Error("Task not found")
    throw new Error("Access denied")
  }

  revalidatePath("/")
  revalidatePath(`/projects/${data.project_id}`)
}

export async function createTask(projectId: string, title: string) {
  const { supabase, user } = await requireUser()
  await requireProjectAccess(supabase, user.id, projectId)

  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert({
      title,
      project_id: projectId,
      completed: false,
      user_id: user.id,
    })
    .select("id, created_at")
    .single()

  if (error) throw error

  await supabase.from("task_assignees").insert({
    task_id: newTask.id,
    profile_id: user.id,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/")

  return {
    id: newTask.id,
    createdAt: newTask.created_at,
    projectId,
    title,
  }
}

export async function deleteTask(taskId: string) {
  const { supabase, user } = await requireUser()

  const { data: task } = await supabase
    .from("tasks")
    .select("user_id, project_id")
    .eq("id", taskId)
    .single()

  if (!task) return

  if (task.user_id !== user.id) {
    await requireProjectAccess(supabase, user.id, task.project_id)
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function duplicateTask(taskId: string) {
  const { supabase, user } = await requireUser()
  await requireTaskAccess(supabase, user.id, taskId)

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single()

  if (fetchError || !task) throw fetchError ?? new Error("Task not found")

  const { id: _id, created_at: _c, updated_at: _u, ...fields } = task

  const { data: newTask, error: insertError } = await supabase
    .from("tasks")
    .insert({
      ...fields,
      title: `${fields.title} (copy)`,
      position: fields.position + 1,
    })
    .select("id")
    .single()

  if (insertError) throw insertError

  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("profile_id")
    .eq("task_id", taskId)

  if (assignees && assignees.length > 0) {
    await supabase.from("task_assignees").insert(
      assignees.map((a) => ({ task_id: newTask.id, profile_id: a.profile_id })),
    )
  }

  revalidatePath("/")
  revalidatePath(`/projects/${fields.project_id}`)
}

export async function deleteProject(projectId: string) {
  const { supabase, user } = await requireUser()

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single()

  if (!project) throw new Error("Project not found")
  if (project.user_id !== user.id) throw new Error("Only the project owner can delete it")

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)

  if (error) throw error

  revalidatePath("/")
}

export async function updateProfile(fullName: string) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (error) throw error

  revalidatePath("/")
}

export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await requireUser()

  const file = formData.get("avatar") as File
  if (!file || file.size === 0) throw new Error("No file provided")

  const ext = file.name.split(".").pop() ?? "png"
  const filePath = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) throw updateError

  revalidatePath("/")
  return publicUrl
}

export async function createProject(title: string, description?: string) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase.from("projects").insert({
    title,
    description: description || null,
    user_id: user.id,
  })

  if (error) throw error

  revalidatePath("/")
}

export async function inviteToProject(
  projectId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectAccess(supabase, user.id, projectId)

  const normalizedEmail = email.trim().toLowerCase()

  // Check if this email is already a member
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single()

  if (existingProfile) {
    const { count } = await supabase
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("profile_id", existingProfile.id)

    if (count && count > 0) {
      return { success: false, error: "This person is already a member" }
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("project_invitations")
    .select("id, expires_at")
    .eq("project_id", projectId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single()

  if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
    return { success: false, error: "An invitation has already been sent to this email" }
  }

  // If there was an expired pending invite, clean it up
  if (existingInvite) {
    await supabase
      .from("project_invitations")
      .update({ status: "expired" })
      .eq("id", existingInvite.id)
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("project_invitations")
    .insert({
      project_id: projectId,
      email: normalizedEmail,
      invited_by: user.id,
    })
    .select("token")
    .single()

  if (inviteError) {
    return { success: false, error: "Failed to create invitation" }
  }

  // Get project name and inviter profile for the email
  const [{ data: project }, { data: inviterProfile }] = await Promise.all([
    supabase.from("projects").select("title").eq("id", projectId).single(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
  ])

  const projectName = project?.title ?? "Untitled project"
  const inviterName = inviterProfile?.full_name ?? inviterProfile?.email ?? "Someone"

  const headerList = await headers()
  const host = headerList.get("host") ?? "localhost:3000"
  const protocol = headerList.get("x-forwarded-proto") ?? "http"
  const origin = `${protocol}://${host}`
  const acceptUrl = `${origin}/invite?token=${invitation.token}`

  const { subject, html } = projectInviteEmail({
    projectName,
    inviterName,
    acceptUrl,
    isExistingUser: !!existingProfile,
  })

  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Email service is not configured" }
  }

  const { error: emailError } = await resend.emails.send({
    from: "Glowna <onboarding@resend.dev>",
    to: normalizedEmail,
    subject,
    html,
  })

  if (emailError) {
    return { success: false, error: "Failed to send invitation email" }
  }

  return { success: true }
}

export async function acceptInvitation(
  token: string,
): Promise<{ projectId?: string; error?: string }> {
  const { supabase } = await requireUser()

  // Use SECURITY DEFINER RPC to bypass RLS — the invited user isn't a
  // project member yet, so normal inserts into project_members are blocked.
  const { data, error } = await supabase.rpc("accept_project_invitation", {
    p_token: token,
  })

  if (error) {
    return { error: "Failed to join the project" }
  }

  const result = data as { project_id?: string; error?: string }

  if (result.error) {
    return { error: result.error }
  }

  if (result.project_id) {
    revalidatePath("/")
    revalidatePath(`/projects/${result.project_id}`)
    return { projectId: result.project_id }
  }

  return { error: "Something went wrong" }
}

export async function declineInvitation(
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single()

  if (!profile?.email) {
    return { success: false, error: "Could not verify your email address" }
  }

  const { data: invitation } = await supabase
    .from("project_invitations")
    .select("id, email, status")
    .eq("id", invitationId)
    .single()

  if (!invitation) {
    return { success: false, error: "Invitation not found" }
  }

  if (invitation.email !== profile.email.toLowerCase()) {
    return { success: false, error: "This invitation belongs to a different user" }
  }

  if (invitation.status !== "pending") {
    return { success: false, error: "This invitation is no longer pending" }
  }

  const { error } = await supabase
    .from("project_invitations")
    .update({ status: "declined" })
    .eq("id", invitation.id)

  if (error) {
    return { success: false, error: "Failed to decline invitation" }
  }

  revalidatePath("/")
  return { success: true }
}
