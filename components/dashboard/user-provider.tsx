"use client"

import * as React from "react"

type UserData = {
  id: string
  email: string
  fullName?: string
  displayName: string
  initial: string
  firstName: string
}

const UserContext = React.createContext<UserData | null>(null)

export function useUser() {
  const ctx = React.useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within <UserProvider>")
  return ctx
}

export function UserProvider({
  id,
  email,
  fullName,
  children,
}: {
  id: string
  email: string
  fullName?: string
  children: React.ReactNode
}) {
  const emailName = email.split("@")[0] ?? "Jane"
  const firstName = fullName
    ? fullName.trim().split(/\s+/)[0]
    : emailName.charAt(0).toUpperCase() + emailName.slice(1)
  const displayName = fullName ?? email

  const value = React.useMemo<UserData>(
    () => ({
      id,
      email,
      fullName,
      displayName,
      initial: firstName.charAt(0).toUpperCase(),
      firstName,
    }),
    [id, email, fullName, displayName, firstName],
  )

  return <UserContext value={value}>{children}</UserContext>
}
