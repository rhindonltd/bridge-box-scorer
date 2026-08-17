import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderBar } from "./HeaderBar";

const meta: Meta<typeof HeaderBar> = {
  title: "Components/Layout/HeaderBar",
  component: HeaderBar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof HeaderBar>;

export const Minimal: Story = {
  args: {
    headerTitle: "Manage Games",
  },
};

export const WithSubTitle: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
  },
};

export const WithSubTitle2: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerSubtitle2: "Session 1, Section A",
  },
};

export const WithSubTitle2AndHeaderRight: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerSubtitle2: "Session 1, Section A",
    headerRight: "Pair 3",
  },
};

export const WithHeaderRight: Story = {
  args: {
    headerTitle: "Manage Games",
    headerRight: "Pair 3",
  },
};

export const WithSubTitleAndHeaderRight: Story = {
  args: {
    headerTitle: "Manage Games",
    headerRight: "Pair 3",
    headerSubtitle: "Summer Pairs Championship",
  },
};

export const WithBackButton: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerRight: "Pair 3",
    backHref: "/games",
  },
};

export const WithBackButtonAndSubTitle2: Story = {
  args: {
    headerTitle: "Manage Games",
    headerSubtitle: "Summer Pairs Championship",
    headerSubtitle2: "Session 1, Section A",
    headerRight: "Pair 3",
    backHref: "/games",
  },
};
