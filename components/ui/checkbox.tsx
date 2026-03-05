"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { useSound } from "@/hooks/use-sound"
import { glitch004Sound } from "@/lib/glitch-004"

function CheckIcon({
  durationMs = 320,
  animate = true,
}: { durationMs?: number; animate?: boolean }) {
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
        strokeDasharray={animate ? "24" : undefined}
        strokeDashoffset={animate ? "24" : undefined}
      >
        {animate && (
          <animate
            attributeName="stroke-dashoffset"
            from="24"
            to="0"
            dur={`${durationMs}ms`}
            fill="freeze"
            begin="0s"
          />
        )}
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
function LoadingCheckPath() {
  return (
    <motion.span
      aria-hidden="true"
      className="flex size-full items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0 }}
    >
      <CheckIcon durationMs={1400} />
    </motion.span>
  )
}

function Checkbox({
  className,
  loading = false,
  checked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { loading?: boolean }) {
  const [playCheck] = useSound(glitch004Sound)
  const isLoadingCheck = loading && checked === true
  const wasLoadingCheckRef = React.useRef(false)
  const [suppressCheckedAnimation, setSuppressCheckedAnimation] = React.useState(false)

  React.useEffect(() => {
    if (wasLoadingCheckRef.current && !isLoadingCheck && checked === true) {
      setSuppressCheckedAnimation(true)
    }

    if (checked !== true) {
      setSuppressCheckedAnimation(false)
    }

    wasLoadingCheckRef.current = isLoadingCheck
  }, [checked, isLoadingCheck])

  return (
    <CheckboxPrimitive.Root
      onCheckedChange={(checked) => {
        if (loading) return
        if (checked === true) playCheck()
        onCheckedChange?.(checked)
      }}
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
        // Unchecked base
        "border border-gray-cool-200 bg-gray-cool-100",
        // Checked
        "data-[state=checked]:border-transparent data-[state=checked]:bg-brand-500",
        // Indeterminate
        "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-brand-50",
        className,
      )}
      checked={checked}
      {...props}
    >
      {isLoadingCheck ? (
        <CheckboxPrimitive.Indicator className="group flex size-full items-center justify-center">
          <LoadingCheckPath />
        </CheckboxPrimitive.Indicator>
      ) : (
        <CheckboxPrimitive.Indicator
          className={cn(
            "group flex size-full items-center justify-center",
            "data-[state=checked]:animate-in data-[state=checked]:zoom-in-50 data-[state=checked]:fade-in-0",
            "data-[state=indeterminate]:animate-in data-[state=indeterminate]:zoom-in-75 data-[state=indeterminate]:fade-in-0",
            "motion-reduce:animate-none",
          )}
        >
          <span className="group-data-[state=indeterminate]:hidden">
            <CheckIcon animate={!suppressCheckedAnimation} />
          </span>
          <span className="hidden group-data-[state=indeterminate]:inline-flex">
            <DashIcon />
          </span>
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
