import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageMovementPage } from "./ManageMovementPage";

const meta: Meta<typeof ManageMovementPage> = {
  title: "Pages/Manage/Movement/ManageMovementPage",
  component: ManageMovementPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ManageMovementPage>;

export const Default: Story = {};
