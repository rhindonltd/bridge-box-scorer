import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SitOutPage> = {
  title: "App/Play/Game/Assignment/SitOutPage",
  component: SitOutPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: {
    onHandleSitOutContinue: () => fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SitOutPage>;

export const Default: Story = {
  args: { round: 5 },
};
