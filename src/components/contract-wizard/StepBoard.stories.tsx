import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { StepBoard } from "./StepBoard";

const meta: Meta<typeof StepBoard> = {
  title: "Components/ContractWizard/StepBoard",
  component: StepBoard,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { onBoardSelected: fn() },
};
export default meta;
type Story = StoryObj<typeof StepBoard>;

export const ThreeBoards: Story = {
  args: { boards: [7, 8, 9], playedBoards: [] },
};
export const OnePlayedBoard: Story = {
  args: { boards: [7, 8, 9], playedBoards: [7] },
};
export const AllPlayed: Story = {
  args: { boards: [7, 8, 9], playedBoards: [7, 8, 9] },
};
