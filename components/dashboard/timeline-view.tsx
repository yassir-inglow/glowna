"use client"

import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { createTask, updateTaskDates } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { ProgressRing } from "@/components/ui/progress-ring"
import { getStatusConfig } from "@/components/dashboard/status-picker"
import type { BoardColumnConfig } from "@/hooks/use-project-board-columns"
import type { TaskWithProject } from "@/lib/data"

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_WIDTH = 40
const ROW_HEIGHT = 44
const LABEL_WIDTH = 200
const HEADER_HEIGHT = 44
const MIN_RANGE_DAYS = 90 // always show at least ~3 months
const BAR_HEIGHT = 28
const HANDLE_WIDTH = 8

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// ─── Status colors (kept for left-panel dots only) ───────────────────────────

const STATUS_DOT: Record<string, string> = {
  todo: "bg-gray-cool-400",
  in_progress: "bg-purple-400",
  done: "bg-success-400",
}

function getStatusDot(status: string) {
  return STATUS_DOT[status] ?? STATUS_DOT.todo
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function toDate(dateStr: string): Date {
  return new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))
}

function differenceInDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function formatISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ─── Compute time range from tasks ───────────────────────────────────────────

function useTimelineRange(tasks: TaskWithProject[]) {
  return React.useMemo(() => {
    const today = startOfDay(new Date())
    let min = today
    let max = today

    let hasAnyDate = false
    for (const t of tasks) {
      if (t.due_date) {
        hasAnyDate = true
        const s = toDate(t.due_date)
        const e = t.due_date_end ? toDate(t.due_date_end) : s
        if (s < min) min = s
        if (e > max) max = e
      }
    }

    // Always pad to at least MIN_RANGE_DAYS
    const naturalRange = differenceInDays(max, min)
    const extraPad = Math.max(0, Math.ceil((MIN_RANGE_DAYS - naturalRange) / 2))
    const basePad = 7 // always add 1 week padding on each side

    const rangeStart = addDays(min, -(basePad + extraPad))
    const rangeEnd = addDays(max, basePad + extraPad)
    const totalDays = differenceInDays(rangeEnd, rangeStart) + 1

    return { rangeStart, rangeEnd, totalDays, today, hasAnyDate }
  }, [tasks])
}

// ─── Generate day columns with month groupings ───────────────────────────────

type DayColumn = { date: Date; dayNum: number; isWeekend: boolean; isToday: boolean }
type MonthGroup = { label: string; span: number }

function useDayColumns(rangeStart: Date, totalDays: number, today: Date) {
  return React.useMemo(() => {
    const days: DayColumn[] = []
    const months: MonthGroup[] = []
    let currentMonth = -1
    let currentYear = -1

    for (let i = 0; i < totalDays; i++) {
      const date = addDays(rangeStart, i)
      const m = date.getMonth()
      const y = date.getFullYear()

      if (m !== currentMonth || y !== currentYear) {
        months.push({ label: `${MONTH_NAMES[m]} ${y}`, span: 1 })
        currentMonth = m
        currentYear = y
      } else {
        months[months.length - 1].span++
      }

      days.push({
        date,
        dayNum: date.getDate(),
        isWeekend: isWeekend(date),
        isToday: differenceInDays(date, today) === 0,
      })
    }

    return { days, months }
  }, [rangeStart, totalDays, today])
}

// ─── Bar position for a task ─────────────────────────────────────────────────

function getBarPosition(task: TaskWithProject, rangeStart: Date) {
  if (!task.due_date) return null

  const start = toDate(task.due_date)
  const end = task.due_date_end ? toDate(task.due_date_end) : start
  const startOffset = differenceInDays(start, rangeStart)
  const duration = Math.max(1, differenceInDays(end, start) + 1)

  return {
    left: startOffset * DAY_WIDTH + 2,
    width: duration * DAY_WIDTH - 4,
    startDate: start,
    endDate: end,
  }
}

