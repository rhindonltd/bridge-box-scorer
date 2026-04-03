import type { Meta, StoryObj } from "@storybook/react";
import { WifiSettingsForm } from "./WifiSettingsForm";
import { Network } from "@/model/network";

const networks: Network[] = [
  { ssid: "Home WiFi", signal: 90 },
  { ssid: "CoffeeShop", signal: 60 },
  { ssid: "Neighbor", signal: 30 },
];

const meta: Meta<typeof WifiSettingsForm> = {
  title: "Pages/Settings/WifiSettingsForm",
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
    message: null,
    testing: false,
    loading: false,
    onTestConnection: async (ssid, password) => {
      alert(`Testing ${ssid} with password ${password}`);
      return ssid === "Home WiFi"; // only Home WiFi "succeeds" in story
    },
    onSaveWifi: (ssid, password) =>
      alert(`Saving ${ssid} with password ${password}`),
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
