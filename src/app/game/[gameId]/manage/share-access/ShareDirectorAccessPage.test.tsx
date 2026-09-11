import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockGenerateShareCode = vi.fn();

vi.mock("@/lib/game-service", () => ({
  generateShareCode: (...args: unknown[]) => mockGenerateShareCode(...args),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { ShareDirectorAccessPage } from "./ShareDirectorAccessPage";

describe("ShareDirectorAccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("requests a code on mount and displays it", async () => {
    mockGenerateShareCode.mockResolvedValue("ABCD");

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);

    expect(mockGenerateShareCode).toHaveBeenCalledWith("g1");
    expect(await screen.findByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText(/Expires in 5:00/)).toBeInTheDocument();
  });

  it("shows the server error message when generation fails", async () => {
    mockGenerateShareCode.mockRejectedValue(new Error("Not allowed"));

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(await screen.findByText("Not allowed")).toBeInTheDocument();
    // No code -> spinner branch is shown (expiresIn still 300, not 0).
  });

  it("falls back to a default error message", async () => {
    mockGenerateShareCode.mockRejectedValue("boom");

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(
      await screen.findByText("Failed to generate code"),
    ).toBeInTheDocument();
  });

  it("counts down and expires the code, then regenerates on demand", async () => {
    vi.useFakeTimers();
    mockGenerateShareCode.mockResolvedValue("WXYZ");

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);

    // Flush the resolved generateShareCode promise (microtasks) under fake timers.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("WXYZ")).toBeInTheDocument();

    // Tick one second: 5:00 -> 4:59.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/Expires in 4:59/)).toBeInTheDocument();

    // Advance the full remaining duration to trigger expiry.
    act(() => {
      vi.advanceTimersByTime(300_000);
    });
    expect(screen.getByText("Code expired.")).toBeInTheDocument();

    // Regenerate from the expired state.
    mockGenerateShareCode.mockClear();
    mockGenerateShareCode.mockResolvedValue("NEW1");
    fireEvent.click(screen.getByRole("button", { name: "Generate New Code" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("NEW1")).toBeInTheDocument();
  });

  it("regenerates when the 'Generate New Code' button is clicked while a code is shown", async () => {
    mockGenerateShareCode.mockResolvedValue("AAAA");

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(await screen.findByText("AAAA")).toBeInTheDocument();

    mockGenerateShareCode.mockResolvedValue("BBBB");
    fireEvent.click(screen.getByRole("button", { name: "Generate New Code" }));
    expect(await screen.findByText("BBBB")).toBeInTheDocument();
  });

  it("does not re-generate on the mount effect after it has already mounted", async () => {
    mockGenerateShareCode.mockResolvedValue("AAAA");

    const { rerender } = render(
      <ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />,
    );
    expect(await screen.findByText("AAAA")).toBeInTheDocument();
    expect(mockGenerateShareCode).toHaveBeenCalledTimes(1);

    // Changing gameId re-creates the memoized generateCode, so the mount
    // effect re-runs while hasMounted.current is already true -> the guard's
    // false branch is taken and generateCode is NOT invoked by the effect.
    mockGenerateShareCode.mockClear();
    rerender(<ShareDirectorAccessPage gameId="g2" onBack={vi.fn()} />);
    expect(mockGenerateShareCode).not.toHaveBeenCalled();
  });
});
