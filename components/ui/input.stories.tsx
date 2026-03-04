import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import {
  Search01Icon,
  Mail01Icon,
  UserIcon,
  Link01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";

const meta: Meta<typeof Input> = {
  title: "Design System/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "The size of the input",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
  },
  args: {
    placeholder: "Text",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Sizes ─────────────────────────────────────────────────

export const Large: Story = {
  args: {
    size: "lg",
    leadingIcon: Search01Icon,
  },
};

export const Medium: Story = {
  args: {
    size: "md",
    leadingIcon: Search01Icon,
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    leadingIcon: Search01Icon,
  },
};

// ─── With / Without Icon ──────────────────────────────────

export const WithIcon: Story = {
  args: {
    size: "lg",
    leadingIcon: Search01Icon,
    placeholder: "Search…",
  },
};

export const WithoutIcon: Story = {
  args: {
    size: "lg",
    placeholder: "Type something…",
  },
};

// ─── Different Icons ──────────────────────────────────────

export const MailIcon: Story = {
  args: {
    size: "lg",
    leadingIcon: Mail01Icon,
    placeholder: "Email address",
  },
};

export const UserIconStory: Story = {
  name: "User Icon",
  args: {
    size: "lg",
    leadingIcon: UserIcon,
    placeholder: "Username",
  },
};

export const LinkIcon: Story = {
  args: {
    size: "lg",
    leadingIcon: Link01Icon,
    placeholder: "Paste a link…",
  },
};

// ─── States ────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    size: "lg",
    leadingIcon: Search01Icon,
    disabled: true,
  },
};

export const DisabledWithoutIcon: Story = {
  args: {
    size: "lg",
    disabled: true,
    placeholder: "Disabled input",
  },
};

// ─── Gallery: All Sizes ───────────────────────────────────

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-medium text-gray-cool-500">With icon</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input size="lg" leadingIcon={Search01Icon} placeholder="Text" />
        <Input size="md" leadingIcon={Search01Icon} placeholder="Text" />
        <Input size="sm" leadingIcon={Search01Icon} placeholder="Text" />
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Without icon</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input size="lg" placeholder="Text" />
        <Input size="md" placeholder="Text" />
        <Input size="sm" placeholder="Text" />
      </div>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-medium text-gray-cool-500">Default</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input size="lg" leadingIcon={Search01Icon} placeholder="Text" />
        <Input size="md" leadingIcon={Search01Icon} placeholder="Text" />
        <Input size="sm" leadingIcon={Search01Icon} placeholder="Text" />
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Disabled</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input size="lg" leadingIcon={Search01Icon} placeholder="Text" disabled />
        <Input size="md" leadingIcon={Search01Icon} placeholder="Text" disabled />
        <Input size="sm" leadingIcon={Search01Icon} placeholder="Text" disabled />
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Various icons</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input size="lg" leadingIcon={Search01Icon} placeholder="Search…" />
        <Input size="lg" leadingIcon={Mail01Icon} placeholder="Email" />
        <Input size="lg" leadingIcon={FilterIcon} placeholder="Filter…" />
      </div>
    </div>
  ),
};
