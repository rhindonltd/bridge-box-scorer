import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import CreateEventForm from "./CreateEventForm";
import { fn } from "storybook/test";

const meta: Meta<typeof CreateEventForm> = {
  title: "Components/Director/Events/CreateEventForm",
  component: CreateEventForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAdd: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof CreateEventForm>;

export const Default: Story = {};
