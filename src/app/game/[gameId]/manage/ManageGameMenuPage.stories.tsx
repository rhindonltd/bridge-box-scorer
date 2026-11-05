import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { ManageHeaderSwitch } from "@/components/game/ManageHeaderSwitch";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

// The manage header switch reads the seat token to decide "Play" vs "Join";
// seed a seat so these stories show the "Play" affordance.
function seedSeat() {
  localStorage.setItem(
    `player:${mockGame.gameId}`,
    JSON.stringify({ startingPosition: "A1NS", token: "seat-tok" }),
  );
}

const meta: Meta<typeof ManageGameMenuPage> = {
  title: "App/Manage/Game/Menu/DirectorMenuPage",
  component: ManageGameMenuPage,
  decorators: [
    (Story) => {
      seedSeat();
      return <Story />;
    },
    withGame(mockGame),
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    // The play⇄manage switch a director sees in the manage header. Seeded seat
    // above makes it read "Play"; clear the seat token to see "Join".
    headerRight: <ManageHeaderSwitch gameId={mockGame.gameId} />,
    onSetUpGameClick: fn(),
    onManageTablesClick: fn(),
    onTravellersClick: fn(),
    onEnterDealsClick: fn(),
    onMovementClick: fn(),
    onShareDirectorAccessClick: fn(),
    onReviewMismatchesClick: fn(),
    onPairsClick: fn(),
    onExportClick: fn(),
    onDeleteGameClick: fn(),
    showSetUpGame: true,
    showManageTables: false,
    showTravellers: false,
    showEnterDeals: false,
    showMovement: false,
    showReviewMismatches: false,
    showPairs: false,
    showExport: false,
  },
};

export default meta;
type Story = StoryObj<typeof ManageGameMenuPage>;

/** Before the game starts: only Set Up Game (plus the always-on options). */
export const NotStarted: Story = {
  args: {
    showSetUpGame: true,
    showTravellers: false,
    showMovement: false,
    showExport: false,
  },
};

/**
 * Game started: Travellers, Movement and the "Export & Publish" submenu entry
 * are available. The individual export gating (results complete, BridgeWebs /
 * EBU configured) now lives inside that submenu.
 */
export const Started: Story = {
  args: {
    showSetUpGame: false,
    showTravellers: true,
    showEnterDeals: true,
    showMovement: true,
    showExport: true,
  },
};

/** A started Swiss game also shows Review Mismatches above Export & Publish. */
export const StartedSwiss: Story = {
  args: {
    showSetUpGame: false,
    showTravellers: true,
    showEnterDeals: true,
    showMovement: true,
    showReviewMismatches: true,
    showExport: true,
  },
};
