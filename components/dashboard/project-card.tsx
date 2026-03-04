import Link from "next/link";
import { Avatar, AvatarAvvvatars, AvatarGroup } from "@/components/ui/avatar";
import type { ProjectMember } from "@/lib/data";

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

function AvatarStack({ members, compact = false }: { members: ProjectMember[]; compact?: boolean }) {
  const visible = compact ? members.slice(0, 1) : members;

  if (visible.length === 0) return null;

  return (
    <AvatarGroup>
      {visible.map((member) => (
        <Avatar key={member.id} size="xs" className="ring-[1.5px] ring-white">
          <AvatarAvvvatars value={member.full_name ?? member.email ?? member.id} />
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

export function ProjectCard({
  id,
  title,
  description,
  compactAvatars = false,
  members = [],
}: {
  id: string;
  title: string;
  description?: string;
  compactAvatars?: boolean;
  members?: ProjectMember[];
}) {
  return (
    <Link href={`/projects/${id}`} className="block">
      <article className="flex h-[200px] flex-col justify-between rounded-[24px] border border-gray-cool-100 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4 transition-all duration-200 hover:border-gray-cool-200 hover:shadow-[0px_7px_8px_-4px_rgba(93,107,152,0.1)]">
        <div className="flex items-center justify-between">
          <AvatarStack members={members} compact={compactAvatars} />
          <button
            type="button"
            className="relative z-10 rounded-full bg-gray-cool-50 p-1 text-gray-cool-500 transition-colors hover:bg-gray-cool-100"
            aria-label="Project options"
            onClick={(e) => e.preventDefault()}
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
    </Link>
  );
}
