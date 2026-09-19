import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { pairsGame4Tables } from "@/mocks/fixtures/game";
import { swrKeys } from "@/swr/swr-keys";

const GAME_ID = pairsGame4Tables.gameId;

const meta: Meta<typeof ShowTablesPage> = {
  title: "App/Create/Game/ShowTablesPage",
  component: ShowTablesPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
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
                  tables: 4,
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

type Story = StoryObj<typeof ShowTablesPage>;

export const Default: Story = {
  decorators: [withGame(pairsGame4Tables)],
};
