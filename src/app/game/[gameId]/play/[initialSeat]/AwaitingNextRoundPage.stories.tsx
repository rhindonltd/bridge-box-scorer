import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AwaitingNextRoundPage } from "@/app/game/[gameId]/play/[initialSeat]/AwaitingNextRoundPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { storyPlayHeader } from "@storybook/decorators/PlayHeaderDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof AwaitingNextRoundPage> = {
  title: "App/Play/Game/Assignment/AwaitingNextRoundPage",
  component: AwaitingNextRoundPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["autodocs"],
  args: { headerRight: storyPlayHeader() },
};

export default meta;
type Story = StoryObj<typeof AwaitingNextRoundPage>;

export const Default: Story = {
  args: {
    completedRound: 3,
  },
};

export const AfterFirstRound: Story = {
  args: {
    completedRound: 1,
  },
};
