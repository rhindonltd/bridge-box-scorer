import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---- mocks ----

const mockCreateGame = vi.fn();
vi.mock("@/lib/game-service", () => ({
  createGame: (...args: unknown[]) => mockCreateGame(...args),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { CreateGamePage } from "./CreateGamePage";

function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

describe("CreateGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGame.mockResolvedValue({ gameId: "new-game" });
  });

  it("does not render a tables field", () => {
    render(<CreateGamePage />);
    expect(screen.queryByText("Initial Tables")).not.toBeInTheDocument();
  });

  it("renders a Date Played field defaulting to today", () => {
    render(<CreateGamePage />);
    const input = screen.getByLabelText("Date Played") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "date");
    expect(input.value).toBe(todayDateOnly());
  });

  it("submits with tables defaulted to 5 and the selected date", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Date Played"), {
      target: { value: "2026-05-20" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        tables: 5,
        eventDate: "2026-05-20",
      }),
    );
  });

  it("navigates to the game create page after creating", async () => {
    render(<CreateGamePage />);
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/new-game/create"),
    );
  });

  it("toggles the lead-card requirement and submits it", async () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ leadCardRequired: false }),
    );
  });

  it("shows an error and re-enables the button when creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateGame.mockRejectedValue(new Error("boom"));

    render(<CreateGamePage />);
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to create game. Please try again.");
    expect(mockReplace).not.toHaveBeenCalled();
    // Button back to enabled/default label after failure.
    expect(
      screen.getByRole("button", { name: "Create Game" }),
    ).not.toBeDisabled();
  });
});
