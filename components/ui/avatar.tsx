"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import Avvvatars from "avvvatars-react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

type AvatarStatus = "online" | "offline" | "busy" | "away"
type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const AvatarContext = React.createContext<{ size?: AvatarSize }>({})

const fallbackTextSize: Record<AvatarSize, string> = {
  xs: "text-[11px]",
  sm: "text-[13px]",
  md: "text-text-sm",
  lg: "text-text-md",
  xl: "text-text-lg",
}

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

const sizeInPx: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 36,
  lg: 40,
  xl: 48,
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
    <AvatarContext.Provider value={{ size }}>
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
    </AvatarContext.Provider>
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
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  const { size } = React.useContext(AvatarContext)

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gray-cool-100 font-medium text-gray-cool-500",
        size ? fallbackTextSize[size] : "text-text-xs",
        className
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
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

function getInitials(value: string): string {
  if (value.includes("@")) {
    const name = value.split("@")[0]
    return name.slice(0, 2).toUpperCase()
  }
  const parts = value.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

/**
 * Drop-in replacement for AvatarFallback powered by avvvatars.
 * Pass `value` as a seed (email, full name, etc.) for deterministic color + character generation.
 * Automatically extracts initials from the value ("John Doe" → "JD", "tim@apple.com" → "TI").
 * Optionally pass `displayValue` to override.
 */
function AvatarAvvvatars({
  value,
  displayValue,
  style = "character",
}: {
  value: string
  displayValue?: string
  style?: "character" | "shape"
}) {
  const { size } = React.useContext(AvatarContext)
  const px = size ? sizeInPx[size] : 32

  return (
    <Avvvatars
      value={value}
      displayValue={displayValue ?? getInitials(value)}
      size={px}
      style={style}
      radius={9999}
    />
  )
}

const addButtonIconSize: Record<AvatarSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 16,
  xl: 20,
}

function AvatarAddButton({
  className,
  size = "xs",
  ...props
}: React.ComponentProps<"button"> & { size?: AvatarSize }) {
  return (
    <button
      type="button"
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-gray-cool-200 bg-gray-cool-100 text-gray-cool-400 transition-colors hover:bg-gray-cool-200 hover:text-gray-cool-600 cursor-pointer",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      <HugeiconsIcon
        icon={PlusSignIcon}
        size={addButtonIconSize[size]}
        color="currentColor"
        strokeWidth={2}
      />
    </button>
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarAvvvatars, AvatarGroup, AvatarAddButton }
export type { AvatarStatus, AvatarSize }
