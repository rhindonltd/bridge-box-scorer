import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SelectGame } from "./SelectGame";

const meta: Meta<typeof SelectGame> = {
  title: "Components/Common/SelectGame",
  component: SelectGame,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SelectGame>;

export const Default: Story = {
  args: {
    games: [
      {
        eventName: "Monday AM Pairs",
        director: null,
        gameType: "PAIRS",
        eventFormat: "STANDARD",
        scoringType: "MP",
        sectionName: "",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        handEntryEnabled: false,
        combinedRanking: true,
        selectedMovement: null,
        bridgewebsEventId: null,
        tournamentLevel: "NORMAL_CLUB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finalisedAt: null,
      },
      {
        eventName: "Monday PM Pairs",
        director: null,
        gameType: "PAIRS",
        eventFormat: "STANDARD",
        scoringType: "MP",
        sectionName: "",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        handEntryEnabled: false,
        combinedRanking: true,
        selectedMovement: null,
        bridgewebsEventId: null,
        tournamentLevel: "NORMAL_CLUB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finalisedAt: null,
      },
      {
        eventName: "Tuesday PM Pairs",
        director: null,
        gameType: "PAIRS",
        eventFormat: "STANDARD",
        scoringType: "MP",
        sectionName: "Section A",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        handEntryEnabled: false,
        combinedRanking: true,
        selectedMovement: null,
        bridgewebsEventId: null,
        tournamentLevel: "NORMAL_CLUB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finalisedAt: null,
      },
      {
        eventName: "Wednesday PM Pairs",
        director: null,
        gameType: "PAIRS",
        eventFormat: "STANDARD",
        scoringType: "MP",
        sectionName: "Section A",
        gameId: crypto.randomUUID(),
        eventDate: new Date().toISOString(),
        tables: 10,
        leadCardRequired: true,
        handEntryEnabled: false,
        combinedRanking: true,
        selectedMovement: null,
        bridgewebsEventId: null,
        tournamentLevel: "NORMAL_CLUB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finalisedAt: null,
      },
    ],
  },
};

export const NoGames: Story = {
  args: {
    games: [],
  },
};
