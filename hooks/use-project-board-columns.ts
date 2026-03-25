"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"
import { computeColumnProgress } from "@/lib/board-columns"
import { ensureProjectBoardColumns, saveProjectBoardColumns } from "@/app/actions"
import { hasRecentLocalMutation, markMutation } from "@/hooks/mutation-tracker"
import { onPeerChange } from "@/hooks/use-broadcast-sync"

export type BoardColumnConfig = {
  /** Matches `tasks.status` */
  id: string
  label: string
  /** Pill header background colour (Tailwind class) */
  headerBg: string
  /** Drop-zone background colour (Tailwind class) */
  bodyBg: string
  /** ProgressRing value (0–100) */
  progress: number
  /** Optional for UI; DB is source of truth. */
  position?: number
}

const FALLBACK_COLUMNS: BoardColumnConfig[] = [
  { id: "todo", label: "To do", headerBg: "bg-gray-cool-25", bodyBg: "bg-gray-cool-25", progress: 0, position: 0 },
  { id: "in_progress", label: "In progress", headerBg: "bg-purple-25", bodyBg: "bg-purple-25", progress: 50, position: 1 },
  { id: "done", label: "Done", headerBg: "bg-success-25", bodyBg: "bg-success-25", progress: 100, position: 2 },
]

const COLUMN_BG_PRESETS: string[] = [
  "bg-purple-25",
  "bg-success-25",
  "bg-warning-25",
  "bg-brand-25",
  "bg-error-25",
]

export function getColumnRingColor(headerBg: string): string | undefined {
  switch (headerBg) {
    case "bg-success-25":
      return "var(--color-success-500)"
    case "bg-purple-25":
      return "var(--color-purple-500)"
    case "bg-warning-25":
      return "var(--color-warning-500)"
    case "bg-brand-25":
      return "var(--color-brand-500)"
    case "bg-error-25":
      return "var(--color-error-500)"
    case "bg-gray-cool-25":
      return "var(--color-gray-cool-400)"
    default:
      return undefined
  }
}

function pickRandomPreset(exclude: string[]) {
  const pool = COLUMN_BG_PRESETS.filter((c) => !exclude.includes(c))
  const list = pool.length > 0 ? pool : COLUMN_BG_PRESETS
  return list[Math.floor(Math.random() * list.length)]
}

function slugifyStatusId(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function uniqueStatusId(base: string, existingIds: Set<string>) {
  const clean = base || ""
  if (!clean) return ""
  let id = clean
  let i = 2
  while (existingIds.has(id)) {
    id = `${clean}_${i}`
    i++
  }
  return id
}

export function createCustomBoardColumn(
  label: string,
  existing: BoardColumnConfig[],
): BoardColumnConfig {
  const trimmed = label.trim()
  const usedBgs = existing.map((c) => c.headerBg)
  const ids = new Set(existing.map((c) => c.id))
  ids.add("todo")
  ids.add("done")

  const base = slugifyStatusId(trimmed)
  const id = uniqueStatusId(base, ids) || `col_${Date.now().toString(36)}`
  const bg = pickRandomPreset(usedBgs)

  return {
    id,
    label: trimmed || "Untitled",
    // Pastel backgrounds keep contrast consistent with the existing UI.
    headerBg: bg,
    bodyBg: bg,
    progress: 50,
  }
}

export function humanizeStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function normalizeOrder(cols: BoardColumnConfig[]) {
  const todo = cols.find((c) => c.id === "todo")
  const done = cols.find((c) => c.id === "done")
  const middle = cols.filter((c) => c.id !== "todo" && c.id !== "done")

  const ordered: BoardColumnConfig[] = [
    todo ? { ...todo, label: "To do" } : FALLBACK_COLUMNS[0],
    ...middle,
    done ? { ...done, label: "Done" } : FALLBACK_COLUMNS[FALLBACK_COLUMNS.length - 1],
  ]

  const total = ordered.length
  return ordered.map((c, index) => ({
    ...c,
    bodyBg:
      (c.bodyBg ?? c.headerBg) === "bg-gray-cool-25" && c.headerBg !== "bg-gray-cool-25"
        ? c.headerBg
        : (c.bodyBg ?? c.headerBg),
    position: index,
    progress: computeColumnProgress(index, total),
  }))
}

async function fetchProjectColumns(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("project_board_columns")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })

  if (error) throw error

  return (data ?? []).map<BoardColumnConfig>((row) => ({
    id: row.status,
    label: row.label,
    headerBg: row.header_bg,
    bodyBg: row.body_bg,
    progress: row.progress,
    position: row.position,
  }))
}

export function useProjectBoardColumns(projectId: string | null) {
  const [columns, setColumns] = React.useState<BoardColumnConfig[]>(FALLBACK_COLUMNS)
  const [loading, setLoading] = React.useState(false)
  const lastReloadAtRef = React.useRef(0)

  const reload = React.useCallback(async () => {
    if (!projectId) {
      setColumns(FALLBACK_COLUMNS)
      return
    }

    setLoading(true)
    try {
      let cols = await fetchProjectColumns(projectId)
      if (cols.length === 0) {
        await ensureProjectBoardColumns(projectId)
        cols = await fetchProjectColumns(projectId)
      }
      setColumns(normalizeOrder(cols))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const dedupedReload = React.useCallback(async () => {
    const now = Date.now()
    if (now - lastReloadAtRef.current < 250) return
    lastReloadAtRef.current = now
    await reload()
  }, [reload])

  React.useEffect(() => {
    void reload()
  }, [reload])

  // Realtime sync: refresh columns when other users update the board.
  React.useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | null = null

    const scheduleReload = (table: string) => {
      if (hasRecentLocalMutation(table)) return
      const delay = 150
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        void dedupedReload()
      }, delay)
    }

	    const channel = supabase
	      .channel(`board-columns-${projectId}`)
	      .on(
	        "postgres_changes",
	        {
	          event: "*",
	          schema: "public",
	          table: "project_board_columns",
          filter: `project_id=eq.${projectId}`,
        },
        () => scheduleReload("project_board_columns"),
      )
      .subscribe()

    const unsubscribeBroadcast = onPeerChange((payload) => {
      const table = payload?.table as string | undefined
      const pid = payload?.projectId as string | undefined
      if (table !== "project_board_columns") return
      if (pid && pid !== projectId) return
      scheduleReload("project_board_columns")
    })

    return () => {
      unsubscribeBroadcast()
      if (timeout) clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  }, [dedupedReload, projectId])

  const save = React.useCallback(
    async (next: BoardColumnConfig[]) => {
      if (!projectId) return
      const ordered = normalizeOrder(next)

      // Optimistic UI update.
      const prev = columns
      const prevIds = new Set(prev.map((c) => c.id))
      const nextIds = new Set(ordered.map((c) => c.id))
      const removedStatuses = Array.from(prevIds).filter(
        (id) => id !== "todo" && id !== "done" && !nextIds.has(id),
      )
      setColumns(ordered)

      try {
        markMutation("project_board_columns", { projectId })
        await saveProjectBoardColumns(
          projectId,
          ordered.map((c) => ({
            status: c.id,
            label: c.label,
            headerBg: c.headerBg,
            bodyBg: c.bodyBg,
          })),
          removedStatuses,
        )
        await dedupedReload()
      } catch (e) {
        setColumns(prev)
        throw e
      }
    },
    [columns, projectId, dedupedReload],
  )

  return {
    columns,
    setColumns,
    save,
    reload,
    loading,
  }
}
