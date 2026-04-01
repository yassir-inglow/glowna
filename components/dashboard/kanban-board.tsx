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
  type Collision,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { LayoutGroup } from "motion/react"

import { KanbanColumn } from "@/components/dashboard/kanban-column"
import { KanbanCard } from "@/components/dashboard/kanban-card"
import { createTask, reorderTasksInColumn as reorderAction } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { humanizeStatus, type BoardColumnConfig } from "@/hooks/use-project-board-columns"
import { computeColumnProgress } from "@/lib/board-columns"
import type { Priority } from "@/components/dashboard/priority-picker"
import type { TaskWithProject, ProjectWithMembers } from "@/lib/data"

const BOARD_POSITION_GAP = 1000

type Columns = Record<string, TaskWithProject[]>

/** Where the blue drop-indicator line is shown. */
type DropIndicator = {
  /** Target column */
  column: string
  /** Show the line BEFORE this card. `null` means at the end of the column. */
  beforeId: string | null
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function findContainerIn(cols: Columns, taskId: string): string | null {
  for (const [status, tasks] of Object.entries(cols)) {
    if (tasks.some((t) => t.id === taskId)) return status
  }
  return null
}

function computeInsertedPosition(
  prevPos: number | null,
  nextPos: number | null,
): { pos: number; needsReindex: boolean } {
  if (prevPos == null && nextPos == null) {
    return { pos: BOARD_POSITION_GAP, needsReindex: false }
  }
  if (prevPos == null) {
    // Insert before the first card
    return { pos: nextPos! - BOARD_POSITION_GAP, needsReindex: false }
  }
  if (nextPos == null) {
    // Insert at end
    return { pos: prevPos + BOARD_POSITION_GAP, needsReindex: false }
  }

  const gap = nextPos - prevPos
  if (gap <= 1) return { pos: prevPos, needsReindex: true }

  const pos = Math.floor(prevPos + gap / 2)
  if (pos === prevPos || pos === nextPos) return { pos, needsReindex: true }

  return { pos, needsReindex: false }
}

function getBeforeIdFromColumnPointer(columnId: string, pointerY: number): string | null {
  if (typeof document === "undefined") return null

  const columnBody = document.querySelector<HTMLElement>(
    `[data-kanban-column-id="${columnId}"]`,
  )
  if (!columnBody) return null

  const slots = Array.from(
    columnBody.querySelectorAll<HTMLElement>("[data-kanban-card-slot][data-task-id]"),
  )

  for (const slot of slots) {
    const taskId = slot.dataset.taskId
    if (!taskId) continue
    const rect = slot.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    if (pointerY < centerY) return taskId
  }

  return null
}

/** Compute indicator position. Returns null when the drag would be a no-op. */
function computeIndicator(
  activeId: string,
  over: DragOverEvent["over"],
  cols: Columns,
  columnOrder: string[],
  delta: { y: number },
  activeInitialRect: { top: number; height: number } | null,
  overRect: { top: number; height: number } | null,
): DropIndicator | null {
  if (!over || (over.id as string) === activeId) return null
  const activeColumn = findContainerIn(cols, activeId)
  const pointerCenterY = activeInitialRect
    ? activeInitialRect.top + delta.y + activeInitialRect.height / 2
    : null

  // Hovering over empty area of a column
  if (columnOrder.includes(over.id as string)) {
    const column = over.id as string
    const colTasks = cols[column] ?? []
    const beforeId =
      pointerCenterY == null ? null : getBeforeIdFromColumnPointer(column, pointerCenterY)

    if (activeColumn === column) {
      const activeIndex = colTasks.findIndex((task) => task.id === activeId)
      if (beforeId === null && colTasks[colTasks.length - 1]?.id === activeId) return null
      if (beforeId === activeId) return null
      if (beforeId && activeIndex >= 0 && colTasks[activeIndex + 1]?.id === beforeId) return null
    }

    return { column, beforeId }
  }

  // Hovering over a card
  const overColumn = findContainerIn(cols, over.id as string)
  if (!overColumn) return null

  const colTasks = cols[overColumn]
  const overIndex = colTasks.findIndex((t) => t.id === over.id)
  if (overIndex === -1) return null

  const activeIndex =
    activeColumn === overColumn ? colTasks.findIndex((t) => t.id === activeId) : -1

  if (pointerCenterY != null && overRect) {
    const overCenterY = overRect.top + overRect.height / 2
    const insertAfter = pointerCenterY > overCenterY

    if (insertAfter) {
      const nextCard = colTasks[overIndex + 1] ?? null

      if (activeColumn === overColumn) {
        if (nextCard?.id === activeId) return null
        if (!nextCard && colTasks[colTasks.length - 1]?.id === activeId) return null
      }

      return {
        column: overColumn,
        beforeId: nextCard ? nextCard.id : null,
      }
    }
  }

  // Same-column no-op: inserting before the card that's already right after active
  if (activeColumn === overColumn) {
    if (overIndex === activeIndex + 1 || overIndex === activeIndex) return null
  }

  return { column: overColumn, beforeId: over.id as string }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type KanbanBoardProps = {
  tasks: TaskWithProject[]
  project: ProjectWithMembers
  columns: BoardColumnConfig[]
  onSaveColumns?: (next: BoardColumnConfig[]) => Promise<void> | void
  canWrite?: boolean
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  onTaskCreated?: () => void
  onDeleteTask?: (taskId: string) => void
  onTaskSelect?: (taskId: string) => void
  selectedTaskId?: string | null
  onTaskPriorityChange?: (taskId: string, priority: Priority) => void
  onTaskDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onTaskAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onTaskReorder?: (
    updates: { id: string; status: string; board_position: number }[],
  ) => void | Promise<void>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KanbanBoard({
  tasks,
  project,
  columns: columnsConfig,
  onSaveColumns,
  canWrite = true,
  onTaskCreated,
  onTaskSelect,
  selectedTaskId,
  onTaskPriorityChange,
  onTaskDateChange,
  onTaskAssigneeChange,
  onTaskStatusChange,
  onTaskReorder,
}: KanbanBoardProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [isPanning, setIsPanning] = React.useState(false)
  const panStartXRef = React.useRef(0)
  const panStartScrollLeftRef = React.useRef(0)
  const isPanningRef = React.useRef(false)

  const effectiveColumnsConfig = React.useMemo(() => {
    const existing = new Set(columnsConfig.map((c) => c.id))
    const unknown: BoardColumnConfig[] = []

    for (const task of tasks) {
      const status = (task.status ?? "todo") as string
      if (existing.has(status)) continue
      existing.add(status)
      unknown.push({
        id: status,
        label: humanizeStatus(status),
        headerBg: "bg-gray-cool-25",
        bodyBg: "bg-gray-cool-25",
        progress: 50,
      })
    }

    const merged =
      unknown.length === 0
        ? columnsConfig
        : (() => {
            const doneIndex = columnsConfig.findIndex((c) => c.id === "done")
            if (doneIndex < 0) return [...columnsConfig, ...unknown]
            return [
              ...columnsConfig.slice(0, doneIndex),
              ...unknown,
              ...columnsConfig.slice(doneIndex),
            ]
          })()

    const total = merged.length
    return merged.map((c, index) => ({
      ...c,
      progress: computeColumnProgress(index, total),
    }))
  }, [columnsConfig, tasks])

  const columnOrder = React.useMemo(
    () => effectiveColumnsConfig.map((c) => c.id),
    [effectiveColumnsConfig],
  )

  const handleRenameColumn = React.useCallback(
    async (columnId: string, label: string) => {
      if (!canWrite) return
      if (!onSaveColumns) return
      const trimmed = label.trim()
      if (!trimmed) return

      const nextColumns = effectiveColumnsConfig.map((column) =>
        column.id === columnId ? { ...column, label: trimmed } : column,
      )

      await onSaveColumns(nextColumns)
    },
    [canWrite, effectiveColumnsConfig, onSaveColumns],
  )

  const kanbanCollision = React.useCallback<CollisionDetection>(
    (args) => {
      const preferCards = (hits: Collision[]) => {
        const cardHits = hits.filter((hit) => !columnOrder.includes(hit.id as string))
        return cardHits.length > 0 ? cardHits : hits
      }

      const pointerHits = pointerWithin(args)
      if (pointerHits.length > 0) return preferCards(pointerHits)

      const rectHits = rectIntersection(args)
      return rectHits.length > 0 ? preferCards(rectHits) : rectHits
    },
    [columnOrder],
  )

  // Group tasks by status, sorted by board_position
  const columns = React.useMemo(() => {
    const grouped: Columns = {}
    for (const col of effectiveColumnsConfig) grouped[col.id] = []
    for (const task of tasks) {
      const status = (task.status ?? "todo") as string
      if (!grouped[status]) grouped[status] = []
      grouped[status].push(task)
    }
    for (const col of Object.values(grouped)) {
      col.sort((a, b) => a.board_position - b.board_position)
    }
    return grouped
  }, [tasks, effectiveColumnsConfig])

  const [localColumns, setLocalColumns] = React.useState(columns)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = React.useState<DropIndicator | null>(null)
  const [justDroppedId, setJustDroppedId] = React.useState<string | null>(null)

  const handleAddTask = React.useCallback(
    async (status: string, title: string) => {
      if (!canWrite) return
      const trimmed = title.trim()
      if (!trimmed) return

      const columnTasks = localColumns[status] ?? []
      const lastTask = columnTasks[columnTasks.length - 1]
      const boardPosition =
        lastTask && Number.isFinite(lastTask.board_position)
          ? lastTask.board_position + BOARD_POSITION_GAP
          : BOARD_POSITION_GAP

      markMutation("tasks")
      await createTask(project.id, trimmed, { status, boardPosition })
      onTaskCreated?.()
    },
    [canWrite, localColumns, onTaskCreated, project.id],
  )

  // Ref mirrors dropIndicator for synchronous reads in handleDragEnd.
  const indicatorRef = React.useRef<DropIndicator | null>(null)

  // Sync from parent (real-time updates).
  React.useEffect(() => {
    if (!activeId) {
      setLocalColumns(columns)
    }
  }, [columns, activeId])

  React.useEffect(() => {
    if (!justDroppedId) return
    const raf = window.requestAnimationFrame(() => {
      setJustDroppedId(null)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [justDroppedId])

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
    if (!canWrite) return
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canWrite) return
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
      localColumns,
      columnOrder,
      event.delta,
      initialRect ? { top: initialRect.top, height: initialRect.height } : null,
      overRect ? { top: overRect.top, height: overRect.height } : null,
    )
    indicatorRef.current = ind
    setDropIndicator(ind)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canWrite) return
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
        localColumns,
        columnOrder,
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
    const cols = localColumns
    const sourceColumn = findContainerIn(cols, draggedId)
    if (!sourceColumn) return

    const card = cols[sourceColumn].find((t) => t.id === draggedId)
    if (!card) return

    // Remove from source
    const filteredSource = cols[sourceColumn].filter((t) => t.id !== draggedId)

    // Build target list
    let targetBase: TaskWithProject[]
    if (sourceColumn === indicator.column) {
      targetBase = [...filteredSource] // same column after removal
    } else {
      targetBase = [...cols[indicator.column]]
    }

    let insertIndex = targetBase.length
    if (indicator.beforeId !== null) {
      const idx = targetBase.findIndex((t) => t.id === indicator.beforeId)
      insertIndex = idx >= 0 ? idx : targetBase.length
    }

    const prev = insertIndex > 0 ? targetBase[insertIndex - 1] : null
    const nextCard = insertIndex < targetBase.length ? targetBase[insertIndex] : null
    const { pos: insertedPos, needsReindex } = computeInsertedPosition(
      prev?.board_position ?? null,
      nextCard?.board_position ?? null,
    )

    const movedCard: TaskWithProject = {
      ...card,
      status: indicator.column as string,
      board_position: insertedPos,
    }

    const target: TaskWithProject[] = [...targetBase]
    target.splice(insertIndex, 0, movedCard)

    // Assemble new columns
    let next: Columns = { ...cols }
    if (sourceColumn === indicator.column) {
      next[sourceColumn] = target
    } else {
      next[sourceColumn] = filteredSource
      next[indicator.column] = target
    }

    // If positions are too dense to insert, reindex the target column (rare fallback).
    if (needsReindex) {
      next = {
        ...next,
        [indicator.column]: next[indicator.column].map((t, i) => ({
          ...t,
          board_position: (i + 1) * BOARD_POSITION_GAP,
        })),
      }
    }

    // Persist
    setLocalColumns(next)
    setJustDroppedId(draggedId)

    const originalMap = new Map(tasks.map((t) => [t.id, t]))
    const updates: { id: string; status: string; board_position: number }[] = []

    if (needsReindex) {
      for (const t of next[indicator.column]) {
        const orig = originalMap.get(t.id)
        const status = indicator.column
        if (!orig || orig.board_position !== t.board_position || orig.status !== status) {
          updates.push({ id: t.id, status, board_position: t.board_position })
        }
      }
    } else {
      const orig = originalMap.get(draggedId)
      if (
        !orig ||
        orig.status !== indicator.column ||
        orig.board_position !== movedCard.board_position
      ) {
        updates.push({
          id: draggedId,
          status: indicator.column,
          board_position: movedCard.board_position,
        })
      }
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

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return
      if (event.shiftKey) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      if (event.deltaY === 0) return

      const target = event.target as HTMLElement | null
      const columnBody = target?.closest?.("[data-kanban-column-body]") as HTMLElement | null
      if (columnBody && columnBody.scrollHeight > columnBody.clientHeight) return

      el.scrollLeft += event.deltaY
      event.preventDefault()
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  function handlePanStart(e: React.PointerEvent<HTMLDivElement>) {
    if (activeId) return
    if (e.button !== 0) return
    if (!scrollRef.current) return

    const target = e.target as HTMLElement | null
    if (
      target?.closest?.(
        "[data-kanban-card],button,a,input,textarea,select,[role='button']",
      )
    )
      return

    isPanningRef.current = true
    setIsPanning(true)
    panStartXRef.current = e.clientX
    panStartScrollLeftRef.current = scrollRef.current.scrollLeft
    scrollRef.current.setPointerCapture(e.pointerId)
  }

  function handlePanMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPanningRef.current) return
    if (!scrollRef.current) return
    const deltaX = e.clientX - panStartXRef.current
    scrollRef.current.scrollLeft = panStartScrollLeftRef.current - deltaX
    e.preventDefault()
  }

  function handlePanEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPanningRef.current) return
    isPanningRef.current = false
    setIsPanning(false)
    scrollRef.current?.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <LayoutGroup>
          <div
            ref={scrollRef}
            className={[
              "flex min-h-0 flex-1 items-start gap-4 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hidden",
              isPanning ? "cursor-grabbing select-none" : "cursor-default",
            ].join(" ")}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerCancel={handlePanEnd}
          >
            {effectiveColumnsConfig.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                config={col}
                tasks={localColumns[col.id] ?? []}
                members={project.members}
                canWrite={canWrite}
                isDragging={!!activeId || !!justDroppedId}
                suppressLayoutForId={justDroppedId}
                onTaskSelect={onTaskSelect}
                selectedTaskId={selectedTaskId}
                onTaskPriorityChange={onTaskPriorityChange}
                onTaskDateChange={onTaskDateChange}
                onTaskAssigneeChange={onTaskAssigneeChange}
                onAddTask={handleAddTask}
                onRenameColumn={handleRenameColumn}
                dropIndicatorBeforeId={
                  dropIndicator?.column === col.id ? dropIndicator.beforeId : undefined
                }
              />
            ))}
          </div>
        </LayoutGroup>

        <DragOverlay dropAnimation={null}>
          {activeTask && <KanbanCard task={activeTask} members={project.members} canWrite={canWrite} isDragOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
