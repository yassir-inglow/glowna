import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-bg-brand text-white hover:bg-bg-brand-hover",
        secondary:
          "bg-alpha-900 text-gray-cool-500 hover:bg-alpha-800 border border-gray-cool-100",
        ghost:
          "text-gray-cool-500 hover:bg-alpha-900 active:bg-alpha-800",
      },
      size: {
        xxs: "pl-1 pr-1.5 py-1 text-text-xs",
        xs: "px-2 py-1.5 text-text-sm",
        sm: "p-2 text-text-sm",
        md: "p-2.5 text-text-sm",
        lg: "p-2.5 text-text-md",
        xl: "p-2.5 text-text-md",
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
        iconOnly && <HugeiconsIcon icon={iconOnly} size={iconPx} color="currentColor" strokeWidth={1.5} />
      )
    ) : (
      <>
        {loading ? (
          <Spinner size={iconPx} />
        ) : (
          leadingIcon && <HugeiconsIcon icon={leadingIcon} size={iconPx} color="currentColor" strokeWidth={1.5} />
        )}
        {(child.props as Record<string, unknown>).children}
        {!loading && trailingIcon && (
          <HugeiconsIcon icon={trailingIcon} size={iconPx} color="currentColor" strokeWidth={1.5} />
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
          <HugeiconsIcon icon={iconOnly!} size={iconPx} color="currentColor" strokeWidth={1.5} />
        )
      ) : (
        <>
          {loading ? (
            <Spinner size={iconPx} />
          ) : (
            leadingIcon && <HugeiconsIcon icon={leadingIcon} size={iconPx} color="currentColor" strokeWidth={1.5} />
          )}
          {!loading && children}
          {!loading && trailingIcon && (
            <HugeiconsIcon icon={trailingIcon} size={iconPx} color="currentColor" strokeWidth={1.5} />
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
    xs: "h-[32px]",
    sm: "h-[36px]",
    md: "h-[40px]",
    lg: "h-[44px]",
    xl: "h-[44px]",
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
