import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreateGame from "./page";

// Mock the child component
vi.mock("@/components/pages/create/CreateGamePage", () => ({
  CreateGamePage: () => <div data-testid="create-game-page" />,
}));

describe("CreateGame page", () => {
  it("renders CreateGamePage", () => {
    render(<CreateGame />);

    expect(screen.getByTestId("create-game-page")).toBeInTheDocument();
  });
});
