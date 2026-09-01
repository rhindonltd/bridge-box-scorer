import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CorrectResultPage } from "@/app/game/[gameId]/manage/travellers/CorrectResultPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof CorrectResultPage> = {
  title: "App/Manage/Game/CorrectResult/CorrectResultPage",
  component: CorrectResultPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onResultCorrected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CorrectResultPage>;

export const Default: Story = {
  decorators: [
    withGame(mockGame),
  ],
};
