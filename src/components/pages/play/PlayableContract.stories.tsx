import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PlayableContract } from "./PlayableContract";

const meta: Meta<typeof PlayableContract> = {
  title: "Pages/Play/PlayableContract",
  component: PlayableContract,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onLevelSelected: fn(),
    onSuitSelected: fn(),
    onDeclarerSelected: fn(),
    onDblSelected: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PlayableContract>;

export const Empty: Story = {
  args: {
    level: null,
    suit: null,
    declarer: null,
    dbl: null,
  },
};

export const PartiallyFilled: Story = {
  args: {
    level: 3,
    suit: "NT",
    declarer: null,
    dbl: null,
  },
};

export const FullyFilled: Story = {
  args: {
    level: 4,
    suit: "H",
    declarer: "S",
    dbl: "X",
  },
};

export const Redoubled: Story = {
  args: {
    level: 7,
    suit: "S",
    declarer: "N",
    dbl: "XX",
  },
};

export const Undoubled: Story = {
  args: {
    level: 1,
    suit: "C",
    declarer: "E",
    dbl: "",
  },
};
