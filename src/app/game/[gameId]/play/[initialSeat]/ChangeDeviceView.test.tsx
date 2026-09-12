import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGenerate = vi.fn();
vi.mock("@/lib/game-service", () => ({
  generateSeatTransferCode: (...args: unknown[]) => mockGenerate(...args),
}));

import { ChangeDeviceView } from "./ChangeDeviceView";

describe("ChangeDeviceView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests a transfer code for the seat on mount and shows it + countdown", async () => {
    mockGenerate.mockResolvedValue("ABC234");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" />);

    expect(mockGenerate).toHaveBeenCalledWith("g1", "A3NS");
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "ABC234",
    );
    expect(screen.getByText(/Expires in 5:00/)).toBeInTheDocument();
    // Reassures the player their device loses the seat once claimed.
    expect(
      screen.getByText(/signed out of the seat/i),
    ).toBeInTheDocument();
  });

  it("shows the server error when generation fails", async () => {
    mockGenerate.mockRejectedValue(new Error("Unauthorized"));

    render(<ChangeDeviceView gameId="g1" seat="A3NS" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
  });

  it("falls back to a default error message", async () => {
    mockGenerate.mockRejectedValue("boom");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" />);
    expect(
      await screen.findByText("Failed to generate code"),
    ).toBeInTheDocument();
  });
});
