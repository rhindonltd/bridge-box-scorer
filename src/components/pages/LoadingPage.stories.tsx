import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingPage } from "./LoadingPage";

const meta: Meta<typeof LoadingPage> = {
  title: "Components/Pages/LoadingPage",
  component: LoadingPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof LoadingPage>;

export const Default: Story = {};
