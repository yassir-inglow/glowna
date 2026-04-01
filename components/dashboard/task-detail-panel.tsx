"use client"

import * as React from "react"
import { useState, useRef, useEffect, useTransition, useMemo } from "react"
import { motion } from "motion/react"
import { Calendar03Icon, Flag02Icon, User02Icon, Tag01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { PriorityPopover, getPriorityConfig } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import { StatusPopover, getStatusConfig } from "@/components/dashboard/status-picker"
import { TaskDatePopover, formatTaskDateLabel } from "@/components/dashboard/task-date-popover"
import { ProgressRing } from "@/components/ui/progress-ring"
import { updateTaskTitle, toggleTaskCompleted } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import type { BoardColumnConfig } from "@/hooks/use-project-board-columns"
import type { ProjectMember, TaskWithProject } from "@/lib/data"

type TaskDetailPanelProps = {
  task: TaskWithProject
  members: ProjectMember[]
  boardColumns?: BoardColumnConfig[]
  canWrite?: boolean
  onClose: () => void
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  onTitleChange?: (taskId: string, title: string) => void
  onDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onPriorityChange?: (taskId: string, priority: Priority) => void
  onAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  onStatusChange?: (taskId: string, status: string) => void
}

export function TaskDetailPanel({ task, members, boardColumns, canWrite = true, onTaskToggle, onTitleChange, onDateChange, onPriorityChange, onAssigneeChange, onStatusChange }: TaskDetailPanelProps) {
  const [, startTransition] = useTransition()

  // ── Title ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(task.title)
  const savedTitleRef = useRef(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditingRef = useRef(false)

  // Delay focus until the slide-in animation settles to prevent visual glitch
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [task.id])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!canWrite) return
    isEditingRef.current = true
    const value = e.target.value
    setTitle(value)
    onTitleChange?.(task.id, value)
  }

  function saveTitle() {
    if (!canWrite) return
    isEditingRef.current = false
    const trimmed = title.trim()
    if (!trimmed || trimmed === savedTitleRef.current) {
      setTitle(savedTitleRef.current)
      onTitleChange?.(task.id, savedTitleRef.current)
      return
    }
    savedTitleRef.current = trimmed
    setTitle(trimmed)
    onTitleChange?.(task.id, trimmed)
    markMutation("tasks")
    startTransition(async () => {
      try {
        await updateTaskTitle(task.id, trimmed)
      } catch {
        setTitle(task.title)
        savedTitleRef.current = task.title
        onTitleChange?.(task.id, task.title)
      }
    })
  }

  // ── Completed ──────────────────────────────────────────────────────────────
  const [completed, setCompleted] = React.useOptimistic(task.completed)

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return
    if (!canWrite) return
    startTransition(() => {
      setCompleted(checked)
    })
    if (onTaskToggle) {
      onTaskToggle(task.id, checked).catch(() => {
        startTransition(() => {
          setCompleted(!checked)
        })
      })
    } else {
      markMutation("tasks")
      startTransition(async () => {
        try {
          await toggleTaskCompleted(task.id, checked)
        } catch {
          startTransition(() => {
            setCompleted(!checked)
          })
        }
      })
    }
  }

  // ── Assignees ──────────────────────────────────────────────────────────────
  const taskAssigneeIds = useMemo(
    () => task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[],
    [task.task_assignees],
  )
  const [localAssignedIds, setLocalAssignedIds] = React.useOptimistic(taskAssigneeIds)

  const displayAssignees = useMemo(
    () => localAssignedIds.map((pid) => members.find((m) => m.id === pid)).filter(Boolean) as ProjectMember[],
    [localAssignedIds, members],
  )

  const priorityConfig = getPriorityConfig(task.priority ?? "none")
  const statusConfig = getStatusConfig(task.status ?? "todo", boardColumns)

  const assigneeLabel = displayAssignees.length === 0
    ? "Assignee"
    : displayAssignees.length === 1
      ? (displayAssignees[0].full_name || displayAssignees[0].email?.split("@")[0] || "Assignee")
      : `${displayAssignees.length} assignees`

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute inset-y-2.5 right-2.5 z-10 flex w-[60%] min-[1400px]:w-[40%] flex-col rounded-[26px] border border-gray-cool-100 bg-bg-primary shadow-[-8px_0_32px_-4px_rgba(93,107,152,0.10)] overflow-y-auto scrollbar-hidden"
    >
      <div className="flex flex-col gap-3 px-6 pt-6 pb-5">
        {/* Task name */}
        <div className="flex items-start gap-3">
          <Checkbox checked={completed} onCheckedChange={handleCheckedChange} disabled={!canWrite} className="mt-2" />
          <input
            ref={inputRef}
            value={title}
            onChange={handleTitleChange}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTitle(); inputRef.current?.blur() } }}
            readOnly={!canWrite}
            className="flex-1 bg-transparent text-display-xs font-medium text-gray-cool-800 outline-none placeholder:text-gray-cool-300"
            placeholder="Task name"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date */}
          <TaskDatePopover
            taskId={task.id}
            dueDate={task.due_date}
            dueDateEnd={task.due_date_end}
            onDateChange={(dueDate, dueDateEnd) => onDateChange?.(task.id, dueDate, dueDateEnd)}
            side="bottom"
            align="start"
            disabled={!canWrite}
            editAccessPrompt={
              !canWrite
                ? {
                    projectId: task.project_id,
                    projectName: task.projects?.title,
                    actionLabel: task.due_date || task.due_date_end ? "change the dates" : "add dates",
                  }
                : undefined
            }
          >
            <span data-slot="popover-trigger">
              <Button variant="secondary" size="xxs" leadingIcon={Calendar03Icon}>
                {formatTaskDateLabel(task.due_date, task.due_date_end)}
              </Button>
            </span>
          </TaskDatePopover>

          {/* Assignee */}
          <AssigneePopover
            taskId={task.id}
            members={members}
            assignedIds={localAssignedIds}
            onAssignedIdsChange={(ids) => {
              setLocalAssignedIds(ids)
              onAssigneeChange?.(task.id, ids)
            }}
            disabled={!canWrite}
            editAccessPrompt={
              !canWrite
                ? {
                    projectId: task.project_id,
                    projectName: task.projects?.title,
                    actionLabel: "assign teammates",
                  }
                : undefined
            }
          >
            <Button variant="secondary" size="xxs" leadingIcon={User02Icon}>
              {assigneeLabel}
            </Button>
          </AssigneePopover>

          {/* Status */}
          <StatusPopover
            taskId={task.id}
            status={task.status ?? "todo"}
            columns={boardColumns}
            onStatusChange={(s) => onStatusChange?.(task.id, s)}
            disabled={!canWrite}
            editAccessPrompt={
              !canWrite
                ? {
                    projectId: task.project_id,
                    projectName: task.projects?.title,
                    actionLabel: "change the status",
                  }
                : undefined
            }
          >
            <Button variant="secondary" size="xxs">
              <ProgressRing value={statusConfig.ringValue} size={16} color={statusConfig.ringColor} />
              {statusConfig.label}
            </Button>
          </StatusPopover>

          {/* Priority */}
          <PriorityPopover
            taskId={task.id}
            priority={(task.priority ?? "none") as Priority}
            onPriorityChange={(p) => onPriorityChange?.(task.id, p)}
            disabled={!canWrite}
            editAccessPrompt={
              !canWrite
                ? {
                    projectId: task.project_id,
                    projectName: task.projects?.title,
                    actionLabel: "change the priority",
                  }
                : undefined
            }
          >
            <Button variant="secondary" size="xxs" leadingIcon={Flag02Icon}>
              {priorityConfig ? priorityConfig.label : "Priority"}
            </Button>
          </PriorityPopover>

          {/* Label (placeholder) */}
          <Button variant="secondary" size="xxs" leadingIcon={Tag01Icon}>
            Label
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-cool-100 mx-6" />

      {/* Description */}
      <div className="flex-1 px-6 py-4">
        <textarea
          placeholder="Description"
          readOnly={!canWrite}
          className="w-full min-h-[120px] resize-none bg-transparent text-text-sm text-gray-cool-600 outline-none placeholder:text-gray-cool-300"
        />
      </div>
    </motion.div>
  )
}
