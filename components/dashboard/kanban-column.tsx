"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { MoreVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { KanbanCard } from "@/components/dashboard/kanban-card"
import { ProgressRing } from "@/components/ui/progress-ring"
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
  onTaskCompletedChange?: (taskId: string, completed: boolean) => void
  onTaskPriorityChange?: (taskId: string, priority: Priority) => void
  onAddTask?: (status: string) => void
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
  onTaskCompletedChange,
  onTaskPriorityChange,
  dropIndicatorBeforeId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div className="flex h-full min-w-[300px] max-w-[420px] flex-1 flex-col gap-2">

      {/* ── Column header pill ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between rounded-full px-3.5 py-[14px]",
          config.headerBg,
        )}
      >
        <div className="flex items-center gap-2">
          <ProgressRing
            value={config.progress}
            size={20}
            color={getColumnRingColor(config.headerBg)}
            aria-label={`${config.label} progress`}
          />
          <span className="text-text-sm font-semibold text-gray-cool-700">
            {config.label}
          </span>
          <span className="text-text-xs text-gray-cool-400">
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          className="rounded-full p-0.5 text-gray-cool-400 transition-colors hover:bg-alpha-800 hover:text-gray-cool-600"
          aria-label="Column options"
        >
          <HugeiconsIcon icon={MoreVerticalIcon} size={16} strokeWidth={2} />
        </button>
      </div>

      {/* ── Drop zone / card list ─────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className={cn(
          "relative flex min-h-[120px] flex-1 flex-col gap-2 rounded-t-[24px] rounded-b-none p-2 transition-colors",
          isOver ? "bg-brand-50/50" : config.bodyBg,
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <div key={task.id} className="relative">
              {dropIndicatorBeforeId === task.id && <DropLine className="-top-2" />}
              <KanbanCard
                task={task}
                members={members}
                layoutEnabled={suppressLayoutForId !== task.id}
                selected={selectedTaskId === task.id}
                onSelect={() => onTaskSelect?.(task.id)}
                onCompletedChange={(completed) => onTaskCompletedChange?.(task.id, completed)}
                onPriorityChange={(priority) => onTaskPriorityChange?.(task.id, priority)}
              />
            </div>
          ))}
        </SortableContext>

        {/* Indicator at the end of the column (beforeId === null) */}
        {dropIndicatorBeforeId === null && <DropLine className="bottom-2" />}

        {tasks.length === 0 && dropIndicatorBeforeId === undefined && (
          <div className="flex flex-1 items-center justify-center py-8">
            <span className="text-text-xs text-gray-cool-400">No tasks</span>
          </div>
        )}
      </div>
    </div>
  )
})

export { KanbanColumn }
