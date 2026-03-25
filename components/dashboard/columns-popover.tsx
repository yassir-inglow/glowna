"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  MoreVerticalIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProgressRing } from "@/components/ui/progress-ring"
import {
  createCustomBoardColumn,
  getColumnRingColor,
  type BoardColumnConfig,
} from "@/hooks/use-project-board-columns"

function ColumnsIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6.5C4 5.67157 4.67157 5 5.5 5H8.5C9.32843 5 10 5.67157 10 6.5V17.5C10 18.3284 9.32843 19 8.5 19H5.5C4.67157 19 4 18.3284 4 17.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M14 6.5C14 5.67157 14.6716 5 15.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H15.5C14.6716 19 14 18.3284 14 17.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

type ColumnsPopoverProps = {
  columns: BoardColumnConfig[]
  onSave: (next: BoardColumnConfig[]) => Promise<void> | void
}

function getErrorMessage(e: unknown): string | null {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === "object" && e) {
    const maybe = e as { message?: unknown }
    if (typeof maybe.message === "string" && maybe.message) return maybe.message
  }
  return null
}

function moveInArray<T>(arr: T[], from: number, to: number) {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function progressForStatus(id: string) {
  if (id === "todo") return 0
  if (id === "done") return 100
  return 50
}

function normalizeFixed(next: BoardColumnConfig[], fallback: BoardColumnConfig[]) {
  const todo = next.find((c) => c.id === "todo") ?? fallback.find((c) => c.id === "todo")
  const done = next.find((c) => c.id === "done") ?? fallback.find((c) => c.id === "done")
  const middle = next.filter((c) => c.id !== "todo" && c.id !== "done")

  const fixedTodo = todo
    ? { ...todo, label: "To do" }
    : { id: "todo", label: "To do", headerBg: "bg-gray-cool-25", bodyBg: "bg-gray-cool-25", progress: 0 }
  const fixedDone = done
    ? { ...done, label: "Done" }
    : { id: "done", label: "Done", headerBg: "bg-success-25", bodyBg: "bg-success-25", progress: 100 }

  return [fixedTodo, ...middle, fixedDone].map((c) => ({
    ...c,
    progress: progressForStatus(c.id),
  }))
}

export function ColumnsPopover({ columns, onSave }: ColumnsPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<BoardColumnConfig[]>(columns)
  const [isAdding, setIsAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const trimmed = name.trim()
  const canAdd = trimmed.length > 0

  function resetDraft() {
    setDraft(columns)
    setIsAdding(false)
    setName("")
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setDraft(columns)
      setIsAdding(false)
      setName("")
      setError(null)
    } else {
      resetDraft()
    }
  }

  function startAdd() {
    setIsAdding(true)
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function moveColumn(id: string, direction: -1 | 1) {
    if (id === "todo" || id === "done") return

    setDraft((prev) => {
      const todo = prev.find((c) => c.id === "todo")
      const done = prev.find((c) => c.id === "done")
      const middle = prev.filter((c) => c.id !== "todo" && c.id !== "done")

      const index = middle.findIndex((c) => c.id === id)
      if (index < 0) return prev

      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= middle.length) return prev

      const nextMiddle = moveInArray(middle, index, nextIndex)
      return normalizeFixed(
        [
          ...(todo ? [todo] : []),
          ...nextMiddle,
          ...(done ? [done] : []),
        ],
        columns,
      )
    })
  }

  function removeColumn(id: string) {
    if (id === "todo" || id === "done") return
    setDraft((prev) => normalizeFixed(prev.filter((c) => c.id !== id), columns))
  }

  async function handleSave() {
    if (isSaving) return
    setError(null)

    let nextDraft = draft
    if (isAdding) {
      if (!canAdd) return
      const newCol = createCustomBoardColumn(trimmed, nextDraft)
      const todo = nextDraft.find((c) => c.id === "todo")
      const done = nextDraft.find((c) => c.id === "done")
      const middle = nextDraft.filter((c) => c.id !== "todo" && c.id !== "done")
      nextDraft = normalizeFixed([...(todo ? [todo] : []), ...middle, newCol, ...(done ? [done] : [])], columns)
    } else {
      nextDraft = normalizeFixed(nextDraft, columns)
    }

    setIsSaving(true)
    try {
      await onSave(nextDraft)
      setOpen(false)
      resetDraft()
    } catch (e) {
      setError(getErrorMessage(e) ?? "Couldn't save columns. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const normalized = normalizeFixed(draft, columns)
  const todo = normalized.find((c) => c.id === "todo") ?? normalized[0]
  const done = normalized.find((c) => c.id === "done") ?? normalized[normalized.length - 1]
  const middle = normalized.filter((c) => c.id !== "todo" && c.id !== "done")

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Columns"
          className="size-9 border border-gray-cool-100 bg-alpha-900 text-gray-cool-500 hover:bg-alpha-800"
        >
          <ColumnsIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[360px]">
        <div className="p-4 pb-3">
          <p className="mb-3 text-text-sm font-semibold text-gray-cool-800">
            Columns
          </p>

          <div className="flex flex-col gap-1">
            {todo && (
              <ColumnRow
                column={todo}
                canMoveUp={false}
                canMoveDown={middle.length > 0}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onRemove={() => {}}
              />
            )}

            {middle.map((col, index) => (
              <ColumnRow
                key={col.id}
                column={col}
                canMoveUp={index > 0}
                canMoveDown={index < middle.length - 1}
                onMoveUp={() => moveColumn(col.id, -1)}
                onMoveDown={() => moveColumn(col.id, 1)}
                onRemove={() => removeColumn(col.id)}
              />
            ))}

            {done && (
              <ColumnRow
                column={done}
                canMoveUp={middle.length > 0}
                canMoveDown={false}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onRemove={() => {}}
              />
            )}
          </div>

          {!isAdding ? (
            <button
              type="button"
              onClick={startAdd}
              className="mt-3 flex w-full items-center gap-2 rounded-full border border-gray-cool-100 bg-alpha-900 px-3 py-2 text-left text-text-sm font-medium text-gray-cool-500 transition-colors hover:bg-alpha-800"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={18} color="currentColor" strokeWidth={1.5} />
              Add column
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-full border border-gray-cool-100 bg-alpha-900 px-3 py-2">
              <HugeiconsIcon icon={PlusSignIcon} size={18} color="currentColor" strokeWidth={1.5} className="shrink-0 text-gray-cool-400" />
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Column name…"
                className="min-w-0 flex-1 bg-transparent text-text-sm font-medium text-gray-cool-700 outline-none placeholder:text-gray-cool-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSave()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    resetDraft()
                  }
                }}
              />
            </div>
          )}

          {error && (
            <p className="mt-2 text-text-xs font-medium text-error-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-cool-100 px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="xs"
            onClick={handleSave}
            loading={isSaving}
            disabled={(isAdding && !canAdd) || isSaving}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ColumnRow({
  column,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  column: BoardColumnConfig
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const ringColor = getColumnRingColor(column.headerBg)
  const locked = column.id === "todo" || column.id === "done"

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-full border border-gray-cool-100 bg-alpha-900 px-3 py-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ProgressRing value={column.progress} color={ringColor} size={16} aria-label={`${column.label} progress`} />
        <span className="min-w-0 flex-1 truncate text-text-sm font-medium text-gray-cool-600">
          {column.label}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Column options"
            className={cn(
              "rounded-full p-1 text-gray-cool-400 transition-colors hover:bg-alpha-800 hover:text-gray-cool-600 disabled:pointer-events-none disabled:opacity-40",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={16} strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          <DropdownMenuItem
            onSelect={onMoveUp}
            disabled={locked || !canMoveUp}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={18} strokeWidth={2} />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onMoveDown}
            disabled={locked || !canMoveDown}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={2} />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={onRemove}
            disabled={locked}
          >
            <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} />
            Remove column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
