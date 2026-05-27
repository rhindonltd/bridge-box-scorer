import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { SelectIndividualTablePage } from "@/components/pages/join/individual/SelectIndividualTablePage";

const meta: Meta<typeof SelectIndividualTablePage> = {
  title: "Pages/JoinGame/SelectIndividualTablePage",
  component: SelectIndividualTablePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectIndividualTablePage>;

export const Default: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "INDIVIDUAL",
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
