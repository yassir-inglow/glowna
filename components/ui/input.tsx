import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "inline-flex items-center gap-[4px] rounded-full border border-gray-cool-100 bg-alpha-900 font-medium text-gray-cool-300 overflow-hidden transition-all focus-within:border-brand-500",
  {
    variants: {
      size: {
        sm: "py-[6px] text-text-xs",
        md: "py-[8px] text-text-sm",
        lg: "py-[10px] text-text-md",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  }
)

const paddingWithIcon: Record<string, string> = {
  sm: "px-[6px]",
  md: "px-[8px]",
  lg: "px-[10px]",
}

const paddingWithoutIcon: Record<string, string> = {
  sm: "px-[10px]",
  md: "px-[12px]",
  lg: "px-[16px]",
}

const iconSizeMap: Record<string, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants> & {
    leadingIcon?: IconSvgElement
  }

function Input({
  className,
  size = "lg",
  leadingIcon,
  ref,
  disabled,
  ...props
}: InputProps) {
  const iconPx = iconSizeMap[size ?? "lg"] ?? 24

  return (
    <div
      data-slot="input"
      data-size={size}
      className={cn(
        inputVariants({ size }),
        leadingIcon ? paddingWithIcon[size ?? "lg"] : paddingWithoutIcon[size ?? "lg"],
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {leadingIcon && (
        <HugeiconsIcon
          icon={leadingIcon}
          size={iconPx}
          color="currentColor"
          strokeWidth={1.5}
        />
      )}
      <input
        ref={ref}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent outline-none text-gray-cool-700 placeholder:text-gray-cool-300 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  )
}

export { Input, inputVariants }
export type { InputProps }