// ─── Drag state ──────────────────────────────────────────────────────────────

type DragState = {
  taskId: string
  edge: "left" | "right" | "move"
  startX: number
  originalLeft: number
  originalWidth: number
  originalStartDate: Date
  originalEndDate: Date
}

type CreateDragState = {
  startX: number
  currentX: number
  rowIndex: number
}

// ─── Component ───────────────────────────────────────────────────────────────

type TimelineViewProps = {
  tasks: TaskWithProject[]
  projectId: string
  columns?: BoardColumnConfig[]
  canWrite?: boolean
  onTaskSelect?: (taskId: string) => void
  selectedTaskId?: string | null
  onTaskDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onTaskCreated?: () => void
}

export function TimelineView({ tasks, projectId, columns, canWrite = true, onTaskSelect, selectedTaskId, onTaskDateChange, onTaskCreated }: TimelineViewProps) {
  const { rangeStart, totalDays, today, hasAnyDate } = useTimelineRange(tasks)
  const { days, months } = useDayColumns(rangeStart, totalDays, today)

  const headerScrollRef = React.useRef<HTMLDivElement>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement>(null)
  const labelScrollRef = React.useRef<HTMLDivElement>(null)

  const gridWidth = totalDays * DAY_WIDTH

  // ── Drag-to-resize/move state ─────────────────────────────────────────────
  const [drag, setDrag] = React.useState<DragState | null>(null)
  const [dragDelta, setDragDelta] = React.useState(0)
  const didDragRef = React.useRef(false)

  // ── Drag-to-create state ──────────────────────────────────────────────────
  const [createDrag, setCreateDrag] = React.useState<CreateDragState | null>(null)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent, taskId: string, edge: "left" | "right" | "move", bar: { left: number; width: number; startDate: Date; endDate: Date }) => {
      if (!canWrite) return
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      didDragRef.current = false
      setDrag({
        taskId,
        edge,
        startX: e.clientX,
        originalLeft: bar.left,
        originalWidth: bar.width,
        originalStartDate: bar.startDate,
        originalEndDate: bar.endDate,
      })
      setDragDelta(0)
    },
    [canWrite],
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (drag) {
        const delta = e.clientX - drag.startX
        if (Math.abs(delta) > 3) didDragRef.current = true
        setDragDelta(delta)
      } else if (createDrag) {
        setCreateDrag((prev) => prev ? { ...prev, currentX: e.clientX } : null)
      }
    },
    [drag, createDrag],
  )

  const handlePointerUp = React.useCallback(() => {
    if (!canWrite) {
      setDrag(null)
      setDragDelta(0)
      setCreateDrag(null)
      return
    }

    if (drag) {
      const daysDelta = Math.round(dragDelta / DAY_WIDTH)

      if (daysDelta !== 0) {
        let newStart = drag.originalStartDate
        let newEnd = drag.originalEndDate

        if (drag.edge === "move") {
          newStart = addDays(drag.originalStartDate, daysDelta)
          newEnd = addDays(drag.originalEndDate, daysDelta)
        } else if (drag.edge === "left") {
          newStart = addDays(drag.originalStartDate, daysDelta)
          if (newStart > newEnd) newStart = newEnd
        } else {
          newEnd = addDays(drag.originalEndDate, daysDelta)
          if (newEnd < newStart) newEnd = newStart
        }

        const startStr = formatISODate(newStart)
        const endStr = differenceInDays(newEnd, newStart) === 0 ? null : formatISODate(newEnd)

        onTaskDateChange?.(drag.taskId, startStr, endStr)
        markMutation("tasks")
        updateTaskDates(drag.taskId, startStr, endStr)
      }

      setDrag(null)
      setDragDelta(0)
      return
    }

    if (createDrag) {
      const body = bodyScrollRef.current
      if (body) {
        const rect = body.getBoundingClientRect()
        const scrollLeft = body.scrollLeft

        const x1 = createDrag.startX - rect.left + scrollLeft
        const x2 = createDrag.currentX - rect.left + scrollLeft
        const leftPx = Math.min(x1, x2)
        const rightPx = Math.max(x1, x2)

        const startDayIndex = Math.floor(leftPx / DAY_WIDTH)
        const endDayIndex = Math.floor(rightPx / DAY_WIDTH)

        // Only create if we dragged at least 1 day
        if (Math.abs(createDrag.currentX - createDrag.startX) > DAY_WIDTH / 2) {
          const startDate = addDays(rangeStart, startDayIndex)
          const endDate = addDays(rangeStart, endDayIndex)

          const startStr = formatISODate(startDate)
          const endStr = startDayIndex === endDayIndex ? null : formatISODate(endDate)

          markMutation("tasks")
          createTask(projectId, "Untitled task", {
            dueDate: startStr,
            dueDateEnd: endStr,
          }).then(() => {
            onTaskCreated?.()
          })
        }
      }

      setCreateDrag(null)
    }
  }, [canWrite, drag, dragDelta, onTaskDateChange, createDrag, rangeStart, projectId, onTaskCreated])

  // Handle drag-to-create on empty area
  const handleGridPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!canWrite) return
      // Only start create-drag if clicking on the grid background (not a bar)
      if ((e.target as HTMLElement).closest("[data-timeline-bar]")) return
      const body = bodyScrollRef.current
      if (!body) return

      const rect = body.getBoundingClientRect()
      const y = e.clientY - rect.top + body.scrollTop
      const rowIndex = Math.floor(y / ROW_HEIGHT)

      // Only allow creating in empty rows (below existing tasks)
      if (rowIndex < tasks.length) return

      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setCreateDrag({
        startX: e.clientX,
        currentX: e.clientX,
        rowIndex,
      })
    },
    [canWrite, tasks.length],
  )

  // Compute visual bar position during drag
  function getDraggedBarStyle(bar: { left: number; width: number }) {
    if (!drag) return bar

    const snappedDelta = Math.round(dragDelta / DAY_WIDTH) * DAY_WIDTH

    if (drag.edge === "move") {
      return {
        left: bar.left + snappedDelta,
        width: bar.width,
      }
    } else if (drag.edge === "left") {
      const newLeft = bar.left + snappedDelta
      const newWidth = bar.width - snappedDelta
      return {
        left: newWidth >= DAY_WIDTH ? newLeft : bar.left + bar.width - DAY_WIDTH,
        width: Math.max(DAY_WIDTH, newWidth),
      }
    } else {
      const newWidth = bar.width + snappedDelta
      return {
        left: bar.left,
        width: Math.max(DAY_WIDTH, newWidth),
      }
    }
  }

  // Compute create-drag preview bar
  function getCreatePreview() {
    if (!createDrag) return null
    const body = bodyScrollRef.current
    if (!body) return null

    const rect = body.getBoundingClientRect()
    const scrollLeft = body.scrollLeft
    const x1 = createDrag.startX - rect.left + scrollLeft
    const x2 = createDrag.currentX - rect.left + scrollLeft

    const leftPx = Math.min(x1, x2)
    const rightPx = Math.max(x1, x2)

    const startDay = Math.floor(leftPx / DAY_WIDTH)
    const endDay = Math.floor(rightPx / DAY_WIDTH)

    return {
      left: startDay * DAY_WIDTH + 2,
      width: (endDay - startDay + 1) * DAY_WIDTH - 4,
      top: createDrag.rowIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2,
    }
  }

  // ── Scroll sync ───────────────────────────────────────────────────────────
  const syncing = React.useRef(false)
  const handleBodyScroll = React.useCallback(() => {
    if (syncing.current) return
    syncing.current = true
    const body = bodyScrollRef.current
    if (body) {
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = body.scrollLeft
      if (labelScrollRef.current) labelScrollRef.current.scrollTop = body.scrollTop
    }
    requestAnimationFrame(() => { syncing.current = false })
  }, [])

  // Scroll to today on mount
  React.useEffect(() => {
    const todayOffset = differenceInDays(today, rangeStart) * DAY_WIDTH
    const body = bodyScrollRef.current
    if (body) {
      const scrollTo = Math.max(0, todayOffset - body.clientWidth / 3)
      body.scrollLeft = scrollTo
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollTo
    }
  }, [today, rangeStart])

  const todayOffset = differenceInDays(today, rangeStart) * DAY_WIDTH
  const createPreview = getCreatePreview()

  return (
    <div className="flex h-full min-h-[400px] overflow-hidden rounded-xl border border-gray-cool-100 bg-white">
      {/* ── Left: Task labels ────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col border-r border-gray-cool-100" style={{ width: LABEL_WIDTH }}>
        {/* Label header */}
        <div
          className="flex shrink-0 items-center border-b border-gray-cool-100 px-3 text-text-xs font-semibold text-gray-cool-500"
          style={{ height: HEADER_HEIGHT }}
        >
          Task
        </div>

        {/* Task labels */}
        <div ref={labelScrollRef} className="flex-1 overflow-hidden">
          {tasks.map((task) => {
            const dotColor = getStatusDot(task.status)
            const selected = selectedTaskId === task.id
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskSelect?.(task.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 text-left transition-colors hover:bg-gray-cool-25",
                  selected && "bg-brand-25"
                )}
                style={{ height: ROW_HEIGHT }}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
                <span className="truncate text-text-sm font-medium text-gray-cool-700">
                  {task.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: Timeline grid ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Date header */}
        <div
          ref={headerScrollRef}
          className="shrink-0 overflow-hidden border-b border-gray-cool-100"
          style={{ height: HEADER_HEIGHT }}
        >
          <div style={{ width: gridWidth }}>
            {/* Month row */}
            <div className="flex" style={{ height: 20 }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  className="border-r border-gray-cool-50 px-1.5 text-text-xs font-semibold text-gray-cool-500"
                  style={{ width: m.span * DAY_WIDTH }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Day row */}
            <div className="flex" style={{ height: 24 }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-center text-text-xs",
                    d.isToday
                      ? "font-semibold text-brand-600"
                      : d.isWeekend
                        ? "text-gray-cool-300"
                        : "text-gray-cool-400"
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {d.dayNum}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid body */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleBodyScroll}
          onPointerDown={handleGridPointerDown}
          onPointerMove={(drag || createDrag) ? handlePointerMove : undefined}
          onPointerUp={(drag || createDrag) ? handlePointerUp : undefined}
          style={{ scrollbarWidth: "none" }}
        >
          <div className="relative" style={{ width: gridWidth, minHeight: "100%" }}>
            {/* Weekend shading + grid lines — fill full height */}
            <div className="absolute inset-0 flex">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "shrink-0 border-r border-gray-cool-50",
                    d.isWeekend && "bg-gray-cool-25/50"
                  )}
                  style={{ width: DAY_WIDTH, height: "100%" }}
                />
              ))}
            </div>

            {/* Row separators — extend well below tasks to fill screen */}
            {Array.from({ length: Math.max(tasks.length + 20, 30) }).map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-b border-gray-cool-50"
                style={{ top: (i + 1) * ROW_HEIGHT }}
              />
            ))}

            {/* Today indicator — full height */}
            <motion.div
              className="absolute top-0 bottom-0 border-l border-dashed border-brand-300"
              style={{ left: todayOffset + DAY_WIDTH / 2 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />

            {/* Task bars */}
            {tasks.map((task, index) => {
              const bar = getBarPosition(task, rangeStart)
              const top = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2
              const statusCfg = getStatusConfig(task.status, columns)

              if (!bar) {
                // No-date task: render dot at today position
                return (
                  <motion.div
                    key={task.id}
                    className="absolute h-2.5 w-2.5 rounded-full bg-gray-cool-300"
                    style={{
                      top: index * ROW_HEIGHT + (ROW_HEIGHT - 10) / 2,
                      left: todayOffset + DAY_WIDTH / 2 - 5,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 28,
                      stiffness: 260,
                      delay: index * 0.03,
                    }}
                  />
                )
              }

              const isDragging = drag?.taskId === task.id
              const visualBar = isDragging ? getDraggedBarStyle(bar) : bar

              return (
                <motion.div
                  key={task.id}
                  data-timeline-bar
                  className={cn(
                    "group absolute flex items-center rounded-md border border-gray-cool-200 bg-white text-text-xs font-medium shadow-xs transition-shadow",
                    selectedTaskId === task.id && "ring-2 ring-brand-300",
                    isDragging && "z-10 shadow-md",
                    !isDragging && "hover:shadow-sm",
                  )}
                  style={{
                    top,
                    left: visualBar.left,
                    width: visualBar.width,
                    height: BAR_HEIGHT,
                    transformOrigin: "left center",
                  }}
                  initial={isDragging ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    type: "spring",
                    damping: 28,
                    stiffness: 260,
                    delay: isDragging ? 0 : index * 0.03,
                  }}
                >
                  {/* Left resize handle */}
                  <div
                    data-timeline-bar
                    className={cn(
                      "absolute top-0 left-0 z-10 flex h-full items-center justify-center opacity-0 transition-opacity",
                      canWrite ? "cursor-col-resize group-hover:opacity-100" : "pointer-events-none",
                    )}
                    style={{ width: HANDLE_WIDTH }}
                    onPointerDown={(e) => handlePointerDown(e, task.id, "left", bar)}
                  >
                    <div className="h-3 w-0.5 rounded-full bg-gray-cool-400/60" />
                  </div>

                  {/* Bar body (drag to move, click to select) */}
                  <div
                    data-timeline-bar
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1 px-2",
                      canWrite
                        ? isDragging && drag?.edge === "move"
                          ? "cursor-grabbing"
                          : "cursor-grab"
                        : "cursor-pointer",
                    )}
                    style={{ height: BAR_HEIGHT }}
                    onPointerDown={(e) => {
                      if (!canWrite) return
                      handlePointerDown(e, task.id, "move", bar)
                    }}
                    onClick={(e) => {
                      if (!didDragRef.current) {
                        e.stopPropagation()
                        onTaskSelect?.(task.id)
                      }
                    }}
                  >
                    <ProgressRing value={statusCfg.ringValue} color={statusCfg.ringColor} size={14} className="shrink-0" />
                    <span className="truncate select-none text-gray-cool-700">{task.title}</span>
                  </div>

                  {/* Right resize handle */}
                  <div
                    data-timeline-bar
                    className={cn(
                      "absolute top-0 right-0 z-10 flex h-full items-center justify-center opacity-0 transition-opacity",
                      canWrite ? "cursor-col-resize group-hover:opacity-100" : "pointer-events-none",
                    )}
                    style={{ width: HANDLE_WIDTH }}
                    onPointerDown={(e) => handlePointerDown(e, task.id, "right", bar)}
                  >
                    <div className="h-3 w-0.5 rounded-full bg-gray-cool-400/60" />
                  </div>
                </motion.div>
              )
            })}

            {/* Drag-to-create preview */}
            {createPreview && (
              <div
                className="absolute rounded-md border border-dashed border-brand-300 bg-brand-25/50"
                style={{
                  left: createPreview.left,
                  width: createPreview.width,
                  top: createPreview.top,
                  height: BAR_HEIGHT,
                }}
              />
            )}

            {/* Empty state hint */}
            {!hasAnyDate && tasks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="rounded-lg bg-white/80 px-4 py-2 text-text-sm text-gray-cool-400">
                  Drag on the timeline to create a task
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
