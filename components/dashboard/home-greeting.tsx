"use client"

import { useUser } from "@/components/dashboard/user-provider"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function HomeGreeting() {
  const { firstName } = useUser()

  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())

  return (
    <section className="space-y-1.5 text-center">
      <p className="text-text-xl font-medium text-gray-cool-400">
        {currentDate}
      </p>
      <h1 className="text-[72px]/none italic text-gray-cool-800 [font-family:'PT_Serif',serif]">
        {getGreeting()}, {firstName}
      </h1>
    </section>
  )
}
