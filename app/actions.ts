"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleTaskCompleted(taskId: string, completed: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId)

  if (error) throw error

  revalidatePath("/")
}
