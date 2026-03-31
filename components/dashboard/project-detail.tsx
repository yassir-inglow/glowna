"use client"

import * as React from "react"
import { ProjectHeader } from "@/components/dashboard/project-header"
import { TaskRow } from "@/components/dashboard/task-row"
import { TaskContextMenu } from "@/components/dashboard/task-context-menu"
import { NewTaskRow } from "@/components/dashboard/new-task-row"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { TimelineView } from "@/components/dashboard/timeline-view"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useProjectBoardColumns, type BoardColumnConfig } from "@/hooks/use-project-board-columns"
import { reorderTasksInColumn as reorderAction } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import type { ProjectWithMembers, TaskWithProject } from "@/lib/data"
import type { Priority } from "@/components/dashboard/priority-picker"

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

const SAVE_DELAY_MS = 6000

type ProjectView = "overview" | "list" | "board" | "timeline"

type ProjectDetailProps = {
  project: ProjectWithMembers
  tasks: TaskWithProject[]
  boardColumns?: BoardColumnConfig[]
  onSaveBoardColumns?: (next: BoardColumnConfig[]) => Promise<void> | void
  onDeleteTask?: (taskId: string) => void
  /** Called when a task's completed state is toggled (for local-state sync in the drawer). */
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  /** Called after a new task is created (so the parent can re-fetch). */
  onTaskCreated?: () => void
  /** Disable the built-in Realtime refresh (e.g. when a parent already subscribes). */
  enableRealtimeRefresh?: boolean
  /** Called when a task row is clicked to open the detail panel. */
  onTaskSelect?: (taskId: string) => void
  /** ID of the currently selected task (shown in the detail panel). */
  selectedTaskId?: string | null
  /** Called when a task's priority changes (for optimistic sync in the drawer). */
  onTaskPriorityChange?: (taskId: string, priority: Priority) => void
  /** Called when a task's assignees change (for optimistic sync in the drawer). */
  onTaskAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  /** Called when a task's status changes (board drag-and-drop). */
  onTaskStatusChange?: (taskId: string, status: string) => void
  /** Called when tasks are reordered on the board. */
  onTaskReorder?: (updates: { id: string; status: string; board_position: number }[]) => void | Promise<void>
  /** Called when a task's dates change (timeline drag-to-resize). */
  onTaskDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
}

