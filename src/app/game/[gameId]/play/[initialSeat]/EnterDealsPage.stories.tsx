import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";
import { EnterDealsPage } from "@/app/game/[gameId]/play/[initialSeat]/EnterDealsPage";

const meta: Meta<typeof EnterDealsPage> = {
  title: "App/Play/Game/Assignment/EnterDealsPage",
  component: EnterDealsPage,
  // GamePageLayout's header reads the game from context and uses the app router.
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/play/abc123/1NS" },
    },
  },
  tags: ["autodocs"],
  args: {
    // Deals always store in these stories; the wizard behaviour itself is
    // covered by EnterDealsPage.test.tsx.
    onSubmitDeal: fn(async () => ({ stored: true })),
    onDone: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EnterDealsPage>;

/** First of several boards — the skip button reads "Skip". */
export const FirstOfMany: Story = {
  args: { boards: [1, 2, 3] },
};

/** A single board to enter. */
export const SingleBoard: Story = {
  args: { boards: [7] },
};
