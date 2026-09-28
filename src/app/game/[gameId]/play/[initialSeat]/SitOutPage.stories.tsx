import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SitOutPage } from "@/app/game/[gameId]/play/[initialSeat]/SitOutPage";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { storyPlayHeader } from "@storybook/decorators/PlayHeaderDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SitOutPage> = {
  title: "App/Play/Game/Assignment/SitOutPage",
  component: SitOutPage,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["autodocs"],
  args: {
    onHandleSitOutContinue: () => fn(),
    headerRight: storyPlayHeader(),
  },
};

export default meta;
type Story = StoryObj<typeof SitOutPage>;

export const AtTable: Story = {
  args: { round: 5, tableNumber: 3 },
};
