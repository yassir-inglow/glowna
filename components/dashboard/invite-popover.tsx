"use client"

import { useState, useTransition } from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { SentIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import { inviteToProject } from "@/app/actions"
import { useUser } from "@/components/dashboard/user-provider"
import { cn } from "@/lib/utils"
import type { ProjectMember } from "@/lib/data"

type SharePopoverProps = {
  projectId: string
  members: ProjectMember[]
  ownerId: string
  className?: string
}

export function SharePopover({ projectId, members, ownerId, className }: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const user = useUser()

  const hasInput = email.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setResult(null)
    startTransition(async () => {
      const res = await inviteToProject(projectId, email.trim())
      if (res.success) {
        setResult({ type: "success", message: "Invitation sent!" })
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

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xxs"
          leadingIcon={UserGroupIcon}
          className={className}
        >
          Share
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-[340px] rounded-2xl border border-gray-cool-100 bg-white shadow-[0px_8px_24px_-4px_rgba(93,107,152,0.16)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
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
                    result.type === "success" ? "text-green-600" : "text-red-500",
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
                  const name = member.full_name || member.email?.split("@")[0] || "Unknown"

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"
                    >
                      <Avatar size="sm" className="shrink-0">
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

                      {isOwner && (
                        <span className="shrink-0 text-text-xs font-medium text-gray-cool-400">
                          Owner
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/** @deprecated Use SharePopover instead */
export const InvitePopover = SharePopover
