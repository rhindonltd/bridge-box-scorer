import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import { http, HttpResponse } from "msw";
import { withGame } from "@storybook/decorators/GameDecorator";
import { SetupGamePage } from "./SetupGamePage";
import { mockGame } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const GAME_ID = mockGame.gameId;

// SetupGamePage is a multi-step flow (tables / movement / timer / sections /
// start) selected via a URL search param. Its default landing step is Tables,
// which reads the game's pairs and sections. The individual step screens
// (ShowTablesPage, MovementStep, StartGameScreen, TimerSetup) each have their
// own stories, so this story exercises the flow shell at its default step with
// real (mocked) data rather than re-mocking every step here.
const meta: Meta<typeof SetupGamePage> = {
  title: "App/Create/Game/SetupGamePage",
  component: SetupGamePage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: `/game/${GAME_ID}/create` },
    },
    msw: {
      handlers: [
        http.get(swrKeys.pairs(GAME_ID), () =>
          HttpResponse.json({ result: { pairs: [] } }),
        ),
        http.get(swrKeys.sections(GAME_ID), () =>
          HttpResponse.json({
            result: {
              sections: [
                {
                  section: "A",
                  label: "A",
                  tables: 5,
                  ordinal: 0,
                  selectedMovement: null,
                },
              ],
            },
          }),
        ),
        // Resizing a section fires PUT /sections/:section/tables. Mock it so
        // changing the table count succeeds instead of erroring with
        // "Request failed" against a non-existent backend.
        http.put(`${swrKeys.sections(GAME_ID)}/:section/tables`, () =>
          HttpResponse.json({ result: { ok: true } }),
        ),
      ],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SetupGamePage>;

/** The default setup step (Tables), with the game's pairs/sections loaded. */
export const TablesStep: Story = {};

/**
 * Regression guard: increasing the table count must succeed rather than raise
 * "Request failed". The section resize (PUT /sections/:section/tables) is
 * mocked in the meta handlers; here we drive the stepper and confirm the count
 * moves to 6 (5 → +1) with no error surfaced.
 */
export const ResizeTables: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Change the table count (5 -> 6). This commits through the same path the
    // stepper uses, firing the mocked PUT /sections/:section/tables.
    const tables = await canvas.findByLabelText("Tables");
    fireEvent.change(tables, { target: { value: "6" } });

    // The optimistic update reflects the new count and, crucially, no
    // "Request failed" error is raised now that the resize is mocked.
    await waitFor(() => expect(tables).toHaveValue(6));
    expect(canvas.queryByText("Request failed")).not.toBeInTheDocument();
  },
};
