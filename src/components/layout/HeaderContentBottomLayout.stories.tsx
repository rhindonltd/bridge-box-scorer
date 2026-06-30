import React from "react";
import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderContentBottomLayout } from "./HeaderContentBottomLayout";

const meta: Meta<typeof HeaderContentBottomLayout> = {
  title: "Components/Layout/HeaderContentBottomLayout",
  component: HeaderContentBottomLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof HeaderContentBottomLayout>;

export const Default: Story = {
  args: {
    heading: <h1 className="text-3xl font-bold">Welcome to Our App</h1>,
    content: (
      <p className="max-w-md text-center text-gray-700">
        Here’s some engaging content to show users when they land on this page.
        You can customize this content as needed.
      </p>
    ),
    bottom: (
      <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Get Started
      </button>
    ),
  },
};
