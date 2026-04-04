import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { ShowDirectorPinPage } from "@/components/pages/director/ShowDirectorPinPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof ShowDirectorPinPage> = {
  title: "Pages/Director/ShowDirectorPinPage",
  component: ShowDirectorPinPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onChangePin: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof ShowDirectorPinPage>;

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
