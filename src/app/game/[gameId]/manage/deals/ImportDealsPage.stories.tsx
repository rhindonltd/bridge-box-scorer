import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ImportDealsPage } from "@/app/game/[gameId]/manage/deals/ImportDealsPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

/** A legal deal; the importer does not care which board it is for. */
const DEAL =
  "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85";

const pbn = (...boards: number[]) =>
  boards.map((n) => `[Board "${n}"]\n[Deal "${DEAL}"]\n`).join("\n");

const boards = (count: number) =>
  Array.from({ length: count }, (_, i) => i + 1);

const meta: Meta<typeof ImportDealsPage> = {
  title: "App/Manage/Game/Deals/ImportDealsPage",
  component: ImportDealsPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    eventBoards: boards(32),
    boardsLoading: false,
    isImporting: false,
    error: null,
    importedCount: null,
    onImport: fn(),
    onBack: fn(),
    onDone: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ImportDealsPage>;

/** Nothing chosen yet. */
export const Empty: Story = {};

/** A file covering every board: ready to import. */
export const AllBoardsFound: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText("Or paste PBN text"));
    await userEvent.paste(pbn(...boards(32)));
    await expect(canvas.getByTestId("import-preview")).toHaveTextContent(
      "32 boards found, 0 missing",
    );
    await expect(
      canvas.getByRole("button", { name: "Import 32 boards" }),
    ).toBeEnabled();
  },
};

/** The file has some boards missing, some extra, and one damaged. */
export const MissingSkippedAndInvalid: Story = {
  args: { eventBoards: boards(8) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText("Or paste PBN text"));
    await userEvent.paste(
      `${pbn(1, 2, 3, 4, 9, 10)}\n[Board "5"]\n[Deal "N:.63.AKQ987.A9732 - - -"]\n`,
    );
    await expect(canvas.getByTestId("import-preview")).toHaveTextContent(
      "Not in this event, so skipped: 9, 10",
    );
  },
};

/** Nothing in the file is usable: import stays disabled. */
export const NothingUsable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText("Or paste PBN text"));
    await userEvent.paste("not a pbn file");
    await expect(canvas.getByRole("button", { name: "Import" })).toBeDisabled();
  },
};

/** The import request is in flight. */
export const Importing: Story = {
  args: { isImporting: true },
};

/** The server rejected the import. */
export const ImportFailed: Story = {
  args: { error: "Board 2 is not a complete deal" },
};

/** The import succeeded. */
export const Done: Story = {
  args: { importedCount: 32 },
};
