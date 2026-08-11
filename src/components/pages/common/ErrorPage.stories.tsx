import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorPage } from "./ErrorPage";

const meta: Meta<typeof ErrorPage> = {
  title: "Pages/Common/ErrorPage",
  component: ErrorPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ErrorPage>;

export const Default: Story = {
  args: {
    error: {
      name: "Error name",
      message: "Error message",
      stack: "Error stack",
      digest: "Some digest",
    },
  },
};
