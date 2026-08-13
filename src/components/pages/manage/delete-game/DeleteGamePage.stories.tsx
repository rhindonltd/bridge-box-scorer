import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DeleteGamePage } from "./DeleteGamePage";

const meta: Meta<typeof DeleteGamePage> = {
  title: "Pages/Manage/DeleteGame/DeleteGamePage",
  component: DeleteGamePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onGameDeleted: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DeleteGamePage>;

export const Default: Story = {};
