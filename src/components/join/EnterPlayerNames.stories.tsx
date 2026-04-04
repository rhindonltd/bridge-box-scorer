import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import EnterPlayerNames from "@/components/join/EnterPlayerNames";

const meta: Meta<typeof EnterPlayerNames> = {
  title: "Components/JoinGame/EnterPlayerNames",
  component: EnterPlayerNames,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    submitPlayerNames: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof EnterPlayerNames>;

export const NorthSouth: Story = {
  args: {
    direction: "NS",
  },
};

export const EastWest: Story = {
  args: {
    direction: "EW",
  },
};
