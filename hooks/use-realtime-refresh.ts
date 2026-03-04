"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Options = {
  table: string
  filter?: string
  /** Debounce window in ms (default 300) */
  debounce?: number
}

export function useRealtimeRefresh({ table, filter, debounce = 300 }: Options) {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            router.refresh()
          }, debounce)
        }
      )
      .subscribe()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [table, filter, debounce, router])
}
