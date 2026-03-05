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
import { markMutation } from "@/hooks/mutation-tracker"

type TaskContextMenuProps = {
  taskId: string
  projectId: string
  onDelete?: () => void
  children: React.ReactNode
}

export function TaskContextMenu({
  taskId,
  projectId,
  onDelete,
  children,
}: TaskContextMenuProps) {
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleOpen() {
    router.push(`/projects/${projectId}`)
  }

  function handleDuplicate() {
    markMutation("tasks")
    startTransition(() => duplicateTask(taskId))
  }

  function handleDelete() {
    markMutation("tasks")
    startTransition(async () => {
      onDelete?.()
      await deleteTask(taskId)
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
