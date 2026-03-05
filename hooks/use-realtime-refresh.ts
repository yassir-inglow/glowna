"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { shouldSuppressRefresh } from "@/hooks/mutation-tracker"

type Options = {
  table: string
  filter?: string
  /** Debounce window in ms (default 500) */
  debounce?: number
  enabled?: boolean
}

export function useRealtimeRefresh({ table, filter, debounce = 500, enabled = true }: Options) {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    const channelName = filter
      ? `realtime-${table}-${filter}`
      : `realtime-${table}`

    const subscriptionConfig: Record<string, string> = {
      event: "*",
      schema: "public",
      table,
    }
    if (filter) {
      subscriptionConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        subscriptionConfig,
        () => {
          if (shouldSuppressRefresh(table)) return

          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            if (shouldSuppressRefresh(table)) return
            router.refresh()
          }, debounce)
        }
      )
      .subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [table, filter, debounce, enabled, router])
}
