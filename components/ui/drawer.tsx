"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Drawer({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerContent({
  className,
  children,
  open,
}: {
  className?: string
  children: React.ReactNode
  open?: boolean
}) {
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    isFirstRender.current = false
  }, [])

  const skipAnimation = isFirstRender.current && open

  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>
        {open && (
          <>
            <DialogPrimitive.Overlay
              data-slot="drawer-overlay"
              className="pointer-events-none fixed inset-0 z-40"
            />
            <DialogPrimitive.Content
              data-slot="drawer-content"
              className={cn(
                "fixed inset-x-0 bottom-0 top-[78px] z-50 flex flex-col overflow-visible rounded-t-[32px] bg-bg-primary shadow-[0px_-8px_32px_-4px_rgba(93,107,152,0.12)] outline-none",
                className,
              )}
              asChild
              forceMount
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <motion.div
                initial={skipAnimation ? false : { opacity: 0, y: "15%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "15%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <DialogPrimitive.Title className="sr-only">
                  Project details
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  View and manage project tasks
                </DialogPrimitive.Description>
                <div className="absolute left-1/2 -top-3 -translate-x-1/2 -translate-y-[calc(50%+24px)]">
                  <DialogPrimitive.Close asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      aria-label="Close"
                      className="border-0 bg-white/50 text-gray-cool-500 hover:bg-white/80"
                    >
                      <CloseIcon />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  )
}

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent }
