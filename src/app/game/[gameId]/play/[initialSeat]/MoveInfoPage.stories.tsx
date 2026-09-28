import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { storyPlayHeader } from "@storybook/decorators/PlayHeaderDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof MoveInfoPage> = {
  title: "App/Play/Game/Assignment/MoveInfoPage",
  component: MoveInfoPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["autodocs"],
  args: { onMoveInfoContinue: fn(), headerRight: storyPlayHeader() },
};

export default meta;
type Story = StoryObj<typeof MoveInfoPage>;

export const Default: Story = {
  args: {
    roundNumber: 2,
    tableNumber: 3,
    side: "NS",
    sitOut: false,
  },
};

export const MoveToEastWest: Story = {
  args: {
    roundNumber: 4,
    tableNumber: 5,
    side: "EW",
    sitOut: false,
  },
};

export const SitOut: Story = {
  args: {
    roundNumber: 2,
    tableNumber: 3,
    sitOut: true,
  },
};
