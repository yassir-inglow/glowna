"use server"

import { createClient } from "@/lib/supabase/server"
import { getResendClient, getResendFromAddress } from "@/lib/resend"
import { projectInviteEmail } from "@/lib/emails/project-invite"
import { projectRemovedEmail } from "@/lib/emails/project-removed"
import { computeColumnProgress } from "@/lib/board-columns"
import { acceptInvitationForCurrentUser } from "@/lib/project-invitations"
import {
  assertProjectRole,
  isMissingProjectRoleSchemaError,
  isProjectPermissionHelperError,
  normalizeProjectRole,
  PROJECT_PERMISSION_HELPER_MIGRATION_ERROR,
  PROJECT_ROLE_MIGRATION_ERROR,
  type ProjectPermission,
} from "@/lib/project-permissions"
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

async function getProjectAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle()

  if (error) throw error
  if (!project) return { exists: false as const, permission: null }
  if (project.user_id === userId) return { exists: true as const, permission: "owner" as ProjectPermission }

  const { data: membership, error: membershipError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("profile_id", userId)
    .maybeSingle()

  if (membershipError) {
    if (isProjectPermissionHelperError(membershipError)) {
      throw new Error(PROJECT_PERMISSION_HELPER_MIGRATION_ERROR)
    }

    if (!isMissingProjectRoleSchemaError(membershipError)) throw membershipError

    const { count, error: legacyMembershipError } = await supabase
      .from("project_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("profile_id", userId)

    if (legacyMembershipError) {
      if (isProjectPermissionHelperError(legacyMembershipError)) {
        throw new Error(PROJECT_PERMISSION_HELPER_MIGRATION_ERROR)
      }

      throw legacyMembershipError
    }

    return {
      exists: true as const,
      permission: count && count > 0 ? ("editor" as const) : null,
    }
  }

  return {
    exists: true as const,
    permission: membership ? normalizeProjectRole(membership.role) : null,
  }
}

async function requireProjectReadAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const access = await getProjectAccess(supabase, userId, projectId)
  if (!access.exists) throw new Error("Project not found")
  if (!access.permission) throw new Error("Access denied")
  return access.permission
}

async function requireProjectWriteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const permission = await requireProjectReadAccess(supabase, userId, projectId)
  if (permission === "viewer") throw new Error("Access denied")
  return permission
}

async function requireProjectOwnerAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const permission = await requireProjectReadAccess(supabase, userId, projectId)
  if (permission !== "owner") throw new Error("Access denied")
  return permission
}

async function requireTaskReadAccess(
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
  await requireProjectReadAccess(supabase, userId, task.project_id)
  return task
}

async function clearProjectAccessNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
  projectName?: string,
) {
  const { error } = await supabase.rpc("clear_project_access_notifications", {
    p_project_id: projectId,
    p_project_name: projectName ?? null,
    p_user_id: userId,
  })

  if (!error) return null

  const { error: fallbackError } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("data->>project_id", projectId)
    .in("type", ["removed_from_project", "project_role_changed"])

  return fallbackError
}

async function notifyProjectRoleChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    actorName,
    memberId,
    previousRole,
    projectId,
    projectName,
    role,
  }: {
    actorName: string
    memberId: string
    previousRole?: string | null
    projectId: string
    projectName: string
    role: string
  },
) {
  const { error: notificationError } = await supabase.rpc("replace_project_access_notification", {
    p_actor_name: actorName,
    p_previous_role: previousRole ?? null,
    p_project_id: projectId,
    p_project_name: projectName,
    p_role: role,
    p_type: "project_role_changed",
    p_user_id: memberId,
  })

  if (!notificationError) return

  await clearProjectAccessNotifications(supabase, memberId, projectId, projectName)
  await supabase.from("notifications").insert({
    user_id: memberId,
    type: "project_role_changed",
    data: {
      project_id: projectId,
      project_name: projectName,
      actor_name: actorName,
      previous_role: previousRole ?? null,
      role,
    },
  })
}

async function markProjectEditAccessRequestsAsRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  projectId: string,
  requesterId: string,
) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", ownerId)
    .eq("type", "project_edit_access_requested")
    .eq("data->>project_id", projectId)
    .eq("data->>requester_id", requesterId)
}

async function requireTaskWriteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  taskId: string,
) {
  const task = await requireTaskReadAccess(supabase, userId, taskId)
  await requireProjectWriteAccess(supabase, userId, task.project_id)
  return task
}

async function getAppOrigin() {
  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.SITE_URL
  if (envOrigin) return envOrigin.replace(/\/+$/, "")

  const headerList = await headers()
  const host = headerList.get("host") ?? "localhost:3000"
  const protocol = headerList.get("x-forwarded-proto") ?? "http"
  return `${protocol}://${host}`
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)
  const status = completed ? "done" : "todo"

  const { error } = await supabase
    .from("tasks")
    .update({ completed, status })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function createTask(
  projectId: string,
  title: string,
  options?: { dueDate?: string | null; dueDateEnd?: string | null; assigneeIds?: string[]; priority?: string; status?: string; boardPosition?: number },
) {
  const { supabase, user } = await requireUser()
  await requireProjectWriteAccess(supabase, user.id, projectId)

  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert({
      title,
      project_id: projectId,
      completed: false,
      user_id: user.id,
      due_date: options?.dueDate ?? null,
      due_date_end: options?.dueDateEnd ?? null,
      priority: options?.priority ?? "none",
      status: options?.status ?? "todo",
      board_position: options?.boardPosition ?? 0,
    })
    .select("id, created_at")
    .single()

  if (error) throw error

  if (options?.assigneeIds && options.assigneeIds.length > 0) {
    await supabase.from("task_assignees").insert(
      options.assigneeIds.map((profileId) => ({
        task_id: newTask.id,
        profile_id: profileId,
      })),
    )
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/")

  return {
    id: newTask.id,
    createdAt: newTask.created_at,
    projectId,
    title,
  }
}

export async function updateTaskTitle(taskId: string, title: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  const { error } = await supabase
    .from("tasks")
    .update({ title })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath("/")
}

export async function updateTaskDates(
  taskId: string,
  dueDate: string | null,
  dueDateEnd: string | null,
) {
  const { supabase, user } = await requireUser()

  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .single()

  if (!task) throw new Error("Task not found")
  await requireProjectWriteAccess(supabase, user.id, task.project_id)

  const { error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate, due_date_end: dueDateEnd })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath("/")
}

export async function updateTaskPriority(taskId: string, priority: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  const { error } = await supabase
    .from("tasks")
    .update({ priority })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath("/")
}

