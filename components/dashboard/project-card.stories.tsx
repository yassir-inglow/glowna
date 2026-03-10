import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectCard, ProjectCardSkeleton } from "./project-card";

const meta: Meta<typeof ProjectCard> = {
  title: "Dashboard/ProjectCard",
  component: ProjectCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "The project title",
    },
    description: {
      control: "text",
      description: "Optional project description",
    },
    compactAvatars: {
      control: "boolean",
      description: "Show a single avatar instead of the full stack",
    },
  },
  args: {
    id: "story-1",
    title: "Name Project",
    description: "This is a description of the project",
    compactAvatars: false,
    ownerId: "00000000-0000-0000-0000-000000000001",
  },
  decorators: [
    (Story) => (
      <div className="w-[335px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── States ────────────────────────────────────────────────

export const Default: Story = {
  args: {
    id: "story-default",
    title: "Name Project",
    description: "this is description on the project",
    compactAvatars: false,
    ownerId: "00000000-0000-0000-0000-000000000001",
  },
};

/** Simulates the hover state by forcing the bg + visible 3-dot via className override */
export const Hover: Story = {
  render: () => (
    <div className="w-[335px] [&_article]:bg-alpha-800 [&_button[aria-label]]:opacity-100">
      <ProjectCard id="story-hover" title="Name Project" description="this is description on the project" ownerId="00000000-0000-0000-0000-000000000001" />
    </div>
  ),
};

export const DefaultAndHover: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-text-xs font-medium uppercase tracking-wide text-gray-cool-400">Default</p>
      <ProjectCard id="story-dh-1" title="Name Project" description="this is description on the project" ownerId="00000000-0000-0000-0000-000000000001" />
      <p className="text-text-xs font-medium uppercase tracking-wide text-gray-cool-400">Hover (simulated)</p>
      <div className="[&_article]:bg-alpha-800">
        <ProjectCard id="story-dh-2" title="Name Project" description="this is description on the project" ownerId="00000000-0000-0000-0000-000000000001" />
      </div>
    </div>
  ),
};

// ─── Variants ──────────────────────────────────────────────

export const WithoutDescription: Story = {
  args: {
    id: "story-no-desc",
    title: "Name Project",
    description: undefined,
    compactAvatars: false,
    ownerId: "00000000-0000-0000-0000-000000000001",
  },
};

export const CompactAvatars: Story = {
  args: {
    id: "story-compact",
    title: "Name Project",
    description: "Solo project",
    compactAvatars: true,
    ownerId: "00000000-0000-0000-0000-000000000001",
  },
};

// ─── Skeleton ───────────────────────────────────────────────

export const Skeleton: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-3 gap-6" style={{ width: 1060 }}>
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    ),
  ],
};

// ─── Gallery ───────────────────────────────────────────────

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6" style={{ width: 1060 }}>
      <ProjectCard id="story-grid-1" title="Brand Redesign" description="Full visual identity refresh for Q3 launch" ownerId="00000000-0000-0000-0000-000000000001" />
      <ProjectCard id="story-grid-2" title="Mobile App" compactAvatars ownerId="00000000-0000-0000-0000-000000000001" />
      <ProjectCard id="story-grid-3" title="Dashboard v2" description="Analytics and reporting overhaul" ownerId="00000000-0000-0000-0000-000000000001" />
    </div>
  ),
};
