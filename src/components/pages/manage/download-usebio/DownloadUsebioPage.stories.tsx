import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DownloadUsebioPage } from "./DownloadUsebioPage";

const meta: Meta<typeof DownloadUsebioPage> = {
  title: "Pages/Manage/DownloadUsebio/DeleteGamePage",
  component: DownloadUsebioPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onUsebioDownloaded: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DownloadUsebioPage>;

export const Default: Story = {};
