import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Calendar, RangeCalendar } from "./calendar"
import type { DateRange } from "react-day-picker"

const meta: Meta<typeof Calendar> = {
  title: "Design System/Calendar",
  component: Calendar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

// ─── Single Date ────────────────────────────────────────────

export const Single: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border border-gray-cool-100"
      />
    )
  },
}

// ─── Range ──────────────────────────────────────────────────

export const Range: Story = {
  render: () => {
    const [range, setRange] = React.useState<DateRange | undefined>({
      from: new Date(),
      to: new Date(Date.now() + 5 * 86_400_000),
    })
    return (
      <RangeCalendar
        selected={range}
        onSelect={setRange}
        className="rounded-lg border border-gray-cool-100"
      />
    )
  },
}

// ─── With Dropdown Caption ──────────────────────────────────

export const DropdownCaption: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2030, 11)}
        className="rounded-lg border border-gray-cool-100"
      />
    )
  },
}

// ─── No Selection ───────────────────────────────────────────

export const Empty: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>()
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border border-gray-cool-100"
      />
    )
  },
}
