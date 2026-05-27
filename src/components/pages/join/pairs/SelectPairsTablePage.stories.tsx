import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { SelectPairsTablePage } from "./SelectPairsTablePage";

const meta: Meta<typeof SelectPairsTablePage> = {
  title: "Pages/JoinGame/SelectPairsTablePage",
  component: SelectPairsTablePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectPairsTablePage>;

export const Default: Story = {
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
  ],
};
