import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnterPlayerNamesPage } from "@/components/pages/join/EnterPlayerNamesPage";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof EnterPlayerNamesPage> = {
  title: "Pages/JoinGame/EnterPlayerNamesPage",
  component: EnterPlayerNamesPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnterPlayerNamesPage>;

export const NS: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    table: 3,
    direction: "NS",
  },
};

export const NSWithSection: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "Section A",
      },
      null,
    ),
  ],
  args: {
    table: 3,
    direction: "NS",
  },
};

export const EW: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      null,
    ),
  ],
  args: {
    table: 3,
    direction: "EW",
  },
};

export const EWWithSection: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "Section A",
      },
      null,
    ),
  ],
  args: {
    table: 3,
    direction: "EW",
  },
};
