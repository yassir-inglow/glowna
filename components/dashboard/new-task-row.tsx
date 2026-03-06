"use client"

import * as React from "react"
import { Folder01Icon, Calendar03Icon, PlusSignIcon, Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Popover as PopoverPrimitive } from "radix-ui"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { createTask } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { PriorityPicker, PriorityButton } from "@/components/dashboard/priority-picker"
import type { Priority } from "@/components/dashboard/priority-picker"
import type { ProjectMember } from "@/lib/data"

type NewTaskRowProps = {
  projectId?: string
  projects?: { id: string; title: string }[]
  members?: ProjectMember[]
  onDone?: () => void
  onCreated?: () => void
}

export function NewTaskRow({ projectId, projects, members, onDone, onCreated }: NewTaskRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [selectedProjectId, setSelectedProjectId] = React.useState(
    projectId ?? projects?.[0]?.id ?? "",
  )
  const [saving, setSaving] = React.useState<string | null>(null)
  const submittedRef = React.useRef(false)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [assigneeOpen, setAssigneeOpen] = React.useState(false)
  const [rangeMode, setRangeMode] = React.useState(false)
  const [dueDate, setDueDate] = React.useState<Date | undefined>()
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()
  const [selectedAssigneeIds, setSelectedAssigneeIds] = React.useState<string[]>([])
  const [priority, setPriority] = React.useState<Priority>("none")
  const [priorityOpen, setPriorityOpen] = React.useState(false)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function reset() {
    if (inputRef.current) inputRef.current.value = ""
    submittedRef.current = false
    setSaving(null)
    setDueDate(undefined)
    setDateRange(undefined)
    setRangeMode(false)
    setCalendarOpen(false)
    setAssigneeOpen(false)
    setSelectedAssigneeIds([])
    setPriority("none")
    setPriorityOpen(false)
  }

  function formatDateForDb(date: Date | undefined): string | null {
    if (!date) return null
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  function handleSubmit() {
    if (submittedRef.current) return
    const title = inputRef.current?.value.trim()
    if (!title || !selectedProjectId) {
      onDone?.()
      return
    }
    submittedRef.current = true
    setSaving(title)
    markMutation("tasks")

    const dueDateVal = rangeMode ? formatDateForDb(dateRange?.from) : formatDateForDb(dueDate)
    const dueDateEndVal = rangeMode ? formatDateForDb(dateRange?.to) : null

    createTask(selectedProjectId, title, {
      dueDate: dueDateVal,
      dueDateEnd: dueDateEndVal,
      assigneeIds: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : undefined,
      priority: priority !== "none" ? priority : undefined,
    })
      .then(() => {
        onCreated?.()
        if (onDone) {
          onDone()
        } else {
          reset()
          requestAnimationFrame(() => inputRef.current?.focus())
        }
      })
      .catch(() => {
        if (onDone) onDone()
        else reset()
      })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      if (onDone) onDone()
      else reset()
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (submittedRef.current) return
    if (calendarOpen || assigneeOpen || priorityOpen) return
    if (rowRef.current?.contains(e.relatedTarget as Node)) return
    const title = inputRef.current?.value.trim()
    if (title && selectedProjectId) {
      handleSubmit()
    } else {
      onDone?.()
    }
  }

  const showProjectPicker = !projectId && projects && projects.length > 0
  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  if (saving) {
    return (
      <div className="relative border-b border-gray-cool-100">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            <Checkbox checked={false} disabled />
            <span className="text-text-md font-medium truncate text-gray-cool-700">
              {saving}
            </span>
          </div>

          {selectedProject && (
            <Button
              variant="secondary"
              size="xxs"
              leadingIcon={Folder01Icon}
              className="pointer-events-none"
            >
              {selectedProject.title}
            </Button>
          )}
        </div>
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-brand-500"
          style={{ animation: "task-save-progress 1.2s ease-out forwards" }}
        />
      </div>
    )
  }

  const dateLabel = rangeMode && dateRange?.from
    ? `${dateRange.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${dateRange.to ? ` – ${dateRange.to.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
    : dueDate
      ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Date"

  return (
    <div ref={rowRef} onBlur={handleBlur} className="flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4">
      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Checkbox checked={false} disabled />
          <input
            ref={inputRef}
            type="text"
            placeholder="Task name…"
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-text-md font-medium text-gray-cool-700 placeholder:text-gray-cool-300 outline-none"
          />
        </div>

        <div className="flex items-center pl-[22px]">
          <PopoverPrimitive.Root open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverPrimitive.Trigger asChild>
              <span data-slot="popover-trigger" className="cursor-pointer">
                <PriorityButton priority={priority} />
              </span>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="start"
                sideOffset={8}
                className="z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                onClick={(e) => e.stopPropagation()}
                onFocusOutside={(e) => e.preventDefault()}
              >
                <PriorityPicker
                  taskId=""
                  priority={priority}
                  onPriorityChange={(p) => {
                    setPriority(p)
                    setPriorityOpen(false)
                  }}
                />
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>

          <PopoverPrimitive.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverPrimitive.Trigger asChild>
              <Button variant="ghost" size="xxs" leadingIcon={Calendar03Icon}>
                {dateLabel}
              </Button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              <PopoverPrimitive.Content
                side="bottom"
                align="start"
                sideOffset={8}
                className="z-50 overflow-clip rounded-2xl border border-gray-cool-100 bg-white shadow-[0px_0px_4px_0px_rgba(93,107,152,0.08),0px_8px_16px_0px_rgba(93,107,152,0.08)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                onClick={(e) => e.stopPropagation()}
                onFocusOutside={(e) => e.preventDefault()}
              >
                {rangeMode ? (
                  <RangeCalendar
                    selected={dateRange}
                    onSelect={setDateRange}
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date)
                      setCalendarOpen(false)
                    }}
                  />
                )}

                <div className="flex flex-col border-t border-gray-cool-100">
                  <div className="px-3 py-2.5">
                    <Switch
                      label="Add an end date"
                      checked={rangeMode}
                      onCheckedChange={() => {
                        if (rangeMode) {
                          setDateRange(undefined)
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
                          setDueDate(undefined)
                          setDateRange(undefined)
                          setCalendarOpen(false)
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
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showProjectPicker && (
          <div className="relative shrink-0">
            <Button
              variant="secondary"
              size="xxs"
              leadingIcon={Folder01Icon}
              className="pointer-events-none"
            >
              {selectedProject?.title ?? "Project"}
            </Button>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <PopoverPrimitive.Root open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button type="button" className="flex items-center cursor-pointer outline-none">
              {selectedAssigneeIds.length > 0 && members ? (
                <AvatarGroup>
                  {selectedAssigneeIds
                    .map((id) => members.find((m) => m.id === id))
                    .filter(Boolean)
                    .map((m) => (
                      <Avatar key={m!.id} size="xs" className="ring-[1.5px] ring-white">
                        {m!.avatar_url ? (
                          <AvatarImage src={m!.avatar_url} alt="" />
                        ) : (
                          <AvatarAvvvatars value={m!.full_name ?? m!.email ?? m!.id} />
                        )}
                      </Avatar>
                    ))}
                </AvatarGroup>
              ) : (
                <span className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-gray-cool-200 bg-gray-cool-100 text-gray-cool-400 transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600 size-6">
                  <HugeiconsIcon icon={PlusSignIcon} size={12} color="currentColor" strokeWidth={2} />
                </span>
              )}
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="bottom"
              align="end"
              sideOffset={8}
              className="z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              onClick={(e) => e.stopPropagation()}
              onFocusOutside={(e) => e.preventDefault()}
            >
              <LocalAssigneePicker
                members={members ?? []}
                selectedIds={selectedAssigneeIds}
                onToggle={(id) => {
                  setSelectedAssigneeIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }}
                onClear={() => setSelectedAssigneeIds([])}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    </div>
  )
}

function LocalAssigneePicker({
  members,
  selectedIds,
  onToggle,
  onClear,
}: {
  members: ProjectMember[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onClear: () => void
}) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    )
  }, [members, search])

  return (
    <div className="w-[240px] overflow-clip rounded-3xl border border-gray-cool-100 bg-white shadow-[0px_0px_4px_0px_rgba(93,107,152,0.08),0px_8px_16px_0px_rgba(93,107,152,0.08)]">
      <div className="border-b border-gray-cool-100 p-2">
        <Input
          size="md"
          leadingIcon={Search01Icon}
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col max-h-[200px] overflow-y-auto scrollbar-hidden">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-text-xs font-medium text-gray-cool-400">
            No members found
          </p>
        ) : (
          filtered.map((member) => {
            const isSelected = selectedIds.includes(member.id)
            const name = member.full_name || member.email?.split("@")[0] || "Unknown"

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggle(member.id)}
                className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
              >
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Avatar size="xs" className="shrink-0">
                    {member.avatar_url ? (
                      <AvatarImage src={member.avatar_url} alt="" />
                    ) : (
                      <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                    )}
                  </Avatar>
                  <span className="truncate text-text-sm font-medium text-gray-cool-500">
                    {name}
                  </span>
                </div>
                {isSelected && (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={18}
                    color="var(--color-brand-500)"
                    strokeWidth={2}
                    className="shrink-0"
                  />
                )}
              </button>
            )
          })
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="border-t border-gray-cool-100 p-2">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-full py-2 text-center text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
