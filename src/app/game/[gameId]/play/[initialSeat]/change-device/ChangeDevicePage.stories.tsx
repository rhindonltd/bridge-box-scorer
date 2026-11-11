import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ChangeDevicePage } from "@/app/game/[gameId]/play/[initialSeat]/change-device/ChangeDevicePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

/**
 * The Change device page: the same pair moves this seat to another device. The
 * code panel mints a code over the socket; with no server in Storybook it shows
 * its loading / error state, so these stories are about the page layout.
 */
const meta: Meta<typeof ChangeDevicePage> = {
  title: "App/Play/ChangeDevicePage",
  component: ChangeDevicePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    gameId: "g1",
    seat: "A3NS",
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChangeDevicePage>;

/** The Change device page (header back arrow, centred code panel). */
export const Default: Story = {};
