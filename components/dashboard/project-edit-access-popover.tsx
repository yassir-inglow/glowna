"use client"

import * as React from "react"

import { requestProjectEditAccess } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type RequestState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null

export type ProjectEditAccessPrompt = {
  projectId: string
  projectName?: string | null
  actionLabel?: string
}

export function ProjectEditAccessPopover({
  projectId,
  projectName,
  actionLabel = "make changes",
  children,
}: ProjectEditAccessPrompt & {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [requestState, setRequestState] = React.useState<RequestState>(null)
  const [isPending, startTransition] = React.useTransition()

  const resolvedProjectName = projectName?.trim() || "this project"

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setRequestState(null)
    }
  }

  function handleRequest() {
    setRequestState(null)
    startTransition(async () => {
      const result = await requestProjectEditAccess(projectId)
      if (!result.success) {
        setRequestState({
          type: "error",
          message: result.error ?? "Couldn't send your request. Please try again.",
        })
        return
      }

      setRequestState({
        type: "success",
        message: "Request sent to the project owner. If they approve it, you'll get Can edit access here.",
      })
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <span
          className="inline-flex cursor-pointer [&_button]:cursor-pointer"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-[320px] p-4"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-text-sm font-semibold text-gray-cool-900">
              You have Can view only access
            </p>
            <p className="text-text-sm font-medium leading-snug text-gray-cool-600">
              Only editors can {actionLabel} in{" "}
              <span className="font-semibold text-gray-cool-900">{resolvedProjectName}</span>.
              Ask the owner to give you Can edit access.
            </p>
          </div>

          {requestState ? (
            <p
              className={
                requestState.type === "success"
                  ? "text-text-xs font-medium text-success-600"
                  : "text-text-xs font-medium text-red-500"
              }
            >
              {requestState.message}
            </p>
          ) : null}

          <Button
            type="button"
            variant="primary"
            size="xs"
            onClick={handleRequest}
            disabled={isPending || requestState?.type === "success"}
            loading={isPending}
            className="w-full"
          >
            {requestState?.type === "success" ? "Request sent" : "Request edit access"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
