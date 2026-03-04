"use client"

import * as React from "react"
import { useTransition } from "react"
import { createProject } from "@/app/actions"

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 14l4.5 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type NewProjectCardProps = {
  onDone: () => void
}

export function NewProjectCard({ onDone }: NewProjectCardProps) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isPending, startTransition] = useTransition()
  const titleRef = React.useRef<HTMLInputElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) {
      onDone()
      return
    }
    startTransition(async () => {
      await createProject(trimmed, description.trim() || undefined)
      onDone()
    })
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onDone()
    }
  }

  function handleDescKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onDone()
    }
  }

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        submit()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  })

  return (
    <div ref={cardRef}>
      <article className="relative flex h-[200px] flex-col justify-between rounded-[24px] border border-brand-200 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4 shadow-[0px_0px_0px_3px_rgba(99,102,241,0.08)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isPending || !title.trim()}
            className="flex size-[28px] items-center justify-center rounded-full bg-brand-500 text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Create project"
            onClick={submit}
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            className="flex size-[28px] items-center justify-center rounded-full bg-gray-cool-50 text-gray-cool-400 transition-colors hover:bg-gray-cool-100 hover:text-gray-cool-600"
            aria-label="Cancel"
            onClick={onDone}
          >
            <XIcon />
          </button>
        </div>

        <div className="space-y-1">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Project name"
            disabled={isPending}
            className="w-full bg-transparent text-[22px]/none italic text-gray-cool-700 placeholder:text-gray-cool-300 outline-none [font-family:'PT_Serif',serif]"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleDescKeyDown}
            placeholder="Add a description…"
            disabled={isPending}
            className="w-full bg-transparent text-text-sm font-medium text-gray-cool-400 placeholder:text-gray-cool-300 outline-none"
          />
        </div>
      </article>
    </div>
  )
}
