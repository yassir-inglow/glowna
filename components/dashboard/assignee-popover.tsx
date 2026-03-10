"use client"

import { useState, useTransition, useMemo } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Search01Icon, Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import { toggleTaskAssignee, clearTaskAssignees } from "@/app/actions"
import { markMutation } from "@/hooks/mutation-tracker"
import type { ProjectMember } from "@/lib/data"

// ─── Standalone picker ─────────────────────────────────────────────────────────

type AssigneePickerProps = {
  taskId: string
  members: ProjectMember[]
  /** Authoritative set of assigned IDs — owned by the parent (TaskRow). */
  assignedIds: string[]
  onChanged?: () => void
  /** Fires immediately (before the server action) with the new full set of IDs. */
  onAssignedIdsChange?: (newIds: string[]) => void
  className?: string
}

export function AssigneePicker({
  taskId,
  members,
  assignedIds,
  onChanged,
  onAssignedIdsChange,
  className,
}: AssigneePickerProps) {
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return members
    return members.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    )
  }, [members, search])

  function handleToggle(profileId: string) {
    const prev = [...assignedIds]
    const next = assignedIds.includes(profileId)
      ? assignedIds.filter((id) => id !== profileId)
      : [...assignedIds, profileId]

    onAssignedIdsChange?.(next)
    markMutation("task_assignees")
    startTransition(async () => {
      try {
        await toggleTaskAssignee(taskId, profileId)
      } catch (err) {
        console.error("[AssigneePicker] toggleTaskAssignee failed:", err)
        onAssignedIdsChange?.(prev)
      }
      onChanged?.()
    })
  }

  function handleClear() {
    const prev = [...assignedIds]
    onAssignedIdsChange?.([])
    markMutation("task_assignees")
    startTransition(async () => {
      try {
        await clearTaskAssignees(taskId)
      } catch (err) {
        console.error("[AssigneePicker] clearTaskAssignees failed:", err)
        onAssignedIdsChange?.(prev)
      }
      onChanged?.()
    })
  }

  return (
    <div
      className={cn("w-[240px]", className)}
    >
      {/* Search */}
      <div className="border-b border-gray-cool-100 p-2">
        <Input
          size="md"
          leadingIcon={Search01Icon}
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Assignee list */}
      <div className="flex flex-col max-h-[200px] overflow-y-auto scrollbar-hidden">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-text-xs font-medium text-gray-cool-400">
            No members found
          </p>
        ) : (
          filtered.map((member) => {
            const isAssigned = assignedIds.includes(member.id)
            const name = member.full_name || member.email?.split("@")[0] || "Unknown"

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleToggle(member.id)}
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
                {isAssigned && (
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

      {/* Clear */}
      {assignedIds.length > 0 && (
        <div className="border-t border-gray-cool-100 p-2">
          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-full py-2 text-center text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-900 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Popover wrapper (used by TaskRow) ──────────────────────────────────────────

type AssigneePopoverProps = {
  taskId: string
  members: ProjectMember[]
  assignedIds: string[]
  children: React.ReactNode
  onChanged?: () => void
  onAssignedIdsChange?: (newIds: string[]) => void
}

export function AssigneePopover({
  taskId,
  members,
  assignedIds,
  children,
  onChanged,
  onAssignedIdsChange,
}: AssigneePopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end">
        <AssigneePicker
          taskId={taskId}
          members={members}
          assignedIds={assignedIds}
          onChanged={onChanged}
          onAssignedIdsChange={onAssignedIdsChange}
        />
      </PopoverContent>
    </Popover>
  )
}
