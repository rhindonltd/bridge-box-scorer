import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { Network } from "@/model/network";

const networks: Network[] = [
  { ssid: "Home WiFi", signal: 90 },
  { ssid: "CoffeeShop", signal: 60 },
  { ssid: "Neighbor", signal: 30 },
];

const meta: Meta<typeof WifiSettingsForm> = {
  title: "App/Settings/Wifi/WifiSettingsForm",
  component: WifiSettingsForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WifiSettingsForm>;

export const Default: Story = {
  args: {
    networks,
    hasScanned: true,
    message: null,
    testing: false,
    loading: false,
    onScan: () => alert("Scanning for networks…"),
    onTestConnection: async (ssid, password) => {
      alert(`Testing ${ssid} with password ${password}`);
      return ssid === "Home WiFi"; // only Home WiFi "succeeds" in story
    },
    onSaveWifi: (ssid, password) =>
      alert(`Saving ${ssid} with password ${password}`),
    onBack: () => alert("Back"),
  },
};

/** The automatic first scan is still running — the picker shows a hint. */
export const Scanning: Story = {
  args: {
    networks: [],
    hasScanned: false,
    scanning: true,
    onScan: () => alert("Scanning for networks…"),
  },
};

/** A completed scan found no networks — the picker offers a rescan. */
export const NoNetworksFound: Story = {
  args: {
    networks: [],
    hasScanned: true,
    onScan: () => alert("Scanning for networks…"),
  },
};

export const LoadingState: Story = {
  args: {
    networks,
    message: "Saving WiFi...",
    loading: true,
    testing: false,
  },
};

export const TestingState: Story = {
  args: {
    networks,
    message: "Testing connection...",
    loading: false,
    testing: true,
  },
};

export const WithMessage: Story = {
  args: {
    networks,
    message: "❌ Failed to connect",
    loading: false,
    testing: false,
  },
};
