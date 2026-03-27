import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WifiRestartingPage } from "@/components/pages/settings/WifiRestartingPage";

const meta: Meta<typeof WifiRestartingPage> = {
    title: "Pages/Player/WifiRestartingPage",
    component: WifiRestartingPage,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof WifiRestartingPage>;

export const Starting: Story = {
    args: {
        seconds: 30,
        status: "Rebooting device...",
    },
};

export const Halfway: Story = {
    args: {
        seconds: 15,
        status: "Rebooting device...",
    },
};

export const AlmostReady: Story = {
    args: {
        seconds: 5,
        status: "Rebooting device...",
    },
};

export const CustomStatus: Story = {
    args: {
        seconds: 10,
        status: "Applying network settings...",
    },
};
