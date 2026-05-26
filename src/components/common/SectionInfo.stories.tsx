import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionInfo } from "@/components/common/SectionInfo";
import { withAssignment } from "@storybook/decorators/AssignmentDecorator";
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
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ],
};

export const EventAndPairOnly: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      player1: {
        id: 1,
        firstName: "Jacqui",
        lastName: "Collier",
        nationalId: "477484",
      },
      player2: {
        id: 2,
        firstName: "David",
        lastName: "Collier",
        nationalId: "404476",
      },
      initialTableNumber: 3,
      initialDirection: "EW",
      pairId: "1",
    }),
  ],
};

export const EventAndSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment(null),
  ],
};

export const EventSectionAndPlayer: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "INDIVIDUAL",
      player: {
        id: 1,
        firstName: "Jacqui",
        lastName: "Collier",
        nationalId: "477484",
      },
      initialTableNumber: 3,
      initialDirection: "E",
      playerId: "12",
    }),
  ],
};

export const EventAndSession: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment(null),
  ],
};

export const EventSessionAndTeam: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "TEAM",
      pair1: {
        type: "PAIR",
        player1: {
          id: 1,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
        player2: {
          id: 2,
          firstName: "David",
          lastName: "Collier",
          nationalId: "404476",
        },
        initialTableNumber: 3,
        initialDirection: "NS",
      },
      pair2: {
        type: "PAIR",
        player1: {
          id: 3,
          firstName: "Peter",
          lastName: "Collier",
          nationalId: "123456",
        },
        player2: {
          id: 4,
          firstName: "Nye",
          lastName: "Collier",
          nationalId: null,
        },
        initialTableNumber: 3,
        initialDirection: "EW",
      },
      teamId: "1",
    }),
  ],
};

export const EventSessionAndSection: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment(null),
  ],
};

export const EventSessionSectionAndPair: Story = {
  decorators: [
    withGame({
      id: 1,
      eventName: "Monday AM Pairs",
      director: null,
      gameType: "PAIRS",
      gameId: crypto.randomUUID(),
      sessionName: "Session 1",
      sectionName: "Section A",
      eventDate: new Date().toISOString(),
      status: "CREATED",
      tables: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    withAssignment({
      type: "PAIR",
      player1: {
        id: 1,
        firstName: "Jacqui",
        lastName: "Collier",
        nationalId: "477484",
      },
      player2: {
        id: 2,
        firstName: "David",
        lastName: "Collier",
        nationalId: "404476",
      },
      initialTableNumber: 3,
      initialDirection: "EW",
      pairId: "11",
    }),
  ],
};
