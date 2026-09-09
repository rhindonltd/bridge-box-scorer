import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { HeaderMenu } from "./HeaderMenu";

const meta: Meta<typeof HeaderMenu> = {
  title: "Layout/HeaderMenu",
  component: HeaderMenu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HeaderMenu>;

/** Three navigation destinations with the second one active. */
export const Navigation: Story = {
  args: {
    label: "Setup menu",
    items: [
      { label: "Tables", onSelect: fn() },
      { label: "Movement", onSelect: fn(), active: true },
      { label: "Timer", onSelect: fn() },
    ],
  },
};

/** Plain action list with no active entry. */
export const Actions: Story = {
  args: {
    items: [
      { label: "Download USEBIO", onSelect: fn() },
      { label: "Delete game", onSelect: fn() },
    ],
  },
};
