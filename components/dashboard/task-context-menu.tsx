"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight01Icon,
  Copy02Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { deleteTask, duplicateTask } from "@/app/actions"

type TaskContextMenuProps = {
  taskId: string
  projectId: string
  children: React.ReactNode
}

export function TaskContextMenu({
  taskId,
  projectId,
  children,
}: TaskContextMenuProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleOpen() {
    router.push(`/projects/${projectId}`)
  }

  function handleDuplicate() {
    startTransition(() => duplicateTask(taskId))
  }

  function handleDelete() {
    startTransition(() => deleteTask(taskId))
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isPending}>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[200px]">
        <ContextMenuItem onSelect={handleOpen}>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color="currentColor"
            strokeWidth={1.5}
          />
          Open project
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleDuplicate}>
          <HugeiconsIcon
            icon={Copy02Icon}
            size={18}
            color="currentColor"
            strokeWidth={1.5}
          />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={handleDelete}>
          <HugeiconsIcon
            icon={Delete02Icon}
            size={18}
            color="currentColor"
            strokeWidth={1.5}
          />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
