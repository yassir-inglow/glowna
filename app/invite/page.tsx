import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import {
  acceptInvitationForCurrentUser,
  getInvitationContext,
} from "@/lib/project-invitations"

import { InviteAuthCard } from "./invite-auth-card"
import { InviteSuccessRedirect } from "./invite-success-redirect"
import { InviteWrongAccountActions } from "./invite-wrong-account-actions"

function buildInviteLoginHref({
  invitedEmail,
  inviterName,
  nextUrl,
  projectName,
}: {
  invitedEmail: string
  inviterName: string
  nextUrl: string
  projectName: string
}) {
  const params = new URLSearchParams()
  params.set("next", nextUrl)
  params.set("invite", "1")
  params.set("email", invitedEmail)
  params.set("project", projectName)
  params.set("inviter", inviterName)
  return `/login?${params.toString()}`
}

function InviteShell({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
      <div className="flex w-full max-w-[440px] flex-col gap-3">
        <div className="flex flex-col items-center gap-1.5 pb-3">
          <p className="text-text-sm font-medium text-text-brand">Glowna invite</p>
          <h1 className="text-center text-display-xs font-medium text-text-secondary">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

function InviteInfoCard({
  invitedEmail,
  inviterName,
  projectName,
  subtitle,
}: {
  invitedEmail: string
  inviterName: string
  projectName: string
  subtitle: string
}) {
  return (
    <div className="rounded-[32px] bg-white p-8">
      <div className="flex flex-col gap-3 text-center">
        <p className="text-text-md font-medium text-text-placeholder">
          <span className="text-text-secondary">{inviterName}</span> invited you to join{" "}
          <span className="text-text-secondary">&quot;{projectName}&quot;</span>.
        </p>
        <p className="text-text-sm font-medium text-text-placeholder">{subtitle}</p>
      </div>

      <div className="mt-5 rounded-[24px] border border-gray-cool-100 bg-alpha-900 px-4 py-3 text-center">
        <p className="text-text-xs font-medium uppercase tracking-[0.12em] text-gray-cool-300">
          Invited email
        </p>
        <p className="mt-1 text-text-md font-medium text-text-secondary">
          {invitedEmail}
        </p>
      </div>
    </div>
  )
}

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[]
    hasAccount?: string | string[]
    inviter?: string | string[]
    project?: string | string[]
    token?: string | string[]
  }>
}) {
  const params = await searchParams
  const tokenParam = params.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  const fallbackEmailParam = Array.isArray(params.email) ? params.email[0] : params.email
  const fallbackProjectParam = Array.isArray(params.project) ? params.project[0] : params.project
  const fallbackInviterParam = Array.isArray(params.inviter) ? params.inviter[0] : params.inviter
  const fallbackHasAccountParam = Array.isArray(params.hasAccount)
    ? params.hasAccount[0]
    : params.hasAccount

  if (!token) {
    redirect("/")
  }

  const inviteLookup = await getInvitationContext(token)
  const legacyLoginHref = `/login?next=${encodeURIComponent(`/invite?token=${token}`)}`
  const fallbackInviteContext =
    fallbackEmailParam && fallbackProjectParam && fallbackInviterParam
      ? {
          hasAccount: fallbackHasAccountParam === "1",
          invitedEmail: fallbackEmailParam,
          inviterName: fallbackInviterParam,
          isExpired: false,
          projectId: "",
          projectName: fallbackProjectParam,
          status: "pending",
        }
      : null

  if (!inviteLookup.context && inviteLookup.reason === "lookup_unavailable") {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      if (fallbackInviteContext) {
        return (
          <InviteShell title={fallbackInviteContext.hasAccount ? "Sign in to join" : "Create your account"}>
            <InviteInfoCard
              invitedEmail={fallbackInviteContext.invitedEmail}
              inviterName={fallbackInviteContext.inviterName}
              projectName={fallbackInviteContext.projectName}
              subtitle={
                fallbackInviteContext.hasAccount
                  ? "Use this invited email to sign in, and we'll open the project right after."
                  : "You're new to Glowna. Create your account with this invited email, and we'll take you straight to the project afterward."
              }
            />
            <InviteAuthCard
              email={fallbackInviteContext.invitedEmail}
              hasAccount={fallbackInviteContext.hasAccount}
              nextUrl={`/invite?token=${token}`}
            />
          </InviteShell>
        )
      }

      return (
        <InviteShell title="Open your invitation">
          <div className="rounded-[32px] bg-white p-8 text-center">
            <p className="text-text-md font-medium text-text-placeholder">
              Your invitation is ready. Continue to sign in or create your account, and
              we&apos;ll connect it to the project right after.
            </p>
            <Button asChild size="xl" className="mt-6 w-full">
              <Link href={legacyLoginHref}>Continue</Link>
            </Button>
          </div>
        </InviteShell>
      )
    }

    const result = await acceptInvitationForCurrentUser(token)

    if (result.projectId) {
      return <InviteSuccessRedirect projectId={result.projectId} />
    }

    return (
      <InviteShell title="Invitation error">
        <div className="rounded-[32px] bg-white p-8 text-center">
          <p className="text-text-md font-medium text-text-placeholder">
            {result.error ?? "Something went wrong with this invitation."}
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={legacyLoginHref}>Try again</Link>
          </Button>
        </div>
      </InviteShell>
    )
  }

  if (!inviteLookup.context) {
    return (
      <InviteShell title="Invitation unavailable">
        <div className="rounded-[32px] bg-white p-8 text-center">
          <p className="text-text-md font-medium text-text-placeholder">
            {inviteLookup.error}
          </p>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/">Go to dashboard</Link>
          </Button>
        </div>
      </InviteShell>
    )
  }

  const invite = inviteLookup.context
  const loginHref = buildInviteLoginHref({
    invitedEmail: invite.invitedEmail,
    inviterName: invite.inviterName,
    nextUrl: `/invite?token=${token}`,
    projectName: invite.projectName,
  })

  if (invite.isExpired || invite.status === "expired" || invite.status === "declined") {
    return (
      <InviteShell title="Invitation expired">
        <InviteInfoCard
          invitedEmail={invite.invitedEmail}
          inviterName={invite.inviterName}
          projectName={invite.projectName}
          subtitle="This invitation is no longer active. Ask the project owner to send you a fresh invite."
        />
        <Button asChild size="lg" className="w-full">
          <Link href="/">Go to dashboard</Link>
        </Button>
      </InviteShell>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <InviteShell title={invite.hasAccount ? "Sign in to join" : "Create your account"}>
        <InviteInfoCard
          invitedEmail={invite.invitedEmail}
          inviterName={invite.inviterName}
          projectName={invite.projectName}
          subtitle={
            invite.hasAccount
              ? "Use this invited email to sign in, and we'll open the project right after."
              : "You're new to Glowna. Create your account with this invited email, and we'll take you straight to the project afterward."
          }
        />
        <InviteAuthCard
          email={invite.invitedEmail}
          hasAccount={invite.hasAccount}
          nextUrl={`/invite?token=${token}`}
        />
      </InviteShell>
    )
  }

  const viewerEmail = user.email?.trim().toLowerCase() ?? null
  const invitedEmail = invite.invitedEmail.trim().toLowerCase()

  if (viewerEmail !== invitedEmail) {
    return (
      <InviteShell title="Use the invited account">
        <InviteInfoCard
          invitedEmail={invite.invitedEmail}
          inviterName={invite.inviterName}
          projectName={invite.projectName}
          subtitle="You're signed in with a different account. Switch to the invited email to join this project."
        />
        <InviteWrongAccountActions
          currentEmail={user.email ?? "Unknown account"}
          loginHref={loginHref}
        />
      </InviteShell>
    )
  }

  const result = await acceptInvitationForCurrentUser(token)

  if (result.projectId) {
    return <InviteSuccessRedirect projectId={result.projectId} />
  }

  return (
    <InviteShell title="Invitation error">
      <InviteInfoCard
        invitedEmail={invite.invitedEmail}
        inviterName={invite.inviterName}
        projectName={invite.projectName}
        subtitle={result.error ?? "Something went wrong with this invitation."}
      />
      <Button asChild size="lg" className="w-full">
        <Link href={loginHref}>Try again</Link>
      </Button>
    </InviteShell>
  )
}
