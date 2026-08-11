import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { SelectSeatPage } from "@/components/pages/join/SelectSeatPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof SelectSeatPage> = {
  title: "Pages/Join/SelectSeatPage",
  component: SelectSeatPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSeatSelected: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SelectSeatPage>;

export const Pairs: Story = {
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
      leadCardRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
};
