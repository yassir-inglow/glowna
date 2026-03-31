"use client"

import * as React from "react"
import { motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import {
  Flag02Icon,
  Calendar03Icon,
  TaskDone02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { getPriorityConfig, PriorityPopover } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { TaskDatePopover, formatTaskDateLabel } from "@/components/dashboard/task-date-popover"
import type { TaskWithProject, ProjectMember } from "@/lib/data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return null
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" })
}

function formatCreatedAt(dateStr: string | null | undefined) {
  if (!dateStr) return null
  return "Created " + formatDate(dateStr)
}

// ─── Label pill ───────────────────────────────────────────────────────────────

function LabelPill({
  icon,
  label,
  iconClassName,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  iconClassName?: string
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-alpha-900 pl-1 pr-1.5 py-0.5">
      <HugeiconsIcon
        icon={icon}
        size={13}
        strokeWidth={1.5}
        className={cn("shrink-0 text-gray-cool-400", iconClassName)}
      />
      <span className="text-text-xs font-medium text-gray-cool-500">{label}</span>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type KanbanCardProps = {
  task: TaskWithProject
  members: ProjectMember[]
  selected?: boolean
  onSelect?: () => void
  onTaskAssigneeChange?: (assignedIds: string[]) => void
  onTaskDateChange?: (dueDate: string | null, dueDateEnd: string | null) => void
  onTaskPriorityChange?: (priority: Priority) => void
  /** Disable layout animation for this card. */
  layoutEnabled?: boolean
  isDragOverlay?: boolean
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const KanbanCard = React.memo(function KanbanCard({
  task,
  members,
  selected,
  onSelect,
  onTaskAssigneeChange,
  onTaskDateChange,
  onTaskPriorityChange,
  layoutEnabled = true,
  isDragOverlay,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragOverlay,
  })

  // Card stays in place — no transform, no transition.
  // Keep the original card visible at 50% while dragging.
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
  }

  const didDragRef = React.useRef(false)
  React.useEffect(() => {
    if (isDragging) didDragRef.current = true
    else if (didDragRef.current) {
      const t = window.setTimeout(() => {
        didDragRef.current = false
      }, 0)
      return () => window.clearTimeout(t)
    }
  }, [isDragging])

  const priorityConfig = getPriorityConfig(task.priority)
  const createdAt = formatCreatedAt(task.created_at)
  const enableLayout = layoutEnabled && !isDragOverlay

  const assignedIds = React.useMemo(
    () => task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[],
    [task.task_assignees],
  )

  const displayAssignees = React.useMemo(() => {
    return task.task_assignees
      .map((a) => a.profiles)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => ({
        id: p!.id,
        avatar_url: p!.avatar_url ?? null,
        label: p!.full_name ?? p!.email ?? p!.id,
      }))
  }, [task.task_assignees])
  const extraAssigneeCount = Math.max(task.task_assignees.length - displayAssignees.length, 0)

  const dueDateButtonLabel = formatTaskDateLabel(task.due_date, task.due_date_end)
  const priorityLabel = priorityConfig ? priorityConfig.label : "Priority"

  return (
    <motion.div
      ref={setNodeRef}
      data-kanban-card
      style={isDragOverlay ? undefined : style}
      // Smooth layout animation when cards shift after a drop
      layout={enableLayout}
      transition={enableLayout ? { layout: { type: "spring", damping: 28, stiffness: 260 } } : undefined}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-2xl border bg-white p-3 shadow-xs transition-shadow transition-opacity",
        "hover:shadow-sm",
        selected ? "border-brand-500 ring-1 ring-brand-500/20" : "border-gray-cool-100",
      )}
    >
      {!isDragOverlay && (
        <button
          type="button"
          aria-label="Open task"
          className="absolute inset-0 z-10 cursor-grab rounded-2xl"
          onClick={(e) => {
            e.stopPropagation()
            if (didDragRef.current) return
            onSelect?.()
          }}
        />
      )}

      <div className="relative z-20 flex flex-col gap-2.5 pointer-events-none">
        {/* ── Title ──────────────────────────────────────────────────────────── */}
        <p
          className={cn(
            "pointer-events-none text-text-sm font-medium leading-snug",
            task.completed
              ? "text-gray-cool-400 line-through"
              : "text-gray-cool-500",
          )}
        >
          {task.title}
        </p>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-1">
          {task.completed && (
            <div className="pointer-events-none">
              <LabelPill icon={TaskDone02Icon} label="Done" iconClassName="text-success-500" />
            </div>
          )}

          {/* Due date: single-date quick edit; range is display-only */}
          {isDragOverlay ? (
            task.due_date ? (
              <div className="pointer-events-none">
                <LabelPill icon={Calendar03Icon} label={dueDateButtonLabel} />
              </div>
            ) : null
          ) : (
            <TaskDatePopover
              taskId={task.id}
              dueDate={task.due_date}
              dueDateEnd={task.due_date_end}
              onDateChange={onTaskDateChange}
              side="bottom"
              align="start"
              contentClassName="w-auto overflow-hidden rounded-3xl border border-gray-cool-100 bg-white p-0 shadow-lg"
              stopPropagation
            >
              <span data-slot="popover-trigger">
                <button
                  type="button"
                  className={cn(
                    "pointer-events-auto relative flex items-center gap-0.5 rounded-full bg-alpha-900 pl-1 pr-1.5 py-0.5 cursor-pointer transition-colors hover:bg-alpha-800",
                    task.due_date ? undefined : "text-gray-cool-400",
                  )}
                  aria-label="Change due date"
                >
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={13}
                    strokeWidth={1.5}
                    className={cn(
                      "shrink-0",
                      task.due_date ? "text-gray-cool-400" : "text-gray-cool-300",
                    )}
                  />
                  <span
                    className={cn(
                      "text-text-xs font-medium",
                      task.due_date ? "text-gray-cool-500" : "text-gray-cool-400",
                    )}
                  >
                    {dueDateButtonLabel}
                  </span>
                </button>
              </span>
            </TaskDatePopover>
          )}

          {/* Priority */}
          {isDragOverlay ? (
            priorityConfig ? (
              <div className="pointer-events-none">
                <LabelPill icon={Flag02Icon} label={priorityLabel} iconClassName={priorityConfig.color} />
              </div>
            ) : null
          ) : (
            <PriorityPopover
              taskId={task.id}
              priority={(task.priority ?? "none") as Priority}
              onPriorityChange={(p) => onTaskPriorityChange?.(p)}
            >
              <button
                type="button"
                className="pointer-events-auto relative flex items-center gap-0.5 rounded-full bg-alpha-900 pl-1 pr-1.5 py-0.5 cursor-pointer transition-colors hover:bg-alpha-800"
                aria-label="Change priority"
              >
                <HugeiconsIcon
                  icon={Flag02Icon}
                  size={13}
                  strokeWidth={1.5}
                  className={cn("shrink-0", priorityConfig ? priorityConfig.color : "text-gray-cool-300")}
                />
                <span className="text-text-xs font-medium text-gray-cool-500">{priorityLabel}</span>
              </button>
            </PriorityPopover>
          )}
        </div>

        {/* ── Footer: created date + assignees ──────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <span className="pointer-events-none text-text-xs text-gray-cool-400">{createdAt}</span>

          {isDragOverlay ? (
            displayAssignees.length > 0 && (
              <AvatarGroup>
                {displayAssignees.map((a) => (
                  <Avatar key={a.id} size="xs">
                    {a.avatar_url ? (
                      <AvatarImage src={a.avatar_url} alt="" />
                    ) : (
                      <AvatarAvvvatars value={a.label} />
                    )}
                  </Avatar>
                ))}
                {extraAssigneeCount > 0 && (
                  <Avatar size="xs" className="ring-[1.5px] ring-white">
                    <span className="flex size-full items-center justify-center rounded-full bg-gray-cool-100 text-[10px] font-medium text-gray-cool-500">
                      +{extraAssigneeCount}
                    </span>
                  </Avatar>
                )}
              </AvatarGroup>
            )
          ) : (
            <AssigneePopover
              taskId={task.id}
              members={members}
              assignedIds={assignedIds}
              onAssignedIdsChange={(ids) => onTaskAssigneeChange?.(ids)}
            >
              <button
                type="button"
                className="pointer-events-auto relative flex items-center gap-0 cursor-pointer"
                aria-label="Change assignees"
              >
                {displayAssignees.length > 0 ? (
                  <AvatarGroup>
                    {displayAssignees.map((a) => (
                      <Avatar key={a.id} size="xs" className="ring-[1.5px] ring-white">
                        {a.avatar_url ? (
                          <AvatarImage src={a.avatar_url} alt="" />
                        ) : (
                          <AvatarAvvvatars value={a.label} />
                        )}
                      </Avatar>
                    ))}
                    {extraAssigneeCount > 0 && (
                      <Avatar size="xs" className="ring-[1.5px] ring-white">
                        <span className="flex size-full items-center justify-center rounded-full bg-gray-cool-100 text-[10px] font-medium text-gray-cool-500">
                          +{extraAssigneeCount}
                        </span>
                      </Avatar>
                    )}
                  </AvatarGroup>
                ) : (
                  <span
                    data-slot="avatar"
                    className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-gray-cool-100 text-gray-cool-400 transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600 size-6"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={12} color="currentColor" strokeWidth={2} />
                  </span>
                )}
              </button>
            </AssigneePopover>
          )}
        </div>
      </div>
    </motion.div>
  )
})

export { KanbanCard }
export type { KanbanCardProps }
