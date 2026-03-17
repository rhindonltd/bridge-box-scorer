import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Header from "@/components/player/contract/Header";

const meta: Meta<typeof Header> = {
  title: "Components/Player/Contract/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: {
    contract: "4S",
    result: 1,
  },
};
