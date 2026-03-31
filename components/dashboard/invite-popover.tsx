"use client"

import { useState, useTransition } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Delete02Icon, SentIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import { inviteToProject, removeProjectMember } from "@/app/actions"
import { useUser } from "@/components/dashboard/user-provider"
import { cn } from "@/lib/utils"
import type { ProjectMember } from "@/lib/data"

type SharePopoverProps = {
  projectId: string
  members: ProjectMember[]
  ownerId: string
  activeUserIds?: Set<string>
  className?: string
  showIcon?: boolean
}

export function SharePopover({ projectId, members, ownerId, activeUserIds, className, showIcon = true }: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null)
  const user = useUser()
  const isCurrentUserOwner = user.id === ownerId

  const hasInput = email.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setResult(null)
    startTransition(async () => {
      const res = await inviteToProject(projectId, email.trim())
      if (res.success) {
        setResult({
          type: res.warning ? "warning" : "success",
          message: res.warning ?? "Invitation sent!",
        })
        setEmail("")
        setTimeout(() => {
          setResult(null)
        }, 3000)
      } else {
        setResult({ type: "error", message: res.error ?? "Something went wrong" })
      }
    })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setEmail("")
      setResult(null)
    }
  }

  function handleRemoveMember(memberId: string) {
    setRemovingId(memberId)
    startTransition(async () => {
      const res = await removeProjectMember(projectId, memberId)
      setRemovingId(null)
      if (!res.success) {
        setResult({ type: "error", message: res.error ?? "Failed to remove member" })
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xxs"
          leadingIcon={showIcon ? UserGroupIcon : undefined}
          className={className}
        >
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[340px]">
          <div className="p-4 pb-3">
            <p className="text-text-sm font-semibold text-gray-cool-800 mb-3">
              Share project
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <Input
                type="email"
                size="sm"
                placeholder="Add people by email…"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setResult(null)
                }}
                required
                autoComplete="off"
                autoFocus
                disabled={isPending}
              />

              {result && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-text-xs font-medium",
                    result.type === "success"
                      ? "text-green-600"
                      : result.type === "warning"
                        ? "text-warning-600"
                        : "text-red-500",
                  )}
                >
                  {result.type === "success" && (
                    <HugeiconsIcon icon={SentIcon} size={14} color="currentColor" strokeWidth={1.5} />
                  )}
                  {result.message}
                </div>
              )}

              {hasInput && (
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  loading={isPending}
                  className="w-full"
                >
                  Invite
                </Button>
              )}
            </form>
          </div>

          {members.length > 0 && (
            <div className="border-t border-gray-cool-100 px-4 py-3">
              <p className="text-text-xs font-medium text-gray-cool-400 mb-2">
                Members
              </p>
              <div className="flex flex-col gap-0.5">
                {members.map((member) => {
                  const isYou = member.id === user.id
                  const isOwner = member.id === ownerId
                  const isActive = activeUserIds?.has(member.id) ?? false
                  const name = member.full_name || member.email?.split("@")[0] || "Unknown"
                  const canRemove = !isOwner && (isCurrentUserOwner || isYou)
                  const isRemoving = removingId === member.id

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-1 py-1.5",
                        isRemoving && "opacity-50",
                      )}
                    >
                      <Avatar size="sm" active={isActive} className="shrink-0 ring-offset-[1.5px] ring-offset-white">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt="" />
                        ) : (
                          <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
                        )}
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-text-sm font-medium text-gray-cool-700">
                            {name}
                          </span>
                          {isYou && (
                            <span className="shrink-0 text-text-xs font-medium text-gray-cool-400">
                              (you)
                            </span>
                          )}
                        </div>
                        {member.email && (
                          <p className="truncate text-text-xs text-gray-cool-400">
                            {member.email}
                          </p>
                        )}
                      </div>

                      {isOwner ? (
                        <span className="shrink-0 text-text-xs font-medium text-gray-cool-400">
                          Owner
                        </span>
                      ) : canRemove ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xxs"
                          disabled={isRemoving}
                          onClick={() => handleRemoveMember(member.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-cool-400 hover:text-red-500 hover:bg-red-50 transition-opacity"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.5} />
                        </Button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
      </PopoverContent>
    </Popover>
  )
}

/** @deprecated Use SharePopover instead */
export const InvitePopover = SharePopover
