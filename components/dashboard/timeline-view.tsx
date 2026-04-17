"use client"

import * as React from "react"
import { motion } from "motion/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { createTask, updateTaskDates } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { ProgressRing } from "@/components/ui/progress-ring"
import { StatusPopover, getStatusConfig } from "@/components/dashboard/status-picker"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import type { BoardColumnConfig } from "@/hooks/use-project-board-columns"
import type { ProjectMember, TaskWithProject } from "@/lib/data"

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_WIDTH = 42
const ROW_HEIGHT = 48
const LABEL_WIDTH = 290
const HEADER_HEIGHT = 72
const MIN_RANGE_DAYS = 90 // always show at least ~3 months
const BAR_HEIGHT = 32
const HANDLE_WIDTH = 10
const MONTH_HEADER_HEIGHT = 40
const DAY_HEADER_HEIGHT = HEADER_HEIGHT - MONTH_HEADER_HEIGHT

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

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

function formatMonthYear(date: Date) {
  return {
    month: date.toLocaleDateString("en-US", { month: "long" }),
    year: String(date.getFullYear()),
  }
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
  containerLeft: number
  scrollLeft: number
}

// ─── Component ───────────────────────────────────────────────────────────────

type TimelineViewProps = {
  tasks: TaskWithProject[]
  projectId: string
  members?: ProjectMember[]
  columns?: BoardColumnConfig[]
  canWrite?: boolean
  onTaskSelect?: (taskId: string) => void
  selectedTaskId?: string | null
  onTaskDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onTaskAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onTaskCreated?: () => void
}

