/**
 * Client-side tracker for in-flight mutations.
 *
 * When the current user triggers a server action, we record the timestamp
 * and broadcast the change to other users/tabs via Supabase Realtime.
 *
 * Realtime subscriptions use the timestamp to choose a debounce strategy:
 * - Recent local mutation → longer debounce (revalidatePath already handles it)
 * - No recent local mutation → short debounce (remote change, refresh fast)
 */

import { broadcastChange } from "@/hooks/use-broadcast-sync"

const lastMutationTime = new Map<string, number>()

const LOCAL_MUTATION_WINDOW_MS = 2000

export function markMutation(table: string, meta?: Record<string, unknown>): void {
  lastMutationTime.set(table, Date.now())
  broadcastChange({ table, ...meta })
}

export function hasRecentLocalMutation(table: string): boolean {
  const t = lastMutationTime.get(table)
  if (!t) return false
  if (Date.now() - t < LOCAL_MUTATION_WINDOW_MS) return true
  lastMutationTime.delete(table)
  return false
}

/** @deprecated Use hasRecentLocalMutation instead */
export const shouldSuppressRefresh = hasRecentLocalMutation
