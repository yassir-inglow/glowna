"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 21L16.65 16.65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

type SearchButtonProps = {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
}

export function SearchButton({ value, onValueChange, placeholder = "Search…" }: SearchButtonProps) {
  const controlled = value !== undefined
  const [isOpen, setIsOpen] = React.useState(false)
  const [internalQuery, setInternalQuery] = React.useState("")
  const query = controlled ? value : internalQuery
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const setQuery = (v: string) => {
    if (controlled) onValueChange?.(v)
    else setInternalQuery(v)
  }

  const open = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  const close = () => {
    setIsOpen(false)
    setQuery("")
  }

  // Close on Escape
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen])

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-[32px] items-center overflow-hidden rounded-full border border-gray-cool-100 bg-alpha-900 transition-[width] duration-300 ease-in-out",
        isOpen ? "w-[220px]" : "w-[32px]"
      )}
    >
      {/* Search icon — doubles as trigger when closed */}
      <button
        type="button"
        onClick={isOpen ? undefined : open}
        className={cn(
          "flex h-[32px] w-[32px] shrink-0 items-center justify-center text-gray-cool-500",
          !isOpen && "hover:text-gray-cool-700"
        )}
        aria-label={isOpen ? undefined : placeholder}
        tabIndex={isOpen ? -1 : 0}
      >
        <SearchIcon />
      </button>

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        tabIndex={isOpen ? 0 : -1}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-text-sm text-gray-cool-700 placeholder:text-gray-cool-400 outline-none transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Clear / close button */}
      <button
        type="button"
        onClick={close}
        aria-label="Close search"
        tabIndex={isOpen ? 0 : -1}
        className={cn(
          "mr-1 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-gray-cool-400 transition-opacity duration-200 hover:bg-alpha-800 hover:text-gray-cool-600",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <XIcon />
      </button>
    </div>
  )
}
