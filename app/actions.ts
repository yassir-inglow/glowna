"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single()

  if (!project) throw new Error("Project not found")
  if (project.user_id === userId) return

  const { count } = await supabase
    .from("task_assignees")
    .select("profile_id", { count: "exact", head: true })
    .eq("profile_id", userId)
    .in(
      "task_id",
      (
        await supabase
          .from("tasks")
          .select("id")
          .eq("project_id", projectId)
      ).data?.map((t) => t.id) ?? [],
    )

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
  const task = await requireTaskAccess(supabase, user.id, taskId)

  const { error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
  revalidatePath(`/projects/${task.project_id}`)
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
    .select("id")
    .single()

  if (error) throw error

  await supabase.from("task_assignees").insert({
    task_id: newTask.id,
    profile_id: user.id,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/")
}

export async function deleteTask(taskId: string) {
  const { supabase, user } = await requireUser()
  const task = await requireTaskAccess(supabase, user.id, taskId)

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
