import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback, AvatarAvvvatars, AvatarGroup, AvatarAddButton, type AvatarSize } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "Design System/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Avvvatars ──────────────────────────────────────────────

export const WithAvvvatars: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-medium text-gray-cool-500">
        Powered by avvvatars — unique color + character for every value.
      </p>
      <div className="flex flex-wrap gap-3">
        {[
          "Alice Brown",
          "Charlie Davis",
          "Eve Foster",
          "George Hill",
          "Iris Jones",
          "tim@apple.com",
          "hello@glowna.io",
          "design@figma.com",
        ].map((value) => (
          <div key={value} className="flex flex-col items-center gap-1.5">
            <Avatar size="lg">
              <AvatarAvvvatars value={value} />
            </Avatar>
            <span className="max-w-[64px] truncate text-center text-text-xs text-gray-cool-400">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const AvvvatarsStyles: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Character style</p>
        <div className="flex gap-3">
          {["Alice Brown", "Charlie Davis", "Eve Foster", "George Hill"].map((v) => (
            <Avatar key={v} size="lg">
              <AvatarAvvvatars value={v} style="character" />
            </Avatar>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Shape style</p>
        <div className="flex gap-3">
          {["Alice Brown", "Charlie Davis", "Eve Foster", "George Hill"].map((v) => (
            <Avatar key={v} size="lg">
              <AvatarAvvvatars value={v} style="shape" />
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  ),
};

export const AvvvatarsSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as AvatarSize[]).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Avatar size={size}>
            <AvatarAvvvatars value="Alice Brown" />
          </Avatar>
          <span className="text-text-xs text-gray-cool-400">
            {size} · {({ xs: 24, sm: 32, md: 36, lg: 40, xl: 48 }[size])}px
          </span>
        </div>
      ))}
    </div>
  ),
};

export const AvvvatarsWithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {(["online", "offline", "busy", "away"] as const).map((status) => (
        <div key={status} className="flex flex-col items-center gap-2">
          <Avatar size="lg" status={status}>
            <AvatarAvvvatars value="Alice Brown" />
          </Avatar>
          <span className="capitalize text-text-xs text-gray-cool-400">{status}</span>
        </div>
      ))}
    </div>
  ),
};

export const AvvvatarsGroup: Story = {
  render: () => (
    <AvatarGroup>
      {["Alice Brown", "Charlie Davis", "Eve Foster", "George Hill"].map((seed) => (
        <Avatar key={seed} size="sm" className="ring-2 ring-white">
          <AvatarAvvvatars value={seed} />
        </Avatar>
      ))}
    </AvatarGroup>
  ),
};

// ─── Single Avatar ──────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <Avatar size="lg">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

// ─── Sizes ─────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as AvatarSize[]).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Avatar size={size}>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span className="text-text-xs text-gray-cool-400">
            {size} · {({ xs: 24, sm: 32, md: 36, lg: 40, xl: 48 }[size])}px
          </span>
        </div>
      ))}
    </div>
  ),
};

// ─── Avatar Group ───────────────────────────────────────────

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {["A", "B", "C", "D"].map((letter) => (
        <Avatar key={letter} className="size-8 ring-2 ring-white">
          <AvatarFallback>{letter}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  ),
};

export const GroupWithStatus: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar className="size-8 ring-2 ring-white" status="online">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar className="size-8 ring-2 ring-white" status="busy">
        <AvatarFallback>B</AvatarFallback>
      </Avatar>
      <Avatar className="size-8 ring-2 ring-white" status="away">
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <Avatar className="size-8 ring-2 ring-white" status="offline">
        <AvatarFallback>D</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  ),
};

export const GroupSmall: Story = {
  render: () => (
    <AvatarGroup>
      {["A", "B", "C", "D"].map((letter) => (
        <Avatar key={letter} className="size-6 ring-[1.5px] ring-white">
          <AvatarFallback>{letter}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  ),
};

export const GroupCompact: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar className="size-8 ring-2 ring-white" status="online">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  ),
};

// ─── Status / Online Badge ──────────────────────────────────

export const Online: Story = {
  render: () => (
    <Avatar className="size-10" status="online">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Offline: Story = {
  render: () => (
    <Avatar className="size-10" status="offline">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Busy: Story = {
  render: () => (
    <Avatar className="size-10" status="busy">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const Away: Story = {
  render: () => (
    <Avatar className="size-10" status="away">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">All statuses</p>
        <div className="flex items-center gap-6">
          {(["online", "offline", "busy", "away"] as const).map((status) => (
            <div key={status} className="flex flex-col items-center gap-2">
              <Avatar className="size-10" status={status}>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <span className="capitalize text-text-xs text-gray-cool-400">{status}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">All sizes — online</p>
        <div className="flex items-end gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as AvatarSize[]).map((size) => (
            <Avatar key={size} size={size} status="online">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  ),
};

// ─── Add Button ──────────────────────────────────────────────

export const AddButton: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as AvatarSize[]).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <AvatarAddButton size={size} />
          <span className="text-text-xs text-gray-cool-400">{size}</span>
        </div>
      ))}
    </div>
  ),
};

export const GroupWithAddButton: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Group with add button</p>
        <AvatarGroup>
          {["Alice Brown", "Charlie Davis", "Eve Foster"].map((seed) => (
            <Avatar key={seed} size="xs" className="ring-[1.5px] ring-white">
              <AvatarAvvvatars value={seed} />
            </Avatar>
          ))}
          <AvatarAddButton size="xs" className="ring-[1.5px] ring-white" />
        </AvatarGroup>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Larger group with add button</p>
        <AvatarGroup>
          {["Alice Brown", "Charlie Davis"].map((seed) => (
            <Avatar key={seed} size="sm" className="ring-2 ring-white">
              <AvatarAvvvatars value={seed} />
            </Avatar>
          ))}
          <AvatarAddButton size="sm" className="ring-2 ring-white" />
        </AvatarGroup>
      </div>
    </div>
  ),
};

// ─── Gallery ────────────────────────────────────────────────

export const Gallery: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Single — sizes</p>
        <div className="flex items-end gap-3">
          {(["xs", "sm", "md", "lg", "xl"] as AvatarSize[]).map((size) => (
            <Avatar key={size} size={size}>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Single — initials</p>
        <div className="flex items-end gap-3">
          {["JD", "AB", "MK"].map((initials) => (
            <Avatar key={initials} className="size-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Group — large</p>
        <AvatarGroup>
          {["A", "B", "C", "D"].map((letter) => (
            <Avatar key={letter} className="size-8 ring-2 ring-white">
              <AvatarFallback>{letter}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </div>
      <div>
        <p className="mb-3 text-text-sm font-medium text-gray-cool-500">Group — small</p>
        <AvatarGroup>
          {["A", "B", "C", "D"].map((letter) => (
            <Avatar key={letter} className="size-6 ring-[1.5px] ring-white">
              <AvatarFallback>{letter}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </div>
    </div>
  ),
};
