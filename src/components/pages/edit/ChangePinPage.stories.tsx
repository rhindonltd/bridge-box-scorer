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
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    directorPin: 123456,
  },
};
