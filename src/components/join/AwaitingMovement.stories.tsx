import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";

const meta: Meta<typeof AwaitingMovement> = {
  title: "Components/JoinGame/AwaitingMovement",
  component: AwaitingMovement,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof AwaitingMovement>;

export const Default: Story = {};
