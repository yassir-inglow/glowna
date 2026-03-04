import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectCard } from "./project-card";

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

/** Simulates the hover state by forcing the shadow + border via className override */
export const Hover: Story = {
  render: () => (
    <div className="w-[335px]">
      <article className="flex h-[200px] flex-col justify-between rounded-[24px] border border-gray-cool-200 bg-gradient-to-b from-gray-cool-25 to-gray-cool-50 p-4 shadow-[0px_7px_8px_-4px_rgba(93,107,152,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {["A", "B", "C"].map((letter, index) => (
              <div
                key={letter}
                className={`relative inline-flex size-6 shrink-0 rounded-full border-[1.5px] border-[#fdfdfd]${index > 0 ? " -ml-1" : ""}`}
                style={{ zIndex: 3 - index }}
              >
                <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-cool-100 text-[10px] font-medium text-gray-cool-600">
                  {letter}
                </span>
                <div className="pointer-events-none absolute inset-0 rounded-full border-[0.5px] border-black/[0.08]" />
              </div>
            ))}
          </div>
          <button type="button" className="rounded-full bg-gray-cool-100 p-1 text-gray-cool-500" aria-label="Project options">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="1.8" fill="currentColor" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
              <circle cx="19" cy="12" r="1.8" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          <h3 className="text-[22px]/none italic text-gray-cool-700 [font-family:'PT_Serif',serif]">Name Project</h3>
          <p className="text-text-sm font-medium text-gray-cool-400">this is description on the project</p>
        </div>
      </article>
    </div>
  ),
};

export const DefaultAndHover: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-text-xs font-medium uppercase tracking-wide text-gray-cool-400">Default</p>
      <ProjectCard id="story-dh-1" title="Name Project" description="this is description on the project" ownerId="00000000-0000-0000-0000-000000000001" />
      <p className="text-text-xs font-medium uppercase tracking-wide text-gray-cool-400">Hover (simulated)</p>
      <div className="[&_article]:border-gray-cool-200 [&_article]:shadow-[0px_7px_8px_-4px_rgba(93,107,152,0.1)]">
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
