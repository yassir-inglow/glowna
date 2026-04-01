"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

import { Button } from "@/components/ui/button"
import { useUser } from "@/components/dashboard/user-provider"
import { createClient } from "@/lib/supabase/client"
import {
  acceptInvitation,
  declineInvitation,
  dismissNotification,
  dismissProjectEditAccessRequest,
  grantProjectEditAccess,
} from "@/app/actions"
import {
  getProjectPermissionLabel,
  normalizeProjectRole,
  type ProjectRole,
} from "@/lib/project-permissions"

type Invitation = {
  id: string
  token: string
  projectName: string
  inviterName: string
  role: ProjectRole
}

type GeneralNotification = {
  id: string
  type: string
  createdAt: string
  projectId?: string
  projectName: string
  actorName: string
  requesterId?: string
  role?: ProjectRole
  previousRole?: ProjectRole
}

type NotificationEntry =
  | { kind: "invitation"; data: Invitation }
  | { kind: "notification"; data: GeneralNotification }

function InvitationItem({
  invitation,
  onResolved,
}: {
  invitation: Invitation
  onResolved: (id: string, accepted: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitation(invitation.token)
      if (result.error) {
        setError(result.error)
      } else {
        onResolved(invitation.id, true)
      }
    })
  }

  function handleDecline() {
    setError(null)
    startTransition(async () => {
      const result = await declineInvitation(invitation.id)
      if (!result.success) {
        setError(result.error ?? "Something went wrong")
      } else {
        onResolved(invitation.id, false)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-gray-cool-50 p-3">
      <p className="text-text-sm font-medium leading-snug text-gray-cool-700">
        <span className="font-semibold text-gray-cool-900">
          {invitation.inviterName}
        </span>{" "}
        sent you an invitation to join{" "}
        <span className="font-semibold text-gray-cool-900">
          {invitation.projectName}
        </span>{" "}
        with{" "}
        <span className="font-semibold text-gray-cool-900">
          {getProjectPermissionLabel(invitation.role)}
        </span>{" "}
        access. You can accept it or deny it.
      </p>
      {error && (
        <p className="text-text-xs font-medium text-red-500">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="xs"
          onClick={handleAccept}
          disabled={isPending}
          loading={isPending}
          className="flex-1"
        >
          Accept
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={handleDecline}
          disabled={isPending}
          className="flex-1"
        >
          Deny
        </Button>
      </div>
    </div>
  )
}

function GeneralNotificationItem({
  notification,
  onDismiss,
}: {
  notification: GeneralNotification
  onDismiss: (id: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDismiss() {
    setError(null)
    startTransition(async () => {
      if (
        notification.type === "project_edit_access_requested"
        && notification.projectId
        && notification.requesterId
      ) {
        const result = await dismissProjectEditAccessRequest(
          notification.id,
          notification.projectId,
          notification.requesterId,
        )

        if (!result.success) {
          setError(result.error ?? "Couldn't dismiss this request.")
          return
        }
      } else {
      await dismissNotification(notification.id)
      }
      onDismiss(notification.id)
    })
  }

  function handleGrantEditAccess() {
    if (!notification.projectId || !notification.requesterId) return

    setError(null)
    startTransition(async () => {
      const result = await grantProjectEditAccess(
        notification.id,
        notification.projectId!,
        notification.requesterId!,
      )

      if (!result.success) {
        setError(result.error ?? "Couldn't grant edit access.")
        return
      }

      onDismiss(notification.id)
    })
  }

  const roleLabel = notification.role ? getProjectPermissionLabel(notification.role) : null
  const previousRoleLabel = notification.previousRole
    ? getProjectPermissionLabel(notification.previousRole)
    : null
  const isRemoval = notification.type === "removed_from_project"
  const isRoleChange = notification.type === "project_role_changed"
  const isEditAccessRequest = notification.type === "project_edit_access_requested"

  return (
    <div className={`flex flex-col gap-2.5 rounded-xl p-3 ${isRemoval ? "bg-red-50" : "bg-gray-cool-50"}`}>
      <p className="text-text-sm font-medium leading-snug text-gray-cool-700">
        {isEditAccessRequest ? (
          <>
            <span className="font-semibold text-gray-cool-900">
              {notification.actorName}
            </span>{" "}
            requested{" "}
            <span className="font-semibold text-gray-cool-900">
              Can edit
            </span>{" "}
            access to{" "}
            <span className="font-semibold text-gray-cool-900">
              {notification.projectName}
            </span>
            .
          </>
        ) : isRoleChange ? (
          <>
            <span className="font-semibold text-gray-cool-900">
              {notification.actorName}
            </span>{" "}
            changed your access in{" "}
            <span className="font-semibold text-gray-cool-900">
              {notification.projectName}
            </span>{" "}
            {previousRoleLabel ? (
              <>
                from{" "}
                <span className="font-semibold text-gray-cool-900">
                  {previousRoleLabel}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-cool-900">
                  {roleLabel ?? "Can edit"}
                </span>
                .
              </>
            ) : (
              <>
                to{" "}
                <span className="font-semibold text-gray-cool-900">
                  {roleLabel ?? "Can edit"}
                </span>
                .
              </>
            )}
          </>
        ) : isRemoval ? (
          <>
            <span className="font-semibold text-gray-cool-900">
              {notification.actorName}
            </span>{" "}
            removed you from{" "}
            <span className="font-semibold text-gray-cool-900">
              {notification.projectName}
            </span>
            . You no longer have access to this project.
          </>
        ) : (
          <>
            <span className="font-semibold text-gray-cool-900">
              {notification.actorName}
            </span>{" "}
            updated your access in{" "}
            <span className="font-semibold text-gray-cool-900">
              {notification.projectName}
            </span>
            .
          </>
        )}
      </p>
      {error ? (
        <p className="text-text-xs font-medium text-red-500">{error}</p>
      ) : null}
      {isEditAccessRequest ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="xs"
            onClick={handleGrantEditAccess}
            disabled={isPending || !notification.projectId || !notification.requesterId}
            loading={isPending}
            className="flex-1"
          >
            Grant edit access
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={handleDismiss}
            disabled={isPending}
            className="flex-1"
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={handleDismiss}
          disabled={isPending}
          className="w-full"
        >
          Dismiss
        </Button>
      )}
    </div>
  )
}

export function NotificationPopover({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [notifications, setNotifications] = useState<GeneralNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [invResult, notifResult] = await Promise.all([
        supabase.rpc("get_pending_invitations"),
        supabase
          .from("notifications")
          .select("id, type, data, created_at")
          .eq("read", false)
          .order("created_at", { ascending: false }),
      ])

      if (invResult.data && Array.isArray(invResult.data)) {
        setInvitations(
          invResult.data.map((row: any) => ({
            id: row.id,
            token: row.token,
            projectName: row.project_name ?? "Untitled project",
            inviterName: row.inviter_name ?? "Someone",
            role: normalizeProjectRole(row.role),
          })),
        )
      }

      if (notifResult.data) {
        const accessNotifications = new Map<string, GeneralNotification>()
        const accessRequestNotifications = new Map<string, GeneralNotification>()
        const miscNotifications: GeneralNotification[] = []

        for (const row of notifResult.data as any[]) {
          const projectId = typeof row.data?.project_id === "string" ? row.data.project_id : undefined
          const projectName = row.data?.project_name ?? "a project"
          const requesterId = typeof row.data?.requester_id === "string" ? row.data.requester_id : undefined
          const notification: GeneralNotification = {
            id: row.id,
            type: row.type,
            createdAt: row.created_at,
            projectId,
            projectName,
            actorName: row.data?.requester_name ?? row.data?.actor_name ?? row.data?.remover_name ?? "Someone",
            requesterId,
            role: row.data?.role ? normalizeProjectRole(row.data.role) : undefined,
            previousRole: row.data?.previous_role
              ? normalizeProjectRole(row.data.previous_role)
              : undefined,
          }
          const isAccessRequest = notification.type === "project_edit_access_requested"
          const isAccessEvent =
            notification.type === "removed_from_project" || notification.type === "project_role_changed"

          if (isAccessRequest) {
            const requestKey = `${notification.projectId ?? `name:${notification.projectName.trim().toLowerCase()}`}:${
              notification.requesterId ?? notification.actorName.trim().toLowerCase()
            }`
            const existing = accessRequestNotifications.get(requestKey)
            const existingTime = existing ? (Date.parse(existing.createdAt) || 0) : 0
            const nextTime = Date.parse(notification.createdAt) || 0

            if (!existing || nextTime >= existingTime) {
              accessRequestNotifications.set(requestKey, notification)
            }

            continue
          }

          if (!isAccessEvent) {
            miscNotifications.push(notification)
            continue
          }

          const accessKey = notification.projectId
            ?? `name:${notification.projectName.trim().toLowerCase()}`
          const existing = accessNotifications.get(accessKey)

          if (!existing) {
            accessNotifications.set(accessKey, notification)
            continue
          }

          const existingTime = Date.parse(existing.createdAt) || 0
          const nextTime = Date.parse(notification.createdAt) || 0
          const shouldReplace = nextTime > existingTime
            || (
              nextTime === existingTime
              && notification.type === "project_role_changed"
              && existing.type !== "project_role_changed"
            )

          if (shouldReplace) {
            accessNotifications.set(accessKey, notification)
          }
        }

        const nextNotifications = [
          ...miscNotifications,
          ...accessRequestNotifications.values(),
          ...accessNotifications.values(),
        ].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))

        setNotifications(nextNotifications)
      }
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Subscribe to Realtime changes on project_invitations + notifications
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("all-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_invitations",
          filter: `email=eq.${user.email.toLowerCase()}`,
        },
        () => fetchAll(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchAll(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.email, user.id, fetchAll])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      fetchAll()
    }
  }

  function handleInvitationResolved(id: string, accepted: boolean) {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    if (accepted) {
      router.refresh()
    }
  }

  function handleNotificationDismissed(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    router.refresh()
  }

  const entries: NotificationEntry[] = [
    ...notifications.map(
      (n) => ({ kind: "notification" as const, data: n }),
    ),
    ...invitations.map(
      (inv) => ({ kind: "invitation" as const, data: inv }),
    ),
  ]

  const count = entries.length

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="relative" suppressHydrationWarning>
          {children}
          {!open && count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-[10px] items-center justify-center rounded-full bg-brand-500 ring-2 ring-white" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[360px] p-4">
          <p className="mb-3 text-text-sm font-semibold text-gray-cool-900">
            Notifications
          </p>

          {loading && !hasFetched ? (
            <div className="flex flex-col gap-2.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[100px] animate-pulse rounded-xl bg-gray-cool-50"
                />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-text-sm font-medium text-gray-cool-400">
                No notifications
              </p>
            </div>
          ) : (
            <div className="flex max-h-[400px] flex-col gap-2.5 overflow-y-auto">
              {entries.map((entry) =>
                entry.kind === "invitation" ? (
                  <InvitationItem
                    key={`inv-${entry.data.id}`}
                    invitation={entry.data}
                    onResolved={handleInvitationResolved}
                  />
                ) : (
                  <GeneralNotificationItem
                    key={`notif-${entry.data.id}`}
                    notification={entry.data}
                    onDismiss={handleNotificationDismissed}
                  />
                ),
              )}
            </div>
          )}
      </PopoverContent>
    </Popover>
  )
}
