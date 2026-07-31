import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerLobbyPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/pages/mainmenu/MainMenuPage", () => ({
  MainMenuPage: ({
    onCreateNewGame,
    onJoinGame,
    onManagePastGames,
    onOpenSettings,
  }: any) => (
    <div>
      <button onClick={onCreateNewGame}>Create Game</button>
      <button onClick={onJoinGame}>Join Game</button>
      <button onClick={onManagePastGames}>Manage Games</button>
      <button onClick={onOpenSettings}>Settings</button>
    </div>
  ),
}));

describe("PlayerLobbyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to /create when create game is clicked", () => {
    render(<PlayerLobbyPage />);
    fireEvent.click(screen.getByText("Create Game"));
    expect(pushMock).toHaveBeenCalledWith("/create");
  });

  it("navigates to /join when join game is clicked", () => {
    render(<PlayerLobbyPage />);
    fireEvent.click(screen.getByText("Join Game"));
    expect(pushMock).toHaveBeenCalledWith("/join");
  });

  it("navigates to /manage when manage games is clicked", () => {
    render(<PlayerLobbyPage />);
    fireEvent.click(screen.getByText("Manage Games"));
    expect(pushMock).toHaveBeenCalledWith("/manage");
  });

  it("navigates to /settings when settings is clicked", () => {
    render(<PlayerLobbyPage />);
    fireEvent.click(screen.getByText("Settings"));
    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("renders the main menu page", () => {
    render(<PlayerLobbyPage />);
    expect(screen.getByText("Create Game")).toBeInTheDocument();
    expect(screen.getByText("Join Game")).toBeInTheDocument();
    expect(screen.getByText("Manage Games")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
