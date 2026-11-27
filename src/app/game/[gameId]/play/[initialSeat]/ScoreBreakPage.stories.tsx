import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ScoreBreakPage } from "@/app/game/[gameId]/play/[initialSeat]/ScoreBreakPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { storyPlayHeader } from "@storybook/decorators/PlayHeaderDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ScoreBreakPage> = {
  title: "App/Play/Game/Assignment/ScoreBreakPage",
  component: ScoreBreakPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1EW" })],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["autodocs"],
  args: { onContinue: fn(), headerRight: storyPlayHeader() },
};

export default meta;
type Story = StoryObj<typeof ScoreBreakPage>;

export const AwayPair: Story = {
  args: { homeTable: 3, away: true },
};

export const HomePair: Story = {
  args: { homeTable: 3, away: false },
};
