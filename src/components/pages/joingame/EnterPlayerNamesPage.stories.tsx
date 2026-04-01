import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnterPlayerNamesPage } from "./EnterPlayerNamesPage";

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
  args: {
    eventName: "Monday PM Pairs",
    table: 3,
    direction: "NS",
  },
};

export const NSWithSection: Story = {
  args: {
    eventName: "Monday PM Pairs",
    sessionName: "Session 1",
    sectionName: "Section A",
    table: 3,
    direction: "NS",
  },
};

export const EW: Story = {
  args: {
    eventName: "Monday PM Pairs",
    table: 3,
    direction: "EW",
  },
};

export const EWWithSection: Story = {
  args: {
    eventName: "Monday PM Pairs",
    sessionName: "Session 1",
    sectionName: "Section A",
    table: 3,
    direction: "EW",
  },
};
