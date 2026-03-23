import React from "react";
import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderContentButtonLayout } from "./HeaderContentButtonLayout";

const meta: Meta<typeof HeaderContentButtonLayout> = {
  title: "Components/Layout/HeaderContentButtonLayout",
  component: HeaderContentButtonLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof HeaderContentButtonLayout>;

export const Default: Story = {
  args: {
    heading: <h1 className="text-3xl font-bold">Welcome to Our App</h1>,
    content: (
      <p className="max-w-md text-center text-gray-700">
        Here’s some engaging content to show users when they land on this page.
        You can customize this content as needed.
      </p>
    ),
    button: (
      <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Get Started
      </button>
    ),
  },
};
