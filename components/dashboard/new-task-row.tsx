"use client"

import * as React from "react"
import { useTransition } from "react"
import { Folder01Icon } from "@hugeicons/core-free-icons"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { createTask } from "@/app/actions"
import { cn } from "@/lib/utils"

type NewTaskRowProps = {
  projectId?: string
  projects?: { id: string; title: string }[]
  onDone: () => void
}

export function NewTaskRow({ projectId, projects, onDone }: NewTaskRowProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedProjectId, setSelectedProjectId] = React.useState(
    projectId ?? projects?.[0]?.id ?? "",
  )
  const isSubmittingRef = React.useRef(false)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    if (isSubmittingRef.current) return
    const title = inputRef.current?.value.trim()
    if (!title || !selectedProjectId) {
      onDone()
      return
    }
    isSubmittingRef.current = true
    startTransition(async () => {
      await createTask(selectedProjectId, title)
      onDone()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      onDone()
    }
  }

  const showProjectPicker = !projectId && projects && projects.length > 0
  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4",
        isPending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox checked={false} disabled />
        <input
          ref={inputRef}
          type="text"
          placeholder="Task name…"
          disabled={isPending}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="bg-transparent text-text-md font-medium text-gray-cool-700 placeholder:text-gray-cool-300 outline-none"
        />
      </div>

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
    </div>
  )
}
