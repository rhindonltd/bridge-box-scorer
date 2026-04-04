import { Meta, StoryObj } from "@storybook/nextjs-vite";
import SelectGamePage from "./SelectGamePage";

const meta: Meta<typeof SelectGamePage> = {
  title: "Pages/JoinGame/SelectGamePage",
  component: SelectGamePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SelectGamePage>;

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
        eventName: "Tuesday PM Pairs",
        sessionName: "Session 1",
        sectionName: "",
      },
      {
        id: crypto.randomUUID(),
        eventName: "Wednesday PM Pairs",
        sessionName: "",
        sectionName: "Section A",
      },
      {
        id: crypto.randomUUID(),
        eventName: "Wednesday PM Pairs",
        sessionName: "",
        sectionName: "Section B",
      },
    ],
  },
};

export const NoGames: Story = {
  args: {
    games: [],
  },
};
