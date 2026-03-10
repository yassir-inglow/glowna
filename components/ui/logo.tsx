import Image from "next/image"
import { cn } from "@/lib/utils"

type LogoProps = {
  size?: number
  className?: string
}

export function Logo({ size = 42, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Glowna"
      width={size}
      height={size}
      draggable={false}
      className={cn("rounded-[8px] select-none", className)}
    />
  )
}
