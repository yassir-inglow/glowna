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

export type TaskStatusValue = "todo" | "in_progress" | "done"

const STATUS_OPTIONS: {
  value: TaskStatusValue
  label: string
  ringValue: number
  color: string
}[] = [
  { value: "todo", label: "Blocked", ringValue: 0, color: "text-gray-cool-500" },
  { value: "in_progress", label: "Pending", ringValue: 75, color: "text-purple-500" },
  { value: "done", label: "Approved", ringValue: 100, color: "text-success-500" },
]

export function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]
}

type StatusPickerProps = {
  taskId: string
  status: TaskStatusValue
  onStatusChange?: (status: TaskStatusValue) => void
  className?: string
}

export function StatusPicker({
  taskId,
  status,
  onStatusChange,
  className,
}: StatusPickerProps) {
  const [, startTransition] = useTransition()

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
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className="flex w-full items-center justify-between rounded-full px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ProgressRing value={option.ringValue} size={16} />
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
  onStatusChange?: (status: TaskStatusValue) => void
  children: React.ReactNode
}

export function StatusPopover({
  taskId,
  status,
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
      <ProgressRing value={config.ringValue} size={16} />
      {config.label}
    </Button>
  )
}
