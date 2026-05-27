import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import EnterPairPlayerNames from "@/components/join/EnterPairPlayerNames";

const meta: Meta<typeof EnterPairPlayerNames> = {
  title: "Components/JoinGame/EnterPlayerNames",
  component: EnterPairPlayerNames,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSubmitPair: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof EnterPairPlayerNames>;

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
