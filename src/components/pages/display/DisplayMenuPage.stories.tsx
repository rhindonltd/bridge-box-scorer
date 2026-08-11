import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisplayMenuPage } from "./DisplayMenuPage";

const meta: Meta<typeof DisplayMenuPage> = {
    title: "Pages/Display/DisplayMenuPage",
    component: DisplayMenuPage,
    parameters: {
        layout: "fullscreen",
        nextjs: {
            appDirectory: true
        },
    },
    tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayMenuPage>;

export const Default: Story = {};
