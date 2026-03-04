"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoMark() {
  return (
    <div className="relative size-[46px] rounded-[8px] bg-white/50 p-[10px]">
      <div className="relative size-full rounded-full bg-brand-500">
        <div className="absolute inset-[4px] rounded-full bg-white" />
      </div>
    </div>
  )
}

export function AppHeader({
  userEmail,
  userInitial,
}: {
  userEmail: string
  userInitial: string
}) {
  return (
    <header className="relative z-50 flex h-[78px] w-full shrink-0 items-center justify-between py-4">
      <LogoMark />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          aria-label="Notifications"
          variant="secondary"
          size="icon-sm"
          className="border-0 bg-alpha-900 text-gray-cool-400 hover:bg-alpha-800"
        >
          <BellIcon />
        </Button>
        <Avatar size="md" status="online" title={userEmail}>
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
