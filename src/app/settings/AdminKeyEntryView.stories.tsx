import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AdminKeyEntryView } from "@/app/settings/AdminKeyEntryView";

const meta: Meta<typeof AdminKeyEntryView> = {
  title: "App/Settings/AdminKeyEntryView",
  component: AdminKeyEntryView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    code: "",
    error: null,
    loading: false,
    onCodeChange: fn(),
    onSubmit: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof AdminKeyEntryView>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    code: "a1b2c3",
  },
};

export const InvalidKey: Story = {
  args: {
    code: "wrongkey",
    error: "Incorrect admin key, try again.",
  },
};

export const Checking: Story = {
  args: {
    code: "a1b2c3",
    loading: true,
  },
};
