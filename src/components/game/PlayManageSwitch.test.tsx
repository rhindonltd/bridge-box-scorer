import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { PlayManageSwitch } from "./PlayManageSwitch";
import { setPlayerToken } from "@/lib/player-token";

describe("PlayManageSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("toManage: shows 'Manage' and navigates to the manage menu", () => {
    render(<PlayManageSwitch gameId="g1" direction="toManage" />);
    const button = screen.getByRole("button", { name: "Manage" });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
  });

  it("toPlay seated: shows 'Play' and navigates to the device's seat", () => {
    setPlayerToken("g1", { startingPosition: "A3NS", token: "tok" });
    render(<PlayManageSwitch gameId="g1" direction="toPlay" />);
    const button = screen.getByRole("button", { name: "Play" });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A3NS");
  });

  it("toPlay unseated: shows 'Join' and navigates to the join flow", () => {
    render(<PlayManageSwitch gameId="g1" direction="toPlay" />);
    const button = screen.getByRole("button", { name: "Join" });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith("/game/g1/join");
  });
});
