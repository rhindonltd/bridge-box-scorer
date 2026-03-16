import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import FormCard from "./FormCard";

const meta: Meta<typeof FormCard> = {
  title: "Common/FormCard",
  component: FormCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    header: "Example Form",
    headerColor: "bg-blue-600",
    primaryText: "Continue",
    onSubmit: fn(),
    onSecondaryClick: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof FormCard>;

export const Default: Story = {
  args: {
    children: (
      <>
        <input className="border p-2 rounded" placeholder="First field" />
        <input className="border p-2 rounded" placeholder="Second field" />
      </>
    ),
  },
};

export const WithSecondaryButton: Story = {
  args: {
    secondaryText: "Cancel",
    children: (
      <>
        <input className="border p-2 rounded" placeholder="First field" />
        <input className="border p-2 rounded" placeholder="Second field" />
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: (
      <input className="border p-2 rounded" placeholder="Loading example" />
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <input className="border p-2 rounded" placeholder="Disabled submit" />
    ),
  },
};
