import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MovementCard } from "@/app/game/[gameId]/create/MovementCard";

const meta: Meta<typeof MovementCard> = {
  title: "App/Create/Game/MovementCard",
  component: MovementCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof MovementCard>;

export const Default: Story = {
  args: {
    movement: {
      id: 1,
      name: "Mitchell 3 Table",
      type: "mitchell",
      tables: 3,
      boards: 24,
      boardsPerRound: 3,
      rounds: 8,
      missingPair: null,
    },
  },
};

export const WithMissingPair: Story = {
  args: {
    movement: {
      id: 2,
      name: "Howell 4 Table",
      type: "howell",
      tables: 4,
      boards: 28,
      boardsPerRound: 4,
      rounds: 7,
      missingPair: 5,
    },
  },
};
