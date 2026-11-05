import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { WithdrawPage } from "@/app/game/[gameId]/play/[initialSeat]/withdraw/WithdrawPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof WithdrawPage> = {
  title: "App/Play/WithdrawPage",
  component: WithdrawPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    onCancel: fn(),
    onConfirm: fn(async () => {}),
    onDone: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WithdrawPage>;

/** The confirmation step. */
export const Confirm: Story = {};

/** The server rejected the withdrawal (e.g. already withdrawn). */
export const Rejected: Story = {
  args: {
    onConfirm: fn(async () => {
      throw new Error("This pair has already withdrawn.");
    }),
  },
};
