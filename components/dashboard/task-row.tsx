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
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage, AvatarSkeleton } from "@/components/ui/avatar"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { AssigneePopover } from "@/components/dashboard/assignee-popover"
import { PriorityPopover, PriorityButton } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import { toggleTaskCompleted, updateTaskDates } from "@/app/actions"
import { markMutation, hasRecentLocalMutation } from "@/hooks/mutation-tracker"
import type { ProjectMember } from "@/lib/data"

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.includes("@") ? [name.split("@")[0]] : name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
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
  onCompletedChange?: (completed: boolean) => void | Promise<void>
  showAddons?: boolean
  subTaskCurrent?: number
  subTaskTotal?: number
  addText?: string
  labelText?: string
  commentCount?: number
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
  /** Called when the row itself is clicked (not interactive children). */
  onSelect?: () => void
}

export function TaskRow({
  id,
  title = "Project name",
  completed = false,
  onCompletedChange,
  showAddons = true,
  subTaskCurrent = 1,
  subTaskTotal = 5,
  addText = "Text",
  labelText = "Label",
  commentCount = 2,
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
  onSelect,
}: TaskRowProps) {
  const [, startTransition] = useTransition()
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed)
  const [contextOpen, setContextOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeMode, setRangeMode] = useState(!!initialDueDateEnd)
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    if (initialDueDate && !initialDueDateEnd) return new Date(initialDueDate + "T00:00:00")
    return undefined
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialDueDate && initialDueDateEnd) {
      return {
        from: new Date(initialDueDate + "T00:00:00"),
        to: new Date(initialDueDateEnd + "T00:00:00"),
      }
    }
    return undefined
  })
  const rowRef = useRef<HTMLDivElement>(null)
  const prevDueDateProp = useRef(initialDueDate)
  const prevDueDateEndProp = useRef(initialDueDateEnd)

  useEffect(() => {
    if (prevDueDateProp.current === initialDueDate && prevDueDateEndProp.current === initialDueDateEnd) return
    prevDueDateProp.current = initialDueDate
    prevDueDateEndProp.current = initialDueDateEnd

    if (initialDueDate && initialDueDateEnd) {
      setRangeMode(true)
      setDueDate(undefined)
      setDateRange({
        from: new Date(initialDueDate + "T00:00:00"),
        to: new Date(initialDueDateEnd + "T00:00:00"),
      })
    } else if (initialDueDate) {
      setRangeMode(false)
      setDueDate(new Date(initialDueDate + "T00:00:00"))
      setDateRange(undefined)
    } else {
      setRangeMode(false)
      setDueDate(undefined)
      setDateRange(undefined)
    }
  }, [initialDueDate, initialDueDateEnd])

  // ── Local assignee state (optimistic + synced from parent for realtime) ─────
  const [localAssignedIds, setLocalAssignedIds] = useState<string[]>(assignedIds ?? [])
  const prevAssignedRef = useRef(assignedIds)
  const selfMutatedRef = useRef(false)

  useEffect(() => {
    const prev = prevAssignedRef.current ?? []
    const next = assignedIds ?? []
    prevAssignedRef.current = assignedIds

    if (prev.length === next.length && prev.every((id, i) => id === next[i])) return
    if (selfMutatedRef.current && hasRecentLocalMutation("task_assignees")) return
    selfMutatedRef.current = false
    setLocalAssignedIds(next)
  }, [assignedIds])

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

  function formatDateForDb(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

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
          />
          <span
            className="text-text-md font-medium truncate text-gray-cool-700"
          >
            {title}
          </span>
        </div>

        {(showAddons || dueDate || dateRange?.from || priority !== "none") && (
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
            >
              <span data-slot="popover-trigger">
                <PriorityButton priority={priority} />
              </span>
            </PriorityPopover>
          )}

          <PopoverPrimitive.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverPrimitive.Trigger asChild>
              <Button variant="ghost" size="xxs" leadingIcon={Calendar03Icon}>
                {rangeMode && dateRange?.from
                  ? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${dateRange.to ? ` – ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
                  : dueDate
                    ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "Date"}
              </Button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="start"
                sideOffset={8}
                className="z-50 overflow-clip rounded-2xl border border-gray-cool-100 bg-white shadow-[0px_0px_4px_0px_rgba(93,107,152,0.08),0px_8px_16px_0px_rgba(93,107,152,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                onClick={(e) => e.stopPropagation()}
              >
                {rangeMode ? (
                  <RangeCalendar
                    selected={dateRange}
                    onSelect={(range) => {
                      const prev = dateRange
                      setDateRange(range)
                      if (id && range?.from) {
                        const from = formatDateForDb(range.from)
                        const to = range.to ? formatDateForDb(range.to) : null
                        markMutation("tasks")
                        startTransition(async () => {
                          try {
                            await updateTaskDates(id, from, to)
                          } catch {
                            setDateRange(prev)
                          }
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
                      if (id) {
                        const val = date ? formatDateForDb(date) : null
                        markMutation("tasks")
                        startTransition(async () => {
                          try {
                            await updateTaskDates(id, val, null)
                          } catch {
                            setDueDate(prev)
                          }
                        })
                      }
                    }}
                  />
                )}

                <div className="flex flex-col border-t border-gray-cool-100">
                  <div className="px-3 py-2.5">
                    <Switch
                      label="Add an end date"
                      checked={rangeMode}
                      onCheckedChange={(checked) => {
                        if (rangeMode) {
                          const prevRange = dateRange
                          setDateRange(undefined)
                          if (id) {
                            markMutation("tasks")
                            startTransition(async () => {
                              try {
                                await updateTaskDates(id, dueDate ? formatDateForDb(dueDate) : null, null)
                              } catch {
                                setDateRange(prevRange)
                                setRangeMode(true)
                                return
                              }
                            })
                          }
                        } else if (dueDate) {
                          setDateRange({ from: dueDate, to: undefined })
                          setDueDate(undefined)
                        }
                        setRangeMode(!rangeMode)
                      }}
                    />
                  </div>

                  {(dueDate || dateRange?.from) && (
                    <div className="border-t border-gray-cool-100 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prevDate = dueDate
                          const prevRange = dateRange
                          const prevRangeMode = rangeMode
                          setDueDate(undefined)
                          setDateRange(undefined)
                          setRangeMode(false)
                          setCalendarOpen(false)
                          if (id) {
                            markMutation("tasks")
                            startTransition(async () => {
                              try {
                                await updateTaskDates(id, null, null)
                              } catch {
                                setDueDate(prevDate)
                                setDateRange(prevRange)
                                setRangeMode(prevRangeMode)
                              }
                            })
                          }
                        }}
                        className="w-full rounded-full py-2 text-center text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-900 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        </div>
        )}
      </div>

      {/* Right: project badge + avatars */}
      <div className="flex items-center gap-2 shrink-0">
        {projectName && (
          <Button variant="secondary" size="xxs" leadingIcon={Folder01Icon}>
            {projectName}
          </Button>
        )}

        {id && members ? (
          <AssigneePopover
            taskId={id}
            members={members}
            assignedIds={localAssignedIds}
            onChanged={onAssigneeChange}
            onAssignedIdsChange={(ids) => {
              selfMutatedRef.current = true
              setLocalAssignedIds(ids)
            }}
          >
            <button type="button" className="flex items-center gap-0 cursor-pointer">
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
                  className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-gray-cool-200 bg-gray-cool-100 text-gray-cool-400 transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600 size-6"
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
