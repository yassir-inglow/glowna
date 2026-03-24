"use client"

import * as React from "react"
import { useState, useRef, useEffect, useTransition, useMemo } from "react"
import { motion } from "motion/react"
import { Calendar03Icon, Flag02Icon, User02Icon, Tag01Icon } from "@hugeicons/core-free-icons"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { PriorityPopover, getPriorityConfig } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import { StatusPopover, getStatusConfig } from "@/components/dashboard/status-picker"
import type { TaskStatusValue } from "@/components/dashboard/status-picker"
import { ProgressRing } from "@/components/ui/progress-ring"
import { updateTaskTitle, updateTaskDates, toggleTaskCompleted } from "@/app/actions"
import { markMutation, hasRecentLocalMutation } from "@/hooks/mutation-tracker"
import type { ProjectMember, TaskWithProject } from "@/lib/data"
import type { DateRange } from "react-day-picker"

type TaskDetailPanelProps = {
  task: TaskWithProject
  members: ProjectMember[]
  onClose: () => void
  onTaskToggle?: (taskId: string, completed: boolean) => Promise<void>
  onTitleChange?: (taskId: string, title: string) => void
  onDateChange?: (taskId: string, dueDate: string | null, dueDateEnd: string | null) => void
  onPriorityChange?: (taskId: string, priority: Priority) => void
  onAssigneeChange?: (taskId: string, assignedIds: string[]) => void
  onStatusChange?: (taskId: string, status: string) => void
}

