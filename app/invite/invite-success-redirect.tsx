"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function InviteSuccessRedirect({ projectId }: { projectId: string }) {
  const router = useRouter()
  const href = `/?project=${projectId}`

  useEffect(() => {
    router.replace(href)
    router.refresh()

    const timeout = window.setTimeout(() => {
      window.location.assign(href)
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [href, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="flex w-full max-w-[404px] flex-col items-center gap-4 rounded-[32px] bg-white p-8 text-center">
        <h1 className="text-display-xs font-medium text-text-secondary">
          Opening project
        </h1>
        <p className="text-text-md font-medium text-text-placeholder">
          Your invitation was accepted. We&apos;re taking you to the project now.
        </p>
      </div>
    </div>
  )
}
