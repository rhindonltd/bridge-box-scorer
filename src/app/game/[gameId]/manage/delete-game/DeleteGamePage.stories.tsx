import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, expect, within, waitFor } from "storybook/test";
import { http, HttpResponse } from "msw";
import { DeleteGamePage } from "@/app/game/[gameId]/manage/delete-game/DeleteGamePage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof DeleteGamePage> = {
  title: "App/Manage/Game/DeleteGame/DeleteGamePage",
  component: DeleteGamePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/game/abc123/manage/delete-game" },
    },
  },
  tags: ["autodocs"],
  args: {
    onGameDeleted: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DeleteGamePage>;

/** The destructive-confirmation prompt. */
export const ConfirmDelete: Story = {};

/**
 * The delete request fails — an error banner is shown and the buttons re-enable.
 * Driven by clicking "Yes, Delete Game" with the delete endpoint mocked to fail.
 */
export const DeleteError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.delete(`/api/games/${mockGame.gameId}/delete`, () =>
          HttpResponse.json({ error: "Could not delete game" }, { status: 500 }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    (await canvas.findByRole("button", { name: "Yes, Delete Game" })).click();
    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent(
        "Could not delete game",
      ),
    );
  },
};
