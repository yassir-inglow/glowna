"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function InviteWrongAccountActions({
  currentEmail,
  loginHref,
}: {
  currentEmail: string
  loginHref: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleSwitchAccount() {
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = loginHref
  }

  return (
    <div className="rounded-[32px] bg-white p-8">
      <div className="rounded-[24px] border border-gray-cool-100 bg-alpha-900 px-4 py-3 text-center">
        <p className="text-text-xs font-medium uppercase tracking-[0.12em] text-gray-cool-300">
          Current account
        </p>
        <p className="mt-1 text-text-md font-medium text-text-secondary">
          {currentEmail}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button
          type="button"
          size="xl"
          className="w-full"
          loading={loading}
          onClick={handleSwitchAccount}
        >
          Sign out and continue
        </Button>
        <Button asChild variant="secondary" size="xl" className="w-full">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
