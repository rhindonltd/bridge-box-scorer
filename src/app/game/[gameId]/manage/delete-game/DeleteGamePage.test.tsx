import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockClearDirectorToken = vi.fn();
const mockGetDirectorToken = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", eventName: "Tuesday Pairs" },
  }),
}));

vi.mock("@/lib/director-token", () => ({
  clearDirectorToken: (...args: unknown[]) => mockClearDirectorToken(...args),
  getDirectorToken: (...args: unknown[]) => mockGetDirectorToken(...args),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    actions,
    children,
  }: {
    headerTitle: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { DeleteGamePage } from "./DeleteGamePage";

describe("DeleteGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirectorToken.mockReturnValue("tok-123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the confirmation prompt with the event name", () => {
    render(<DeleteGamePage onGameDeleted={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Tuesday Pairs")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yes, Delete Game" }),
    ).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<DeleteGamePage onGameDeleted={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("deletes the game on success and clears the token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const onGameDeleted = vi.fn();

    render(
      <DeleteGamePage onGameDeleted={onGameDeleted} onCancel={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yes, Delete Game" }));

    // Button shows in-progress state.
    expect(
      await screen.findByRole("button", { name: "Deleting..." }),
    ).toBeInTheDocument();

    await waitFor(() => expect(onGameDeleted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/delete",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ directorToken: "tok-123" }),
      }),
    );
    expect(mockClearDirectorToken).toHaveBeenCalledWith("g1");
  });

  it("shows the server error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Game is locked" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeleteGamePage onGameDeleted={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes, Delete Game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Game is locked",
    );
    // Button re-enabled to its default label.
    expect(
      screen.getByRole("button", { name: "Yes, Delete Game" }),
    ).toBeInTheDocument();
  });

  it("falls back to a default error message when none is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeleteGamePage onGameDeleted={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes, Delete Game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to delete game",
    );
  });

  it("shows a network error when the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<DeleteGamePage onGameDeleted={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes, Delete Game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
});
