import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

    // Defaults to a plain change-device code (same pair, new device).
    expect(mockGenerate).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      "CHANGE_DEVICE",
      false,
    );
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "ABC234",
    );
    expect(screen.getByText(/Expires in 5:00/)).toBeInTheDocument();
    // Reassures the player their device loses the seat once claimed.
    expect(screen.getByText(/signed out of the seat/i)).toBeInTheDocument();
  });

  it("mints a HANDOVER code and shows arriving-pair copy when kind=HANDOVER", async () => {
    mockGenerate.mockResolvedValue("HAND01");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" kind="HANDOVER" />);

    expect(mockGenerate).toHaveBeenCalledWith("g1", "A3NS", "HANDOVER", false);
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "HAND01",
    );
    // Copy is tailored to the arriving pair taking over (both the instructions
    // and the footer mention them).
    expect(screen.getAllByText(/arriving pair/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/enter their names/i)).toBeInTheDocument();
  });

  it("mints a REINSTATE code and shows returning-pair copy when kind=REINSTATE", async () => {
    mockGenerate.mockResolvedValue("BACK01");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" kind="REINSTATE" />);

    expect(mockGenerate).toHaveBeenCalledWith("g1", "A3NS", "REINSTATE", false);
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "BACK01",
    );
    // Copy is tailored to the withdrawn pair returning on a device (both the
    // instructions and the footer mention them).
    expect(screen.getAllByText(/returning pair/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/pick up the seat again/i)).toBeInTheDocument();
  });

  it("mints a CHANGE_DEVICE code as the director and speaks about the pair's new device", async () => {
    mockGenerate.mockResolvedValue("MOVE01");
    render(<ChangeDeviceView gameId="g1" seat="A3NS" byDirector />);
    expect(mockGenerate).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      "CHANGE_DEVICE",
      true,
    );
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "MOVE01",
    );
    expect(screen.getByText(/pair.s new device/i)).toBeInTheDocument();
    expect(
      screen.getByText(/old device will be signed out/i),
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

  it("counts down and drops the code, showing an expired prompt", async () => {
    // Fake timers from the start so the countdown interval is fake too. The
    // code arrives via a resolved promise, which we flush before ticking.
    vi.useFakeTimers();
    mockGenerate.mockResolvedValue("ABC234");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" />);

    // Flush the pending generate() promise so the code renders and the
    // countdown effect starts.
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(screen.getByTestId("seat-transfer-code")).toHaveTextContent(
      "ABC234",
    );

    // One tick: 5:00 -> 4:59.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Expires in 4:59/)).toBeInTheDocument();

    // Run out the full remaining time: code is dropped and expiry hits 0.
    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    expect(screen.queryByTestId("seat-transfer-code")).not.toBeInTheDocument();
    expect(screen.getByText("Code expired.")).toBeInTheDocument();
  });

  it("only auto-generates once, even if the mount effect re-runs", async () => {
    mockGenerate.mockResolvedValue("ABC234");

    const { rerender } = render(<ChangeDeviceView gameId="g1" seat="A3NS" />);
    await screen.findByTestId("seat-transfer-code");
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    // Re-render with a new seat: the generate callback (and thus the mount
    // effect's dep) changes, but the hasMounted guard is already set, so no
    // second auto-generate fires.
    rerender(<ChangeDeviceView gameId="g1" seat="B1EW" />);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("regenerates a code when 'Generate new code' is pressed", async () => {
    const user = userEvent.setup();
    mockGenerate.mockResolvedValue("ABC234");

    render(<ChangeDeviceView gameId="g1" seat="A3NS" />);
    await screen.findByTestId("seat-transfer-code");
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    mockGenerate.mockResolvedValue("ZZZ999");
    await user.click(screen.getByRole("button", { name: "Generate new code" }));

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("seat-transfer-code")).toHaveTextContent(
      "ZZZ999",
    );
  });
});