export function ProjectDetail({ project, tasks, boardColumns: boardColumnsProp, onSaveBoardColumns, onDeleteTask, onTaskToggle, onTaskCreated, enableRealtimeRefresh = true, onTaskSelect, selectedTaskId, onTaskPriorityChange, onTaskAssigneeChange, onTaskStatusChange, onTaskReorder, onTaskDateChange }: ProjectDetailProps) {
  const [activeView, setActiveView] = React.useState<ProjectView>("overview")
  const [focusNewTask, setFocusNewTask] = React.useState(false)
  const newTaskInputRef = React.useRef<HTMLInputElement>(null)
  type TaskPatch = Partial<
    Pick<
      TaskWithProject,
      "status" | "board_position" | "priority" | "completed" | "due_date" | "due_date_end" | "task_assignees"
    >
  >
  const [pendingPatches, setPendingPatches] = React.useState<Map<string, TaskPatch>>(() => new Map())
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(() => new Set())
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "delayed" | "error">("idle")
  const [lastFailedUpdates, setLastFailedUpdates] = React.useState<
    { updates: { id: string; status: string; board_position: number }[] } | null
  >(null)
  const [saveTimerId, setSaveTimerId] = React.useState<number | null>(null)

  const boardColumnsState = useProjectBoardColumns(boardColumnsProp ? null : project.id)
  const boardColumns = boardColumnsProp ?? boardColumnsState.columns
  const saveBoardColumns = onSaveBoardColumns ?? boardColumnsState.save

  const tasksById = React.useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const displayTasks = React.useMemo(() => {
    if (pendingPatches.size === 0 && pendingDeletes.size === 0) return tasks
    return tasks
      .filter((t) => !pendingDeletes.has(t.id))
      .map((t) => {
        const patch = pendingPatches.get(t.id)
        return patch ? { ...t, ...patch } : t
      })
  }, [tasks, pendingDeletes, pendingPatches])

  const assignedIdsFromAssignees = React.useCallback(
    (assignees: TaskWithProject["task_assignees"]) =>
      assignees.map((a) => a.profiles?.id).filter(Boolean) as string[],
    [],
  )

  const equalIdSets = React.useCallback((a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    const setA = new Set(a)
    for (const id of b) if (!setA.has(id)) return false
    return true
  }, [])

  React.useEffect(() => {
    return () => {
      if (saveTimerId) window.clearTimeout(saveTimerId)
    }
  }, [saveTimerId])

  const beginSave = React.useCallback(() => {
    setSaveStatus("saving")
    setLastFailedUpdates(null)
    setSaveTimerId((prev) => {
      if (prev) window.clearTimeout(prev)
      return window.setTimeout(() => {
        setSaveStatus((prevStatus) => (prevStatus === "saving" ? "delayed" : prevStatus))
      }, SAVE_DELAY_MS)
    })
  }, [])

  const clearSaveTimer = React.useCallback(() => {
    setSaveTimerId((prev) => {
      if (prev) window.clearTimeout(prev)
      return null
    })
  }, [])

  const finishSave = React.useCallback(() => {
    clearSaveTimer()
    setSaveStatus("idle")
    setLastFailedUpdates(null)
  }, [clearSaveTimer])

  React.useEffect(() => {
    if (pendingPatches.size === 0 && pendingDeletes.size === 0) {
      if (saveStatus !== "idle") finishSave()
      return
    }

    let nextPatches = pendingPatches
    let nextDeletes = pendingDeletes
    let changed = false

    for (const id of pendingDeletes) {
      if (!tasksById.has(id)) {
        if (nextDeletes === pendingDeletes) nextDeletes = new Set(pendingDeletes)
        nextDeletes.delete(id)
        changed = true
      }
    }

    for (const [id, patch] of pendingPatches) {
      const task = tasksById.get(id)
      if (!task) {
        if (nextPatches === pendingPatches) nextPatches = new Map(pendingPatches)
        nextPatches.delete(id)
        changed = true
        continue
      }

      let matches = true
      if (patch.status !== undefined && task.status !== patch.status) matches = false
      if (patch.board_position !== undefined && task.board_position !== patch.board_position) matches = false
      if (patch.priority !== undefined && task.priority !== patch.priority) matches = false
      if (patch.completed !== undefined && task.completed !== patch.completed) matches = false
      if (patch.due_date !== undefined && task.due_date !== patch.due_date) matches = false
      if (patch.due_date_end !== undefined && task.due_date_end !== patch.due_date_end) matches = false
      if (patch.task_assignees !== undefined) {
        const taskIds = assignedIdsFromAssignees(task.task_assignees)
        const patchIds = assignedIdsFromAssignees(patch.task_assignees)
        if (!equalIdSets(taskIds, patchIds)) matches = false
      }

      if (matches) {
        if (nextPatches === pendingPatches) nextPatches = new Map(pendingPatches)
        nextPatches.delete(id)
        changed = true
      }
    }

    if (changed) {
      setPendingPatches(nextPatches)
      setPendingDeletes(nextDeletes)
    }

    const finalPatches = changed ? nextPatches : pendingPatches
    const finalDeletes = changed ? nextDeletes : pendingDeletes
    if (finalPatches.size === 0 && finalDeletes.size === 0) {
      finishSave()
    }
  }, [assignedIdsFromAssignees, equalIdSets, finishSave, pendingDeletes, pendingPatches, saveStatus, tasksById])

  React.useEffect(() => () => clearSaveTimer(), [clearSaveTimer])

  const queuePatch = React.useCallback((taskId: string, patch: TaskPatch) => {
    setPendingPatches((prev) => {
      const next = new Map(prev)
      const existing = next.get(taskId) ?? {}
      next.set(taskId, { ...existing, ...patch })
      return next
    })
  }, [])

  const queueDelete = React.useCallback((taskId: string) => {
    setPendingDeletes((prev) => {
      if (prev.has(taskId)) return prev
      const next = new Set(prev)
      next.add(taskId)
      return next
    })
  }, [])

  const runReorderSave = React.useCallback(
    (updates: { id: string; status: string; board_position: number }[]) => {
      if (onTaskReorder) return onTaskReorder(updates)
      markMutation("tasks")
      return reorderAction(updates)
    },
    [onTaskReorder],
  )

  const handleOptimisticDelete = React.useCallback(
    (taskId: string) => {
      React.startTransition(() => {
        queueDelete(taskId)
      })
      beginSave()
    },
    [queueDelete, beginSave],
  )

  const handleOptimisticStatusChange = React.useCallback(
    (taskId: string, status: string) => {
      React.startTransition(() => {
        queuePatch(taskId, { status, completed: status === "done" })
      })
      beginSave()
      onTaskStatusChange?.(taskId, status)
    },
    [queuePatch, beginSave, onTaskStatusChange],
  )

  const handleOptimisticPriorityChange = React.useCallback(
    (taskId: string, priority: Priority) => {
      React.startTransition(() => {
        queuePatch(taskId, { priority })
      })
      beginSave()
      onTaskPriorityChange?.(taskId, priority)
    },
    [queuePatch, beginSave, onTaskPriorityChange],
  )

  const handleOptimisticDateChange = React.useCallback(
    (taskId: string, dueDate: string | null, dueDateEnd: string | null) => {
      React.startTransition(() => {
        queuePatch(taskId, { due_date: dueDate, due_date_end: dueDateEnd })
      })
      beginSave()
      onTaskDateChange?.(taskId, dueDate, dueDateEnd)
    },
    [queuePatch, beginSave, onTaskDateChange],
  )

  const handleOptimisticAssigneeChange = React.useCallback(
    (taskId: string, assignedIds: string[]) => {
      const newAssignees: TaskWithProject["task_assignees"] = assignedIds
        .map((pid) => project.members.find((m) => m.id === pid))
        .filter(Boolean)
        .map((m) => ({
          profiles: { id: m!.id, full_name: m!.full_name, email: m!.email, avatar_url: m!.avatar_url },
        }))

      React.startTransition(() => {
        queuePatch(taskId, { task_assignees: newAssignees })
      })
      beginSave()
      onTaskAssigneeChange?.(taskId, assignedIds)
    },
    [queuePatch, beginSave, onTaskAssigneeChange, project.members],
  )

  const handleOptimisticReorder = React.useCallback(
    (updates: { id: string; status: string; board_position: number }[]) => {
      React.startTransition(() => {
        setPendingPatches((prev) => {
          const next = new Map(prev)
          for (const u of updates) {
            const existing = next.get(u.id) ?? {}
            next.set(u.id, {
              ...existing,
              status: u.status,
              board_position: u.board_position,
              completed: u.status === "done",
            })
          }
          return next
        })
      })
      beginSave()
      Promise.resolve(runReorderSave(updates)).catch(() => {
        setSaveStatus("error")
        setLastFailedUpdates({ updates })
      })
    },
    [beginSave, runReorderSave],
  )

  const handleRetry = React.useCallback(() => {
    if (!lastFailedUpdates) return
    beginSave()
    Promise.resolve(runReorderSave(lastFailedUpdates.updates)).catch(() => {
      setSaveStatus("error")
    })
  }, [beginSave, lastFailedUpdates, runReorderSave])

  useRealtimeRefresh({ table: "tasks", filter: `project_id=eq.${project.id}`, enabled: enableRealtimeRefresh })
  useRealtimeRefresh({ table: "task_assignees", enabled: enableRealtimeRefresh })
  useRealtimeRefresh({ table: "project_members", filter: `project_id=eq.${project.id}`, enabled: enableRealtimeRefresh })

  React.useEffect(() => {
    if (!focusNewTask) return
    if (!newTaskInputRef.current) return
    newTaskInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    newTaskInputRef.current.focus()
    setFocusNewTask(false)
  }, [focusNewTask])

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        activeView={activeView}
        onActiveViewChange={setActiveView}
        columns={boardColumns}
        onSaveColumns={saveBoardColumns}
        onNewTask={() => {
          if (activeView === "board" || activeView === "timeline") setActiveView("list")
          setFocusNewTask(true)
        }}
      />

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-6">
      {saveStatus !== "idle" && (
        <div className="flex items-center justify-end gap-2 text-text-xs text-gray-cool-500">
          <span>
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "delayed" && "Still saving..."}
            {saveStatus === "error" && "Couldn't save."}
          </span>
          {(saveStatus === "delayed" || saveStatus === "error") && lastFailedUpdates && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full px-2 py-0.5 text-text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {activeView === "board" ? (
        <KanbanBoard
          tasks={displayTasks}
          project={project}
          columns={boardColumns}
          onSaveColumns={saveBoardColumns}
          onTaskToggle={onTaskToggle}
          onTaskCreated={onTaskCreated}
          onDeleteTask={(taskId) => { handleOptimisticDelete(taskId); onDeleteTask?.(taskId) }}
          onTaskSelect={onTaskSelect}
          selectedTaskId={selectedTaskId}
          onTaskPriorityChange={handleOptimisticPriorityChange}
          onTaskDateChange={handleOptimisticDateChange}
          onTaskAssigneeChange={handleOptimisticAssigneeChange}
          onTaskStatusChange={handleOptimisticStatusChange}
          onTaskReorder={handleOptimisticReorder}
        />
      ) : activeView === "timeline" ? (
        <TimelineView
          tasks={displayTasks}
          projectId={project.id}
          columns={boardColumns}
          onTaskSelect={onTaskSelect}
          selectedTaskId={selectedTaskId}
          onTaskDateChange={onTaskDateChange}
          onTaskCreated={onTaskCreated}
        />
      ) : (
        <div className="overflow-hidden">
          <NewTaskRow
            projectId={project.id}
            members={project.members}
            onCreated={onTaskCreated}
            autoFocus={false}
            inputRef={newTaskInputRef}
          />
          {displayTasks.map((task) => (
            <TaskContextMenu key={task.id} taskId={task.id} projectId={task.project_id} onDelete={() => { handleOptimisticDelete(task.id); onDeleteTask?.(task.id) }}>
              <TaskRow
                id={task.id}
                title={task.title}
                completed={task.completed}
                onCompletedChange={onTaskToggle ? (checked) => onTaskToggle(task.id, checked) : undefined}
                showAddons={!!(task.sub_task_total || task.add_text || task.label_text || task.comment_count)}
                subTaskCurrent={task.sub_task_current}
                subTaskTotal={task.sub_task_total}
                addText={task.add_text ?? undefined}
                labelText={task.label_text ?? undefined}
                commentCount={task.comment_count}
                avatars={task.task_assignees.map((a) => ({
                  src: a.profiles?.avatar_url ?? undefined,
                  fallback: getInitials(a.profiles?.full_name ?? a.profiles?.email),
                  value: a.profiles?.full_name ?? a.profiles?.email ?? undefined,
                }))}
                members={project.members}
                assignedIds={task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[]}
                selected={selectedTaskId === task.id}
                initialDueDate={task.due_date}
                initialDueDateEnd={task.due_date_end}
                priority={(task.priority ?? "none") as Priority}
                onDateChange={handleOptimisticDateChange ? (dueDate, dueDateEnd) => handleOptimisticDateChange(task.id, dueDate, dueDateEnd) : undefined}
                onPriorityChange={handleOptimisticPriorityChange ? (p) => handleOptimisticPriorityChange(task.id, p) : undefined}
                onSelect={onTaskSelect ? () => onTaskSelect(task.id) : undefined}
              />
            </TaskContextMenu>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
