import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import {ShowDirectorPinPage} from "@/components/pages/director/ShowDirectorPinPage";

const meta: Meta<typeof ShowDirectorPinPage> = {
    title: "Pages/Director/ShowDirectorPinPage",
    component: ShowDirectorPinPage,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
    args: {
        onChangePin: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof ShowDirectorPinPage>;

export const Default: Story = {
    args: {
        eventName: 'Monday PM Pairs',
        directorPin: 123456
    }
};
