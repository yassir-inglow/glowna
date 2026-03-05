"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

const CHANNEL_NAME = "app-sync"
const DEBOUNCE_MS = 400

let activeChannel: RealtimeChannel | null = null
let refCount = 0

type BroadcastPayload = Record<string, unknown> | undefined
type Listener = (payload?: BroadcastPayload) => void
const peerListeners = new Set<Listener>()

/**
 * Register a callback that fires when a peer (another user/tab) changes data.
 * The callback receives the broadcast payload (e.g. `{ table: "tasks" }`).
 * Returns an unsubscribe function.
 */
export function onPeerChange(fn: Listener): () => void {
  peerListeners.add(fn)
  return () => peerListeners.delete(fn)
}

/**
 * Broadcast a "data changed" event to all other tabs/users.
 * Call this after any mutation so peers know to refresh.
 * Optionally include metadata (e.g. which table changed).
 */
export function broadcastChange(meta?: Record<string, unknown>) {
  activeChannel?.send({
    type: "broadcast",
    event: "data-changed",
    payload: meta ?? {},
  })
}

/**
 * Sets up a Supabase broadcast channel that listens for
 * "data-changed" events from other users/tabs and refreshes
 * the page. Place this once in the dashboard layout.
 *
 * Uses broadcast (not postgres_changes) so it works without
 * any ALTER PUBLICATION or Supabase dashboard configuration.
 */
export function useBroadcastSync() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    refCount++

    if (!activeChannel) {
      const supabase = createClient()
      activeChannel = supabase.channel(CHANNEL_NAME, {
        config: { broadcast: { self: false } },
      })

      activeChannel
        .on("broadcast", { event: "data-changed" }, ({ payload }: { payload: BroadcastPayload }) => {
          for (const fn of peerListeners) fn(payload)

          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            router.refresh()
          }, DEBOUNCE_MS)
        })
        .subscribe()
    }

    return () => {
      refCount--
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      if (refCount === 0 && activeChannel) {
        const supabase = createClient()
        supabase.removeChannel(activeChannel)
        activeChannel = null
      }
    }
  }, [router])
}
