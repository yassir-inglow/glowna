"use client"

import { useMemo, useState, useTransition } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  ArrowDown01Icon,
  Delete02Icon,
  SentIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inviteToProject, removeProjectMember, updateProjectMemberRole } from "@/app/actions"
import { useUser } from "@/components/dashboard/user-provider"
import { cn } from "@/lib/utils"
import type { ProjectMember } from "@/lib/data"
import {
  PROJECT_ROLE_OPTIONS,
  canManageProjectSharing,
  getProjectPermission,
  getProjectPermissionLabel,
  type ProjectPermission,
  type ProjectRole,
} from "@/lib/project-permissions"

type SharePopoverProps = {
  projectId: string
  members: ProjectMember[]
  ownerId: string
  activeUserIds?: Set<string>
  className?: string
  showIcon?: boolean
}

type ResultState = {
  type: "success" | "error" | "warning"
  message: string
} | null

function PermissionDropdown({
  value,
  onSelect,
  onRemove,
  disabled = false,
  align = "end",
  className,
  variant = "pill",
}: {
  value: ProjectPermission
  onSelect?: (role: ProjectRole) => void
  onRemove?: () => void
  disabled?: boolean
  align?: "start" | "center" | "end"
  className?: string
  variant?: "pill" | "member"
}) {
  const isOwner = value === "owner"
  const label = getProjectPermissionLabel(value)
  const baseClassName = variant === "member"
    ? "inline-flex min-w-[96px] shrink-0 items-center justify-end gap-1 text-right text-text-xs font-medium text-gray-cool-500"
    : "inline-flex shrink-0 items-center rounded-full bg-alpha-900 px-2.5 py-1 text-text-xs font-medium text-gray-cool-500"

  if (isOwner || !onSelect) {
    return (
      <span
        className={cn(
          baseClassName,
          className,
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Change permission, currently ${label}`}
          className={cn(
            baseClassName,
            variant === "member"
              ? "transition-colors hover:text-gray-cool-700 disabled:cursor-not-allowed disabled:opacity-50"
              : "rounded-full bg-alpha-900 px-2.5 py-1 transition-colors hover:bg-alpha-800 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span>{label}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} color="currentColor" strokeWidth={1.6} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} portalled={false} className="min-w-[170px] rounded-[24px] px-1 py-1.5">
        {PROJECT_ROLE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => onSelect(option.value)} className="justify-between rounded-[18px] px-3 py-2 text-gray-cool-50">
            <span>{option.label}</span>
            {option.value === value && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            )}
          </DropdownMenuItem>
        ))}
        {onRemove ? (
          <>
            <DropdownMenuSeparator className="mx-2 my-1" />
            <DropdownMenuItem
              variant="destructive"
              onSelect={onRemove}
              className="justify-between rounded-[18px] px-3 py-2"
            >
              <span>Remove from project</span>
              <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.5} />
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SharePopover({
  projectId,
  members,
  ownerId,
  activeUserIds,
  className,
  showIcon = true,
}: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor")
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [result, setResult] = useState<ResultState>(null)
  const user = useUser()

  const permission = getProjectPermission({
    ownerId,
    userId: user.id,
    members,
  })
  const canManageSharing = canManageProjectSharing(permission)
  const hasInput = email.trim().length > 0
  const visibleMembers = useMemo<ProjectMember[]>(() => {
    if (!permission || members.some((member) => member.id === user.id)) {
      return members
    }

    return [
      ...members,
      {
        id: user.id,
        email: user.email,
        full_name: user.fullName ?? null,
        avatar_url: user.avatarUrl ?? null,
        role: permission === "viewer" ? "viewer" : "editor",
      },
    ]
  }, [members, permission, user.avatarUrl, user.email, user.fullName, user.id])

  function flashResult(next: ResultState) {
    setResult(next)
    if (!next) return
    window.setTimeout(() => {
      setResult((current) => (current?.message === next.message ? null : current))
    }, 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !canManageSharing) return

    setResult(null)
    startTransition(async () => {
      const res = await inviteToProject(projectId, email.trim(), inviteRole)
      if (res.success) {
        flashResult({
          type: res.warning ? "warning" : "success",
          message: res.warning ?? "Invitation sent!",
        })
        setEmail("")
        setInviteRole("editor")
      } else {
        setResult({ type: "error", message: res.error ?? "Something went wrong" })
      }
    })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setEmail("")
      setInviteRole("editor")
      setResult(null)
    }
  }

  function handleRemoveMember(memberId: string) {
    if (!canManageSharing) return

    setRemovingId(memberId)
    startTransition(async () => {
      const res = await removeProjectMember(projectId, memberId)
      setRemovingId(null)
      if (!res.success) {
        setResult({ type: "error", message: res.error ?? "Failed to remove member" })
        return
      }

      flashResult({ type: "success", message: "Member removed." })
    })
  }

  function handleMemberRoleChange(memberId: string, role: ProjectRole) {
    if (!canManageSharing) return

    setUpdatingRoleId(memberId)
    setResult(null)
    startTransition(async () => {
      const res = await updateProjectMemberRole(projectId, memberId, role)
      setUpdatingRoleId(null)
      if (!res.success) {
        setResult({ type: "error", message: res.error ?? "Failed to update role" })
        return
      }

      flashResult({ type: "success", message: "Permissions updated." })
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
      <PopoverContent side="bottom" align="end" className="w-[360px]">
        <div className="p-4 pb-3">
          <p className="mb-3 text-text-sm font-semibold text-gray-cool-800">
            Share project
          </p>

          {canManageSharing ? (
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
                trailing={
                  <PermissionDropdown
                    value={inviteRole}
                    onSelect={setInviteRole}
                    disabled={isPending}
                    className="bg-white shadow-xs"
                  />
                }
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
          ) : (
            <p className="text-text-sm text-gray-cool-400">
              You can view everyone on this project, but only the owner can manage sharing.
            </p>
          )}
        </div>

        {visibleMembers.length > 0 && (
          <div className="border-t border-gray-cool-100 px-4 py-3">
            <p className="mb-2 text-text-xs font-medium text-gray-cool-400">
              Members
            </p>
            <div className="flex flex-col gap-0.5">
              {visibleMembers.map((member) => {
                const isYou = member.id === user.id
                const isOwner = member.id === ownerId
                const isActive = activeUserIds?.has(member.id) ?? false
                const name = member.full_name || member.email?.split("@")[0] || "Unknown"
                const isRemoving = removingId === member.id
                const isUpdatingRole = updatingRoleId === member.id
                const memberPermission: ProjectPermission = isOwner ? "owner" : member.role

                return (
                  <div
                    key={member.id}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-1 py-1.5",
                      (isRemoving || isUpdatingRole) && "opacity-50",
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

                    <div className="flex shrink-0 items-center gap-1.5">
                      <PermissionDropdown
                        value={memberPermission}
                        onSelect={
                          canManageSharing && !isOwner
                            ? (nextRole) => handleMemberRoleChange(member.id, nextRole)
                            : undefined
                        }
                        onRemove={
                          canManageSharing && !isOwner
                            ? () => handleRemoveMember(member.id)
                            : undefined
                        }
                        disabled={isRemoving || isUpdatingRole || isPending}
                        variant="member"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {!canManageSharing && result && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-text-xs font-medium",
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
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** @deprecated Use SharePopover instead */
export const InvitePopover = SharePopover
