import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MainMenu from "./page";

// Mock lucide icon to avoid SVG noise
vi.mock("lucide-react", () => ({
  Settings: () => <div data-testid="settings-icon" />,
}));

describe("MainMenu page", () => {
  it("renders the main menu links with correct destinations", () => {
    render(<MainMenu />);

    expect(screen.getByRole("link", { name: "Join Game" })).toHaveAttribute(
      "href",
      "/join",
    );
    expect(
      screen.getByRole("link", { name: "Create New Game" }),
    ).toHaveAttribute("href", "/create");
    expect(screen.getByRole("link", { name: "Manage Games" })).toHaveAttribute(
      "href",
      "/manage",
    );
    expect(screen.getByRole("link", { name: "Room Display" })).toHaveAttribute(
      "href",
      "/display",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});
