"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { LayoutGroup } from "motion/react"

import { KanbanColumn, type TaskStatus } from "@/components/dashboard/kanban-column"
import { KanbanCard } from "@/components/dashboard/kanban-card"
import { reorderTasksInColumn as reorderAction } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import type { Priority } from "@/components/dashboard/priority-picker"
import type { TaskWithProject, ProjectWithMembers } from "@/lib/data"

const COLUMN_ORDER: TaskStatus[] = ["todo", "in_progress", "done"]
const DROP_ANIMATION_MS = 280

type Columns = Record<TaskStatus, TaskWithProject[]>

/** Where the blue drop-indicator line is shown. */
type DropIndicator = {
  /** Target column */
  column: TaskStatus
  /** Show the line BEFORE this card. `null` means at the end of the column. */
  beforeId: string | null
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function findContainerIn(cols: Columns, taskId: string): TaskStatus | null {
  for (const [status, tasks] of Object.entries(cols)) {
    if (tasks.some((t) => t.id === taskId)) return status as TaskStatus
  }
  return null
}

function resolveOverColumn(cols: Columns, overId: string): TaskStatus | null {
  return (
    findContainerIn(cols, overId) ??
    (COLUMN_ORDER.includes(overId as TaskStatus) ? (overId as TaskStatus) : null)
  )
}

/** Compute indicator position. Returns null when the drag would be a no-op. */
function computeIndicator(
  activeId: string,
  over: DragOverEvent["over"],
  cols: Columns,
  delta: { y: number },
  activeInitialRect: { top: number; height: number } | null,
  overRect: { top: number; height: number } | null,
): DropIndicator | null {
  if (!over || (over.id as string) === activeId) return null

  // Hovering over empty area of a column
  if (COLUMN_ORDER.includes(over.id as TaskStatus)) {
    const column = over.id as TaskStatus
    // No-op: active is already last in this column
    const colTasks = cols[column]
    const activeColumn = findContainerIn(cols, activeId)
    if (
      activeColumn === column &&
      colTasks.length > 0 &&
      colTasks[colTasks.length - 1].id === activeId
    )
      return null
    return { column, beforeId: null }
  }

  // Hovering over a card
  const overColumn = findContainerIn(cols, over.id as string)
  if (!overColumn) return null

  const colTasks = cols[overColumn]
  const overIndex = colTasks.findIndex((t) => t.id === over.id)
  if (overIndex === -1) return null

  // For the LAST card in a column, check top/bottom half of the card.
  // If the pointer is in the bottom half → insert at end instead of before it.
  if (overIndex === colTasks.length - 1 && activeInitialRect && overRect) {
    const pointerCenterY = activeInitialRect.top + delta.y + activeInitialRect.height / 2
    const overCenterY = overRect.top + overRect.height / 2
    if (pointerCenterY > overCenterY) {
      // Same-column no-op: active is already last
      const activeColumn = findContainerIn(cols, activeId)
      if (activeColumn === overColumn && colTasks[colTasks.length - 1].id === activeId)
        return null
      return { column: overColumn, beforeId: null }
    }
  }

  // Same-column no-op: inserting before the card that's already right after active
  const activeColumn = findContainerIn(cols, activeId)
  if (activeColumn === overColumn) {
    const activeIndex = colTasks.findIndex((t) => t.id === activeId)
    if (overIndex === activeIndex + 1 || overIndex === activeIndex) return null
  }

  return { column: overColumn, beforeId: over.id as string }
}

// ─── Custom collision detection ──────────────────────────────────────────────
const kanbanCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

// ─── Types ───────────────────────────────────────────────────────────────────

type KanbanBoardProps = {
  tasks: TaskWithProject[]
  project: ProjectWithMembers
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  onTaskCreated?: () => void
  onDeleteTask?: (taskId: string) => void
  onTaskSelect?: (taskId: string) => void
  selectedTaskId?: string | null
  onTaskPriorityChange?: (taskId: string, priority: Priority) => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onTaskReorder?: (
    updates: { id: string; status: string; board_position: number }[],
  ) => void | Promise<void>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KanbanBoard({
  tasks,
  project,
  onTaskToggle,
  onTaskSelect,
  selectedTaskId,
  onTaskPriorityChange,
  onTaskStatusChange,
  onTaskReorder,
}: KanbanBoardProps) {
  // Group tasks by status, sorted by board_position
  const columns = React.useMemo(() => {
    const grouped: Columns = { todo: [], in_progress: [], done: [] }
    for (const task of tasks) {
      const status = (task.status ?? "todo") as TaskStatus
      ;(grouped[status] ?? grouped.todo).push(task)
    }
    for (const col of Object.values(grouped)) {
      col.sort((a, b) => a.board_position - b.board_position)
    }
    return grouped
  }, [tasks])

  const [localColumns, setLocalColumns] = React.useState(columns)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = React.useState<DropIndicator | null>(null)
  const [justDroppedId, setJustDroppedId] = React.useState<string | null>(null)

  // Ref mirrors localColumns so we can read the latest value synchronously.
  const colsRef = React.useRef(localColumns)

  // Ref mirrors dropIndicator for synchronous reads in handleDragEnd.
  const indicatorRef = React.useRef<DropIndicator | null>(null)
  const clearDropTimeoutRef = React.useRef<number | null>(null)

  // Sync from parent (real-time updates).
  React.useEffect(() => {
    if (!activeId) {
      colsRef.current = columns
      setLocalColumns(columns)
    }
  }, [columns, activeId])

  React.useEffect(() => {
    if (!justDroppedId) return
    if (clearDropTimeoutRef.current) {
      window.clearTimeout(clearDropTimeoutRef.current)
      clearDropTimeoutRef.current = null
    }
    clearDropTimeoutRef.current = window.setTimeout(() => {
      clearDropTimeoutRef.current = null
      setJustDroppedId(null)
    }, DROP_ANIMATION_MS)
    return () => {
      if (clearDropTimeoutRef.current) {
        window.clearTimeout(clearDropTimeoutRef.current)
        clearDropTimeoutRef.current = null
      }
    }
  }, [justDroppedId, localColumns])

  // ─── Sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // Active task for overlay
  const activeTask = React.useMemo(() => {
    if (!activeId) return null
    for (const col of Object.values(localColumns)) {
      const found = col.find((t) => t.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, localColumns])

  // ─── rAF throttle ──────────────────────────────────────────────────────
  const rafRef = React.useRef<number | null>(null)
  const pendingRef = React.useRef<DragOverEvent | null>(null)

  // ─── Handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over) {
      indicatorRef.current = null
      setDropIndicator(null)
      return
    }
    pendingRef.current = event
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const ev = pendingRef.current
      if (!ev) return
      pendingRef.current = null
      processOver(ev)
    })
  }

  function processOver(event: DragOverEvent) {
    if (!activeId || !event.over) return
    const initialRect = event.active.rect.current.initial
    const overRect = event.over.rect
    const ind = computeIndicator(
      activeId,
      event.over,
      colsRef.current,
      event.delta,
      initialRect ? { top: initialRect.top, height: initialRect.height } : null,
      overRect ? { top: overRect.top, height: overRect.height } : null,
    )
    indicatorRef.current = ind
    setDropIndicator(ind)
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedId = event.active.id as string
    // Cancel pending rAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Process any pending over event so indicator is up to date
    const pendingEv = pendingRef.current
    pendingRef.current = null
    if (pendingEv && activeId) {
      const initialRect = pendingEv.active.rect.current.initial
      const overRect = pendingEv.over?.rect
      indicatorRef.current = computeIndicator(
        activeId,
        pendingEv.over,
        colsRef.current,
        pendingEv.delta,
        initialRect ? { top: initialRect.top, height: initialRect.height } : null,
        overRect ? { top: overRect.top, height: overRect.height } : null,
      )
    }

    const indicator = indicatorRef.current

    // Reset drag state
    setActiveId(null)
    setDropIndicator(null)
    indicatorRef.current = null

    if (!indicator) return

    // ── Compute the new column layout ──────────────────────────────────
    const cols = colsRef.current
    const sourceColumn = findContainerIn(cols, draggedId)
    if (!sourceColumn) return

    const card = cols[sourceColumn].find((t) => t.id === draggedId)
    if (!card) return

    const movedCard = { ...card, status: indicator.column as string }

    // Remove from source
    const filteredSource = cols[sourceColumn].filter((t) => t.id !== draggedId)

    // Build target list
    let target: TaskWithProject[]
    if (sourceColumn === indicator.column) {
      target = [...filteredSource] // same column after removal
    } else {
      target = [...cols[indicator.column]]
    }

    // Insert at the indicated position
    if (indicator.beforeId !== null) {
      const idx = target.findIndex((t) => t.id === indicator.beforeId)
      if (idx >= 0) {
        target.splice(idx, 0, movedCard)
      } else {
        target.push(movedCard)
      }
    } else {
      target.push(movedCard)
    }

    // Assemble new columns
    const next: Columns = { ...cols }
    if (sourceColumn === indicator.column) {
      next[sourceColumn] = target
    } else {
      next[sourceColumn] = filteredSource
      next[indicator.column] = target
    }

    // Persist
    colsRef.current = next
    setLocalColumns(next)
    setJustDroppedId(draggedId)

    const originalMap = new Map(tasks.map((t) => [t.id, t]))
    const updates: { id: string; status: string; board_position: number }[] = []

    for (const [status, colTasks] of Object.entries(next) as [
      TaskStatus,
      TaskWithProject[],
    ][]) {
      colTasks.forEach((t, i) => {
        const newPos = (i + 1) * 1000
        const orig = originalMap.get(t.id)
        if (!orig || orig.board_position !== newPos || orig.status !== status) {
          updates.push({ id: t.id, status, board_position: newPos })
        }
      })
    }

    if (updates.length > 0) {
      if (onTaskReorder) {
        onTaskReorder(updates)
      } else {
        markMutation("tasks")
        reorderAction(updates)
      }
      for (const u of updates) {
        const orig = originalMap.get(u.id)
        if (orig && orig.status !== u.status) {
          onTaskStatusChange?.(u.id, u.status)
        }
      }
    }
  }

  function handleDragCancel() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingRef.current = null
    indicatorRef.current = null
    setActiveId(null)
    setDropIndicator(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <LayoutGroup>
        <div className="flex h-full gap-4 overflow-x-auto pb-4 scrollbar-hidden">
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              tasks={localColumns[status]}
              members={project.members}
              suppressLayoutForId={justDroppedId}
              hideWhileDropId={justDroppedId}
              onTaskSelect={onTaskSelect}
              selectedTaskId={selectedTaskId}
              onTaskCompletedChange={(taskId, completed) => onTaskToggle?.(taskId, completed)}
              onTaskPriorityChange={onTaskPriorityChange}
              dropIndicatorBeforeId={
                dropIndicator?.column === status ? dropIndicator.beforeId : undefined
              }
            />
          ))}
        </div>
      </LayoutGroup>

      <DragOverlay
        dropAnimation={{
          duration: DROP_ANIMATION_MS,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {activeTask && (
          <KanbanCard
            task={activeTask}
            members={project.members}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
