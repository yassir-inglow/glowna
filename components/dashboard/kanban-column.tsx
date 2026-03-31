"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { KanbanCard } from "@/components/dashboard/kanban-card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getColumnRingColor, type BoardColumnConfig } from "@/hooks/use-project-board-columns"
import type { Priority } from "@/components/dashboard/priority-picker"
import type { TaskWithProject, ProjectMember } from "@/lib/data"

export type TaskStatus = string

type KanbanColumnProps = {
  id: string
  config: BoardColumnConfig
  tasks: TaskWithProject[]
  members: ProjectMember[]
  /** Disable layout animation for the card that just dropped. */
  suppressLayoutForId?: string | null
  onTaskSelect?: (taskId: string) => void
  selectedTaskId?: string | null
  onTaskPriorityChange?: (taskId: string, priority: Priority) => void
  onTaskDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onTaskAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  onAddTask?: (status: string, title: string) => Promise<void> | void
  onRenameColumn?: (status: string, label: string) => Promise<void> | void
  /** When defined, show a blue drop-indicator line. `string` = before that card, `null` = at the end. */
  dropIndicatorBeforeId?: string | null
}

/** Blue horizontal line that indicates "the card will land here". */
function DropLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 flex items-center gap-1",
        className,
      )}
    >
      <div className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
      <div className="h-0.5 flex-1 rounded-full bg-brand-500" />
    </div>
  )
}

