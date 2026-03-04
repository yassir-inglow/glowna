"use client"

import { useRef, useState, useTransition } from "react"
import { Camera01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarAvvvatars, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useUser } from "@/components/dashboard/user-provider"
import { updateProfile, uploadAvatar } from "@/app/actions"

type ProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { email, fullName, avatarUrl, displayName } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(fullName ?? "")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()
  const [isUploading, startUploadTransition] = useTransition()

  const currentAvatarUrl = previewUrl ?? avatarUrl

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append("avatar", file)
    startUploadTransition(async () => {
      const url = await uploadAvatar(formData)
      if (url) setPreviewUrl(url)
    })
  }

  function handleSave() {
    startSaveTransition(async () => {
      await updateProfile(name)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-gray-cool-800">Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="group relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
            disabled={isUploading}
          >
            <Avatar size="xl">
              {currentAvatarUrl ? (
                <AvatarImage src={currentAvatarUrl} alt="Profile avatar" />
              ) : (
                <AvatarAvvvatars value={displayName} />
              )}
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <HugeiconsIcon
                icon={Camera01Icon}
                size={20}
                color="white"
                strokeWidth={1.5}
              />
            </span>
            {isUploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <svg className="size-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-text-xs text-gray-cool-400">
            Click to upload photo
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-text-sm font-medium text-gray-cool-500">
              Email
            </label>
            <Input
              value={email}
              disabled
              className="border-gray-cool-200 bg-gray-cool-50 text-gray-cool-400 disabled:opacity-70"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text-sm font-medium text-gray-cool-500">
              Full name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="border-gray-cool-200 bg-white text-gray-cool-800 placeholder:text-gray-cool-300"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
