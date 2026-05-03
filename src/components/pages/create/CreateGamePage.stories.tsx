import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import { CreateGamePage } from "./CreateGamePage";

const meta: Meta<typeof CreateGamePage> = {
    title: "Pages/Create/CreateGamePage",
    component: CreateGamePage,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
    args: {
        onNext: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof CreateGamePage>;

export const Default: Story = {
    args: {},
};
