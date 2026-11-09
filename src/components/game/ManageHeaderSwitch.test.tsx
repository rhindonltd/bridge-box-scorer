import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSeat = vi.fn();
vi.mock("@/hooks/use-player-seat", () => ({
  usePlayerSeat: () => mockSeat(),
}));

import { ManageHeaderSwitch } from "./ManageHeaderSwitch";

describe("ManageHeaderSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSeat.mockReturnValue("A1NS");
  });

  it("always renders the hamburger, offering Share Director Access", async () => {
    const user = userEvent.setup();
    render(<ManageHeaderSwitch gameId="g1" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Share Director Access" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/share-access");
  });

  it("folds the play switch into the hamburger (hidden from sm up)", async () => {
    const user = userEvent.setup();
    render(<ManageHeaderSwitch gameId="g1" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const folded = screen.getByRole("menuitem", { name: "Play" });
    // The visible header button covers `sm`+, so the folded item is hidden there.
    expect(folded).toHaveClass("sm:hidden");
    await user.click(folded);
    expect(mockPush).toHaveBeenCalledWith("/game/g1/play/A1NS");
  });

  it("offers Join instead of Play when the device holds no seat", async () => {
    mockSeat.mockReturnValue(null);
    const user = userEvent.setup();
    render(<ManageHeaderSwitch gameId="g1" />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menuitem", { name: "Join" })).toBeInTheDocument();
  });
});
