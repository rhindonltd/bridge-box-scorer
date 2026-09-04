import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/app/game/[gameId]/manage/ManageGameMenuPage", () => ({
  ManageGameMenuPage: (props: Record<string, () => void>) => (
    <div>
      {Object.entries(props).map(([name, handler]) => (
        <button key={name} onClick={handler}>
          {name}
        </button>
      ))}
    </div>
  ),
}));

import { ManageGameMenu } from "./ManageGameMenu";

describe("ManageGameMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes each menu action to the correct path", () => {
    render(<ManageGameMenu gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "onSetUpGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/create");

    fireEvent.click(screen.getByRole("button", { name: "onTravellersClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/travellers");

    fireEvent.click(screen.getByRole("button", { name: "onMovementClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/movement");

    fireEvent.click(
      screen.getByRole("button", { name: "onShareDirectorAccessClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/share-access");

    fireEvent.click(
      screen.getByRole("button", { name: "onDownloadUsebioClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/download-usebio");

    fireEvent.click(screen.getByRole("button", { name: "onDeleteGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/delete-game");
  });
});
