import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "text-xs",
            "text-sm",
            "text-md",
            "text-lg",
            "text-xl",
            "display-xs",
            "display-sm",
            "display-md",
            "display-lg",
            "display-xl",
            "display-2xl",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
