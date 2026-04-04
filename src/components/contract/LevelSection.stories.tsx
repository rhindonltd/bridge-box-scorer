import { Meta, StoryObj } from "@storybook/nextjs-vite";
import LevelSection from "@/components/contract/LevelSection";
import { fn } from "storybook/test";

const meta: Meta<typeof LevelSection> = {
  title: "Components/Contract/Level",
  component: LevelSection,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onLevelSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof LevelSection>;

export const Default: Story = {
  args: {
    level: 2,
  },
};
