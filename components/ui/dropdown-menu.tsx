"use client"

import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      suppressHydrationWarning
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  portalled = true,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  /** Disable the portal when nesting inside other dismissable layers (e.g. Popover). */
  portalled?: boolean
}) {
  const content = (
    <DropdownMenuPrimitive.Content
      data-slot="dropdown-menu-content"
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-4xl border border-alpha-500 bg-alpha-200 py-1 px-0 text-gray-cool-50 shadow-[0px_0px_4px_0px_rgba(93,107,152,0.08),0px_8px_16px_0px_rgba(93,107,152,0.08)] backdrop-blur-[5px] data-[state=open]:animate-[ctx-menu-in_150ms_ease-out] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    />
  )

  if (!portalled) return content
  return <DropdownMenuPrimitive.Portal>{content}</DropdownMenuPrimitive.Portal>
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "relative flex cursor-default items-center gap-2 px-2 py-2 text-text-sm font-medium text-gray-cool-50 outline-hidden select-none focus:bg-alpha-300 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:border-t data-[variant=destructive]:border-alpha-500 data-[variant=destructive]:bg-[rgba(255,69,30,0.2)] data-[variant=destructive]:text-[#ff787a] data-[variant=destructive]:focus:bg-[rgba(255,69,30,0.3)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("my-0 h-px bg-alpha-500", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
