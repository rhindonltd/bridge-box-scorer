import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import SimpleCreateGameForm from "./SimpleCreateGameForm";

const meta: Meta<typeof SimpleCreateGameForm> = {
  title: "Components/Create/SimpleCreateGameForm",
  component: SimpleCreateGameForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onGameCreated: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof SimpleCreateGameForm>;

export const Default: Story = {};
