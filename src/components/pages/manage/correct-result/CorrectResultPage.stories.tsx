import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CorrectResultPage } from "./CorrectResultPage";

const meta: Meta<typeof CorrectResultPage> = {
  title: "Pages/Manage/CorrectResult/CorrectResultPage",
  component: CorrectResultPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onResultCorrected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CorrectResultPage>;

export const Default: Story = {};
