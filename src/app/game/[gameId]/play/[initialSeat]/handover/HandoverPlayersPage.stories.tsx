import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { HandoverPlayersPage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverPlayersPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof HandoverPlayersPage> = {
  title: "App/Play/HandoverPlayersPage",
  component: HandoverPlayersPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    onCancel: fn(),
    onSubmit: fn(async () => {}),
  },
};

export default meta;
type Story = StoryObj<typeof HandoverPlayersPage>;

/** The arriving real pair's name-entry screen (submit disabled until both set). */
export const Default: Story = {};
