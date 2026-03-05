"use client"

import * as React from "react"
import { Folder01Icon } from "@hugeicons/core-free-icons"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { createTask } from "@/app/actions"

type NewTaskRowProps = {
  projectId?: string
  projects?: { id: string; title: string }[]
  onDone: () => void
}

export function NewTaskRow({ projectId, projects, onDone }: NewTaskRowProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [selectedProjectId, setSelectedProjectId] = React.useState(
    projectId ?? projects?.[0]?.id ?? "",
  )
  const [saving, setSaving] = React.useState<string | null>(null)
  const submittedRef = React.useRef(false)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    if (submittedRef.current) return
    const title = inputRef.current?.value.trim()
    if (!title || !selectedProjectId) {
      onDone()
      return
    }
    submittedRef.current = true
    setSaving(title)

    createTask(selectedProjectId, title)
      .then(() => onDone())
      .catch(() => onDone())
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

  function handleBlur() {
    if (submittedRef.current) return
    const title = inputRef.current?.value.trim()
    if (title && selectedProjectId) {
      handleSubmit()
    } else {
      onDone()
    }
  }

  const showProjectPicker = !projectId && projects && projects.length > 0
  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  if (saving) {
    return (
      <div className="relative border-b border-gray-cool-100">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={false} disabled />
            <span className="text-text-md font-medium text-gray-cool-700">
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

  return (
    <div className="flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4">
      <div className="flex items-center gap-2">
        <Checkbox checked={false} disabled />
        <input
          ref={inputRef}
          type="text"
          placeholder="Task name…"
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
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
