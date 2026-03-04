import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";

function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

function AvatarStack({ compact = false }: { compact?: boolean }) {
  const avatars = compact ? ["A"] : ["A", "B", "C"];

  return (
    <AvatarGroup>
      {avatars.map((letter) => (
        <Avatar key={letter} size="xs" className="ring-[1.5px] ring-white">
          <AvatarFallback>{letter}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

export function ProjectCard({
  title,
  description,
  compactAvatars = false,
}: {
  title: string;
  description?: string;
  compactAvatars?: boolean;
}) {
  return (
    <article className="flex h-[200px] flex-col justify-between rounded-[24px] border border-gray-cool-100 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4 transition-all duration-200 hover:border-gray-cool-200 hover:shadow-[0px_7px_8px_-4px_rgba(93,107,152,0.1)]">
      <div className="flex items-center justify-between">
        <AvatarStack compact={compactAvatars} />
        <button
          type="button"
          className="rounded-full bg-gray-cool-50 p-1 text-gray-cool-500 transition-colors hover:bg-gray-cool-100"
          aria-label="Project options"
        >
          <MoreIcon />
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-[22px]/none italic text-gray-cool-700 [font-family:'PT_Serif',serif]">
          {title}
        </h3>
        {description ? (
          <p className="text-text-sm font-medium text-gray-cool-400">{description}</p>
        ) : null}
      </div>
    </article>
  );
}
