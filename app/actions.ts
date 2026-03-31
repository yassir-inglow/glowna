"use server"

import { createClient } from "@/lib/supabase/server"
import { getResendClient, getResendFromAddress } from "@/lib/resend"
import { projectInviteEmail } from "@/lib/emails/project-invite"
import { projectRemovedEmail } from "@/lib/emails/project-removed"
import { computeColumnProgress } from "@/lib/board-columns"
import { acceptInvitationForCurrentUser } from "@/lib/project-invitations"
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

  if (count && count > 0) return

  // Fallback for legacy projects where the owner membership row might be missing.
  const { data: project, error } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle()

  if (error) throw error
  if (project?.user_id === userId) return

  throw new Error("Access denied")
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
  const { supabase } = await requireUser()

  // Sync status with completed flag
  const status = completed ? "done" : "todo"

  // Single query: update + return project_id. RLS ensures the user has access;
  // manual ownership check is a fallback if no row is returned.
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed, status })
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

export async function createTask(
  projectId: string,
  title: string,
  options?: { dueDate?: string | null; dueDateEnd?: string | null; assigneeIds?: string[]; priority?: string; status?: string; boardPosition?: number },
) {
  const { supabase, user } = await requireUser()
  await requireProjectAccess(supabase, user.id, projectId)

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
  const task = await requireTaskAccess(supabase, user.id, taskId)

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
  await requireProjectAccess(supabase, user.id, task.project_id)

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
  const task = await requireTaskAccess(supabase, user.id, taskId)

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

  const [{ data: project }, { data: memberProfile }, { data: removerProfile }] =
    await Promise.all([
      supabase.from("projects").select("user_id, title").eq("id", projectId).single(),
      supabase.from("profiles").select("email, full_name").eq("id", memberId).single(),
      supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    ])

  if (!project) return { success: false, error: "Project not found" }
  if (project.user_id === memberId) return { success: false, error: "Cannot remove the project owner" }
  if (project.user_id !== user.id && memberId !== user.id) {
    return { success: false, error: "Only the owner can remove members" }
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", memberId)

  if (error) return { success: false, error: "Failed to remove member" }

  const projectName = project.title ?? "Untitled project"
  const removerName = removerProfile?.full_name ?? removerProfile?.email ?? "Someone"

  // Insert in-app notification for the removed member
  await supabase.from("notifications").insert({
    user_id: memberId,
    type: "removed_from_project",
    data: {
      project_name: projectName,
      remover_name: removerName,
      project_id: projectId,
    },
  })

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
): Promise<{ success: boolean; error?: string; warning?: string }> {
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

  const origin = await getAppOrigin()
  const acceptUrl = `${origin}/invite?token=${invitation.token}`

  const { subject, html } = projectInviteEmail({
    projectName,
    inviterName,
    acceptUrl,
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

export async function acceptInvitation(
  token: string,
): Promise<{ projectId?: string; error?: string }> {
  return acceptInvitationForCurrentUser(token)
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

export async function dismissNotification(notificationId: string) {
  const { supabase } = await requireUser()

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
}

export async function toggleTaskAssignee(taskId: string, profileId: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskAccess(supabase, user.id, taskId)

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
  const task = await requireTaskAccess(supabase, user.id, taskId)

  const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId)
  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskAccess(supabase, user.id, taskId)

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

  const task = await requireTaskAccess(supabase, user.id, updates[0].id)

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
  await requireProjectAccess(supabase, user.id, projectId)

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
  await requireProjectAccess(supabase, user.id, projectId)

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
