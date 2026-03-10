import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium rounded-full transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-bg-brand text-white hover:bg-bg-brand-hover",
        secondary:
          "bg-alpha-900 text-gray-cool-500 [--icon-color:var(--color-gray-cool-300)] hover:bg-alpha-800 hover:[--icon-color:var(--color-gray-cool-400)]",
        ghost:
          "text-gray-cool-500 [--icon-color:var(--color-gray-cool-300)] hover:bg-alpha-800 hover:[--icon-color:var(--color-gray-cool-400)]",
      },
      size: {
        xxs: "pl-1 pr-1.5 py-1 text-text-xs",
        xs: "py-1 pl-1 pr-2 text-text-sm",
        sm: "py-2 pl-2 pr-3 text-text-sm",
        md: "py-2 pl-2 pr-4 text-text-sm",
        lg: "py-2.5 pl-2.5 pr-5 text-text-md",
        xl: "py-2.5 pl-2.5 pr-5 text-text-md",
        "icon-xxs": "p-[3px]",
        "icon-xs": "p-1.5",
        "icon-sm": "p-2",
        "icon-md": "p-2.5",
        "icon-lg": "p-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

const iconSizeMap: Record<string, number> = {
  xxs: 16,
  xs: 20,
  sm: 20,
  md: 20,
  lg: 24,
  xl: 24,
  "icon-xxs": 16,
  "icon-xs": 20,
  "icon-sm": 20,
  "icon-md": 20,
  "icon-lg": 24,
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    leadingIcon?: IconSvgElement
    trailingIcon?: IconSvgElement
    iconOnly?: IconSvgElement
    loading?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  leadingIcon,
  trailingIcon,
  iconOnly,
  loading = false,
  children,
  ...props
}: ButtonProps) {
  const isIconOnly = !!iconOnly
  const resolvedSize = isIconOnly && !size?.toString().startsWith("icon-")
    ? (`icon-${size}` as NonNullable<typeof size>)
    : size

  const iconPx = iconSizeMap[resolvedSize ?? "md"] ?? 20
  const iconColor = variant === "primary" ? "currentColor" : "var(--icon-color, var(--color-gray-cool-300))"
  const iconStroke = 1.4

  const gapClass =
    variant === "primary" || resolvedSize === "icon-xxs"
      ? "gap-[2px]"
      : "gap-1"

  const sharedProps = {
    "data-slot": "button" as const,
    "data-variant": variant,
    "data-size": resolvedSize,
    className: cn(
      buttonVariants({ variant, size: resolvedSize }),
      gapClass,
      className,
    ),
    disabled: loading || props.disabled,
    ...props,
  }

  if (asChild) {
    const child = React.isValidElement(children) ? children : null
    if (!child) return null

    const injectedChildren = isIconOnly ? (
      loading ? <Spinner size={iconPx} /> : (
        iconOnly && <HugeiconsIcon icon={iconOnly} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
      )
    ) : (
      <>
        {loading ? (
          <Spinner size={iconPx} />
        ) : (
          leadingIcon && <HugeiconsIcon icon={leadingIcon} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
        )}
        {(child.props as Record<string, unknown>).children}
        {!loading && trailingIcon && (
          <HugeiconsIcon icon={trailingIcon} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
        )}
      </>
    )

    return (
      <Slot.Root {...sharedProps}>
        {React.cloneElement(child, undefined, injectedChildren)}
      </Slot.Root>
    )
  }

  return (
    <button {...sharedProps}>
      {isIconOnly ? (
        loading ? (
          <Spinner size={iconPx} />
        ) : (
          <HugeiconsIcon icon={iconOnly!} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
        )
      ) : (
        <>
          {loading ? (
            <Spinner size={iconPx} />
          ) : (
            leadingIcon && <HugeiconsIcon icon={leadingIcon} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
          )}
          {!loading && children}
          {!loading && trailingIcon && (
            <HugeiconsIcon icon={trailingIcon} size={iconPx} color={iconColor} strokeWidth={iconStroke} />
          )}
        </>
      )}
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

type ButtonSkeletonProps = {
  variant?: "primary" | "secondary" | "ghost"
  size?: NonNullable<ButtonProps["size"]>
  className?: string
  width?: string
}

function ButtonSkeleton({
  size = "md",
  className,
  width,
}: ButtonSkeletonProps) {
  const isIcon = size?.toString().startsWith("icon-")

  const sizeMap: Record<string, string> = {
    xxs: "h-[26px]",
    xs: "h-[28px]",
    sm: "h-[36px]",
    md: "h-[36px]",
    lg: "h-[40px]",
    xl: "h-[40px]",
    "icon-xxs": "size-[22px]",
    "icon-xs": "size-[32px]",
    "icon-sm": "size-[36px]",
    "icon-md": "size-[40px]",
    "icon-lg": "size-[44px]",
  }

  return (
    <div
      data-slot="button-skeleton"
      className={cn(
        "animate-pulse rounded-full bg-gray-cool-100",
        sizeMap[size ?? "md"],
        isIcon ? undefined : (width ?? "w-24"),
        className,
      )}
    />
  )
}

export { Button, buttonVariants, ButtonSkeleton }
export type { ButtonProps, ButtonSkeletonProps }
