"use client"

import { useState, useEffect, useOptimistic, useRef, useTransition, useMemo } from "react"

import {
  Square01Icon,
  Add01Icon,
  Tag02Icon,
  BubbleChatIcon,
  Folder01Icon,
  PlusSignIcon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage, AvatarSkeleton } from "@/components/ui/avatar"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { PriorityPopover, PriorityButton } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import { TaskDatePopover, formatTaskDateLabel } from "@/components/dashboard/task-date-popover"
import { toggleTaskCompleted } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import type { ProjectMember } from "@/lib/data"

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

const PROJECT_COLORS = [
  "#FF004A", "#6366F1", "#3B82F6", "#10B981",
  "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6",
]

function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function ProjectBadge({ projectId, projectName }: { projectId: string; projectName: string }) {
  const color = PROJECT_COLORS[hashCode(projectId) % PROJECT_COLORS.length]

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-alpha-900 py-px pl-px pr-2.5">
      <span
        className="relative size-6 shrink-0 overflow-hidden rounded-full"
        style={{ backgroundColor: color }}
      >
        <span className="flex size-full items-center justify-center">
          <HugeiconsIcon icon={Folder01Icon} size={14} color="white" strokeWidth={1.5} />
        </span>
        <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0px_5.4px_10.8px_0px_rgba(255,255,255,0.4)]" />
      </span>
      <span className="text-text-xs font-medium text-gray-cool-500 whitespace-nowrap">
        {projectName}
      </span>
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TaskRowSkeleton() {
  return (
    <div className="flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-[18px] rounded-[5px]" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="flex items-center gap-1 pl-[22px]">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <AvatarSkeleton size="xs" />
      </div>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

export type TaskRowAvatar = {
  src?: string
  fallback: string
  value?: string
}

export type TaskRowProps = {
  id?: string
  title?: string
  completed?: boolean
  canWrite?: boolean
  onCompletedChange?: (completed: boolean) => void | Promise<void>
  showAddons?: boolean
  subTaskCurrent?: number
  subTaskTotal?: number
  addText?: string
  labelText?: string
  commentCount?: number
  projectId?: string
  projectName?: string
  avatars?: TaskRowAvatar[]
  selected?: boolean
  /** Project members for the assignee popover. When provided with `id`, the avatar area becomes interactive. */
  members?: ProjectMember[]
  /** Profile IDs of current assignees — used together with `members`. */
  assignedIds?: string[]
  /** Callback after an assignee is added/removed/cleared. */
  onAssigneeChange?: () => void
  /** Due date stored in the DB (ISO date string). */
  initialDueDate?: string | null
  /** End of date range stored in the DB (ISO date string). */
  initialDueDateEnd?: string | null
  /** Task priority level. */
  priority?: Priority
  /** Callback when priority is changed. */
  onPriorityChange?: (priority: Priority) => void
  /** Callback when due date is changed. */
  onDateChange?: (dueDate: string | null, dueDateEnd: string | null) => void
  /** Called when the row itself is clicked (not interactive children). */
  onSelect?: () => void
}

export function TaskRow({
  id,
  title = "Project name",
  completed = false,
  canWrite = true,
  onCompletedChange,
  showAddons = true,
  subTaskCurrent = 1,
  subTaskTotal = 5,
  addText = "Text",
  labelText = "Label",
  commentCount = 2,
  projectId,
  projectName,
  avatars = [],
  selected = false,
  members,
  assignedIds,
  onAssigneeChange,
  initialDueDate,
  initialDueDateEnd,
  priority = "none",
  onPriorityChange,
  onDateChange,
  onSelect,
}: TaskRowProps) {
  const [, startTransition] = useTransition()
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed)
  const [contextOpen, setContextOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  // ── Local assignee state (optimistic + synced from parent for realtime) ─────
  const [localAssignedIds, setLocalAssignedIds] = useOptimistic(assignedIds ?? [])

  const displayAvatars = useMemo<TaskRowAvatar[]>(() => {
    if (!members?.length) return avatars
    return localAssignedIds
      .map((pid) => members.find((m) => m.id === pid))
      .filter((m): m is ProjectMember => !!m)
      .map((m) => ({
        src: m.avatar_url ?? undefined,
        fallback: initials(m.full_name ?? m.email),
        value: m.full_name ?? m.email ?? undefined,
      }))
  }, [localAssignedIds, members, avatars])

  useEffect(() => {
    if (!contextOpen) return
    function dismiss() {
      setContextOpen(false)
    }
    const raf = requestAnimationFrame(() => {
      window.addEventListener("click", dismiss, { once: true })
      window.addEventListener("contextmenu", dismiss, { once: true })
      window.addEventListener("scroll", dismiss, { once: true, capture: true })
      window.addEventListener("keydown", dismiss, { once: true })
    })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("click", dismiss)
      window.removeEventListener("contextmenu", dismiss)
      window.removeEventListener("scroll", dismiss, { capture: true })
      window.removeEventListener("keydown", dismiss)
    }
  }, [contextOpen])

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return
    if (!canWrite) return

    if (onCompletedChange) {
      startTransition(async () => {
        setOptimisticCompleted(checked)
        try {
          await onCompletedChange(checked)
        } catch {
          setOptimisticCompleted(!checked)
        }
      })
      return
    }

    if (!id) return

    markMutation("tasks")
    startTransition(async () => {
      setOptimisticCompleted(checked)
      try {
        await toggleTaskCompleted(id, checked)
      } catch {
        setOptimisticCompleted(!checked)
      }
    })
  }

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSelect) return
    const target = e.target as HTMLElement
    if (target.closest("button, input, label, [role=checkbox], [data-slot=popover-trigger], [data-radix-popper-content-wrapper]")) return
    e.stopPropagation()
    onSelect()
  }

  return (
    <div
      ref={rowRef}
      onContextMenu={() => setContextOpen(true)}
      onClick={handleRowClick}
      className={cn(
        "relative flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4 transition-colors hover:bg-alpha-900",
        onSelect && "cursor-pointer",
        selected ? "bg-alpha-900/50" : contextOpen && "bg-alpha-900",
      )}
    >
      {selected && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-brand-500" />
      )}
      {/* Left: task info */}
      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={optimisticCompleted}
            onCheckedChange={handleCheckedChange}
            disabled={!canWrite}
          />
          <span
            className="text-text-md font-medium truncate text-gray-cool-700"
          >
            {title}
          </span>
        </div>

        {(showAddons || initialDueDate || initialDueDateEnd || priority !== "none") && (
        <div className="flex items-center pl-[22px]">
          {showAddons && (
            <>
              <Button variant="ghost" size="xxs" leadingIcon={Square01Icon}>
                {`${subTaskCurrent}/${subTaskTotal}`}
              </Button>
              <Button variant="ghost" size="xxs" leadingIcon={Add01Icon}>
                {addText}
              </Button>
              <Button variant="ghost" size="xxs" leadingIcon={Tag02Icon}>
                {labelText}
              </Button>
              <Button variant="ghost" size="xxs" leadingIcon={BubbleChatIcon}>
                {String(commentCount)}
              </Button>
            </>
          )}

          {id && (
            <PriorityPopover
              taskId={id}
              priority={priority}
              onPriorityChange={onPriorityChange}
              disabled={!canWrite}
              editAccessPrompt={
                !canWrite && projectId
                  ? {
                      projectId,
                      projectName,
                      actionLabel: "change the priority",
                    }
                  : undefined
              }
            >
              <span data-slot="popover-trigger">
                <PriorityButton priority={priority} />
              </span>
            </PriorityPopover>
          )}

          {id && (
            <TaskDatePopover
              taskId={id}
              dueDate={initialDueDate}
              dueDateEnd={initialDueDateEnd}
              onDateChange={onDateChange}
              side="bottom"
              align="start"
              stopPropagation
              disabled={!canWrite}
              editAccessPrompt={
                !canWrite && projectId
                  ? {
                      projectId,
                      projectName,
                      actionLabel: initialDueDate || initialDueDateEnd ? "change the dates" : "add dates",
                    }
                  : undefined
              }
            >
              <span data-slot="popover-trigger">
              <Button variant="ghost" size="xxs" leadingIcon={Calendar03Icon}>
                {formatTaskDateLabel(initialDueDate, initialDueDateEnd)}
              </Button>
              </span>
            </TaskDatePopover>
          )}
        </div>
      )}
      </div>

      {/* Right: project badge + avatars */}
      <div className="flex items-center gap-2 shrink-0">
        {projectId && projectName && (
          <ProjectBadge projectId={projectId} projectName={projectName} />
        )}

        {id && members ? (
          <AssigneePopover
            taskId={id}
            members={members}
            assignedIds={localAssignedIds}
            onChanged={onAssigneeChange}
            onAssignedIdsChange={(ids) => {
              setLocalAssignedIds(ids)
            }}
            disabled={!canWrite}
            editAccessPrompt={
              !canWrite && projectId
                ? {
                    projectId,
                    projectName,
                    actionLabel: "assign teammates",
                  }
                : undefined
            }
          >
            <button type="button" className={cn("flex items-center gap-0", canWrite && "cursor-pointer")}>
              {displayAvatars.length > 0 ? (
                <AvatarGroup>
                  {displayAvatars.map((av, i) => (
                    <Avatar key={i} size="xs" className="ring-[1.5px] ring-white">
                      {av.src ? (
                        <AvatarImage src={av.src} alt="" />
                      ) : (
                        <AvatarAvvvatars value={av.value ?? av.fallback} />
                      )}
                    </Avatar>
                  ))}
                </AvatarGroup>
              ) : (
                <span
                  data-slot="avatar"
                  className={cn(
                    "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-cool-100 text-gray-cool-400",
                    canWrite && "transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600",
                  )}
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={12} color="currentColor" strokeWidth={2} />
                </span>
              )}
            </button>
          </AssigneePopover>
        ) : avatars.length > 0 ? (
          <AvatarGroup>
            {avatars.map((av, i) => (
              <Avatar key={i} size="xs" className="ring-[1.5px] ring-white">
                {av.src ? (
                  <AvatarImage src={av.src} alt="" />
                ) : (
                  <AvatarAvvvatars value={av.value ?? av.fallback} />
                )}
              </Avatar>
            ))}
          </AvatarGroup>
        ) : null}
      </div>
    </div>
  )
}
