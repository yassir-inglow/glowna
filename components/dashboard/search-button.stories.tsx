import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchButton } from "./search-button";

const meta: Meta<typeof SearchButton> = {
  title: "Dashboard/SearchButton",
  component: SearchButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── States ────────────────────────────────────────────────

export const Default: Story = {};

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-[32px] bg-bg-primary p-6">
      <SearchButton />
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-2 text-text-sm font-medium text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        New Project
      </button>
    </div>
  ),
};
