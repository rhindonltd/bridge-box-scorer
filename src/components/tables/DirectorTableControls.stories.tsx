import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import DirectorTableControls from "./DirectorTableControls";
import { fn } from "storybook/test";

const meta: Meta<typeof DirectorTableControls> = {
    title: "Components/Tables/DirectorTableControls",
    component: DirectorTableControls,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
    args: {
        onChange: fn(),
        onEvict: fn()
    }
};

export default meta;

type Story = StoryObj<typeof DirectorTableControls>;

export const Default: Story = {
    args: {
        tables: [
            {
                tableNumber: 1,
                players: {
                    N: {
                        id: 1,
                        firstName: 'Yellow',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    S: {
                        id: 1,
                        firstName: 'Blue',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    E: {
                        id: 1,
                        firstName: 'Green',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    W: {
                        id: 1,
                        firstName: 'Purple',
                        lastName: 'Yoshi',
                        nationalId: null
                    }
                },
                seats: {
                    N: null,
                    S: null,
                    E: null,
                    W: null
                }
            },
            {
                tableNumber: 2,
                players: {
                    N: {
                        id: 1,
                        firstName: 'Yellow',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    S: {
                        id: 1,
                        firstName: 'Blue',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    E: {
                        id: 1,
                        firstName: 'Green',
                        lastName: 'Yoshi',
                        nationalId: null
                    },
                    W: {
                        id: 1,
                        firstName: 'Purple',
                        lastName: 'Yoshi',
                        nationalId: null
                    }
                },
                seats: {
                    N: null,
                    S: null,
                    E: null,
                    W: null
                }
            }
        ],
    },
};
