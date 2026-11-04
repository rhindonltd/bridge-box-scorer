import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ExportReadinessPage } from "@/app/game/[gameId]/manage/export/ExportReadinessPage";
import { buildExportReadiness } from "@/app/game/[gameId]/manage/export/export-readiness";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ExportReadinessPage> = {
  title: "App/Manage/Game/Menu/ExportReadinessPage",
  component: ExportReadinessPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    onBack: fn(),
    onContinue: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ExportReadinessPage>;

/** Everything in place: all results in, club info and both publishers set. */
export const AllReady: Story = {
  args: {
    items: buildExportReadiness({
      totalPlayable: 24,
      finalized: 24,
      clubConfigured: true,
      bridgewebsConfigured: true,
      ebuConfigured: true,
    }),
  },
};

/**
 * Many results outstanding: only the count is shown (listing dozens of boards
 * would be noise), and the optional publishers are not set up.
 */
export const ManyResultsOutstanding: Story = {
  args: {
    items: buildExportReadiness({
      totalPlayable: 24,
      finalized: 10,
      clubConfigured: true,
      bridgewebsConfigured: false,
      ebuConfigured: false,
    }),
  },
};

/**
 * A single-section event with a few results outstanding: each card lists the
 * round / table / board and who is seated — no section, since there's only one.
 */
export const FewResultsOutstanding: Story = {
  args: {
    items: buildExportReadiness({
      totalPlayable: 24,
      finalized: 21,
      clubConfigured: true,
      bridgewebsConfigured: true,
      ebuConfigured: true,
      multiSection: false,
      outstandingBoards: [
        {
          section: "A",
          tableNumber: 2,
          boardNumber: 7,
          roundNumber: 3,
          nsPair: "Alice Smith & Bob Jones",
          ewPair: "Carol May & Dan Fox",
        },
        {
          section: "A",
          tableNumber: 5,
          boardNumber: 7,
          roundNumber: 3,
          nsPair: "Eve Adams & Frank Lee",
          ewPair: "Grace Hill & Heidi Poe",
        },
      ],
    }),
  },
};

/**
 * A multi-section event: each card additionally calls out the section, which
 * disambiguates the table number (table numbers restart within each section).
 */
export const FewResultsOutstandingMultiSection: Story = {
  args: {
    items: buildExportReadiness({
      totalPlayable: 48,
      finalized: 45,
      clubConfigured: true,
      bridgewebsConfigured: true,
      ebuConfigured: true,
      multiSection: true,
      outstandingBoards: [
        {
          section: "A",
          tableNumber: 2,
          boardNumber: 7,
          roundNumber: 3,
          nsPair: "Alice Smith & Bob Jones",
          ewPair: "Carol May & Dan Fox",
        },
        {
          section: "B",
          tableNumber: 1,
          boardNumber: 12,
          roundNumber: 4,
          nsPair: "Ivan Reed & Judy Kent",
          ewPair: "Ken Ash & Lara Dow",
        },
      ],
    }),
  },
};

/** Club information missing: the core USEBIO file can't be built. */
export const ClubInfoMissing: Story = {
  args: {
    items: buildExportReadiness({
      totalPlayable: 24,
      finalized: 24,
      clubConfigured: false,
      bridgewebsConfigured: true,
      ebuConfigured: true,
    }),
  },
};
