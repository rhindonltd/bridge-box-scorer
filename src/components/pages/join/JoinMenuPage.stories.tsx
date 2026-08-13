import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { JoinMenuPage } from "./JoinMenuPage";

const meta: Meta<typeof JoinMenuPage> = {
  title: "Pages/Join/JoinMenuPage",
  component: JoinMenuPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onJoinAsPlayer: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof JoinMenuPage>;

export const Default: Story = {};
