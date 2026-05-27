import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectGamePage from "./SelectGamePage";

const meta: Meta<typeof SelectGamePage> = {
  title: "Pages/JoinGame/SelectGamePage",
  component: SelectGamePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SelectGamePage>;

export const Default: Story = {
  args: {},
};
