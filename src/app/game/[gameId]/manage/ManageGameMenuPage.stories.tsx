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
    onTravellersClick: fn(),
    onEnterDealsClick: fn(),
    onMovementClick: fn(),
    onShareDirectorAccessClick: fn(),
    onDownloadUsebioClick: fn(),
    onDownloadPbnClick: fn(),
    onUploadBridgewebsClick: fn(),
    onDeleteGameClick: fn(),
    showSetUpGame: true,
    showTravellers: false,
    showEnterDeals: false,
    showMovement: false,
    showDownloadUsebio: false,
    downloadUsebioDisabled: false,
    showDownloadPbn: false,
    showUploadBridgewebs: false,
    uploadBridgewebsDisabled: false,
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
    showDownloadUsebio: false,
  },
};

/**
 * Game started but results still outstanding: Travellers and Movement are
 * available; Download USEBIO is shown but disabled until every result is in.
 */
export const StartedResultsIncomplete: Story = {
  args: {
    showSetUpGame: false,
    showTravellers: true,
    showEnterDeals: true,
    showMovement: true,
    showDownloadUsebio: true,
    downloadUsebioDisabled: true,
  },
};

/** All results in: Download USEBIO is available. */
export const StartedResultsComplete: Story = {
  args: {
    showSetUpGame: false,
    showTravellers: true,
    showEnterDeals: true,
    showMovement: true,
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
  },
};

/**
 * All results in and BridgeWebs configured: the Upload to BridgeWebs option is
 * shown alongside the USEBIO/PBN exports.
 */
export const StartedWithBridgewebs: Story = {
  args: {
    showSetUpGame: false,
    showTravellers: true,
    showEnterDeals: true,
    showMovement: true,
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
    showDownloadPbn: true,
    showUploadBridgewebs: true,
    uploadBridgewebsDisabled: false,
  },
};
