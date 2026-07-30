import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RoundStatusView } from "./RoundStatusView";

const meta: Meta<typeof RoundStatusView> = {
  title: "Pages/Manage/RoundStatusView",
  component: RoundStatusView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RoundStatusView>;

export const AllProgressing: Story = {
  args: {
    eventName: "Monday AM Pairs",
    isLoading: false,
    tables: [
      { tableNumber: 1, currentRound: 3, boardsEntered: 2, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 2, currentRound: 3, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 3, currentRound: 2, boardsEntered: 1, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 4, currentRound: 3, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
    ],
  },
};

export const WithMissingRounds: Story = {
  args: {
    eventName: "Tuesday PM Individual",
    isLoading: false,
    tables: [
      { tableNumber: 1, currentRound: 3, boardsEntered: 1, boardsTotal: 3, hasMissingPreviousRounds: true, missingRounds: [2] },
      { tableNumber: 2, currentRound: 4, boardsEntered: 2, boardsTotal: 3, hasMissingPreviousRounds: true, missingRounds: [2, 3] },
      { tableNumber: 3, currentRound: 2, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
    ],
  },
};

export const AllComplete: Story = {
  args: {
    eventName: "Thursday Pairs",
    isLoading: false,
    tables: [
      { tableNumber: 1, currentRound: 5, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 2, currentRound: 5, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 3, currentRound: 5, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 4, currentRound: 5, boardsEntered: 3, boardsTotal: 3, hasMissingPreviousRounds: false, missingRounds: [] },
    ],
  },
};

export const NoScoresYet: Story = {
  args: {
    eventName: "Wednesday Evening Teams",
    isLoading: false,
    tables: [
      { tableNumber: 1, currentRound: 0, boardsEntered: 0, boardsTotal: 0, hasMissingPreviousRounds: false, missingRounds: [] },
      { tableNumber: 2, currentRound: 0, boardsEntered: 0, boardsTotal: 0, hasMissingPreviousRounds: false, missingRounds: [] },
    ],
  },
};

export const Empty: Story = {
  args: {
    eventName: "New Game",
    isLoading: false,
    tables: [],
  },
};

export const Loading: Story = {
  args: {
    eventName: "Loading Game",
    isLoading: true,
    tables: [],
  },
};
