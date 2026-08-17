import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SimpleCreateGameForm from "./SimpleCreateGameForm";

const meta: Meta<typeof SimpleCreateGameForm> = {
  title: "App/Create/SimpleCreateGameForm",
  component: SimpleCreateGameForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SimpleCreateGameForm>;

export const Default: Story = {};
