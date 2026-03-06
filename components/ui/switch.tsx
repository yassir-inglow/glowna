"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  /** When provided, renders a clickable label row alongside the toggle. */
  label?: React.ReactNode
}

function SwitchThumb({ checked, disabled, className }: { checked: boolean; disabled?: boolean; className?: string }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        disabled ? "opacity-50" : "",
        checked ? "bg-bg-brand" : "bg-gray-cool-200",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </span>
  )
}

function Switch({ checked, onCheckedChange, className, disabled, label }: SwitchProps) {
  if (label) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "flex w-full items-center justify-between gap-2 cursor-pointer disabled:cursor-not-allowed",
          className,
        )}
      >
        <span className="text-text-sm font-medium text-gray-cool-700 select-none">{label}</span>
        <SwitchThumb checked={checked} disabled={disabled} />
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-bg-brand" : "bg-gray-cool-200",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  )
}

export { Switch }
