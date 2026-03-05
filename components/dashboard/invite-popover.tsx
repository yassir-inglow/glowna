"use client"

import { useState, useTransition } from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CircleLock01Icon, SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { inviteToProject } from "@/app/actions"
import { cn } from "@/lib/utils"

type InvitePopoverProps = {
  projectId: string
  className?: string
}

export function InvitePopover({ projectId, className }: InvitePopoverProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setResult(null)
    startTransition(async () => {
      const res = await inviteToProject(projectId, email.trim())
      if (res.success) {
        setResult({ type: "success", message: "Invitation sent!" })
        setEmail("")
        setTimeout(() => {
          setResult(null)
        }, 3000)
      } else {
        setResult({ type: "error", message: res.error ?? "Something went wrong" })
      }
    })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setEmail("")
      setResult(null)
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="xxs"
          leadingIcon={CircleLock01Icon}
          className={className}
        >
          Invite
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-[320px] rounded-2xl border border-gray-cool-100 bg-white p-4 shadow-[0px_8px_24px_-4px_rgba(93,107,152,0.16)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-text-sm font-medium text-gray-cool-700">
              Invite to project
            </p>
            <Input
              type="email"
              size="md"
              placeholder="colleague@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setResult(null)
              }}
              required
              autoFocus
              disabled={isPending}
              className="w-full bg-white border-gray-cool-200"
            />
            {result && (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-text-xs font-medium",
                  result.type === "success" ? "text-green-600" : "text-red-500",
                )}
              >
                {result.type === "success" && (
                  <HugeiconsIcon icon={SentIcon} size={14} color="currentColor" strokeWidth={1.5} />
                )}
                {result.message}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="xs"
              loading={isPending}
              className="w-full"
            >
              Send invite
            </Button>
          </form>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