export async function deleteTask(taskId: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  const { error } = await supabase.from("tasks").delete().eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function duplicateTask(taskId: string) {
  const { supabase, user } = await requireUser()
  await requireTaskWriteAccess(supabase, user.id, taskId)

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single()

  if (fetchError || !task) throw fetchError ?? new Error("Task not found")

  const { id: _id, created_at: _c, updated_at: _u, ...fields } = task
  void _id
  void _c
  void _u

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
  await requireProjectOwnerAccess(supabase, user.id, projectId)

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

export async function removeProjectMember(
  projectId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectOwnerAccess(supabase, user.id, projectId)

  const [{ data: project }, { data: memberProfile }, { data: removerProfile }] =
    await Promise.all([
      supabase.from("projects").select("user_id, title").eq("id", projectId).single(),
      supabase.from("profiles").select("email, full_name").eq("id", memberId).single(),
      supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    ])

  if (!project) return { success: false, error: "Project not found" }
  if (project.user_id === memberId) return { success: false, error: "Cannot remove the project owner" }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", memberId)

  if (error) return { success: false, error: "Failed to remove member" }

  const projectName = project.title ?? "Untitled project"
  const removerName = removerProfile?.full_name ?? removerProfile?.email ?? "Someone"

  const { error: notificationError } = await supabase.rpc("replace_project_access_notification", {
    p_actor_name: removerName,
    p_project_id: projectId,
    p_project_name: projectName,
    p_type: "removed_from_project",
    p_user_id: memberId,
  })
  if (notificationError) {
    await clearProjectAccessNotifications(supabase, memberId, projectId, projectName)
    await supabase.from("notifications").insert({
      user_id: memberId,
      type: "removed_from_project",
      data: {
        project_name: projectName,
        remover_name: removerName,
        actor_name: removerName,
        project_id: projectId,
      },
    })
  }

  // Send email to the removed member
  if (memberProfile?.email) {
    const dashboardUrl = await getAppOrigin()

    const { subject, html } = projectRemovedEmail({
      projectName,
      removerName,
      dashboardUrl,
    })

    const resend = getResendClient()
    if (resend) {
      await resend.emails.send({
        from: getResendFromAddress(),
        to: memberProfile.email,
        subject,
        html,
      }).catch(() => {})
    }
  }

  revalidatePath("/")
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
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
  role: string,
): Promise<{ success: boolean; error?: string; warning?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectOwnerAccess(supabase, user.id, projectId)

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedRole = assertProjectRole(role)

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
    .select("id, expires_at, token")
    .eq("project_id", projectId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single()

  let invitationToken: string | null = null

  if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
    const { error: updateInviteError } = await supabase
      .from("project_invitations")
      .update({
        invited_by: user.id,
        role: normalizedRole,
      })
      .eq("id", existingInvite.id)

    if (updateInviteError) {
      if (isMissingProjectRoleSchemaError(updateInviteError)) {
        return { success: false, error: PROJECT_ROLE_MIGRATION_ERROR }
      }

      if (isProjectPermissionHelperError(updateInviteError)) {
        return { success: false, error: PROJECT_PERMISSION_HELPER_MIGRATION_ERROR }
      }

      return { success: false, error: "Failed to update invitation" }
    }

    invitationToken = existingInvite.token
  } else if (existingInvite) {
    await supabase
      .from("project_invitations")
      .update({ status: "expired" })
      .eq("id", existingInvite.id)
  }

  if (!invitationToken) {
    const { data: invitation, error: inviteError } = await supabase
      .from("project_invitations")
      .insert({
        project_id: projectId,
        email: normalizedEmail,
        invited_by: user.id,
        role: normalizedRole,
      })
      .select("token")
      .single()

    if (inviteError) {
      if (isMissingProjectRoleSchemaError(inviteError)) {
        return { success: false, error: PROJECT_ROLE_MIGRATION_ERROR }
      }

      if (isProjectPermissionHelperError(inviteError)) {
        return { success: false, error: PROJECT_PERMISSION_HELPER_MIGRATION_ERROR }
      }

      return { success: false, error: "Failed to create invitation" }
    }

    invitationToken = invitation.token
  }

  // Get project name and inviter profile for the email
  const [{ data: project }, { data: inviterProfile }] = await Promise.all([
    supabase.from("projects").select("title").eq("id", projectId).single(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
  ])

  const projectName = project?.title ?? "Untitled project"
  const inviterName = inviterProfile?.full_name ?? inviterProfile?.email ?? "Someone"

  const origin = await getAppOrigin()
  const inviteUrl = new URL("/invite", origin)
  inviteUrl.searchParams.set("token", invitationToken)
  inviteUrl.searchParams.set("email", normalizedEmail)
  inviteUrl.searchParams.set("project", projectName)
  inviteUrl.searchParams.set("inviter", inviterName)
  inviteUrl.searchParams.set("hasAccount", existingProfile ? "1" : "0")
  const acceptUrl = inviteUrl.toString()

  const { subject, html } = projectInviteEmail({
    projectName,
    inviterName,
    acceptUrl,
    invitedEmail: normalizedEmail,
    isExistingUser: !!existingProfile,
  })

  const resend = getResendClient()
  if (!resend) {
    return {
      success: true,
      warning: "Invitation created, but email delivery is not configured. The invite will still appear in-app for existing users.",
    }
  }

  const { error: emailError } = await resend.emails.send({
    from: getResendFromAddress(),
    to: normalizedEmail,
    subject,
    html,
  })

  if (emailError) {
    return {
      success: true,
      warning: `Invitation created, but email delivery failed${emailError.message ? `: ${emailError.message}` : "."}`,
    }
  }

  return { success: true }
}

export async function requestProjectEditAccess(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()

  let permission: ProjectPermission
  try {
    permission = await requireProjectReadAccess(supabase, user.id, projectId)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Couldn't verify project access",
    }
  }

  if (permission !== "viewer") {
    return {
      success: false,
      error: permission === "owner" || permission === "editor"
        ? "You already have Can edit access to this project."
        : "Only project members can request edit access.",
    }
  }

  const [{ data: project }, { data: requesterProfile }] = await Promise.all([
    supabase
      .from("projects")
      .select("user_id, title")
      .eq("id", projectId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single(),
  ])

  if (!project) {
    return { success: false, error: "Project not found" }
  }

  const requesterName = requesterProfile?.full_name ?? requesterProfile?.email ?? "Someone"
  const projectName = project.title ?? "Untitled project"

  const { error } = await supabase.from("notifications").insert({
    user_id: project.user_id,
    type: "project_edit_access_requested",
    data: {
      actor_name: requesterName,
      requester_id: user.id,
      requester_name: requesterName,
      project_id: projectId,
      project_name: projectName,
      role: "editor",
    },
  })

  if (error) {
    return { success: false, error: "Couldn't send your request right now." }
  }

  revalidatePath("/")
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function acceptInvitation(
  token: string,
): Promise<{ projectId?: string; error?: string }> {
  const { supabase, user } = await requireUser()
  const result = await acceptInvitationForCurrentUser(token)

  if (result.projectId) {
    await clearProjectAccessNotifications(supabase, user.id, result.projectId)
    revalidatePath("/")
    revalidatePath(`/projects/${result.projectId}`)
  }

  return result
}

export async function declineInvitation(
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  void user

  const { data, error } = await supabase.rpc("decline_project_invitation", {
    p_invitation_id: invitationId,
  })

  if (error) return { success: false, error: "Failed to decline invitation" }

  const result = data as { error?: string } | null
  if (result?.error) {
    return { success: false, error: result.error }
  }

  revalidatePath("/")
  return { success: true }
}

export async function dismissNotification(notificationId: string) {
  const { supabase } = await requireUser()

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
}

export async function dismissProjectEditAccessRequest(
  notificationId: string,
  projectId: string,
  requesterId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectOwnerAccess(supabase, user.id, projectId)

  await markProjectEditAccessRequestsAsRead(supabase, user.id, projectId, requesterId)
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  return { success: true }
}

export async function toggleTaskAssignee(taskId: string, profileId: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  // Try INSERT first. If the row already exists (23505 unique violation),
  // fall back to DELETE. This avoids a SELECT that can fail under RLS.
  const { error: insertError } = await supabase
    .from("task_assignees")
    .insert({ task_id: taskId, profile_id: profileId })

  if (insertError) {
    if (insertError.code === "23505") {
      const { error: deleteError } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId)
        .eq("profile_id", profileId)
      if (deleteError) throw deleteError
    } else {
      throw insertError
    }
  }

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function clearTaskAssignees(taskId: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId)
  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskWriteAccess(supabase, user.id, taskId)

  const completed = status === "done"

  const { error } = await supabase
    .from("tasks")
    .update({ status, completed })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath("/")
}

export async function reorderTasksInColumn(
  updates: { id: string; status: string; board_position: number }[],
) {
  const { supabase, user } = await requireUser()
  if (updates.length === 0) return

  const task = await requireTaskWriteAccess(supabase, user.id, updates[0].id)

  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("tasks")
        .update({
          status: u.status,
          board_position: u.board_position,
          completed: u.status === "done",
        })
        .eq("id", u.id),
    ),
  )

  for (const r of results) {
    if (r.error) throw r.error
  }

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath("/")
}

type ProjectBoardColumnInput = {
  status: string
  label: string
  headerBg?: string
  bodyBg?: string
}

function humanizeStatusLabel(status: string) {
  return (status || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

export async function ensureProjectBoardColumns(projectId: string) {
  const { supabase, user } = await requireUser()
  await requireProjectWriteAccess(supabase, user.id, projectId)

  const { count, error: countError } = await supabase
    .from("project_board_columns")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)

  if (countError) throw countError
  if (count && count > 0) return

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("status")
    .eq("project_id", projectId)

  if (taskError) throw taskError

  const extraStatuses = Array.from(
    new Set(
      (taskRows ?? [])
        .map((r) => (r.status ?? "").trim())
        .filter((s) => s && s !== "todo" && s !== "in_progress" && s !== "done"),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const base = [
    { status: "todo", label: "To do", header_bg: "bg-gray-cool-25", body_bg: "bg-gray-cool-25" },
    { status: "in_progress", label: "In progress", header_bg: "bg-purple-25", body_bg: "bg-purple-25" },
    ...extraStatuses.map((status) => ({
      status,
      label: humanizeStatusLabel(status) || status,
      header_bg: "bg-gray-cool-25",
      body_bg: "bg-gray-cool-25",
    })),
    { status: "done", label: "Done", header_bg: "bg-success-25", body_bg: "bg-success-25" },
  ]

  const total = base.length
  const rows = base.map((c, index) => ({
    ...c,
    project_id: projectId,
    position: index,
    progress: computeColumnProgress(index, total),
  }))

  const { error } = await supabase.from("project_board_columns").insert(rows)

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function saveProjectBoardColumns(
  projectId: string,
  columns: ProjectBoardColumnInput[],
  removedStatuses?: string[],
) {
  const { supabase, user } = await requireUser()
  await requireProjectWriteAccess(supabase, user.id, projectId)

  const uniq = new Map<string, ProjectBoardColumnInput>()
  for (const c of columns ?? []) {
    const status = (c.status ?? "").trim()
    if (!status) continue
    uniq.set(status, {
      status,
      label: (c.label ?? "").trim() || status,
      headerBg: c.headerBg,
      bodyBg: c.bodyBg,
    })
  }

  const todo = uniq.get("todo") ?? { status: "todo", label: "To do", headerBg: "bg-gray-cool-25", bodyBg: "bg-gray-cool-25" }
  const done = uniq.get("done") ?? { status: "done", label: "Done", headerBg: "bg-success-25", bodyBg: "bg-success-25" }

  // Enforce fixed first/last.
  const middle = Array.from(uniq.values()).filter((c) => c.status !== "todo" && c.status !== "done")
  const ordered: ProjectBoardColumnInput[] = [
    {
      ...todo,
      label: todo.label?.trim() || "To do",
      headerBg: todo.headerBg ?? "bg-gray-cool-25",
      bodyBg: todo.bodyBg ?? todo.headerBg ?? "bg-gray-cool-25",
    },
    ...middle,
    {
      ...done,
      label: done.label?.trim() || "Done",
      headerBg: done.headerBg ?? "bg-success-25",
      bodyBg: done.bodyBg ?? done.headerBg ?? "bg-success-25",
    },
  ]

  const desiredStatuses = new Set(ordered.map((c) => c.status))

  const toDelete = (removedStatuses ?? [])
    .map((s) => (s ?? "").trim())
    .filter((s) => s && s !== "todo" && s !== "done" && !desiredStatuses.has(s))

  if (toDelete.length > 0) {
    // Move any tasks that were in deleted columns back to "To do".
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ status: "todo", completed: false })
      .eq("project_id", projectId)
      .in("status", toDelete)
    if (taskError) throw new Error(taskError.message)
  }

  const upserts = ordered.map((c, index) => ({
    project_id: projectId,
    status: c.status,
    label: c.label?.trim() || humanizeStatusLabel(c.status) || c.status,
    position: index,
    progress: computeColumnProgress(index, ordered.length),
    header_bg: c.headerBg ?? "bg-gray-cool-25",
    body_bg: c.bodyBg ?? c.headerBg ?? "bg-gray-cool-25",
  }))

  const { error } = await supabase
    .from("project_board_columns")
    .upsert(upserts, { onConflict: "project_id,status" })

  if (error) {
    const msg = error.message
    if (
      msg &&
      msg.toLowerCase().includes("no unique or exclusion constraint") &&
      msg.toLowerCase().includes("on conflict")
    ) {
      // Fallback for environments where the unique index isn't present yet.
      const { error: delAllError } = await supabase
        .from("project_board_columns")
        .delete()
        .eq("project_id", projectId)
      if (delAllError) throw new Error(delAllError.message)

      const { error: insertError } = await supabase
        .from("project_board_columns")
        .insert(upserts)
      if (insertError) throw new Error(insertError.message)
    } else {
      if (msg && msg.toLowerCase().includes("relation") && msg.toLowerCase().includes("project_board_columns")) {
        throw new Error(
          `${msg}. Run the Supabase migration lib/supabase/migrations/012_project_board_columns.sql in your Supabase project.`,
        )
      }
      throw new Error(msg || "Couldn't save board columns.")
    }
  }

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from("project_board_columns")
      .delete()
      .eq("project_id", projectId)
      .in("status", toDelete)
    if (delError) throw new Error(delError.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function updateProjectMemberRole(
  projectId: string,
  memberId: string,
  role: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectOwnerAccess(supabase, user.id, projectId)

  const normalizedRole = assertProjectRole(role)

  const [{ data: project }, { data: member }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from("projects")
      .select("user_id, title")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("profile_id", memberId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single(),
  ])

  if (!project) return { success: false, error: "Project not found" }
  if (project.user_id === memberId) return { success: false, error: "Cannot change the project owner" }
  if (!member) return { success: false, error: "Member not found" }
  if (member.role === normalizedRole) return { success: true }

  const { error } = await supabase
    .from("project_members")
    .update({ role: normalizedRole })
    .eq("project_id", projectId)
    .eq("profile_id", memberId)

  if (error) {
    if (isMissingProjectRoleSchemaError(error)) {
      return { success: false, error: PROJECT_ROLE_MIGRATION_ERROR }
    }

    if (isProjectPermissionHelperError(error)) {
      return { success: false, error: PROJECT_PERMISSION_HELPER_MIGRATION_ERROR }
    }

    return { success: false, error: "Failed to update member role" }
  }

  const projectName = project.title ?? "Untitled project"
  const actorName = ownerProfile?.full_name ?? ownerProfile?.email ?? "Someone"

  await notifyProjectRoleChange(supabase, {
    actorName,
    memberId,
    previousRole: member.role,
    projectId,
    projectName,
    role: normalizedRole,
  })

  revalidatePath("/")
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function grantProjectEditAccess(
  notificationId: string,
  projectId: string,
  requesterId: string,
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser()
  await requireProjectOwnerAccess(supabase, user.id, projectId)

  const [{ data: member }, roleUpdate] = await Promise.all([
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("profile_id", requesterId)
      .maybeSingle(),
    updateProjectMemberRole(projectId, requesterId, "editor"),
  ])

  if (!roleUpdate.success) {
    return roleUpdate
  }

  if (!member) {
    return { success: false, error: "Member not found" }
  }

  await markProjectEditAccessRequestsAsRead(supabase, user.id, projectId, requesterId)
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  revalidatePath("/")
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