export function TaskDetailPanel({ task, members, onClose, onTaskToggle, onTitleChange, onDateChange, onPriorityChange, onAssigneeChange, onStatusChange }: TaskDetailPanelProps) {
  const [, startTransition] = useTransition()

  // ── Title ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(task.title)
  const savedTitleRef = useRef(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditingRef = useRef(false)

  // Reset all local state when switching to a different task (stable key means no remount)
  const taskIdRef = useRef(task.id)
  useEffect(() => {
    if (taskIdRef.current === task.id) return
    taskIdRef.current = task.id
    isEditingRef.current = false
    setTitle(task.title)
    savedTitleRef.current = task.title
    setCompleted(task.completed)
    setCalendarOpen(false)
    setRangeMode(!!task.due_date_end)
    setDueDate(task.due_date && !task.due_date_end ? new Date(task.due_date + "T00:00:00") : undefined)
    setDateRange(
      task.due_date && task.due_date_end
        ? { from: new Date(task.due_date + "T00:00:00"), to: new Date(task.due_date_end + "T00:00:00") }
        : undefined,
    )
    const ids = task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[]
    setLocalAssignedIds(ids)
  }, [task])

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

  // Sync from parent only when an external source updates the title (not our own edits)
  useEffect(() => {
    if (!isEditingRef.current && task.title !== savedTitleRef.current) {
      savedTitleRef.current = task.title
      setTitle(task.title)
    }
  }, [task.title])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    isEditingRef.current = true
    const value = e.target.value
    setTitle(value)
    onTitleChange?.(task.id, value)
  }

  function saveTitle() {
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
  const [completed, setCompleted] = useState(task.completed)

  useEffect(() => { setCompleted(task.completed) }, [task.completed])

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return
    setCompleted(checked)
    if (onTaskToggle) {
      onTaskToggle(task.id, checked).catch(() => setCompleted(!checked))
    } else {
      markMutation("tasks")
      startTransition(async () => {
        try {
          await toggleTaskCompleted(task.id, checked)
        } catch {
          setCompleted(!checked)
        }
      })
    }
  }

  // ── Due date ───────────────────────────────────────────────────────────────
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeMode, setRangeMode] = useState(!!task.due_date_end)
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    if (task.due_date && !task.due_date_end) return new Date(task.due_date + "T00:00:00")
    return undefined
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (task.due_date && task.due_date_end) {
      return { from: new Date(task.due_date + "T00:00:00"), to: new Date(task.due_date_end + "T00:00:00") }
    }
    return undefined
  })

  function fmtDb(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  // ── Assignees ──────────────────────────────────────────────────────────────
  const [localAssignedIds, setLocalAssignedIds] = useState<string[]>(
    task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[],
  )

  useEffect(() => {
    const next = task.task_assignees.map((a) => a.profiles?.id).filter(Boolean) as string[]
    if (hasRecentLocalMutation("task_assignees")) return
    setLocalAssignedIds(next)
  }, [task.task_assignees])

  const displayAssignees = useMemo(
    () => localAssignedIds.map((pid) => members.find((m) => m.id === pid)).filter(Boolean) as ProjectMember[],
    [localAssignedIds, members],
  )

  const dateLabel = rangeMode && dateRange?.from
    ? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${dateRange.to ? ` – ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
    : dueDate
      ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Date"

  const priorityConfig = getPriorityConfig(task.priority ?? "none")
  const statusConfig = getStatusConfig(task.status ?? "todo")

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
          <Checkbox checked={completed} onCheckedChange={handleCheckedChange} className="mt-2" />
          <input
            ref={inputRef}
            value={title}
            onChange={handleTitleChange}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTitle(); inputRef.current?.blur() } }}
            className="flex-1 bg-transparent text-display-xs font-medium text-gray-cool-800 outline-none placeholder:text-gray-cool-300"
            placeholder="Task name"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="xxs" leadingIcon={Calendar03Icon}>
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom">
                {rangeMode ? (
                  <RangeCalendar
                    selected={dateRange}
                    onSelect={(range) => {
                      const prev = dateRange
                      setDateRange(range)
                      if (range?.from) {
                        const from = fmtDb(range.from)
                        const to = range.to ? fmtDb(range.to) : null
                        onDateChange?.(task.id, from, to)
                        markMutation("tasks")
                        startTransition(async () => {
                          try { await updateTaskDates(task.id, from, to) }
                          catch { setDateRange(prev) }
                        })
                      }
                    }}
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      const prev = dueDate
                      setDueDate(date)
                      setCalendarOpen(false)
                      const val = date ? fmtDb(date) : null
                      onDateChange?.(task.id, val, null)
                      markMutation("tasks")
                      startTransition(async () => {
                        try { await updateTaskDates(task.id, val, null) }
                        catch { setDueDate(prev) }
                      })
                    }}
                  />
                )}
                <div className="border-t border-gray-cool-100 px-3 py-2.5">
                  <Switch
                    label="End date"
                    checked={rangeMode}
                    onCheckedChange={() => {
                      if (rangeMode) {
                        const prevRange = dateRange
                        setDateRange(undefined)
                        onDateChange?.(task.id, dueDate ? fmtDb(dueDate) : null, null)
                        markMutation("tasks")
                        startTransition(async () => {
                          try { await updateTaskDates(task.id, dueDate ? fmtDb(dueDate) : null, null) }
                          catch { setDateRange(prevRange); setRangeMode(true) }
                        })
                      } else if (dueDate) {
                        setDateRange({ from: dueDate, to: undefined })
                        setDueDate(undefined)
                      }
                      setRangeMode(!rangeMode)
                    }}
                  />
                </div>
            </PopoverContent>
          </Popover>

          {/* Assignee */}
          <AssigneePopover
            taskId={task.id}
            members={members}
            assignedIds={localAssignedIds}
            onAssignedIdsChange={(ids) => {
              setLocalAssignedIds(ids)
              onAssigneeChange?.(task.id, ids)
            }}
          >
            <Button variant="secondary" size="xxs" leadingIcon={User02Icon}>
              {assigneeLabel}
            </Button>
          </AssigneePopover>

          {/* Status */}
          <StatusPopover
            taskId={task.id}
            status={(task.status ?? "todo") as TaskStatusValue}
            onStatusChange={(s) => onStatusChange?.(task.id, s)}
          >
            <Button variant="secondary" size="xxs">
              <ProgressRing value={statusConfig.ringValue} size={16} />
              {statusConfig.label}
            </Button>
          </StatusPopover>

          {/* Priority */}
          <PriorityPopover
            taskId={task.id}
            priority={(task.priority ?? "none") as Priority}
            onPriorityChange={(p) => onPriorityChange?.(task.id, p)}
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
          className="w-full min-h-[120px] resize-none bg-transparent text-text-sm text-gray-cool-600 outline-none placeholder:text-gray-cool-300"
        />
      </div>
    </motion.div>
  )
}
