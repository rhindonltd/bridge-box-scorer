import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SelectBoardPage } from "@/app/game/[gameId]/manage/travellers/SelectBoardPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof SelectBoardPage> = {
  title: "App/Manage/Game/CorrectResult/SelectBoardPage",
  component: SelectBoardPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onBoardSelected: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SelectBoardPage>;

export const WithBoards: Story = {
  args: {
    isLoading: false,
    boards: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24,
    ],
  },
};

export const FewBoards: Story = {
  args: {
    isLoading: false,
    boards: [1, 2, 3, 4, 5, 6],
  },
};

export const Empty: Story = {
  args: {
    isLoading: false,
    boards: [],
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    boards: [],
  },
};
