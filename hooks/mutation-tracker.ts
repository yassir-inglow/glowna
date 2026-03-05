/**
 * Client-side tracker for in-flight mutations.
 *
 * When the current user triggers a server action (e.g. toggle, delete, create),
 * we record the timestamp. Realtime subscriptions check this before firing
 * router.refresh() — if a local mutation happened recently, the refresh is
 * skipped because `revalidatePath` inside the server action already handles it.
 */

const lastMutationTime = new Map<string, number>()

const SUPPRESSION_WINDOW_MS = 2000

export function markMutation(table: string): void {
  lastMutationTime.set(table, Date.now())
}

export function shouldSuppressRefresh(table: string): boolean {
  const t = lastMutationTime.get(table)
  if (!t) return false
  if (Date.now() - t < SUPPRESSION_WINDOW_MS) return true
  lastMutationTime.delete(table)
  return false
}
