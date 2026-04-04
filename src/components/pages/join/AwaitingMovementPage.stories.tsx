import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AwaitingMovementPage } from "@/components/pages/join/AwaitingMovementPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof AwaitingMovementPage> = {
  title: "Pages/JoinGame/AwaitingMovement",
  component: AwaitingMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AwaitingMovementPage>;

export const Default: Story = {};
