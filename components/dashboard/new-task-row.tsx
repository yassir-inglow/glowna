"use client"

import * as React from "react"
import { Calendar03Icon, Folder01Icon, PlusSignIcon, Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Calendar, RangeCalendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { createTask } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import { PriorityPicker, PriorityButton } from "@/components/dashboard/priority-picker"
import { ProjectBadge } from "@/components/dashboard/task-row"
import type { Priority } from "@/components/dashboard/priority-picker"
import type { ProjectMember } from "@/lib/data"

function NewTaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <circle cx="11" cy="11" r="10.75" fill="var(--color-gray-cool-50)"/>
      <path d="M10.9991 21.0011C5.47567 21.0011 0.998047 16.5235 0.998047 11.0001C0.998047 5.47665 5.47567 0.999023 10.9991 0.999023C16.3199 0.999023 20.6702 5.15416 20.9823 10.3966" stroke="var(--color-gray-cool-200)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.6072 11.7754V21.2342" stroke="var(--color-gray-cool-200)" strokeWidth="1.50548" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21.3366 16.5049H11.8777" stroke="var(--color-gray-cool-200)" strokeWidth="1.50548" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

type NewTaskRowProps = {
  projectId?: string
  projects?: { id: string; title: string; members: ProjectMember[] }[]
  members?: ProjectMember[]
  onDone?: () => void
  onCreated?: () => void
  autoFocus?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  canCreate?: boolean
}

export function NewTaskRow({ projectId, projects, members, onDone, onCreated, autoFocus = true, inputRef: inputRefProp, canCreate = true }: NewTaskRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const internalInputRef = React.useRef<HTMLInputElement>(null)
  const inputRef = inputRefProp ?? internalInputRef
  const [selectedProjectId, setSelectedProjectId] = React.useState(
    projectId ?? "",
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
  const [projectPickerOpen, setProjectPickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (!autoFocus) return
    inputRef.current?.focus()
  }, [autoFocus, inputRef])

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
    setProjectPickerOpen(false)
    if (!projectId) setSelectedProjectId("")
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
    if (calendarOpen || assigneeOpen || priorityOpen || projectPickerOpen) return
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

  const projectMembers = React.useMemo(() => {
    if (members) return members
    return projects?.find((p) => p.id === selectedProjectId)?.members ?? []
  }, [members, projects, selectedProjectId])

  if (!canCreate) {
    return null
  }

  if (saving) {
    return (
      <div className="relative border-b border-gray-cool-100">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            <NewTaskIcon />
            <span className="text-text-md font-medium truncate text-gray-cool-700">
              {saving}
            </span>
          </div>

          {selectedProject && (
            <ProjectBadge projectId={selectedProject.id} projectName={selectedProject.title} />
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
          <NewTaskIcon />
          <input
            ref={inputRef}
            type="text"
            placeholder="Task name…"
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 bg-transparent text-text-md font-medium text-gray-cool-700 placeholder:text-gray-cool-300 outline-none"
          />
        </div>

        <div className="flex items-center pl-[22px]">
          <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger asChild>
              <span data-slot="popover-trigger" className="cursor-pointer">
                <PriorityButton priority={priority} />
              </span>
            </PopoverTrigger>
            <PopoverContent
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
            </PopoverContent>
          </Popover>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="xxs" leadingIcon={Calendar03Icon}>
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
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
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showProjectPicker ? (
          <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="cursor-pointer outline-none shrink-0">
                {selectedProject ? (
                  <ProjectBadge
                    projectId={selectedProject.id}
                    projectName={selectedProject.title}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-cool-50 py-px pl-px pr-2.5">
                    <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-cool-200">
                      <HugeiconsIcon icon={Folder01Icon} size={14} color="var(--color-gray-cool-400)" strokeWidth={1.5} />
                    </span>
                    <span className="text-text-xs font-medium text-gray-cool-400">Project</span>
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              onClick={(e) => e.stopPropagation()}
              onFocusOutside={(e) => e.preventDefault()}
            >
              <LocalProjectPicker
                projects={projects}
                selectedId={selectedProjectId}
                onSelect={(id) => {
                  setSelectedProjectId(id)
                  setSelectedAssigneeIds([])
                  setProjectPickerOpen(false)
                }}
                onClear={() => {
                  setSelectedProjectId("")
                  setSelectedAssigneeIds([])
                  setProjectPickerOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        ) : !projectId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-cool-50 py-px pl-px pr-2.5">
            <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-cool-200">
              <HugeiconsIcon icon={Folder01Icon} size={14} color="var(--color-gray-cool-400)" strokeWidth={1.5} />
            </span>
            <span className="text-text-xs font-medium text-gray-cool-400">No projects</span>
          </span>
        )}

        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center cursor-pointer outline-none">
              {selectedAssigneeIds.length > 0 && projectMembers.length > 0 ? (
                <AvatarGroup>
                  {selectedAssigneeIds
                    .map((id) => projectMembers.find((m) => m.id === id))
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
                <span className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-gray-cool-100 text-gray-cool-400 transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600 size-6">
                  <HugeiconsIcon icon={PlusSignIcon} size={12} color="currentColor" strokeWidth={2} />
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            onClick={(e) => e.stopPropagation()}
            onFocusOutside={(e) => e.preventDefault()}
          >
              <LocalAssigneePicker
                members={projectMembers}
                selectedIds={selectedAssigneeIds}
                onToggle={(id) => {
                  setSelectedAssigneeIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }}
                onClear={() => setSelectedAssigneeIds([])}
              />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
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

function LocalProjectPicker({
  projects,
  selectedId,
  onSelect,
  onClear,
}: {
  projects: { id: string; title: string }[]
  selectedId: string
  onSelect: (id: string) => void
  onClear: () => void
}) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return projects
    return projects.filter((p) => p.title.toLowerCase().includes(q))
  }, [projects, search])

  return (
    <div className="w-[240px]">
      <div className="border-b border-gray-cool-100 p-2">
        <Input
          size="md"
          leadingIcon={Search01Icon}
          placeholder="Search projects"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-0.5 p-2 max-h-[200px] overflow-y-auto scrollbar-hidden">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-text-xs font-medium text-gray-cool-400">
            No projects found
          </p>
        ) : (
          filtered.map((project) => {
            const isSelected = project.id === selectedId
            const color = PROJECT_COLORS[hashCode(project.id) % PROJECT_COLORS.length]

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelect(project.id)}
                className="flex w-full items-center justify-between rounded-full px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
              >
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <span
                    className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <HugeiconsIcon icon={Folder01Icon} size={14} color="white" strokeWidth={1.5} />
                    <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0px_5.4px_10.8px_0px_rgba(255,255,255,0.4)]" />
                  </span>
                  <span className="truncate text-text-sm font-medium text-gray-cool-500">
                    {project.title}
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

      {selectedId && (
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
    <div className="w-[240px]">
      <div className="border-b border-gray-cool-100 p-2">
        <Input
          size="md"
          leadingIcon={Search01Icon}
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-0.5 p-2 max-h-[200px] overflow-y-auto scrollbar-hidden">
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
                className="flex w-full items-center justify-between rounded-full px-3 py-2 transition-colors hover:bg-alpha-900 cursor-pointer"
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
