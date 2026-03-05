"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Delete02Icon,
  Share08Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Avatar, AvatarAvvvatars, AvatarImage, AvatarGroup } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { deleteProject } from "@/app/actions"
import { cn } from "@/lib/utils"
import type { ProjectMember } from "@/lib/data"

function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </svg>
  )
}

function AvatarStack({
  members,
  ownerId,
  compact = false,
}: {
  members: ProjectMember[]
  ownerId: string
  compact?: boolean
}) {
  const hasCollaborators = members.some((m) => m.id !== ownerId)

  if (!hasCollaborators) return null

  const visible = compact ? members.slice(0, 1) : members

  return (
    <AvatarGroup>
      {visible.map((member) => (
        <Avatar
          key={member.id}
          size="xs"
          className="ring-[1.5px] ring-white"
        >
          {member.avatar_url ? (
            <AvatarImage src={member.avatar_url} alt="" />
          ) : (
            <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
          )}
        </Avatar>
      ))}
    </AvatarGroup>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex h-[200px] flex-col justify-between rounded-[24px] border border-gray-cool-100 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
        </div>
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-3.5 w-48 rounded-md" />
      </div>
    </div>
  )
}

export function ProjectCard({
  id,
  title,
  description,
  compactAvatars = false,
  members = [],
  ownerId,
  onSelect,
}: {
  id: string
  title: string
  description?: string
  compactAvatars?: boolean
  members?: ProjectMember[]
  ownerId: string
  onSelect?: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  function handleShare() {
    if (onSelect) {
      onSelect(id)
    } else {
      router.push(`/projects/${id}`)
    }
  }

  function handleDelete() {
    startTransition(() => deleteProject(id))
  }

  function handleCardClick() {
    if (menuOpen || isPending) return
    if (onSelect) {
      onSelect(id)
    } else {
      router.push(`/projects/${id}`)
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleCardClick() }}
      className={cn(
        "flex h-[200px] cursor-pointer flex-col justify-between rounded-[24px] border border-gray-cool-100 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4 transition-all duration-200 hover:border-gray-cool-200 hover:shadow-[0px_7px_8px_-4px_rgba(93,107,152,0.1)]",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <AvatarStack members={members} ownerId={ownerId} compact={compactAvatars} />
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative z-10 ml-auto rounded-full bg-gray-cool-50 p-1 text-gray-cool-500 transition-colors hover:bg-gray-cool-100"
              aria-label="Project options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreIcon />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleShare}>
              <HugeiconsIcon icon={Share08Icon} size={18} color="currentColor" strokeWidth={1.5} />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
              <HugeiconsIcon icon={Delete02Icon} size={18} color="currentColor" strokeWidth={1.5} />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <h3 className="text-[22px]/none italic text-gray-cool-700 [font-family:'PT_Serif',serif]">
          {title}
        </h3>
        {description ? (
          <p className="text-text-sm font-medium text-gray-cool-400">
            {description}
          </p>
        ) : null}
      </div>
    </article>
  )
}
