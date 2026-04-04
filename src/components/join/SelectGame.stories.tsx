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
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "",
      },
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "Section A",
      },
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "Section A",
      },
    ],
  },
};

export const NoGames: Story = {
  args: {
    games: [],
  },
};
