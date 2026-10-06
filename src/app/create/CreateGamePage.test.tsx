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

// The form is a two-step wizard: step 1 ("Next") collects the event + director
// name, step 2 ("Create Game") the type/scoring/toggles. Most tests exercise
// step 2, so advance past step 1 first. Next only unlocks once both details are
// present, so fill them unless the caller already did (e.g. via the BridgeWebs
// picker, which supplies the event name itself).
function goToOptionsStep({ fillDetails = true }: { fillDetails?: boolean } = {}) {
  if (fillDetails) {
    const eventName = screen.getByLabelText("Event Name");
    if ((eventName as HTMLInputElement).value.trim() === "") {
      fireEvent.change(eventName, { target: { value: "Test Event" } });
    }
    const director = screen.getByLabelText("Director Name") as HTMLInputElement;
    if (director.value.trim() === "") {
      fireEvent.change(director, { target: { value: "Test Director" } });
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
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

  it("starts on the details step with event and director name only", () => {
    render(<CreateGamePage />);

    expect(screen.getByLabelText("Event Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Director Name")).toBeInTheDocument();
    // Options-step fields are not mounted until the second step.
    expect(screen.queryByLabelText("Event Type")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create Game" }),
    ).not.toBeInTheDocument();
  });

  it("disables Next until both event name and director are filled", () => {
    render(<CreateGamePage />);

    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();

    // Only the event name: still blocked on the missing director.
    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    expect(next).toBeDisabled();

    // Both filled: Next unlocks.
    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "Jane" },
    });
    expect(next).not.toBeDisabled();
  });

  it("keeps the helper text visible on the details step even once filled", () => {
    render(<CreateGamePage />);

    const hint = "Enter an event name and director to continue.";
    expect(screen.getByText(hint)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "Jane" },
    });

    // Both filled, Next unlocked, but the standing instruction remains.
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it("drops the helper text once past the details step", () => {
    render(<CreateGamePage />);
    goToOptionsStep();

    expect(
      screen.queryByText("Enter an event name and director to continue."),
    ).not.toBeInTheDocument();
  });

  it("keeps Next disabled when the fields hold only whitespace", () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "   " },
    });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    // Still on the details step; options fields never mounted.
    expect(screen.queryByLabelText("Event Type")).not.toBeInTheDocument();
  });

  it("does not advance on Enter while the details are incomplete", () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    // Director still blank: submitting the form (e.g. Enter) must not advance.
    fireEvent.submit(screen.getByLabelText("Event Name").closest("form")!);

    expect(screen.queryByLabelText("Event Type")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Event Name")).toBeInTheDocument();
  });

  it("advances to the options step and shows the options fields", () => {
    render(<CreateGamePage />);
    goToOptionsStep();

    expect(screen.getByLabelText("Event Type")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Record Opening Lead" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Allow Hand Entry" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Game" }),
    ).toBeInTheDocument();
    // Details fields are no longer mounted on the options step.
    expect(screen.queryByLabelText("Event Name")).not.toBeInTheDocument();
  });

  it("carries the entered event and director name into the create payload", async () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "Jane" },
    });
    goToOptionsStep();
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "Tuesday Pairs", director: "Jane" }),
    );
  });

  it("does not render a tables field", () => {
    render(<CreateGamePage />);
    goToOptionsStep();
    expect(screen.queryByText("Initial Tables")).not.toBeInTheDocument();
  });

  it("does not render a Date Played field", () => {
    render(<CreateGamePage />);
    expect(screen.queryByLabelText("Date Played")).not.toBeInTheDocument();
    goToOptionsStep();
    expect(screen.queryByLabelText("Date Played")).not.toBeInTheDocument();
  });

  it("submits with tables defaulted to 5 and today's date", async () => {
    render(<CreateGamePage />);
    goToOptionsStep();

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
    goToOptionsStep();
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/new-game/create"),
    );
  });

  it("toggles the lead-card requirement and submits it", async () => {
    render(<CreateGamePage />);
    goToOptionsStep();

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
    goToOptionsStep();

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ handEntryEnabled: false }),
    );
  });

  it("toggles hand entry on and submits it", async () => {
    render(<CreateGamePage />);
    goToOptionsStep();

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

    goToOptionsStep();
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

    goToOptionsStep();
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
    goToOptionsStep();
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

    goToOptionsStep();
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
    goToOptionsStep();

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
    goToOptionsStep();

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
    goToOptionsStep();

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

  it("offers Point-a-Board (not Board-a-Match) for a Teams game in the default en-GB locale", async () => {
    render(<CreateGamePage />);
    goToOptionsStep();

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });

    // en-GB: the board-comparison method is "Point-a-Board" (PAB); the US name
    // "Board-a-Match" is not offered.
    expect(
      screen.getByRole("option", { name: "Point-a-Board" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Board-a-Match" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Scoring"), {
      target: { value: "PAB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "TEAMS", scoringType: "PAB" }),
    );
  });

  it("offers Board-a-Match (not Point-a-Board) for a Teams game in the en-US locale", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRIDGE_LOCALE", "en-US");

    render(<CreateGamePage />);
    goToOptionsStep();

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });

    // en-US: the board-comparison method is "Board-a-Match" (BAM); the UK name
    // "Point-a-Board" is not offered.
    expect(
      screen.getByRole("option", { name: "Board-a-Match" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Point-a-Board" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Scoring"), {
      target: { value: "BAM" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    await waitFor(() => expect(mockCreateGame).toHaveBeenCalledTimes(1));
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameType: "TEAMS", scoringType: "BAM" }),
    );

    vi.unstubAllEnvs();
  });

  it("preserves entered details when stepping back from options to details", () => {
    render(<CreateGamePage />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "Jane" },
    });
    goToOptionsStep();

    // Step back via the header back control, then confirm the fields kept
    // their values.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(screen.getByLabelText("Event Name")).toHaveValue("Tuesday Pairs");
    expect(screen.getByLabelText("Director Name")).toHaveValue("Jane");
  });

  it("shows an error and re-enables the button when creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateGame.mockRejectedValue(new Error("boom"));

    render(<CreateGamePage />);
    goToOptionsStep();
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
