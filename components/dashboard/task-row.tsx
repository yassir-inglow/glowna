import {
  Square01Icon,
  Add01Icon,
  Tag02Icon,
  BubbleChatIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

// ─── Task Row ─────────────────────────────────────────────────────────────────

export type TaskRowAvatar = {
  src?: string
  fallback: string
}

export type TaskRowProps = {
  title?: string
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
  title = "Project name",
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
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between border-b border-gray-cool-100 px-4 py-4 transition-colors hover:bg-alpha-900",
        selected && "bg-alpha-900",
      )}
    >
      {/* Left: task info */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Checkbox />
          <span className="text-text-md font-medium text-gray-cool-700 whitespace-nowrap">
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
                {av.src && <AvatarImage src={av.src} alt="" />}
                <AvatarFallback>{av.fallback}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        )}
      </div>
    </div>
  )
}
