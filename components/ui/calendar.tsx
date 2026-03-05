"use client"

import * as React from "react"
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DayPicker,
  getDefaultClassNames,
  type DateRange,
  type DayButton,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-bg-primary p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-end gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-start",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-gray-cool-200 shadow-xs has-focus:border-brand-500 has-focus:ring-[3px] has-focus:ring-brand-500/50",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-white opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-gray-cool-500",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-gray-cool-500 select-none",
          defaultClassNames.weekday
        ),
        weeks: cn("text-sm", defaultClassNames.weeks),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-gray-cool-500 select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-full",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-full"
            : "[&:first-child[data-selected=true]_button]:rounded-full",
          defaultClassNames.day
        ),
        range_start: "rounded-l-full rounded-r-none bg-gray-cool-100",
        range_middle: "rounded-none bg-gray-cool-100",
        range_end: "rounded-r-full rounded-l-none bg-gray-cool-100",
        today: cn(
          "rounded-full bg-gray-cool-100 text-gray-cool-900",
          defaultClassNames.today
        ),
        outside: cn(
          "text-gray-cool-500 opacity-40 aria-selected:text-gray-cool-500",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-gray-cool-500 opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          const icon =
            orientation === "left"
              ? ArrowLeft01Icon
              : orientation === "right"
                ? ArrowRight01Icon
                : ArrowDown01Icon

          return (
            <HugeiconsIcon
              icon={icon}
              size={18}
              color="currentColor"
              strokeWidth={2}
              className={cn(className)}
              {...props}
            />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative flex aspect-square size-auto w-full min-w-(--cell-size) items-center justify-center leading-none font-normal rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 group-data-[focused=true]/day:z-10 data-[range-end=true]:rounded-full data-[range-end=true]:bg-bg-brand data-[range-end=true]:text-white data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-gray-cool-100 data-[range-middle=true]:text-gray-cool-900 data-[range-start=true]:rounded-full data-[range-start=true]:bg-bg-brand data-[range-start=true]:text-white data-[selected-single=true]:bg-bg-brand data-[selected-single=true]:text-white [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      {props.children}
      {modifiers.today && (
        <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-bg-brand" />
      )}
    </Button>
  )
}

// ─── Range Calendar ──────────────────────────────────────────────────────────

function formatDate(date: Date | undefined): string {
  if (!date) return ""
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
}

function parseDate(value: string): Date | undefined {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return undefined
  const [, month, day, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (isNaN(date.getTime())) return undefined
  if (date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day))
    return undefined
  return date
}

type RangeCalendarProps = Omit<
  React.ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect"
> & {
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
}

function RangeCalendar({
  className,
  selected,
  onSelect,
  ...props
}: RangeCalendarProps) {
  const [fromInput, setFromInput] = React.useState("")
  const [toInput, setToInput] = React.useState("")
  const [activeField, setActiveField] = React.useState<"start" | "end">("start")

  const fromTime = selected?.from?.getTime()
  const toTime = selected?.to?.getTime()

  React.useEffect(() => {
    setFromInput(formatDate(selected?.from))
  }, [fromTime]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setToInput(formatDate(selected?.to))
  }, [toTime]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCalendarSelect(_range: DateRange | undefined, selectedDay: Date) {
    if (activeField === "start") {
      onSelect?.({ from: selectedDay, to: selected?.to })
      setActiveField("end")
    } else {
      onSelect?.({ from: selected?.from, to: selectedDay })
      setActiveField("start")
    }
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setFromInput(value)
    const date = parseDate(value)
    if (date) {
      onSelect?.({ from: date, to: selected?.to })
    }
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setToInput(value)
    const date = parseDate(value)
    if (date) {
      onSelect?.({ from: selected?.from, to: date })
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <Calendar
        mode="range"
        selected={selected}
        onSelect={handleCalendarSelect}
        {...props}
      />
      <div className="flex flex-col gap-2 border-t border-gray-cool-100 px-3 pb-3 pt-3">
        <div className={cn(
          "inline-flex w-full items-center gap-1.5 rounded-full border bg-alpha-900 px-[10px] py-[6px] text-text-xs",
          activeField === "start" ? "border-brand-500" : "border-gray-cool-100"
        )}>
          <span className="shrink-0 font-medium text-gray-cool-500">Start</span>
          <span className="text-gray-cool-500">-</span>
          <input
            value={fromInput}
            onChange={handleFromChange}
            onFocus={() => setActiveField("start")}
            placeholder="MM/DD/YYYY"
            className="min-w-0 flex-1 bg-transparent font-medium text-gray-cool-700 outline-none placeholder:text-gray-cool-300"
          />
        </div>
        <div className={cn(
          "inline-flex w-full items-center gap-1.5 rounded-full border bg-alpha-900 px-[10px] py-[6px] text-text-xs",
          activeField === "end" ? "border-brand-500" : "border-gray-cool-100"
        )}>
          <span className="shrink-0 font-medium text-gray-cool-500">End</span>
          <span className="text-gray-cool-500">-</span>
          <input
            value={toInput}
            onChange={handleToChange}
            onFocus={() => setActiveField("end")}
            placeholder="MM/DD/YYYY"
            className="min-w-0 flex-1 bg-transparent font-medium text-gray-cool-700 outline-none placeholder:text-gray-cool-300"
          />
        </div>
      </div>
    </div>
  )
}

export { Calendar, CalendarDayButton, RangeCalendar }
