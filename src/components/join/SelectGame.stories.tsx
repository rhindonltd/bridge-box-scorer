import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectGame from "./SelectGame";

const meta: Meta<typeof SelectGame> = {
  title: "Components/JoinGame/SelectGame",
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
        id: 1,
        eventName: "Monday AM Pairs",
        director: null,
        eventType: null,
        sessionName: "",
        sectionName: "",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        eventName: "Monday PM Pairs",
        director: null,
        eventType: null,
        sessionName: "Session 1",
        sectionName: "",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        eventName: "Tuesday PM Pairs",
        director: null,
        eventType: null,
        sessionName: "",
        sectionName: "Section A",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        eventName: "Wednesday PM Pairs",
        director: null,
        eventType: null,
        sessionName: "Session 1",
        sectionName: "Section A",
        eventDate: new Date().toISOString(),
        status: "CREATED",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};

export const NoGames: Story = {
  args: {
    games: [],
  },
};
