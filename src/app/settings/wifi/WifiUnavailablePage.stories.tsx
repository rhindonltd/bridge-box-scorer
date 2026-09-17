import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";

const meta: Meta<typeof WifiUnavailablePage> = {
  title: "App/Settings/Wifi/WifiUnavailablePage",
  component: WifiUnavailablePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/settings/wifi" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WifiUnavailablePage>;

/** Shown when the device cannot manage WiFi (no NetworkManager / nmcli). */
export const Default: Story = {};
