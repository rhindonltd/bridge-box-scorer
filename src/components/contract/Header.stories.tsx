import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Header from "@/components/contract/Header";

const meta: Meta<typeof Header> = {
  title: "Components/Contract/Header",
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
