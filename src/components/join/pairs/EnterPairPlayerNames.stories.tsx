import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import EnterPairPlayerNames from "@/components/join/pairs/EnterPairPlayerNames";

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
    seat: {
      type: "PAIR",
      tableNumber: 1,
      direction: "NS",
    },
  },
};

export const EastWest: Story = {
  args: {
    seat: {
      type: "PAIR",
      tableNumber: 1,
      direction: "EW",
    },
  },
};
