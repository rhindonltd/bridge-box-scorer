import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GameInfo } from "@/components/common/GameInfo";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";

const meta: Meta<typeof GameInfo> = {
    title: "Components/Common/Participant",
    component: GameInfo,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof GameInfo>;

export const Individual: Story = {
    decorators: [
        withAssignment({
            type: "INDIVIDUAL",
            player: {
                id: 1,
                firstName: "Jacqui",
                lastName: "Collier",
                nationalId: "477484",
            },
            tableNumber: 3,
            direction: "E",
            playerId: "12",
        }),
    ],
};

export const Pair: Story = {
    decorators: [
        withAssignment({
            type: "PAIR",
            player1: {
                id: 1,
                firstName: "Jacqui",
                lastName: "Collier",
                nationalId: "477484",
            },
            player2: {
                id: 2,
                firstName: "David",
                lastName: "Collier",
                nationalId: "404476",
            },
            tableNumber: 3,
            direction: "EW",
            pairId: "1",
        }),
    ],
};

export const Team: Story = {
    decorators: [
        withAssignment({
            type: "TEAM",
            pair1: {
                type: "PAIR",
                player1: {
                    id: 1,
                    firstName: "Jacqui",
                    lastName: "Collier",
                    nationalId: "477484",
                },
                player2: {
                    id: 2,
                    firstName: "David",
                    lastName: "Collier",
                    nationalId: "404476",
                },
                tableNumber: 3,
                direction: "NS",
            },
            pair2: {
                type: "PAIR",
                player1: {
                    id: 3,
                    firstName: "Peter",
                    lastName: "Collier",
                    nationalId: "123456",
                },
                player2: {
                    id: 4,
                    firstName: "Nye",
                    lastName: "Collier",
                    nationalId: null,
                },
                tableNumber: 3,
                direction: "EW",
            },
            teamId: "1",
        }),
    ],
};
