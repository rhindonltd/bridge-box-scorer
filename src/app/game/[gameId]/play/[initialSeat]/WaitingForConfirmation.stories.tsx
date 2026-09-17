import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof WaitingForConfirmation> = {
  title: "App/Play/Game/Assignment/WaitingForConfirmation",
  component: WaitingForConfirmation,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: {
    layout: "fullscreen",
    // GamePageLayout's header uses the Next app router (useBackNavigation), so
    // the story must mount the app-router context.
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/play/abc123/1NS" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WaitingForConfirmation>;

export const Default: Story = {
  args: { boardNumber: 5 },
};

/** A higher board number, to confirm the header reflects the board in play. */
export const LaterBoard: Story = {
  args: { boardNumber: 24 },
};
