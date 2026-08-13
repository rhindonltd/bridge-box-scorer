import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import EnterPairPlayerNames from "@/components/join/EnterPlayerNames";

const meta: Meta<typeof EnterPairPlayerNames> = {
  title: "Components/Join/EnterPlayerNames",
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
    seat: "1NS",
  },
};

export const EastWest: Story = {
  args: {
    seat: "1EW",
  },
};
