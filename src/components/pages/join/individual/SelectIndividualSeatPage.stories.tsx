import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { SelectIndividualSeatPage } from "@/components/pages/join/individual/SelectIndividualSeatPage";

const meta: Meta<typeof SelectIndividualSeatPage> = {
  title: "Pages/JoinGame/SelectIndividualSeatPage",
  component: SelectIndividualSeatPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectIndividualSeatPage>;

export const Default: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "INDIVIDUAL",
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
};
