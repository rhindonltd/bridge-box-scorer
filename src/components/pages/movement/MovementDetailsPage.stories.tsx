import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MovementDetailsPage } from "@/components/pages/movement/MovementDetailsPage";
import { generateMitchell } from "@/movement/mitchell";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof MovementDetailsPage> = {
  title: "Pages/Movement/MovementDetailsPage",
  component: MovementDetailsPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MovementDetailsPage>;

export const Default: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    movementName: "9-table Switch Mitchell",
    tables: generateMitchell({
      tables: 9,
      rounds: 9,
      boardsPerRound: 3,
      arrowSwitchRounds: 0,
    }),
  },
};

export const WithSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      scoringType: "MP",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
  args: {
    movementName: "9-table Switch Mitchell",
    tables: generateMitchell({
      tables: 9,
      rounds: 9,
      boardsPerRound: 3,
      arrowSwitchRounds: 0,
    }),
  },
};
