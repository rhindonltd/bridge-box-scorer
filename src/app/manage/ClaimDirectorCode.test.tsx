import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

const mockSetDirectorToken = vi.fn();
vi.mock("@/lib/director-token", () => ({
  setDirectorToken: (...args: unknown[]) => mockSetDirectorToken(...args),
}));

// Render the view as simple controls so we can drive the logic.
vi.mock("@/app/manage/ClaimDirectorCodeView", () => ({
  ClaimDirectorCodeView: ({
    code,
    error,
    loading,
    onCodeChange,
    onSubmit,
    onCancel,
  }: {
    code: string;
    error: string | null;
    loading: boolean;
    onCodeChange: (c: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
  }) => (
    <div>
      <input
        aria-label="code"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
      />
      <span data-testid="error">{error}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button onClick={onSubmit}>submit</button>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}));

import { SocketEvents } from "@/socket/socket-events";
import { ClaimDirectorCode } from "./ClaimDirectorCode";

function renderComponent(overrides: Partial<Parameters<typeof ClaimDirectorCode>[0]> = {}) {
  const props = {
    gameId: "g1",
    gameName: "Tuesday",
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<ClaimDirectorCode {...props} />);
  return props;
}

describe("ClaimDirectorCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when the code is blank", () => {
    renderComponent();
    fireEvent.click(screen.getByText("submit"));
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("claims the code, stores the token and reports success", () => {
    const props = renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: " abc123 " },
    });
    fireEvent.click(screen.getByText("submit"));

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.CLAIM_DIRECTOR_CODE,
      { code: "ABC123" },
      expect.any(Function),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    const ack = mockEmit.mock.calls[0][2] as (r: unknown) => void;
    act(() => ack({ success: true, directorToken: "tok", gameId: "g1" }));

    expect(mockSetDirectorToken).toHaveBeenCalledWith("g1", "tok");
    expect(props.onSuccess).toHaveBeenCalled();
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("shows the server error when the claim fails", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: "ABC123" },
    });
    fireEvent.click(screen.getByText("submit"));

    const ack = mockEmit.mock.calls[0][2] as (r: unknown) => void;
    act(() => ack({ success: false, error: "Nope" }));

    expect(screen.getByTestId("error")).toHaveTextContent("Nope");
  });

  it("falls back to a default error when none is provided", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: "ABC123" },
    });
    fireEvent.click(screen.getByText("submit"));

    const ack = mockEmit.mock.calls[0][2] as (r: unknown) => void;
    act(() => ack({ success: true })); // missing token/gameId -> treated as failure

    expect(screen.getByTestId("error")).toHaveTextContent(
      "Failed to claim code",
    );
  });

  it("cancels via the view", () => {
    const props = renderComponent();
    fireEvent.click(screen.getByText("cancel"));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
