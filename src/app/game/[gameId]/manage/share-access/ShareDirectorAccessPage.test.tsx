import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockEmit = vi.fn();
const mockGetDirectorToken = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: (...args: unknown[]) => mockGetDirectorToken(...args),
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
import { SocketEvents } from "@/socket/socket-events";

describe("ShareDirectorAccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirectorToken.mockReturnValue("tok-1");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("requests a code on mount and displays it", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "ABCD" }),
    );

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.GENERATE_SHARE_CODE,
      { gameId: "g1", directorToken: "tok-1" },
      expect.any(Function),
    );
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText(/Expires in 5:00/)).toBeInTheDocument();
  });

  it("shows the server error message when generation fails", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: false, error: "Not allowed" }),
    );

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
    // No code -> spinner branch is shown (expiresIn still 300, not 0).
  });

  it("falls back to a default error message", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) => cb({ success: false }));

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(screen.getByText("Failed to generate code")).toBeInTheDocument();
  });

  it("shows a spinner when the ack has success but no code", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) => cb({ success: true }));

    const { container } = render(
      <ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />,
    );
    expect(screen.getByText("Failed to generate code")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("counts down and expires the code, then regenerates on demand", () => {
    vi.useFakeTimers();
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "WXYZ" }),
    );

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
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
    mockEmit.mockClear();
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "NEW1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate New Code" }));
    expect(screen.getByText("NEW1")).toBeInTheDocument();
  });

  it("regenerates when the 'Generate New Code' button is clicked while a code is shown", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "AAAA" }),
    );

    render(<ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />);
    expect(screen.getByText("AAAA")).toBeInTheDocument();

    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "BBBB" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate New Code" }));
    expect(screen.getByText("BBBB")).toBeInTheDocument();
  });

  it("does not re-generate on the mount effect after it has already mounted", () => {
    mockEmit.mockImplementation((_ev, _payload, cb) =>
      cb({ success: true, code: "AAAA" }),
    );

    const { rerender } = render(
      <ShareDirectorAccessPage gameId="g1" onBack={vi.fn()} />,
    );
    expect(mockEmit).toHaveBeenCalledTimes(1);

    // Changing gameId re-creates the memoized generateCode, so the mount
    // effect re-runs while hasMounted.current is already true -> the guard's
    // false branch is taken and generateCode is NOT invoked by the effect.
    mockEmit.mockClear();
    rerender(<ShareDirectorAccessPage gameId="g2" onBack={vi.fn()} />);
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
