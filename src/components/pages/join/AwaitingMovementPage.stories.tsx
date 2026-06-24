import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AwaitingMovementPage } from "@/components/pages/join/AwaitingMovementPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof AwaitingMovementPage> = {
  title: "Pages/JoinGame/AwaitingMovement",
  component: AwaitingMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
      withAssignment({
          type: "PAIR",
          player1: {
              id: 1,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
          },
          player2: {
              id: 2,
              firstName: "David",
              lastName: "Collier",
              nationalId: "404476",
          },
          tableNumber: 3,
          direction: "EW",
          pairId: "1",
      }),
  ],
};

export default meta;

type Story = StoryObj<typeof AwaitingMovementPage>;

export const Default: Story = {};