export function TimelineView({
  tasks,
  projectId,
  members = [],
  columns,
  canWrite = true,
  onTaskSelect,
  selectedTaskId,
  onTaskDateChange,
  onTaskAssigneeChange,
  onTaskStatusChange,
  onTaskCreated,
}: TimelineViewProps) {
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
  const [optimisticAssignedIds, setOptimisticAssignedIds] = React.useState<Record<string, string[]>>({})
  const [optimisticStatuses, setOptimisticStatuses] = React.useState<Record<string, string>>({})

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
        const x1 = createDrag.startX - createDrag.containerLeft + createDrag.scrollLeft
        const x2 = createDrag.currentX - createDrag.containerLeft + createDrag.scrollLeft
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
        containerLeft: rect.left,
        scrollLeft: body.scrollLeft,
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
    const x1 = createDrag.startX - createDrag.containerLeft + createDrag.scrollLeft
    const x2 = createDrag.currentX - createDrag.containerLeft + createDrag.scrollLeft

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
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[24px] border border-gray-cool-100 bg-white">
      {/* Date header */}
      <div
        ref={headerScrollRef}
        className="relative z-20 overflow-hidden border-b border-gray-cool-100 bg-white"
        style={{ height: HEADER_HEIGHT }}
      >
        <div style={{ width: gridWidth }}>
            {/* Month row */}
            <div className="flex" style={{ height: MONTH_HEADER_HEIGHT }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-white px-3 text-[15px] font-medium leading-5"
                  style={{ width: m.span * DAY_WIDTH }}
                >
                  {(() => {
                    const monthStart = addDays(rangeStart, months.slice(0, i).reduce((sum, group) => sum + group.span, 0))
                    const label = formatMonthYear(monthStart)
                    return (
                      <>
                        <span className="text-gray-cool-600">{label.month}</span>
                        <span className="text-gray-cool-400">{label.year}</span>
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
            {/* Day row */}
            <div className="flex bg-white" style={{ height: DAY_HEADER_HEIGHT }}>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-center text-[12px] font-medium leading-[18px]",
                    d.isToday
                      ? "text-white"
                      : d.isWeekend
                        ? "text-gray-cool-300"
                        : "text-gray-cool-400"
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {d.isToday ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5">
                      {d.dayNum}
                    </span>
                  ) : (
                    d.dayNum
                  )}
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Grid body */}
      <div
        ref={bodyScrollRef}
        className="h-[calc(100%-72px)] overflow-auto"
        onScroll={handleBodyScroll}
        onPointerDown={handleGridPointerDown}
        onPointerMove={(drag || createDrag) ? handlePointerMove : undefined}
        onPointerUp={(drag || createDrag) ? handlePointerUp : undefined}
        style={{ scrollbarWidth: "none" }}
      >
        <div className="relative" style={{ width: gridWidth, minHeight: "100%" }}>
            {/* Vertical grid */}
            <div className="absolute inset-0 flex">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    "shrink-0 bg-white",
                    d.isWeekend && "bg-gray-cool-25/30"
                  )}
                  style={{
                    width: DAY_WIDTH,
                    height: "100%",
                    backgroundImage: d.isWeekend
                      ? "repeating-linear-gradient(115deg, rgba(239,241,245,0.45) 0, rgba(239,241,245,0.45) 2px, transparent 2px, transparent 8px)"
                      : undefined,
                  }}
                />
              ))}
            </div>

            {/* Today indicator */}
            <motion.div
              className="absolute top-0 bottom-0 border-l border-gray-cool-100"
              style={{ left: todayOffset + DAY_WIDTH / 2 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />

            {/* Task bars */}
            {tasks.map((task, index) => {
              const bar = getBarPosition(task, rangeStart)
              const top = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2

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
                    "group absolute flex items-center rounded-full border border-gray-cool-200 bg-[#f6f6f9] text-text-xs font-medium transition-shadow",
                    selectedTaskId === task.id && "ring-2 ring-brand-200/70",
                    isDragging && "z-10 shadow-md",
                    !isDragging && "hover:border-gray-cool-300",
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
                      "flex min-w-0 flex-1 items-center px-3",
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
                    <span className="truncate select-none text-[14px] font-medium leading-5 text-gray-cool-700">
                      {task.title}
                    </span>
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
                className="absolute rounded-full border border-dashed border-brand-300 bg-brand-25/50"
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

      {/* Overlay task rail */}
      <div
        className="pointer-events-none absolute left-0 top-[72px] bottom-0 z-30 border-r-2 border-gray-cool-100 bg-white"
        style={{ width: LABEL_WIDTH }}
      >
        <div ref={labelScrollRef} className="h-full overflow-hidden">
          {tasks.map((task) => {
            const selected = selectedTaskId === task.id
            const currentStatus = optimisticStatuses[task.id] ?? task.status
            const statusCfg = getStatusConfig(currentStatus, columns)
            const assignedIds = optimisticAssignedIds[task.id] ?? task.task_assignees
              .map((assignee) => assignee.profiles?.id)
              .filter(Boolean) as string[]
            const assignees = assignedIds
              .map((id) => members.find((member) => member.id === id))
              .filter((member): member is ProjectMember => !!member)
            const firstAssignee = assignees[0]
            const extraAssigneeCount = Math.max(0, assignedIds.length - (firstAssignee ? 1 : 0))

            return (
              <div
                key={task.id}
                className={cn(
                  "pointer-events-auto flex w-full items-center overflow-hidden border-b border-gray-cool-100 px-3 py-4",
                  selected && "bg-brand-25/60",
                )}
                style={{ minHeight: ROW_HEIGHT }}
              >
                <div className="min-w-0 shrink-0 pr-3" style={{ width: 201 }}>
                  <button
                    type="button"
                    onClick={() => onTaskSelect?.(task.id)}
                    className="block w-full min-w-0 text-left"
                  >
                    <span className="block truncate text-[14px] font-medium leading-5 text-gray-cool-700">
                      {task.title}
                    </span>
                  </button>
                </div>

                <div className="flex flex-1 items-center justify-center">
                  <StatusPopover
                    taskId={task.id}
                    status={currentStatus}
                    columns={columns}
                    onStatusChange={(status) => {
                      setOptimisticStatuses((prev) => ({ ...prev, [task.id]: status }))
                      onTaskStatusChange?.(task.id, status)
                    }}
                    disabled={!canWrite}
                    editAccessPrompt={
                      !canWrite
                        ? {
                            projectId,
                            actionLabel: "change the status",
                          }
                        : undefined
                    }
                  >
                    <span data-slot="popover-trigger">
                      <button
                        type="button"
                        className="flex size-[18px] items-center justify-center rounded-full"
                        aria-label={`Change status for ${task.title}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ProgressRing value={statusCfg.ringValue} color={statusCfg.ringColor} size={14} className="shrink-0" />
                      </button>
                    </span>
                  </StatusPopover>
                </div>

                <div className="flex flex-1 items-center justify-center">
                  <AssigneePopover
                    taskId={task.id}
                    members={members}
                    assignedIds={assignedIds}
                    onAssignedIdsChange={(ids) => {
                      setOptimisticAssignedIds((prev) => ({ ...prev, [task.id]: ids }))
                      onTaskAssigneeChange?.(task.id, ids)
                    }}
                    disabled={!canWrite}
                    editAccessPrompt={
                      !canWrite
                        ? {
                            projectId,
                            actionLabel: "assign teammates",
                          }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className="flex items-center gap-[6px] rounded-full"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Change assignees for ${task.title}`}
                    >
                      {firstAssignee ? (
                        <Avatar size="xs" className="ring-[1px] ring-white">
                          {firstAssignee.avatar_url ? (
                            <AvatarImage src={firstAssignee.avatar_url} alt="" />
                          ) : (
                            <AvatarAvvvatars value={firstAssignee.full_name ?? firstAssignee.email ?? firstAssignee.id} />
                          )}
                        </Avatar>
                      ) : null}

                      {extraAssigneeCount > 0 ? (
                        <span className="inline-flex size-5 items-center justify-center rounded-full border-[1.25px] border-gray-cool-25 bg-gray-cool-50 text-[8.33px] font-medium leading-[12.5px] text-gray-cool-600">
                          +{extraAssigneeCount}
                        </span>
                      ) : null}

                      {canWrite ? (
                        <span
                          aria-hidden="true"
                          className="inline-flex size-[22px] items-center justify-center rounded-full border border-dashed border-gray-cool-300 bg-alpha-900 text-gray-cool-300"
                        >
                          <HugeiconsIcon icon={PlusSignIcon} size={16} color="currentColor" strokeWidth={1.8} />
                        </span>
                      ) : null}
                    </button>
                  </AssigneePopover>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
