"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"

import { updateTaskDates } from "@/app/actions"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { markMutation } from "@/hooks/mutation-tracker"
import {
  ProjectEditAccessPopover,
  type ProjectEditAccessPrompt,
} from "@/components/dashboard/project-edit-access-popover"

function toDate(value: string | null | undefined) {
  if (!value) return undefined
  return new Date(value + "T00:00:00")
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatDateForDb(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

export function formatTaskDateLabel(
  dueDate: string | null | undefined,
  dueDateEnd: string | null | undefined,
) {
  const start = formatDateLabel(dueDate)
  if (!start) return "Date"
  const end = formatDateLabel(dueDateEnd)
  return end ? `${start} – ${end}` : start
}

type TaskDatePopoverProps = {
  taskId?: string
  dueDate?: string | null
  dueDateEnd?: string | null
  onDateChange?: (dueDate: string | null, dueDateEnd: string | null) => void
  children: React.ReactNode
  side?: React.ComponentProps<typeof PopoverContent>["side"]
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  contentClassName?: string
  stopPropagation?: boolean
  rangeToggleLabel?: string
  disabled?: boolean
  editAccessPrompt?: ProjectEditAccessPrompt
}

export function TaskDatePopover({
  taskId,
  dueDate,
  dueDateEnd,
  onDateChange,
  children,
  side = "bottom",
  align = "start",
  contentClassName,
  stopPropagation = false,
  rangeToggleLabel = "Add an end date",
  disabled = false,
  editAccessPrompt,
}: TaskDatePopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [rangeMode, setRangeMode] = React.useState(!!dueDateEnd)
  const [singleDate, setSingleDate] = React.useState<Date | undefined>(() =>
    dueDate && !dueDateEnd ? toDate(dueDate) : undefined,
  )
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() =>
    dueDate && dueDateEnd
      ? { from: toDate(dueDate), to: toDate(dueDateEnd) }
      : undefined,
  )
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(toDate(dueDate) ?? new Date())

  React.useEffect(() => {
    if (open) return
    setRangeMode(!!dueDateEnd)
    setSingleDate(dueDate && !dueDateEnd ? toDate(dueDate) : undefined)
    setDateRange(
      dueDate && dueDateEnd
        ? { from: toDate(dueDate), to: toDate(dueDateEnd) }
        : undefined,
    )
  }, [open, dueDate, dueDateEnd])

  React.useEffect(() => {
    if (!open) return
    setCalendarMonth(dateRange?.from ?? singleDate ?? toDate(dueDate) ?? new Date())
  }, [open, dateRange?.from, singleDate, dueDate])

  if (disabled) {
    if (editAccessPrompt) {
      return (
        <ProjectEditAccessPopover
          {...editAccessPrompt}
          actionLabel={
            editAccessPrompt.actionLabel ?? (dueDate || dueDateEnd ? "change the dates" : "add dates")
          }
        >
          {children}
        </ProjectEditAccessPopover>
      )
    }
    return <>{children}</>
  }

  function runPersist(
    nextDueDate: string | null,
    nextDueDateEnd: string | null,
    rollback: () => void,
  ) {
    onDateChange?.(nextDueDate, nextDueDateEnd)
    if (!taskId) return

    markMutation("tasks")
    startTransition(async () => {
      try {
        await updateTaskDates(taskId, nextDueDate, nextDueDateEnd)
      } catch {
        rollback()
      }
    })
  }

  function handleSingleSelect(date: Date | undefined) {
    const prevSingle = singleDate
    const prevRange = dateRange
    const prevRangeMode = rangeMode
    const value = date ? formatDateForDb(date) : null

    setSingleDate(date)
    setDateRange(undefined)
    setRangeMode(false)
    setOpen(false)

    runPersist(value, null, () => {
      setSingleDate(prevSingle)
      setDateRange(prevRange)
      setRangeMode(prevRangeMode)
      onDateChange?.(
        prevSingle ? formatDateForDb(prevSingle) : prevRange?.from ? formatDateForDb(prevRange.from) : dueDate ?? null,
        prevRange?.to ? formatDateForDb(prevRange.to) : dueDateEnd ?? null,
      )
    })
  }

  function handleRangeSelect(range: DateRange | undefined) {
    const prevSingle = singleDate
    const prevRange = dateRange
    const prevRangeMode = rangeMode

    setDateRange(range)
    setSingleDate(undefined)
    setRangeMode(true)

    if (!range?.from) return

    const from = formatDateForDb(range.from)
    const to = range.to ? formatDateForDb(range.to) : null

    runPersist(from, to, () => {
      setSingleDate(prevSingle)
      setDateRange(prevRange)
      setRangeMode(prevRangeMode)
      onDateChange?.(
        prevSingle ? formatDateForDb(prevSingle) : prevRange?.from ? formatDateForDb(prevRange.from) : dueDate ?? null,
        prevRange?.to ? formatDateForDb(prevRange.to) : dueDateEnd ?? null,
      )
    })
  }

  function handleToggleRange(checked: boolean) {
    const prevSingle = singleDate
    const prevRange = dateRange
    const prevRangeMode = rangeMode

    if (checked) {
      const nextFrom = singleDate ?? dateRange?.from
      setRangeMode(true)
      setDateRange(nextFrom ? { from: nextFrom, to: dateRange?.to } : undefined)
      setSingleDate(undefined)
      return
    }

    const fallbackDate = dateRange?.from ?? singleDate
    setRangeMode(false)
    setDateRange(undefined)
    setSingleDate(fallbackDate)

    runPersist(fallbackDate ? formatDateForDb(fallbackDate) : null, null, () => {
      setSingleDate(prevSingle)
      setDateRange(prevRange)
      setRangeMode(prevRangeMode)
      onDateChange?.(
        prevSingle ? formatDateForDb(prevSingle) : prevRange?.from ? formatDateForDb(prevRange.from) : dueDate ?? null,
        prevRange?.to ? formatDateForDb(prevRange.to) : dueDateEnd ?? null,
      )
    })
  }

  function handleClear() {
    const prevSingle = singleDate
    const prevRange = dateRange
    const prevRangeMode = rangeMode

    setSingleDate(undefined)
    setDateRange(undefined)
    setRangeMode(false)
    setOpen(false)

    runPersist(null, null, () => {
      setSingleDate(prevSingle)
      setDateRange(prevRange)
      setRangeMode(prevRangeMode)
      onDateChange?.(
        prevSingle ? formatDateForDb(prevSingle) : prevRange?.from ? formatDateForDb(prevRange.from) : dueDate ?? null,
        prevRange?.to ? formatDateForDb(prevRange.to) : dueDateEnd ?? null,
      )
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={contentClassName}
        onPointerDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {rangeMode ? (
          <RangeCalendar
            selected={dateRange}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={handleRangeSelect}
          />
        ) : (
          <Calendar
            mode="single"
            selected={singleDate}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={handleSingleSelect}
          />
        )}

        <div className="flex flex-col border-t border-gray-cool-100">
          <div className="px-3 py-2.5">
            <Switch
              label={rangeToggleLabel}
              checked={rangeMode}
              onCheckedChange={handleToggleRange}
            />
          </div>

          {(singleDate || dateRange?.from) && (
            <div className="border-t border-gray-cool-100 p-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleClear}
                className="w-full rounded-full py-2 text-center text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
