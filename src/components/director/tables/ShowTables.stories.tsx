import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ShowTables from "./ShowTables";

const meta: Meta<typeof ShowTables> = {
  title: "Components/Director/Tables/ShowTables",
  component: ShowTables,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ShowTables>;

export const Default: Story = {
  args: {
    tables: [
      {
        tableNumber: 1,
        players: {
          N: {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          S: {
            firstName: "David",
            lastName: "Collier",
          },
          E: {
            firstName: "Peter",
            lastName: "Collier",
          },
          W: {
            firstName: "Andrew",
            lastName: "Robson",
          },
        },
      },
      {
        tableNumber: 2,
        players: {
          N: {
            firstName: "Sally",
            lastName: "Brock",
          },
          S: {
            firstName: "Michael",
            lastName: "Byrne",
          },
          E: {
            firstName: "David",
            lastName: "Gold",
          },
          W: {
            firstName: "Tony",
            lastName: "Forrester",
          },
        },
      },
      {
        tableNumber: 3,
        players: {
          N: {
            firstName: "Sally",
            lastName: "Brock",
          },
          S: {
            firstName: "Michael",
            lastName: "Byrne",
          },
          E: {
            firstName: "David",
            lastName: "Gold",
          },
          W: {
            firstName: "Tony",
            lastName: "Forrester",
          },
        },
      },
      {
        tableNumber: 4,
        players: {
          N: {
            firstName: "Sally",
            lastName: "Brock",
          },
          S: {
            firstName: "Michael",
            lastName: "Byrne",
          },
          E: {
            firstName: "David",
            lastName: "Gold",
          },
          W: {
            firstName: "Tony",
            lastName: "Forrester",
          },
        },
      },
      {
        tableNumber: 5,
        players: {
          N: {
            firstName: "Sally",
            lastName: "Brock",
          },
          S: {
            firstName: "Michael",
            lastName: "Byrne",
          },
        },
      },
    ],
  },
};
