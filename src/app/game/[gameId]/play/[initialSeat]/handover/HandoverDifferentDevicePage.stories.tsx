import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { HandoverDifferentDevicePage } from "@/app/game/[gameId]/play/[initialSeat]/handover/HandoverDifferentDevicePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

/**
 * The different-device handover screen mints a HANDOVER transfer code over a
 * socket on mount (via {@link ChangeDeviceView}). Storybook has no socket, so
 * the mint stays pending and the shared code view shows its loading spinner —
 * which is the genuine pre-code state. The code-shown / countdown / expiry
 * states are exercised by ChangeDeviceView.test.tsx.
 */
const meta: Meta<typeof HandoverDifferentDevicePage> = {
  title: "App/Play/HandoverDifferentDevicePage",
  component: HandoverDifferentDevicePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    gameId: "game-1",
    seat: "A1NS",
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HandoverDifferentDevicePage>;

/** Minting the handover code (pending socket mint → loading spinner). */
export const Default: Story = {};
