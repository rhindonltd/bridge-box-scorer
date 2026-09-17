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

// The BridgeWebs event picker reads its data via SWR. Default to "not
// configured" so the base tests see the page exactly as before; individual
// tests override the returned data.
const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (key: string) => mockUseSWR(key),
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
    // Default: BridgeWebs not configured -> no picker.
    mockUseSWR.mockReturnValue({
      data: { configured: false, events: [] },
    });
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

  it("does not show the BridgeWebs picker when not configured", () => {
    render(<CreateGamePage />);
    expect(screen.queryByLabelText("BridgeWebs Event")).not.toBeInTheDocument();
  });

  it("does not show the picker when configured but there are no events", () => {
    mockUseSWR.mockReturnValue({ data: { configured: true, events: [] } });
    render(<CreateGamePage />);
    expect(screen.queryByLabelText("BridgeWebs Event")).not.toBeInTheDocument();
  });

  it("shows the picker and prefills the event name on selection, persisting the event id", async () => {
    mockUseSWR.mockReturnValue({
      data: {
        configured: true,
        events: [
          { id: "1", title: "Monday Duplicate" },
          { id: "2", title: "Afternoon Teams" },
        ],
      },
    });

    render(<CreateGamePage />);

    const picker = screen.getByLabelText("BridgeWebs Event");
    expect(picker).toBeInTheDocument();

    fireEvent.change(picker, { target: { value: "2" } });

    // Event name is prefilled from the selected event.
    expect(screen.getByLabelText("Event Name")).toHaveValue("Afternoon Teams");

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "Afternoon Teams",
        bridgewebsEventId: "2",
      }),
    );
  });

  it("submits a null bridgewebsEventId when no event is chosen", async () => {
    render(<CreateGamePage />);
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ bridgewebsEventId: null }),
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
