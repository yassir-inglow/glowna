"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
}

export async function createTask(projectId: string, title: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("tasks").insert({
    title,
    project_id: projectId,
    completed: false,
    user_id: user.id,
  })

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
  revalidatePath("/")
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("tasks").delete().eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
}

export async function duplicateTask(taskId: string) {
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single()

  if (fetchError || !task) throw fetchError ?? new Error("Task not found")

  const { id: _id, created_at: _c, updated_at: _u, ...fields } = task

  const { error: insertError } = await supabase.from("tasks").insert({
    ...fields,
    title: `${fields.title} (copy)`,
    position: fields.position + 1,
  })

  if (insertError) throw insertError

  revalidatePath("/")
  revalidatePath(`/projects/${fields.project_id}`)
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)

  if (error) throw error

  revalidatePath("/")
}

export async function createProject(title: string, description?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.from("projects").insert({
    title,
    description: description || null,
    user_id: user.id,
  })

  if (error) throw error

  revalidatePath("/")
}
