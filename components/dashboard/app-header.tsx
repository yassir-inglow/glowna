"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  ArrowTurnBackwardIcon,
  Logout03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarAvvvatars } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/components/dashboard/user-provider"
import { createClient } from "@/lib/supabase/client"

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
    <Link href="/" className="relative block size-[46px] rounded-[8px] bg-white/50 p-[10px] transition-opacity hover:opacity-80">
      <div className="relative size-full rounded-full bg-brand-500">
        <div className="absolute inset-[4px] rounded-full bg-white" />
      </div>
    </Link>
  )
}

export function AppHeader() {
  const { email, displayName } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const isSubpage = pathname !== "/"

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="relative z-50 flex h-[78px] w-full shrink-0 items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <LogoMark />
        {isSubpage && (
          <Button
            variant="secondary"
            size="xs"
            leadingIcon={ArrowTurnBackwardIcon}
            asChild
          >
            <Link href="/">Back</Link>
          </Button>
        )}
      </div>

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2">
              <Avatar size="md" status="online" title={email}>
                <AvatarAvvvatars value={displayName} />
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <div className="px-2 py-2 text-text-sm font-medium text-gray-cool-300">
              {email}
            </div>
            <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
              <HugeiconsIcon icon={Logout03Icon} size={18} color="currentColor" strokeWidth={1.5} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
