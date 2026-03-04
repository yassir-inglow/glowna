"use client"

import * as React from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export type ProjectTabValue = "project" | "tasks"

type ProjectTabsProps = {
  value?: ProjectTabValue
  defaultValue?: ProjectTabValue
  onValueChange?: (value: ProjectTabValue) => void
  taskCount?: number
}

function ProjectTabs({
  value,
  defaultValue = "project",
  onValueChange,
  taskCount = 0,
}: ProjectTabsProps) {
  const [internalValue, setInternalValue] = React.useState<ProjectTabValue>(defaultValue)
  const activeValue = value ?? internalValue

  const handleValueChange = (nextValue: string) => {
    const resolvedValue = nextValue as ProjectTabValue

    if (value === undefined) {
      setInternalValue(resolvedValue)
    }

    onValueChange?.(resolvedValue)
  }

  return (
    <Tabs value={activeValue} onValueChange={handleValueChange} className="gap-0">
      <TabsList className="relative h-auto w-[260px] overflow-hidden !rounded-full bg-gray-cool-100 p-px">
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-px w-[calc(50%-1px)] !rounded-[512px] bg-gray-cool-25 shadow-[0_4px_12px_-6px_rgba(93,107,152,0.2)] transition-transform duration-300 ease-out",
            activeValue === "project" ? "translate-x-0" : "translate-x-full"
          )}
        />

        <TabsTrigger
          value="project"
          className="relative z-10 w-1/2 !rounded-full py-2 text-text-sm font-medium text-gray-cool-400 transition-colors duration-200 data-[state=active]:text-gray-cool-700"
        >
          Project
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className="relative z-10 flex w-1/2 items-center justify-center gap-2 !rounded-full py-2 text-text-sm font-medium text-gray-cool-400 transition-colors duration-200 data-[state=active]:text-gray-cool-700"
        >
          My tasks
          <span className="!rounded-full bg-brand-500 px-1.5 text-text-sm font-semibold text-white">
            {taskCount}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export { ProjectTabs }
