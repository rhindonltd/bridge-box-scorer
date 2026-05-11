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
      null,
    ),
  ],
};

export const EventAndPairOnly: Story = {
  decorators: [
    withGame(
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
      null,
    ),
  ],
};

export const EventSectionAndPlayer: Story = {
  decorators: [
    withGame(
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
      null,
    ),
  ],
};

export const EventSessionAndTeam: Story = {
  decorators: [
    withGame(
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
        type: "TEAM",
        pair1: {
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
          initialDirection: "NS",
        },
        pair2: {
          type: "PAIR",
          player1: {
            firstName: "Peter",
            lastName: "Collier",
          },
          player2: {
            firstName: "Nye",
            lastName: "Collier",
          },
          initialTableNumber: 3,
          initialDirection: "EW",
        },
        teamId: "1",
      },
    ),
  ],
};

export const EventSessionAndSection: Story = {
  decorators: [
    withGame(
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
      null,
    ),
  ],
};

export const EventSessionSectionAndPair: Story = {
  decorators: [
    withGame(
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
