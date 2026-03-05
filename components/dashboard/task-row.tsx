"use client"

import { useState, useEffect, useOptimistic, useRef, useTransition } from "react"

import {
  Square01Icon,
  Add01Icon,
  Tag02Icon,
  BubbleChatIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Avatar, AvatarAvvvatars, AvatarGroup, AvatarImage, AvatarSkeleton } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { toggleTaskCompleted } from "@/app/actions"

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TaskRowSkeleton() {
  return (
    <div className="flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-[18px] rounded-[5px]" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="flex items-center gap-1 pl-[22px]">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <AvatarSkeleton size="xs" />
      </div>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

export type TaskRowAvatar = {
  src?: string
  fallback: string
  value?: string
}

export type TaskRowProps = {
  id?: string
  title?: string
  completed?: boolean
  onCompletedChange?: (completed: boolean) => void | Promise<void>
  showAddons?: boolean
  subTaskCurrent?: number
  subTaskTotal?: number
  addText?: string
  labelText?: string
  commentCount?: number
  projectName?: string
  avatars?: TaskRowAvatar[]
  selected?: boolean
}

export function TaskRow({
  id,
  title = "Project name",
  completed = false,
  onCompletedChange,
  showAddons = true,
  subTaskCurrent = 1,
  subTaskTotal = 5,
  addText = "Text",
  labelText = "Label",
  commentCount = 2,
  projectName,
  avatars = [],
  selected = false,
}: TaskRowProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed)
  const [contextOpen, setContextOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextOpen) return
    function dismiss() {
      setContextOpen(false)
    }
    const raf = requestAnimationFrame(() => {
      window.addEventListener("click", dismiss, { once: true })
      window.addEventListener("contextmenu", dismiss, { once: true })
      window.addEventListener("scroll", dismiss, { once: true, capture: true })
      window.addEventListener("keydown", dismiss, { once: true })
    })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("click", dismiss)
      window.removeEventListener("contextmenu", dismiss)
      window.removeEventListener("scroll", dismiss, { capture: true })
      window.removeEventListener("keydown", dismiss)
    }
  }, [contextOpen])

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return

    if (onCompletedChange) {
      startTransition(async () => {
        setOptimisticCompleted(checked)
        await onCompletedChange(checked)
      })
      return
    }

    if (!id) {
      startTransition(() => {
        setOptimisticCompleted(checked)
      })
      return
    }

    startTransition(async () => {
      setOptimisticCompleted(checked)
      await toggleTaskCompleted(id, checked)
    })
  }

  return (
    <div
      ref={rowRef}
      onContextMenu={() => setContextOpen(true)}
      className={cn(
        "flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4 transition-colors hover:bg-alpha-900",
        (selected || contextOpen) && "bg-alpha-900",
        isPending && "opacity-60",
      )}
    >
      {/* Left: task info */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={optimisticCompleted}
            onCheckedChange={handleCheckedChange}
            loading={isPending}
          />
          <span
            className="text-text-md font-medium whitespace-nowrap text-gray-cool-700"
          >
            {title}
          </span>
        </div>

        {showAddons && (
          <div className="flex items-center pl-[22px]">
            <Button variant="ghost" size="xxs" leadingIcon={Square01Icon}>
              {`${subTaskCurrent}/${subTaskTotal}`}
            </Button>
            <Button variant="ghost" size="xxs" leadingIcon={Add01Icon}>
              {addText}
            </Button>
            <Button variant="ghost" size="xxs" leadingIcon={Tag02Icon}>
              {labelText}
            </Button>
            <Button variant="ghost" size="xxs" leadingIcon={BubbleChatIcon}>
              {String(commentCount)}
            </Button>
          </div>
        )}
      </div>

      {/* Right: project badge + avatars */}
      <div className="flex items-center gap-2 shrink-0">
        {projectName && (
          <Button variant="secondary" size="xxs" leadingIcon={Folder01Icon}>
            {projectName}
          </Button>
        )}

        {avatars.length > 0 && (
          <AvatarGroup>
            {avatars.map((av, i) => (
              <Avatar key={i} size="xs" className="ring-[1.5px] ring-white">
                {av.src ? (
                  <AvatarImage src={av.src} alt="" />
                ) : (
                  <AvatarAvvvatars value={av.value ?? av.fallback} />
                )}
              </Avatar>
            ))}
          </AvatarGroup>
        )}
      </div>
    </div>
  )
}
