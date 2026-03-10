import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/dashboard/app-header"
import { UserProvider } from "@/components/dashboard/user-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <UserProvider
      id={user.id}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? undefined}
      avatarUrl={profile?.avatar_url ?? undefined}
    >
      <div className="relative h-screen overflow-hidden bg-gray-cool-50">
        <div className="relative mx-auto flex h-full max-w-[1100px] flex-col">
          <div className="relative z-50">
            <AppHeader />
          </div>
          <div className="flex w-full flex-1 flex-col items-center overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </UserProvider>
  )
}
