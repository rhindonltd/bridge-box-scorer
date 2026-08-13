import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageLayout2 } from "./PageLayout2";

const meta: Meta<typeof PageLayout2> = {
  title: "Components/Layout/PageLayout2",
  component: PageLayout2,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PageLayout2>;

export const Default: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerRight: "Pair 3",
    children: (
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Games</h2>
        <div className="space-y-3">
          <div className="rounded border p-4">Game 1</div>
          <div className="rounded border p-4">Game 2</div>
          <div className="rounded border p-4">Game 3</div>
        </div>
      </div>
    ),
  },
};

export const WithBackButton: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerRight: "Pair 3",
    backHref: "/games",
    children: (
      <div className="p-6">
        <p>Select a game to manage.</p>
      </div>
    ),
  },
};

export const WithSubHeader: Story = {
  args: {
    headerTitle: "Select Table",
    headerSubtitle: "Summer Pairs Championship",
    backHref: "/join",
    subHeader: (
      <div className="bg-blue-600 px-4 py-3 text-sm font-medium text-white">
        Please select your starting table
      </div>
    ),
    children: (
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <button
            key={index}
            className="rounded-lg border bg-white p-6 text-center font-semibold shadow-sm hover:bg-gray-50"
          >
            Table {index + 1}
          </button>
        ))}
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    headerTitle: "Confirm Selection",
    headerSubtitle: "Table 4",
    backHref: "/select-table",
    children: (
      <div className="p-6">
        <h2 className="mb-2 text-lg font-semibold">Table 4</h2>
        <p className="text-gray-600">
          You are about to join Table 4. Are you sure?
        </p>
      </div>
    ),
    actions: (
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border px-4 py-3">Cancel</button>
        <button className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-white">
          Confirm
        </button>
      </div>
    ),
  },
};

export const CenteredContent: Story = {
  args: {
    headerTitle: "Settings",
    backHref: "/",
    centerContent: true,
    children: (
      <div className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-center text-gray-600">
          Choose an option to continue.
        </p>
        <div className="flex flex-col gap-2">
          <button className="rounded-lg border px-6 py-3">Profile</button>
          <button className="rounded-lg border px-6 py-3">Preferences</button>
        </div>
      </div>
    ),
  },
};

export const Minimal: Story = {
  args: {
    children: (
      <div className="p-6">
        <p>Content only.</p>
      </div>
    ),
  },
};

export const LongContent: Story = {
  args: {
    headerTitle: "Game Results",
    headerSubtitle: "Summer Pairs Championship",
    backHref: "/games",
    subHeader: (
      <div className="bg-blue-600 px-4 py-3 text-sm text-white">
        Round 4 of 6
      </div>
    ),
    children: (
      <div className="space-y-4 p-6">
        {Array.from({ length: 25 }, (_, index) => (
          <div key={index} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="font-semibold">Game {index + 1}</div>
            <div className="text-sm text-gray-600">Result and game details</div>
          </div>
        ))}
      </div>
    ),
    actions: (
      <div className="flex justify-end">
        <button className="rounded-lg bg-blue-600 px-6 py-3 text-white">
          Continue
        </button>
      </div>
    ),
  },
};
