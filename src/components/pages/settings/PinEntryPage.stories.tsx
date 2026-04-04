import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PinEntryPage } from "./PinEntryPage";

const meta: Meta<typeof PinEntryPage> = {
  title: "Pages/Settings/PinEntryPage",
  component: PinEntryPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSuccess: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof PinEntryPage>;

export const Starting: Story = {
  args: {
    correctPin: "1234",
  },
};
