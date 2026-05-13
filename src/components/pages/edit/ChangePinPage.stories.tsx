import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { ChangePinPage } from "@/components/pages/edit/ChangePinPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof ChangePinPage> = {
  title: "Pages/Edit/ChangePinPage",
  component: ChangePinPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onChangePin: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof ChangePinPage>;

export const Default: Story = {
  decorators: [
    withGame(
      {
        id: 1,
        eventName: "Monday AM Pairs",
        director: null,
        eventType: null,
        gameId: crypto.randomUUID(),
        sessionName: "",
        sectionName: "",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        tables: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      null,
    ),
  ],
  args: {
    directorPin: 123456,
  },
};
