import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockClaimDirectorCode = vi.fn();
vi.mock("@/lib/game-service", () => ({
  claimDirectorCode: (...args: unknown[]) => mockClaimDirectorCode(...args),
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

import { ClaimDirectorCode } from "./ClaimDirectorCode";

function renderComponent(
  overrides: Partial<Parameters<typeof ClaimDirectorCode>[0]> = {},
) {
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
    expect(mockClaimDirectorCode).not.toHaveBeenCalled();
  });

  it("claims the code (trimmed + uppercased) and reports success", async () => {
    mockClaimDirectorCode.mockResolvedValue("g1");
    const props = renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: " abc123 " },
    });
    fireEvent.click(screen.getByText("submit"));

    expect(mockClaimDirectorCode).toHaveBeenCalledWith("ABC123");
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("shows the server error when the claim fails", async () => {
    mockClaimDirectorCode.mockRejectedValue(new Error("Nope"));
    renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: "ABC123" },
    });
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Nope"),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("falls back to a default error when the rejection is not an Error", async () => {
    mockClaimDirectorCode.mockRejectedValue("boom");
    renderComponent();

    fireEvent.change(screen.getByLabelText("code"), {
      target: { value: "ABC123" },
    });
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Failed to claim code",
      ),
    );
  });

  it("cancels via the view", () => {
    const props = renderComponent();
    fireEvent.click(screen.getByText("cancel"));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
