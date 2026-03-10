"use client"

import { useState, useTransition } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  Flag02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { updateTaskPriority } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"

export type Priority = "none" | "low" | "medium" | "high" | "urgent"

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "urgent", label: "Urgent", color: "text-red-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-blue-500" },
]

export function getPriorityConfig(priority: string) {
  return PRIORITY_OPTIONS.find((o) => o.value === priority) ?? null
}

type PriorityPickerProps = {
  taskId: string
  priority: Priority
  onPriorityChange?: (priority: Priority) => void
  className?: string
}

export function PriorityPicker({
  taskId,
  priority,
  onPriorityChange,
  className,
}: PriorityPickerProps) {
  const [, startTransition] = useTransition()

  function handleSelect(value: Priority) {
    const prev = priority
    onPriorityChange?.(value)
    if (!taskId) return
    markMutation("tasks")
    startTransition(async () => {
      try {
        await updateTaskPriority(taskId, value)
      } catch {
        onPriorityChange?.(prev)
      }
    })
  }

  return (
    <div
      className={cn("w-[200px]", className)}
    >
      <div className="flex flex-col py-1">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Flag02Icon}
                size={16}
                className={option.color}
                strokeWidth={2}
              />
              <span className="text-text-sm font-medium text-gray-cool-600">
                {option.label}
              </span>
            </div>
            {priority === option.value && (
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

      {priority !== "none" && (
        <div className="border-t border-gray-cool-100 p-2">
          <button
            type="button"
            onClick={() => handleSelect("none")}
            className="w-full rounded-full py-2 text-center text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

type PriorityPopoverProps = {
  taskId: string
  priority: Priority
  onPriorityChange?: (priority: Priority) => void
  children: React.ReactNode
}

export function PriorityPopover({
  taskId,
  priority,
  onPriorityChange,
  children,
}: PriorityPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent onClick={(e) => e.stopPropagation()}>
        <PriorityPicker
          taskId={taskId}
          priority={priority}
          onPriorityChange={(v) => {
            onPriorityChange?.(v)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function PriorityButton({ priority }: { priority: Priority }) {
  const config = getPriorityConfig(priority)
  return (
    <Button variant="ghost" size="xxs">
      <HugeiconsIcon
        icon={Flag02Icon}
        size={16}
        className={config ? config.color : "text-gray-cool-400"}
        strokeWidth={1.5}
      />
      {config ? config.label : "Priority"}
    </Button>
  )
}
