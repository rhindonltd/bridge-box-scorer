import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionInfo } from "@/components/common/SectionInfo";
import { withGame } from "@storybook/decorators/GameDecorator";

const meta: Meta<typeof SectionInfo> = {
  title: "Components/Common/SectionInfo",
  component: SectionInfo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SectionInfo>;

export const EventOnly: Story = {
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
};

export const EventAndPairOnly: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "",
      },
      {
        type: "PAIR",
        player1: {
          firstName: "Jacqui",
          lastName: "Collier",
        },
        player2: {
          firstName: "David",
          lastName: "Collier",
        },
        initialTableNumber: 3,
        initialDirection: "EW",
        pairId: "1",
      },
    ),
  ],
};

export const EventAndSection: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "Section A",
      },
      null,
    ),
  ],
};

export const EventSectionAndPlayer: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "",
        sectionName: "Section A",
      },
      {
        type: "INDIVIDUAL",
        player: {
          firstName: "Jacqui",
          lastName: "Collier",
        },
        initialTableNumber: 3,
        initialDirection: "E",
        playerId: "12",
      },
    ),
  ],
};

export const EventAndSession: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "",
      },
      null,
    ),
  ],
};

export const EventSessionAndTeam: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "",
      },
      {
        type: "TEAM",
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
          {
            firstName: "Nye",
            lastName: "Collier",
          },
          {
            firstName: "Peter",
            lastName: "Collier",
          },
        ],
        initialTableNumber: 3,
        teamId: "1",
      },
    ),
  ],
};

export const EventSessionAndSection: Story = {
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
};

export const EventSessionSectionAndPair: Story = {
  decorators: [
    withGame(
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        sessionName: "Session 1",
        sectionName: "Section A",
      },
      {
        type: "PAIR",
        player1: {
          firstName: "Jacqui",
          lastName: "Collier",
        },
        player2: {
          firstName: "David",
          lastName: "Collier",
        },
        initialTableNumber: 3,
        initialDirection: "EW",
        pairId: "11",
      },
    ),
  ],
};
