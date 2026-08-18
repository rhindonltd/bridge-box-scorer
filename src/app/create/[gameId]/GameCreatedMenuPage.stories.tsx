import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { withGame } from "@storybook/decorators/GameDecorator";
import { GameCreatedMenuPage } from "./GameCreatedMenuPage";

const mockGame = {
    id: 1,
    eventName: "Monday AM Pairs",
    director: "Jacqui Collier",
    gameType: "PAIRS" as const,
    scoringType: "MP" as const,
    gameId: "abc123",
    sessionName: "1",
    sectionName: "A",
    eventDate: new Date().toISOString(),
    tables: 8,
    leadCardRequired: true,
    status: "JOINABLE" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const meta: Meta<typeof GameCreatedMenuPage> = {
    title: "App/Create/Game/GameCreatedMenuPage",
    component: GameCreatedMenuPage,
    decorators: [withGame(mockGame)],
    parameters: {
        layout: "fullscreen",
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ["autodocs"],
    args: {
        onTimerClick: fn(),
        onTravellersClick: fn(),
        onMovementClick: fn(),
        onDownloadUsebioClick: fn(),
        onDeleteGameClick: fn(),
    },
};

export default meta;
type Story = StoryObj<typeof GameCreatedMenuPage>;

export const Default: Story = {};