const KanbanColumn = React.memo(function KanbanColumn({
  id,
  config,
  tasks,
  members,
  suppressLayoutForId,
  onTaskSelect,
  selectedTaskId,
  onTaskPriorityChange,
  onTaskDateChange,
  onTaskAssigneeChange,
  onAddTask,
  onRenameColumn,
  dropIndicatorBeforeId,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })
  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks])
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [isSubmittingTask, setIsSubmittingTask] = React.useState(false)
  const [isSavingLabel, setIsSavingLabel] = React.useState(false)
  const [labelDraft, setLabelDraft] = React.useState(config.label)
  const addInputRef = React.useRef<HTMLInputElement>(null)
  const labelInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!renameOpen) setLabelDraft(config.label)
  }, [config.label, renameOpen])

  React.useEffect(() => {
    if (!isAddingTask) return
    const timeout = window.setTimeout(() => addInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timeout)
  }, [isAddingTask])

  React.useEffect(() => {
    if (!renameOpen) return
    const timeout = window.setTimeout(() => {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [renameOpen])

  function startTaskComposer() {
    setIsAddingTask(true)
  }

  function cancelTaskComposer() {
    if (isSubmittingTask) return
    setIsAddingTask(false)
    setNewTaskTitle("")
  }

  async function submitTaskComposer() {
    const trimmed = newTaskTitle.trim()
    if (!trimmed || isSubmittingTask) return

    setIsSubmittingTask(true)
    try {
      await onAddTask?.(id, trimmed)
      setIsAddingTask(false)
      setNewTaskTitle("")
    } finally {
      setIsSubmittingTask(false)
    }
  }

  function startLabelEdit() {
    setRenameOpen(true)
  }

  function cancelLabelEdit() {
    if (isSavingLabel) return
    setLabelDraft(config.label)
    setRenameOpen(false)
  }

  async function submitLabelEdit() {
    const trimmed = labelDraft.trim()
    if (!trimmed) {
      cancelLabelEdit()
      return
    }
    if (trimmed === config.label) {
      setRenameOpen(false)
      return
    }

    setIsSavingLabel(true)
    try {
      await onRenameColumn?.(id, trimmed)
      setRenameOpen(false)
    } finally {
      setIsSavingLabel(false)
    }
  }

  return (
    <motion.div
      ref={setNodeRef}
      layout
      transition={{ layout: { type: "spring", damping: 28, stiffness: 260 } }}
      className="group/column flex min-w-[360px] max-w-[420px] flex-1 self-stretch flex-col gap-3"
    >

      {/* ── Column header pill ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between rounded-full px-3.5 py-[14px]",
          config.headerBg,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ProgressRing
            value={config.progress}
            size={20}
            color={getColumnRingColor(config.headerBg)}
            aria-label={`${config.label} progress`}
          />
          <Popover open={renameOpen} onOpenChange={(open) => {
            if (!open) {
              cancelLabelEdit()
              return
            }
            startLabelEdit()
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="max-w-[180px] truncate text-left text-text-sm font-semibold text-gray-cool-700 outline-none transition-colors hover:text-gray-cool-800"
              >
                {renameOpen ? labelDraft || config.label : config.label}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" className="w-[248px] rounded-[24px] p-2.5">
              <div className="flex flex-col gap-2">
                <Input
                  ref={labelInputRef}
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void submitLabelEdit()
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      cancelLabelEdit()
                    }
                  }}
                  size="md"
                  className="w-full rounded-[18px] pr-1"
                  aria-label="Column name"
                  trailing={
                    <Button
                      type="button"
                      variant="primary"
                      size="xxs"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void submitLabelEdit()}
                      loading={isSavingLabel}
                      disabled={!labelDraft.trim()}
                      className="px-2.5"
                    >
                      Save
                    </Button>
                  }
                />
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-text-xs text-gray-cool-400">
            {tasks.length}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/column:opacity-100 group-focus-within/column:opacity-100">
          <button
            type="button"
            className="rounded-full p-1 text-gray-cool-400 transition-colors hover:bg-alpha-800 hover:text-gray-cool-600"
            aria-label={`Add card to ${config.label}`}
            onClick={startTaskComposer}
          >
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ── Drop zone / card list ─────────────────────────────────────────── */}
      <motion.div
        layout
        transition={{ layout: { type: "spring", damping: 28, stiffness: 260 } }}
        data-kanban-column-body
        data-kanban-column-id={id}
        className={cn(
          "relative z-10 flex min-h-[140px] max-h-full flex-col gap-3 overflow-y-auto rounded-[28px] p-3 scrollbar-hidden",
          config.bodyBg,
        )}
      >
        {isAddingTask && (
          <div className="rounded-2xl border border-gray-cool-100 bg-white p-3 shadow-xs">
            <input
              ref={addInputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void submitTaskComposer()
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  cancelTaskComposer()
                }
              }}
              placeholder="Task name..."
              className="w-full bg-transparent text-text-sm font-medium text-gray-cool-700 outline-none placeholder:text-gray-cool-300"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={cancelTaskComposer}
                disabled={isSubmittingTask}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="xs"
                onClick={() => void submitTaskComposer()}
                disabled={!newTaskTitle.trim()}
                loading={isSubmittingTask}
              >
                Add card
              </Button>
            </div>
          </div>
        )}

        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <div key={task.id} className="relative" data-kanban-card-slot data-task-id={task.id}>
              {dropIndicatorBeforeId === task.id && <DropLine className="-top-2" />}
              <KanbanCard
                task={task}
                members={members}
                layoutEnabled={suppressLayoutForId !== task.id}
                selected={selectedTaskId === task.id}
                onSelect={() => onTaskSelect?.(task.id)}
                onTaskPriorityChange={(priority) => onTaskPriorityChange?.(task.id, priority)}
                onTaskDateChange={(dueDate, dueDateEnd) => onTaskDateChange?.(task.id, dueDate, dueDateEnd)}
                onTaskAssigneeChange={(ids) => onTaskAssigneeChange?.(task.id, ids)}
              />
            </div>
          ))}
        </SortableContext>

        {/* Indicator at the end of the column (beforeId === null) */}
        {dropIndicatorBeforeId === null && <DropLine className="bottom-3" />}

        {tasks.length === 0 && dropIndicatorBeforeId === undefined && (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-text-xs text-gray-cool-400">No tasks</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
})

export { KanbanColumn }
