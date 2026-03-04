"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.75 10.875C3.75 10.875 4.875 10.875 6.375 13.5C6.375 13.5 10.5441 6.625 14.25 5.25"
        stroke="#FCFCFD"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="24"
        strokeDashoffset="24"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="24"
          to="0"
          dur="180ms"
          fill="freeze"
          begin="0s"
        />
      </path>
    </svg>
  )
}

function DashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="2"
      viewBox="0 0 10 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 1H9"
        stroke="#FF451E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Checkbox built on Radix UI primitives.
 *
 * Accessibility (handled automatically by Radix):
 * - role="checkbox" with aria-checked (true | false | mixed)
 * - Keyboard: Space to toggle
 *
 * Usage: pair with a <label htmlFor={id}> or pass aria-label directly.
 *
 * @example
 * <label htmlFor="terms" className="flex items-center gap-2 text-sm">
 *   <Checkbox id="terms" />
 *   Accept terms
 * </label>
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Base
        "peer relative size-5 shrink-0 cursor-pointer rounded-[8px] outline-none",
        "transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out",
        "active:scale-95 motion-reduce:transition-none",
        // Focus ring
        "focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2",
        // Disabled
        "disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
        // Unchecked
        "border border-gray-cool-200 bg-gray-cool-100",
        // Checked
        "data-[state=checked]:border-transparent data-[state=checked]:bg-brand-500",
        // Indeterminate
        "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-brand-50",
        className,
      )}
      {...props}
    >
      {/*
       * Indicator only mounts when state is "checked" or "indeterminate".
       * It receives data-state from Radix, so the group-data-[state=*] variants
       * below use that to swap between the two icons.
       */}
      <CheckboxPrimitive.Indicator
        className={cn(
          "group flex size-full items-center justify-center",
          "data-[state=checked]:animate-in data-[state=checked]:zoom-in-50 data-[state=checked]:fade-in-0",
          "data-[state=indeterminate]:animate-in data-[state=indeterminate]:zoom-in-75 data-[state=indeterminate]:fade-in-0",
          "motion-reduce:animate-none",
        )}
      >
        {/* Checkmark — visible when checked, hidden when indeterminate */}
        <span className="group-data-[state=indeterminate]:hidden">
          <CheckIcon />
        </span>
        {/* Dash — visible when indeterminate only */}
        <span className="hidden group-data-[state=indeterminate]:inline-flex">
          <DashIcon />
        </span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
