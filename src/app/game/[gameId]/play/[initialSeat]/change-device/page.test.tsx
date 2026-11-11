import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "g1", initialSeat: "A3NS" }),
  useRouter: () => ({ replace: mockReplace }),
}));

let mockTakenOver = false;
vi.mock("@/hooks/seat-taken-over", () => ({
  useSeatTakenOver: () => mockTakenOver,
}));

const mockRenumbered = vi.fn();
const mockEvicted = vi.fn();
vi.mock("@/hooks/seat-redirects", () => ({
  useSeatRenumberedRedirect: (...a: unknown[]) => mockRenumbered(...a),
  useSeatEvictedRedirect: (...a: unknown[]) => mockEvicted(...a),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage", () => ({
  SeatTakenOverPage: () => <div>seat-moved</div>,
}));
vi.mock(
  "@/app/game/[gameId]/play/[initialSeat]/change-device/ChangeDevicePage",
  () => ({
    ChangeDevicePage: ({ onBack }: { onBack: () => void }) => (
      <button type="button" onClick={onBack}>
        back
      </button>
    ),
  }),
);

import ChangeDeviceRoute from "./page";

describe("ChangeDeviceRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTakenOver = false;
  });

  it("goes back to the play screen for this seat", () => {
    render(<ChangeDeviceRoute />);
    fireEvent.click(screen.getByRole("button", { name: "back" }));
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/A3NS");
  });

  it("shows the seat-moved screen once the other device claims the code", () => {
    mockTakenOver = true;
    render(<ChangeDeviceRoute />);
    expect(screen.getByText("seat-moved")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "back" }),
    ).not.toBeInTheDocument();
  });

  it("reacts to pre-start seat changes (section split, eviction) like the play page", () => {
    render(<ChangeDeviceRoute />);
    expect(mockRenumbered).toHaveBeenCalledWith("g1", "A3NS");
    expect(mockEvicted).toHaveBeenCalledWith("g1", "A3NS");
  });
});
