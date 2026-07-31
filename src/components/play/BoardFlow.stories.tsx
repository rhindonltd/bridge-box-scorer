import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { BoardFlow } from "./BoardFlow";

const meta: Meta<typeof BoardFlow> = {
  title: "Components/Play/BoardFlow",
  component: BoardFlow,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onComplete: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof BoardFlow>;

export const WithoutLead: Story = {
  args: {
    board: 5,
    contract: "4H",
    declarer: "N",
    openingLead: false,
  },
};

export const WithLead: Story = {
  args: {
    board: 12,
    contract: "3NT",
    declarer: "S",
    openingLead: true,
  },
};
