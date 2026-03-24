import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MovementDetailsPage } from "@/components/pages/movement/MovementDetailsPage";
import { generateMitchell } from "@/movement/mitchell";

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
  args: {
    movementName: "9-table Switch Mitchell",
    eventName: "Monday PM Pairs",
    tables: generateMitchell({
      tables: 9,
      rounds: 9,
      boardsPerRound: 3,
      arrowSwitchRounds: 0,
    }),
  },
};

export const WithSection: Story = {
  args: {
    movementName: "9-table Switch Mitchell",
    eventName: "Monday PM Pairs",
    sessionName: "Session 1",
    sectionName: "Section A",
    tables: generateMitchell({
      tables: 9,
      rounds: 9,
      boardsPerRound: 3,
      arrowSwitchRounds: 0,
    }),
  },
};
