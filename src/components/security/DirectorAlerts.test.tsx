import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import type { DirectorAlert } from "@/model/director-alert";

const handlers: Record<string, (payload?: unknown) => void> = {};
const socket = {
  on: vi.fn((event: string, fn: (p?: unknown) => void) => {
    handlers[event] = fn;
  }),
  off: vi.fn(),
};
const mockEmitWithAck = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => socket,
  emitWithAck: (...a: unknown[]) => mockEmitWithAck(...a),
}));

let tokens: { gameId: string; directorToken: string }[] = [];
vi.mock("@/lib/director-token", () => ({
  DIRECTOR_TOKENS_CHANGED: "test:tokens-changed",
  heldDirectorTokens: () => tokens,
  getDirectorToken: (gameId: string) => `tok-${gameId}`,
}));
const mockPlayChime = vi.fn();
vi.mock("@/lib/chime", () => ({
  playChime: () => mockPlayChime(),
  primeChime: vi.fn(),
}));

const hidden = new Set<string>();
const mockMarkAlertSeen = vi.fn((id: string) => hidden.add(id));
vi.mock("@/lib/director-alerts-seen", () => ({
  isAlertHidden: (a: { id: string }) => hidden.has(a.id),
  markAlertSeen: (id: string) => mockMarkAlertSeen(id),
}));

import { DirectorAlerts } from "./DirectorAlerts";

const call = (id: string, calls = 1): DirectorAlert => ({
  id,
  at: "2026-11-20T19:44:00.000Z",
  kind: "callDirector",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  table: { section: null, tableNumber: 3, roundNumber: 2, side: "NS" },
  players: "Mary Smith & John Jones",
  calls,
});

const alert = (id: string): DirectorAlert => ({
  id,
  at: "2026-11-20T19:42:00.000Z",
  kind: "signedIn",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  method: "adminKey",
  seatedAs: [],
});

describe("DirectorAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    hidden.clear();
    tokens = [{ gameId: "g1", directorToken: "t1" }];
    mockEmitWithAck.mockResolvedValue({ alerts: [] });
  });

  it("does nothing on a device that isn't a director", () => {
    tokens = [];
    render(<DirectorAlerts />);
    expect(socket.on).not.toHaveBeenCalled();
    expect(mockEmitWithAck).not.toHaveBeenCalled();
  });

  it("proves its director tokens and shows missed alerts", async () => {
    mockEmitWithAck.mockResolvedValue({ alerts: [alert("a1")] });
    render(<DirectorAlerts />);
    expect(mockEmitWithAck).toHaveBeenCalledWith("director:watch", {
      directors: tokens,
    });
    expect(await screen.findByText("Security alert")).toBeInTheDocument();
  });

  it("shows live alerts, once each, and not ones it should hide", async () => {
    hidden.add("mine");
    render(<DirectorAlerts />);
    await waitFor(() => expect(handlers["director:alert"]).toBeDefined());
    act(() => {
      handlers["director:alert"](alert("a1"));
      handlers["director:alert"](alert("a1"));
      handlers["director:alert"](alert("mine"));
    });
    expect(screen.getAllByTestId("director-alert")).toHaveLength(1);
  });

  it("dismissing remembers the alert and removes it", async () => {
    mockEmitWithAck.mockResolvedValue({ alerts: [alert("a1")] });
    render(<DirectorAlerts />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(mockMarkAlertSeen).toHaveBeenCalledWith("a1");
    expect(screen.queryByTestId("director-alert")).not.toBeInTheDocument();
  });

  it("re-proves its tokens on reconnect and when they change", async () => {
    render(<DirectorAlerts />);
    await waitFor(() => expect(handlers.connect).toBeDefined());
    act(() => handlers.connect());
    act(() => {
      window.dispatchEvent(new Event("test:tokens-changed"));
    });
    expect(mockEmitWithAck).toHaveBeenCalledTimes(3);
  });

  it("starts watching once the device becomes a director", () => {
    tokens = [];
    render(<DirectorAlerts />);
    tokens = [{ gameId: "g2", directorToken: "t2" }];
    act(() => {
      window.dispatchEvent(new Event("test:tokens-changed"));
    });
    expect(mockEmitWithAck).toHaveBeenCalledWith("director:watch", {
      directors: tokens,
    });
  });

  it("tells the server when it no longer directs anything", () => {
    render(<DirectorAlerts />);
    tokens = [];
    act(() => {
      window.dispatchEvent(new Event("test:tokens-changed"));
    });
    expect(mockEmitWithAck).toHaveBeenLastCalledWith("director:watch", {
      directors: [],
    });
  });

  it("ignores a failed watch (it retries on reconnect)", async () => {
    mockEmitWithAck.mockRejectedValue(new Error("Timeout"));
    render(<DirectorAlerts />);
    await Promise.resolve();
    expect(screen.queryByTestId("director-alert")).not.toBeInTheDocument();
  });

  it("stops listening when unmounted", () => {
    const { unmount } = render(<DirectorAlerts />);
    unmount();
    expect(socket.off).toHaveBeenCalledWith(
      "director:alert",
      expect.any(Function),
    );
    expect(socket.off).toHaveBeenCalledWith("connect", expect.any(Function));
  });

  it("has nothing to stop when it never listened", () => {
    tokens = [];
    const { unmount } = render(<DirectorAlerts />);
    unmount();
    expect(socket.off).not.toHaveBeenCalled();
  });

  it("chimes for a call, and updates it in place when called again", async () => {
    render(<DirectorAlerts />);
    await waitFor(() => expect(handlers["director:alert"]).toBeDefined());
    act(() => handlers["director:alert"](alert("security")));
    expect(mockPlayChime).not.toHaveBeenCalled();
    act(() => handlers["director:alert"](call("c1")));
    expect(mockPlayChime).toHaveBeenCalledTimes(1);
    act(() => handlers["director:alert"](call("c1", 2)));
    expect(mockPlayChime).toHaveBeenCalledTimes(2);
    const cards = screen.getAllByTestId("director-alert");
    expect(cards).toHaveLength(2);
    expect(cards[1]).toHaveTextContent("They have called 2 times.");
  });

  it("answers a call when it is dismissed", async () => {
    mockEmitWithAck.mockImplementation(async (event: string) =>
      event === "director:watch"
        ? { alerts: [call("c1")] }
        : { answered: true },
    );
    render(<DirectorAlerts />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith("director:answerCall", {
      gameId: "g1",
      directorToken: "tok-g1",
      alertId: "c1",
    });
  });

  it("ignores a failed answer", async () => {
    mockEmitWithAck.mockImplementation(async (event: string) => {
      if (event === "director:watch") return { alerts: [call("c1")] };
      throw new Error("offline");
    });
    render(<DirectorAlerts />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    await Promise.resolve();
    expect(screen.queryByTestId("director-alert")).not.toBeInTheDocument();
  });

  it("doesn't answer anything when a security alert is dismissed", async () => {
    mockEmitWithAck.mockResolvedValue({ alerts: [alert("a1")] });
    render(<DirectorAlerts />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(mockEmitWithAck).not.toHaveBeenCalledWith(
      "director:answerCall",
      expect.anything(),
    );
  });
});
