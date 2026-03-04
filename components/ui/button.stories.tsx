import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "./button";
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Download04Icon,
  Edit02Icon,
  FavouriteIcon,
  Search01Icon,
  Settings01Icon,
  Share01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";

const meta: Meta<typeof Button> = {
  title: "Design System/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
      description: "The visual style of the button",
    },
    size: {
      control: "select",
      options: [
        "xxs", "xs", "sm", "md", "lg",
        "icon-xxs", "icon-xs", "icon-sm", "icon-md", "icon-lg",
      ],
      description: "The size of the button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    loading: {
      control: "boolean",
      description: "Whether the button shows a loading spinner",
    },
    children: {
      control: "text",
      description: "Button label",
    },
  },
  args: {
    onClick: fn(),
    children: "Text",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Variants ──────────────────────────────────────────────

export const Primary: Story = {
  args: {
    variant: "primary",
    leadingIcon: Add01Icon,
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    leadingIcon: Add01Icon,
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    leadingIcon: Add01Icon,
  },
};

// ─── Sizes ─────────────────────────────────────────────────

export const SizeXxs: Story = {
  args: {
    variant: "primary",
    size: "xxs",
    leadingIcon: Add01Icon,
  },
};

export const SizeXs: Story = {
  args: {
    variant: "primary",
    size: "xs",
    leadingIcon: Add01Icon,
  },
};

export const SizeSm: Story = {
  args: {
    variant: "primary",
    size: "sm",
    leadingIcon: Add01Icon,
  },
};

export const SizeMd: Story = {
  args: {
    variant: "primary",
    size: "md",
    leadingIcon: Add01Icon,
  },
};

export const SizeLg: Story = {
  args: {
    variant: "primary",
    size: "lg",
    leadingIcon: Add01Icon,
  },
};

// ─── With Icons ────────────────────────────────────────────

export const WithLeadingIcon: Story = {
  args: {
    variant: "primary",
    size: "md",
    leadingIcon: Add01Icon,
    children: "Text",
  },
};

export const WithTrailingIcon: Story = {
  args: {
    variant: "primary",
    size: "md",
    trailingIcon: ArrowRight01Icon,
    children: "Text",
  },
};

export const WithBothIcons: Story = {
  args: {
    variant: "secondary",
    size: "md",
    leadingIcon: Add01Icon,
    trailingIcon: ArrowRight01Icon,
    children: "Text",
  },
};

export const IconOnly: Story = {
  args: {
    variant: "primary",
    size: "lg",
    iconOnly: Add01Icon,
    "aria-label": "Add item",
  },
};

export const IconOnlySecondary: Story = {
  args: {
    variant: "secondary",
    size: "lg",
    iconOnly: Add01Icon,
    "aria-label": "Add",
  },
};

// ─── Loading State ─────────────────────────────────────────

export const Loading: Story = {
  args: {
    variant: "primary",
    size: "md",
    loading: true,
    leadingIcon: Add01Icon,
    children: "Text",
  },
};

export const LoadingSecondary: Story = {
  args: {
    variant: "secondary",
    size: "md",
    loading: true,
    leadingIcon: Add01Icon,
    children: "Text",
  },
};

export const LoadingIconOnly: Story = {
  args: {
    variant: "primary",
    size: "lg",
    loading: true,
    iconOnly: Add01Icon,
    "aria-label": "Loading",
  },
};

// ─── States ────────────────────────────────────────────────

export const Disabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    leadingIcon: Add01Icon,
    children: "Text",
  },
};

export const DisabledSecondary: Story = {
  args: {
    variant: "secondary",
    disabled: true,
    leadingIcon: Add01Icon,
    children: "Text",
  },
};

// ─── Gallery: All Variants ─────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" leadingIcon={Add01Icon}>Text</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" leadingIcon={Add01Icon} trailingIcon={ArrowRight01Icon}>Text</Button>
        <Button variant="secondary" leadingIcon={Add01Icon} trailingIcon={ArrowRight01Icon}>Text</Button>
        <Button variant="ghost" leadingIcon={Add01Icon} trailingIcon={ArrowRight01Icon}>Text</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" loading leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" loading leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" loading leadingIcon={Add01Icon}>Text</Button>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-medium text-gray-cool-500">Primary — all sizes</p>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="primary" size="xxs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="primary" size="xs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="primary" size="sm" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="primary" size="md" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="primary" size="lg" leadingIcon={Add01Icon}>Text</Button>
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Secondary — all sizes</p>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="secondary" size="xxs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" size="xs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" size="sm" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" size="md" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="secondary" size="lg" leadingIcon={Add01Icon}>Text</Button>
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Ghost — all sizes</p>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="ghost" size="xxs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" size="xs" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" size="sm" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" size="md" leadingIcon={Add01Icon}>Text</Button>
        <Button variant="ghost" size="lg" leadingIcon={Add01Icon}>Text</Button>
      </div>
    </div>
  ),
};

export const IconOnlySizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-text-sm font-medium text-gray-cool-500">Primary — icon only</p>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="primary" size="icon-xxs" iconOnly={Add01Icon} aria-label="Add" />
        <Button variant="primary" size="icon-sm" iconOnly={Add01Icon} aria-label="Add" />
        <Button variant="primary" size="icon-lg" iconOnly={Add01Icon} aria-label="Add" />
      </div>
      <p className="text-text-sm font-medium text-gray-cool-500">Secondary — icon only</p>
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="secondary" size="icon-xxs" iconOnly={Add01Icon} aria-label="Add" />
        <Button variant="secondary" size="icon-sm" iconOnly={Add01Icon} aria-label="Add" />
        <Button variant="secondary" size="icon-lg" iconOnly={Add01Icon} aria-label="Add" />
      </div>
    </div>
  ),
};
