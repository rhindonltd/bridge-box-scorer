import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AddSectionForm from "./AddSectionForm";
import { fn } from "storybook/test";

const meta: Meta<typeof AddSectionForm> = {
  title: "Components/Director/Sections/AddSectionForm",
  component: AddSectionForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAdd: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof AddSectionForm>;

export const Default: Story = {};
