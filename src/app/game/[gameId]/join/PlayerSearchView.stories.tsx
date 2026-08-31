import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PlayerSearchView } from "@/app/game/[gameId]/join/PlayerSearchView";

const meta: Meta<typeof PlayerSearchView> = {
  title: "App/Join/Game/Player/PlayerSearchView",
  component: PlayerSearchView,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    onQueryChange: fn(),
    onPlayerSelected: fn(),
    onClear: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PlayerSearchView>;

export const Empty: Story = {
  args: {
    label: "Player 1",
    value: null,
    query: "",
    results: [],
    loading: false,
  },
};

export const WithQuery: Story = {
  args: {
    label: "Player 1",
    value: null,
    query: "Smith",
    results: [],
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    label: "Player 1",
    value: null,
    query: "Smi",
    results: [],
    loading: true,
  },
};

export const WithResults: Story = {
  args: {
    label: "Player 1",
    value: null,
    query: "Smith",
    results: [
      { firstName: "Alice", lastName: "Smith", nationalId: "123456" },
      { firstName: "Bob", lastName: "Smithson", nationalId: "654321" },
      { firstName: "Carol", lastName: "Blacksmith", nationalId: null },
    ],
    loading: false,
  },
};

export const Selected: Story = {
  args: {
    label: "Player 1",
    value: { firstName: "Alice", lastName: "Smith", nationalId: "123456" },
    query: "",
    results: [],
    loading: false,
  },
};

export const SelectedNoEbu: Story = {
  args: {
    label: "Player 2",
    value: { firstName: "Bob", lastName: "Jones", nationalId: null },
    query: "",
    results: [],
    loading: false,
  },
};
