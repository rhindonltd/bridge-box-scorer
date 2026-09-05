import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ManageGameMenuPage> = {
  title: "App/Manage/Game/Menu/DirectorMenuPage",
  component: ManageGameMenuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onSetUpGameClick: fn(),
    onTravellersClick: fn(),
    onMovementClick: fn(),
    onShareDirectorAccessClick: fn(),
    onDownloadUsebioClick: fn(),
    onDeleteGameClick: fn(),
    showSetUpGame: true,
    showTravellers: false,
    showMovement: false,
    showDownloadUsebio: false,
    downloadUsebioDisabled: false,
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
    showMovement: true,
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
  },
};
