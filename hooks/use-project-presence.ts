"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Tracks which project members are currently viewing the project using
 * Supabase Realtime Presence. Returns the set of active user IDs.
 */
export function useProjectPresence(projectId: string, userId: string) {
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`project-presence:${projectId}`)
    channelRef.current = channel

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>()
        const ids = new Set<string>()
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            ids.add(p.user_id)
          }
        }
        setActiveUserIds(ids)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId, userId])

  return activeUserIds
}
