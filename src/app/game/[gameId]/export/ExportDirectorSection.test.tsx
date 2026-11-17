import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockMutateGame = vi.fn();
let gameLevel: string | null = "NORMAL_CLUB";
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", tournamentLevel: gameLevel },
    mutateGame: mockMutateGame,
  }),
}));

let bridgewebsConfigured = true;
let ebuConfigured = true;
vi.mock("swr", () => ({
  default: (key: string) => ({
    data:
      key === "/api/system/bridgewebs"
        ? { configured: bridgewebsConfigured }
        : { configured: ebuConfigured },
  }),
}));
vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    bridgewebs: () => "/api/system/bridgewebs",
    ebu: () => "/api/system/ebu",
  },
}));

const mockSaveLevel = vi.fn().mockResolvedValue(undefined);
const mockReopen = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  saveTournamentLevel: (...a: unknown[]) => mockSaveLevel(...a),
  reopenGame: (...a: unknown[]) => mockReopen(...a),
}));

let onLevelChange: ((l: string) => void) | undefined;
vi.mock("@/components/common/TournamentLevelSelect", () => ({
  TournamentLevelSelect: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (l: string) => void;
    disabled?: boolean;
  }) => {
    onLevelChange = onChange;
    return (
      <div data-testid="level" data-disabled={String(!!disabled)}>
        {value}
      </div>
    );
  },
}));

import { ExportDirectorSection } from "./ExportDirectorSection";

describe("ExportDirectorSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameLevel = "NORMAL_CLUB";
    bridgewebsConfigured = true;
    ebuConfigured = true;
  });

  it("shows the saved tournament level, defaulting when none is saved", () => {
    const { unmount } = render(<ExportDirectorSection gameId="g1" />);
    expect(screen.getByTestId("level")).toHaveTextContent("NORMAL_CLUB");
    unmount();
    gameLevel = null;
    render(<ExportDirectorSection gameId="g1" />);
    expect(screen.getByTestId("level")).toHaveTextContent("NORMAL_CLUB");
  });

  it("saves a changed level and updates the cached game", async () => {
    render(<ExportDirectorSection gameId="g1" />);
    onLevelChange!("NATIONAL_HEAT");
    await waitFor(() =>
      expect(mockSaveLevel).toHaveBeenCalledWith("g1", "NATIONAL_HEAT"),
    );
    await waitFor(() =>
      expect(mockMutateGame).toHaveBeenCalledWith(
        expect.objectContaining({ tournamentLevel: "NATIONAL_HEAT" }),
        false,
      ),
    );
  });

  it("reverts the level and shows the error when saving fails", async () => {
    mockSaveLevel.mockRejectedValueOnce(new Error("nope"));
    render(<ExportDirectorSection gameId="g1" />);
    onLevelChange!("NATIONAL_HEAT");
    expect(await screen.findByRole("alert")).toHaveTextContent("nope");
    expect(screen.getByTestId("level")).toHaveTextContent("NORMAL_CLUB");
  });

  it("offers uploads only for configured services", () => {
    render(<ExportDirectorSection gameId="g1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/export/upload-bridgewebs");
    fireEvent.click(screen.getByRole("button", { name: "Submit to EBU" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/export/upload-ebu");
  });

  it("hides uploads that are not configured", () => {
    bridgewebsConfigured = false;
    ebuConfigured = false;
    render(<ExportDirectorSection gameId="g1" />);
    expect(
      screen.queryByRole("button", { name: "Upload to BridgeWebs" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit to EBU" })).toBeNull();
  });

  it("asks for confirmation, then reopens and returns to the main menu", async () => {
    render(<ExportDirectorSection gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reopen game" }));
    expect(mockReopen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    await waitFor(() => expect(mockReopen).toHaveBeenCalledWith("g1"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("can cancel the reopen confirmation", () => {
    render(<ExportDirectorSection gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reopen game" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Reopen game" })).toBeVisible();
    expect(mockReopen).not.toHaveBeenCalled();
  });

  it("shows the error and stays when reopening fails", async () => {
    mockReopen.mockRejectedValueOnce(new Error("cannot"));
    render(<ExportDirectorSection gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reopen game" }));
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
