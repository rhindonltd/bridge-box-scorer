import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import AddSessionForm from "./AddSessionForm";

const meta: Meta<typeof AddSessionForm> = {
  title: "Director/Events/Session/AddSessionForm",
  component: AddSessionForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAdd: fn(), // Logs clicks in Storybook Actions panel
  },
};

export default meta;

type Story = StoryObj<typeof AddSessionForm>;

// Default story with empty input
export const Default: Story = {};
