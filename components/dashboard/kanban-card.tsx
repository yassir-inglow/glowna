"use client"

import * as React from "react"
import { motion } from "motion/react"
import { useSortable } from "@dnd-kit/sortable"
import {
  Flag02Icon,
  Calendar03Icon,
  TaskDone02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { getPriorityConfig } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
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
  onCompletedChange?: (completed: boolean) => void
  onPriorityChange?: (priority: Priority) => void
  /** Disable layout animation for this card. */
  layoutEnabled?: boolean
  /** Hide the card briefly after drop to avoid double-visibility with overlay. */
  hideWhileDrop?: boolean
  isDragOverlay?: boolean
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const KanbanCard = React.memo(function KanbanCard({
  task,
  selected,
  onSelect,
  layoutEnabled = true,
  hideWhileDrop = false,
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
    opacity: hideWhileDrop ? 0 : isDragging ? 0.5 : 1,
    pointerEvents: hideWhileDrop ? "none" : undefined,
  }

  const priorityConfig = getPriorityConfig(task.priority)
  const assignees = task.task_assignees
  const dueDate = formatDate(task.due_date)
  const createdAt = formatCreatedAt(task.created_at)
  const hasLabels = !!priorityConfig || !!dueDate || task.completed
  const enableLayout = layoutEnabled && !isDragOverlay && !hideWhileDrop

  return (
    <motion.div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      // Smooth layout animation when cards shift after a drop
      layout={enableLayout}
      transition={enableLayout ? { layout: { type: "spring", damping: 28, stiffness: 260 } } : undefined}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      className={cn(
        "flex cursor-grab flex-col gap-2.5 rounded-2xl border bg-white p-3 shadow-xs transition-shadow transition-opacity",
        "hover:shadow-sm active:cursor-grabbing",
        selected ? "border-brand-500 ring-1 ring-brand-500/20" : "border-gray-cool-100",
        isDragOverlay && "shadow-lg",
      )}
    >
      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <p
        className={cn(
          "text-text-sm font-medium leading-snug",
          task.completed
            ? "text-gray-cool-400 line-through"
            : "text-gray-cool-500",
        )}
      >
        {task.title}
      </p>

      {/* ── Label pills ────────────────────────────────────────────────────── */}
      {hasLabels && (
        <div className="flex flex-wrap items-center gap-1">
          {task.completed && (
            <LabelPill
              icon={TaskDone02Icon}
              label="Done"
              iconClassName="text-success-500"
            />
          )}
          {priorityConfig && (
            <LabelPill
              icon={Flag02Icon}
              label={priorityConfig.label}
              iconClassName={priorityConfig.color}
            />
          )}
          {dueDate && (
            <LabelPill icon={Calendar03Icon} label={dueDate} />
          )}
        </div>
      )}

      {/* ── Footer: created date + avatars ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-xs text-gray-cool-400">
          {createdAt}
        </span>

        {assignees.length > 0 && (
          <AvatarGroup>
            {assignees.slice(0, 3).map((a) => (
              <Avatar key={a.profiles?.id} size="xs">
                {a.profiles?.avatar_url ? (
                  <AvatarImage src={a.profiles.avatar_url} alt="" />
                ) : (
                  <AvatarAvvvatars
                    value={a.profiles?.full_name ?? a.profiles?.email ?? ""}
                  />
                )}
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <span className="text-text-xs text-gray-cool-400">
                +{assignees.length - 3}
              </span>
            )}
          </AvatarGroup>
        )}
      </div>
    </motion.div>
  )
})

export { KanbanCard }
export type { KanbanCardProps }
