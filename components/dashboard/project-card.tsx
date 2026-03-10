"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Delete02Icon,
  Share08Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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

const PROJECT_COLORS = [
  "#111322", "#6366F1", "#3B82F6", "#10B981",
  "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6",
]

function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function ProjectIcon({ projectId }: { projectId: string }) {
  const color = PROJECT_COLORS[hashCode(projectId) % PROJECT_COLORS.length]

  return (
    <div
      className="relative size-[31px] shrink-0 overflow-hidden rounded-full"
      style={{ backgroundColor: color }}
    >
      <div className="flex size-full items-center justify-center">
        <HugeiconsIcon icon={Folder01Icon} size={18} color="white" strokeWidth={1.5} />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0px_7px_13.9px_0px_rgba(255,255,255,0.4)]" />
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex h-[200px] flex-col justify-between rounded-[24px] bg-alpha-900 p-4">
      <Skeleton className="size-[31px] rounded-full" />
      <div className="space-y-2">
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
        "group flex h-[200px] cursor-pointer flex-col justify-between rounded-[24px] bg-alpha-900 p-4 transition-colors duration-200 hover:bg-alpha-800",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <ProjectIcon projectId={id} />
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative z-10 ml-auto rounded-full bg-alpha-900 p-1.5 text-gray-cool-400 transition-opacity hover:bg-alpha-800",
                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
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

      <div>
        <h3 className="text-text-xl font-medium text-gray-cool-700">
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
