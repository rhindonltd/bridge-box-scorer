import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ExportMenuPage } from "@/app/game/[gameId]/manage/export/options/ExportMenuPage";
import { withGame } from "@storybook/decorators/GameDecorator";
import { mockGame } from "@/mocks/fixtures/game";

const meta: Meta<typeof ExportMenuPage> = {
  title: "App/Manage/Game/Menu/ExportMenuPage",
  component: ExportMenuPage,
  decorators: [withGame(mockGame)],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  tags: ["autodocs"],
  args: {
    onBack: fn(),
    onDownloadUsebioClick: fn(),
    onDownloadPbnClick: fn(),
    onUploadBridgewebsClick: fn(),
    onUploadEbuClick: fn(),
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
    showDownloadPbn: true,
    showUploadBridgewebs: false,
    uploadBridgewebsDisabled: false,
    showUploadEbu: false,
    uploadEbuDisabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof ExportMenuPage>;

/**
 * Results still outstanding: the USEBIO download is shown but disabled until
 * every result is in; PBN (deals, not results) stays available.
 */
export const ResultsIncomplete: Story = {
  args: {
    showDownloadUsebio: true,
    downloadUsebioDisabled: true,
    showDownloadPbn: true,
  },
};

/** All results in: Download USEBIO and Download PBN are both available. */
export const ResultsComplete: Story = {
  args: {
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
    showDownloadPbn: true,
  },
};

/**
 * All results in with BridgeWebs and EBU configured: every export / publish
 * option is shown and enabled.
 */
export const AllPublishersConfigured: Story = {
  args: {
    showDownloadUsebio: true,
    downloadUsebioDisabled: false,
    showDownloadPbn: true,
    showUploadBridgewebs: true,
    uploadBridgewebsDisabled: false,
    showUploadEbu: true,
    uploadEbuDisabled: false,
  },
};
