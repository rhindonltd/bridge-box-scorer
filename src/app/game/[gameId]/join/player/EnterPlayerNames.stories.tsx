import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import EnterPairPlayerNames from "@/app/game/[gameId]/join/player/EnterPlayerNames";

const meta: Meta<typeof EnterPairPlayerNames> = {
  title: "App/Join/Game/Player/EnterPlayerNames",
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
