"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/components/dashboard/user-provider"

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

export function HomeGreeting() {
  const { firstName } = useUser()
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  return (
    <section className="flex flex-col items-center text-center">
      <p className="text-display-xs font-medium text-gray-cool-300">
        {now ? formatDate(now) : "\u00A0"}
      </p>
      <h1 className="text-display-lg font-medium tracking-[-0.96px] text-gray-cool-900">
        {now ? `${getGreeting(now.getHours())}, ${firstName}` : `Hello, ${firstName}`}
      </h1>
    </section>
  )
}
