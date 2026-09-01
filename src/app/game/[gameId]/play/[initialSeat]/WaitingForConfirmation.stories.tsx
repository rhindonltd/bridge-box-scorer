import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof WaitingForConfirmation> = {
  title: "App/Play/Game/Assignment/WaitingForConfirmation",
  component: WaitingForConfirmation,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WaitingForConfirmation>;

export const Default: Story = {
  args: { boardNumber: 5 },
};
