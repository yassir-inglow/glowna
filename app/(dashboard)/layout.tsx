import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/dashboard/app-header"


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

  const displayName = user.email?.split("@")[0] ?? "Jane"
  const firstName =
    displayName.charAt(0).toUpperCase() + displayName.slice(1)

  return (
    <div className="relative h-screen overflow-hidden bg-bg-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-[-1000px] z-0 h-[1500px] w-full -translate-x-1/2 rounded-full bg-gray-cool-200 blur-[900px]"
      />

      <div className="relative mx-auto flex h-full max-w-[1100px] flex-col">
        <div className="relative z-50">
          <AppHeader
            userEmail={user.email ?? ""}
            userInitial={firstName.charAt(0).toUpperCase()}
          />
        </div>
        <div className="flex w-full flex-1 flex-col items-center overflow-y-auto">
          {children}
        </div>
      </div>

    </div>
  )
}
