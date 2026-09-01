import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameComplete } from "@/app/game/[gameId]/play/[initialSeat]/GameComplete";
import { withGame } from "@storybook/decorators/GameDecorator";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof GameComplete> = {
  title: "App/Play/Game/Assignment/GameComplete",
  component: GameComplete,
  decorators: [withGame(mockGame), withAssignment({ type: "PAIR", id: "1NS" })],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/play/abc123/1NS",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GameComplete>;

export const Default: Story = {
  args: {
    loading: false,
  },
};
