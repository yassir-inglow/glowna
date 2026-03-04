import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type AvatarStatus = "online" | "offline" | "busy" | "away"
type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const statusStyles: Record<AvatarStatus, string> = {
  online: "bg-green-500",
  offline: "bg-gray-cool-300",
  busy: "bg-red-500",
  away: "bg-yellow-400",
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: "size-6",   // 24px — used in stacked groups
  sm: "size-8",   // 32px
  md: "size-9",   // 36px
  lg: "size-10",  // 40px
  xl: "size-12",  // 48px
}

/**
 * Outer wrapper is a plain div (no overflow-hidden) so AvatarBadge can
 * peek outside the circle. The Radix Root inside handles clipping.
 */
function Avatar({
  className,
  size,
  status,
  children,
  ...props
}: React.ComponentProps<"div"> & { size?: AvatarSize; status?: AvatarStatus }) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        size && sizeStyles[size],
        className
      )}
      {...props}
    >
      <AvatarPrimitive.Root className="h-full w-full overflow-hidden rounded-full">
        {children}
      </AvatarPrimitive.Root>

      {status && (
        <span
          data-slot="avatar-status"
          data-status={status}
          aria-label={status}
          className={cn(
            "absolute bottom-0 right-0 size-[30%] min-h-2 min-w-2 rounded-full ring-[1.5px] ring-white",
            statusStyles[status]
          )}
        />
      )}
    </div>
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gray-cool-100 text-text-xs font-medium text-gray-cool-600",
        className
      )}
      {...props}
    />
  )
}

/**
 * Wraps a set of Avatar elements with overlapping stacked layout.
 * Each Avatar inside should use `ring` for the border so overlap looks clean.
 */
function AvatarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "flex items-center [&>[data-slot=avatar]]:-ml-1.5 [&>[data-slot=avatar]:first-child]:ml-0",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
export type { AvatarStatus, AvatarSize }
