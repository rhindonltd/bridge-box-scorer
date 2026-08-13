import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ChangeStatusPage } from "./ChangeStatusPage";

const meta: Meta<typeof ChangeStatusPage> = {
  title: "Pages/Manage/CorrectStatus/ChangeStatusPage",
  component: ChangeStatusPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onStatusChanged: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChangeStatusPage>;

export const Default: Story = {};
