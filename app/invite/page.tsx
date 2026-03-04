import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { acceptInvitation } from "@/app/actions"

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    redirect("/")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const encodedNext = encodeURIComponent(`/invite?token=${token}`)
    redirect(`/login?next=${encodedNext}`)
  }

  const result = await acceptInvitation(token)

  if (result.projectId) {
    redirect(`/projects/${result.projectId}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="flex w-full max-w-[404px] flex-col items-center gap-4 rounded-[32px] bg-white p-8">
        <h1 className="text-display-xs font-medium text-text-secondary">
          Invitation error
        </h1>
        <p className="text-center text-text-md font-medium text-text-placeholder">
          {result.error ?? "Something went wrong with this invitation."}
        </p>
        <a
          href="/"
          className="text-text-sm font-medium text-text-brand transition-colors hover:opacity-80"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
