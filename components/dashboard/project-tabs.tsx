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
      <TabsList className="relative h-9 w-[260px] overflow-hidden !rounded-full bg-alpha-800 p-0.5">
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0.5 w-[calc(50%-2px)] !rounded-full bg-white transition-transform duration-300 ease-out",
            activeValue === "project" ? "translate-x-0" : "translate-x-full"
          )}
        />

        <TabsTrigger
          value="project"
          className="relative z-10 h-full w-1/2 !rounded-full text-text-sm font-medium text-gray-cool-400 transition-colors duration-200 data-[state=active]:text-gray-cool-900"
        >
          Project
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className="relative z-10 flex h-full w-1/2 items-center justify-center gap-1 !rounded-full text-text-sm font-medium text-gray-cool-400 transition-colors duration-200 data-[state=active]:text-gray-cool-900"
        >
          My Tasks
          <span className="!rounded-full bg-alpha-700 px-1.5 text-text-sm font-medium text-gray-cool-700">
            {taskCount}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export { ProjectTabs }
