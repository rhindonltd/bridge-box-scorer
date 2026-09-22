import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

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

  it("does not render a Date Played field", () => {
    render(<CreateGamePage />);
    expect(screen.queryByLabelText("Date Played")).not.toBeInTheDocument();
  });

  it("submits with tables defaulted to 5 and today's date", async () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        tables: 5,
        eventDate: todayDateOnly(),
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

    const leadGroup = screen.getByRole("group", {
      name: "Record Opening Lead",
    });
    fireEvent.click(within(leadGroup).getByRole("button", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ leadCardRequired: false }),
    );
  });

  it("defaults hand entry off and submits it off", async () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ handEntryEnabled: false }),
    );
  });

  it("toggles hand entry on and submits it", async () => {
    render(<CreateGamePage />);

    const handEntryGroup = screen.getByRole("group", {
      name: "Allow Hand Entry",
    });
    fireEvent.click(
      within(handEntryGroup).getByRole("button", { name: "Yes" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ handEntryEnabled: true }),
    );
  });

  it("shows only a free-text Event Name and no BridgeWebs switch when not configured", () => {
    render(<CreateGamePage />);
    const eventName = screen.getByLabelText("Event Name") as HTMLInputElement;
    expect(eventName.tagName).toBe("INPUT");
    expect(screen.queryByText("Use BridgeWebs Event")).not.toBeInTheDocument();
  });

  it("shows no BridgeWebs switch when configured but there are no events", () => {
    mockUseSWR.mockReturnValue({ data: { configured: true, events: [] } });
    render(<CreateGamePage />);
    const eventName = screen.getByLabelText("Event Name") as HTMLInputElement;
    expect(eventName.tagName).toBe("INPUT");
    expect(screen.queryByText("Use BridgeWebs Event")).not.toBeInTheDocument();
  });

  it("offers a BridgeWebs switch and swaps Event Name to a dropdown, prefilling and persisting the event id", async () => {
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

    // Starts as a free-text field; the switch defaults to "No".
    expect(screen.getByText("Use BridgeWebs Event")).toBeInTheDocument();
    expect((screen.getByLabelText("Event Name") as HTMLElement).tagName).toBe(
      "INPUT",
    );

    // Turn the switch on -> Event Name becomes a dropdown of events.
    const bridgewebsSwitch = screen.getByRole("group", {
      name: "Use BridgeWebs Event",
    });
    fireEvent.click(
      within(bridgewebsSwitch).getByRole("button", { name: "Yes" }),
    );

    const picker = screen.getByLabelText("Event Name");
    expect(picker.tagName).toBe("SELECT");

    fireEvent.change(picker, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "Afternoon Teams",
        bridgewebsEventId: "2",
      }),
    );
  });

  it("drops the BridgeWebs event id when the switch is turned back off", async () => {
    mockUseSWR.mockReturnValue({
      data: {
        configured: true,
        events: [{ id: "2", title: "Afternoon Teams" }],
      },
    });

    render(<CreateGamePage />);

    const bridgewebsSwitch = screen.getByRole("group", {
      name: "Use BridgeWebs Event",
    });
    fireEvent.click(
      within(bridgewebsSwitch).getByRole("button", { name: "Yes" }),
    );
    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "2" },
    });
    // Back to free text: keeps the prefilled name but drops the event id.
    fireEvent.click(
      within(bridgewebsSwitch).getByRole("button", { name: "No" }),
    );

    expect((screen.getByLabelText("Event Name") as HTMLElement).tagName).toBe(
      "INPUT",
    );
    expect(screen.getByLabelText("Event Name")).toHaveValue("Afternoon Teams");

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "Afternoon Teams",
        bridgewebsEventId: null,
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

  it("treats an undefined BridgeWebs response as not configured", () => {
    // SWR has no data yet: the `?? false` / `?? 0` fallbacks must keep the
    // picker unavailable rather than throwing.
    mockUseSWR.mockReturnValue({ data: undefined });
    render(<CreateGamePage />);

    expect((screen.getByLabelText("Event Name") as HTMLElement).tagName).toBe(
      "INPUT",
    );
    expect(screen.queryByText("Use BridgeWebs Event")).not.toBeInTheDocument();
  });

  it("leaves the event name untouched when the 'None' option is picked", async () => {
    mockUseSWR.mockReturnValue({
      data: {
        configured: true,
        events: [{ id: "2", title: "Afternoon Teams" }],
      },
    });

    render(<CreateGamePage />);

    const bridgewebsSwitch = screen.getByRole("group", {
      name: "Use BridgeWebs Event",
    });
    fireEvent.click(
      within(bridgewebsSwitch).getByRole("button", { name: "Yes" }),
    );

    const picker = screen.getByLabelText("Event Name");
    // Prefill a name, then pick "None" (value ""): the id clears but the name
    // stays put (the `if (selected)` guard's false arm).
    fireEvent.change(picker, { target: { value: "2" } });
    fireEvent.change(picker, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    // Picker is shown but no event is selected, so the id resolves to null via
    // the `bridgewebsEventId || null` fallback.
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "Afternoon Teams",
        bridgewebsEventId: null,
      }),
    );
  });

  it("reveals a Scoring selector for a Pairs game, defaulting to MP", async () => {
    render(<CreateGamePage />);

    const scoring = screen.getByLabelText("Scoring") as HTMLSelectElement;
    expect(scoring.tagName).toBe("SELECT");
    expect(scoring.value).toBe("MP");

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    const payload = mockCreateGame.mock.calls[0][0];
    expect(payload.gameType).toBe("PAIRS");
    expect(payload.scoringType).toBe("MP");
  });

  it("submits XIMP when a Pairs game selects Cross-IMPs", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Scoring"), {
      target: { value: "XIMP" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "PAIRS", scoringType: "XIMP" }),
    );
  });

  it("reveals a Scoring selector for a Teams game, defaulting to IMP", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });

    const scoring = screen.getByLabelText("Scoring") as HTMLSelectElement;
    expect(scoring.tagName).toBe("SELECT");
    expect(scoring.value).toBe("IMP");

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "TEAMS", scoringType: "IMP" }),
    );
  });

  it("submits Board-a-Match scoring for a Teams game", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });
    fireEvent.change(screen.getByLabelText("Scoring"), {
      target: { value: "BAM" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "TEAMS", scoringType: "BAM" }),
    );
  });

  it("submits Point-a-Board scoring for a Teams game", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });
    fireEvent.change(screen.getByLabelText("Scoring"), {
      target: { value: "PAB" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "TEAMS", scoringType: "PAB" }),
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
