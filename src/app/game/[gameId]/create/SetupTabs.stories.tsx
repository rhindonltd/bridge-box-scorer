import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SetupTabs } from "@/app/game/[gameId]/create/SetupTabs";

const meta: Meta<typeof SetupTabs> = {
  title: "App/Game/Create/SetupTabs",
  component: SetupTabs,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SetupTabs>;

export const TablesActive: Story = {
  args: { active: "tables" },
};

export const MovementActive: Story = {
  args: { active: "movements" },
};

export const TimerActive: Story = {
  args: { active: "timer" },
};
