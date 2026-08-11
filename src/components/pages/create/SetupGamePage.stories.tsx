import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SetupGamePage } from "./SetupGamePage";

const meta: Meta<typeof SetupGamePage> = {
    title: "Pages/Create/SetupGamePage",
    component: SetupGamePage,
    parameters: {
        layout: "fullscreen",
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: "/create",
            },
        },
    },
    tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SetupGamePage>;

export const Default: Story = {};
