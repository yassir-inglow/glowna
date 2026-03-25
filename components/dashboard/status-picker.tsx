"use client"

import { useState, useTransition } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ProgressRing } from "@/components/ui/progress-ring"
import { updateTaskStatus } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { getColumnRingColor } from "@/hooks/use-project-board-columns"

export type TaskStatusValue = string

type StatusSource = {
  id: string
  label: string
  progress: number
  headerBg?: string
}

const DEFAULT_STATUS_OPTIONS: { value: string; label: string; ringValue: number; ringColor?: string }[] = [
  { value: "todo", label: "To do", ringValue: 0 },
  { value: "in_progress", label: "In progress", ringValue: 50 },
  { value: "done", label: "Done", ringValue: 100 },
]

function humanizeStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function buildStatusOptions(columns?: StatusSource[]) {
  if (!columns || columns.length === 0) return DEFAULT_STATUS_OPTIONS
  return columns.map((c) => ({ value: c.id, label: c.label, ringValue: c.progress, ringColor: c.headerBg ? getColumnRingColor(c.headerBg) : undefined }))
}

export function getStatusConfig(status: string, columns?: StatusSource[]) {
  const v = status || "todo"
  const fromColumns = columns?.find((c) => c.id === v)
  if (fromColumns) return { value: fromColumns.id, label: fromColumns.label, ringValue: fromColumns.progress, ringColor: fromColumns.headerBg ? getColumnRingColor(fromColumns.headerBg) : undefined }
  const def = DEFAULT_STATUS_OPTIONS.find((o) => o.value === v)
  if (def) return def
  return { value: v, label: humanizeStatus(v), ringValue: 50, ringColor: undefined }
}

type StatusPickerProps = {
  taskId: string
  status: TaskStatusValue
  columns?: StatusSource[]
  onStatusChange?: (status: TaskStatusValue) => void
  className?: string
}

export function StatusPicker({
  taskId,
  status,
  columns,
  onStatusChange,
  className,
}: StatusPickerProps) {
  const [, startTransition] = useTransition()
  const options = buildStatusOptions(columns)

  function handleSelect(value: TaskStatusValue) {
    const prev = status
    onStatusChange?.(value)
    if (!taskId) return
    markMutation("tasks")
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, value)
      } catch {
        onStatusChange?.(prev)
      }
    })
  }

  return (
    <div className={cn("w-[200px]", className)}>
      <div className="flex flex-col gap-0.5 p-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className="flex w-full items-center justify-between rounded-full px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ProgressRing value={option.ringValue} size={16} color={option.ringColor} />
              <span className="text-text-sm font-medium text-gray-cool-600">
                {option.label}
              </span>
            </div>
            {status === option.value && (
              <HugeiconsIcon
                icon={Tick01Icon}
                size={18}
                color="var(--color-brand-500)"
                strokeWidth={2}
                className="shrink-0"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

type StatusPopoverProps = {
  taskId: string
  status: TaskStatusValue
  columns?: StatusSource[]
  onStatusChange?: (status: TaskStatusValue) => void
  children: React.ReactNode
}

export function StatusPopover({
  taskId,
  status,
  columns,
  onStatusChange,
  children,
}: StatusPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()}>
        <StatusPicker
          taskId={taskId}
          status={status}
          columns={columns}
          onStatusChange={(v) => {
            onStatusChange?.(v)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function StatusButton({ status }: { status: TaskStatusValue }) {
  const config = getStatusConfig(status)
  return (
    <Button variant="secondary" size="xxs">
      <ProgressRing value={config.ringValue} size={16} color={config.ringColor} />
      {config.label}
    </Button>
  )
}
