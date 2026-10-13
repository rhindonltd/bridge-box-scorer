import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainMenuPage } from "./MainMenuPage";

// Mock lucide icon to avoid SVG noise
vi.mock("lucide-react", () => ({
  Settings: () => <div data-testid="settings-icon" />,
}));

describe("MainMenuPage", () => {
  it("renders logo", () => {
    render(<MainMenuPage />);

    expect(screen.getByAltText("Bridge Box")).toBeInTheDocument();
  });

  it("links to settings", () => {
    render(<MainMenuPage />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("links Join Game to /join", () => {
    render(<MainMenuPage />);

    expect(screen.getByRole("link", { name: "Join Game" })).toHaveAttribute(
      "href",
      "/join",
    );
  });

  it("links Create New Game to /create", () => {
    render(<MainMenuPage />);

    expect(
      screen.getByRole("link", { name: "Create Game" }),
    ).toHaveAttribute("href", "/create");
  });

  it("links Manage Game to /manage", () => {
    render(<MainMenuPage />);

    expect(screen.getByRole("link", { name: "Manage Game" })).toHaveAttribute(
      "href",
      "/manage",
    );
  });

  it("links Display Game to /display", () => {
    render(<MainMenuPage />);

    expect(screen.getByRole("link", { name: "Display Game" })).toHaveAttribute(
      "href",
      "/display",
    );
  });

  it("applies layout structure classes", () => {
    const { container } = render(<MainMenuPage />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass(
      "flex-1",
      "flex",
      "flex-col",
      "overflow-y-auto",
      "relative",
    );
  });

  it("renders all main menu links", () => {
    render(<MainMenuPage />);

    expect(screen.getByText("Join Game")).toBeInTheDocument();
    expect(screen.getByText("Create Game")).toBeInTheDocument();
    expect(screen.getByText("Manage Game")).toBeInTheDocument();
    expect(screen.getByText("Display Game")).toBeInTheDocument();
  });
});
