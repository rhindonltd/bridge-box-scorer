import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import EnterPlayerNames from "./EnterPlayerNames";
import { fn } from "storybook/test";

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
