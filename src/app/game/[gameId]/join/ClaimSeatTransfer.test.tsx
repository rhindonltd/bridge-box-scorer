import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockClaim = vi.fn();
vi.mock("@/lib/game-service", () => ({
  claimSeatTransfer: (...args: unknown[]) => mockClaim(...args),
}));

import { ClaimSeatTransfer } from "./ClaimSeatTransfer";

function open() {
  render(<ClaimSeatTransfer />);
  fireEvent.click(
    screen.getByRole("button", { name: /Moving from another device/i }),
  );
}

describe("ClaimSeatTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims the code (trimmed + uppercased) and routes to the seat's play page", async () => {
    mockClaim.mockResolvedValue({ gameId: "g9", seat: "B2EW" });
    open();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "abc234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Take over seat" }));

    expect(mockClaim).toHaveBeenCalledWith("ABC234");
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/g9/play/B2EW"),
    );
  });

  it("shows the server error and does not route when the code is invalid", async () => {
    mockClaim.mockRejectedValue(new Error("Code has expired"));
    open();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "OLD222" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Take over seat" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Code has expired"),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("disables submit until six characters are entered", () => {
    open();
    const submit = screen.getByRole("button", { name: "Take over seat" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "ABC23" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "ABC234" },
    });
    expect(submit).toBeEnabled();
  });

  it("uses the default error message when the failure is not an Error", async () => {
    mockClaim.mockRejectedValue("boom");
    open();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "ABC234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Take over seat" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to move seat",
      ),
    );
  });

  it("ignores submit when the trimmed code is shorter than six characters", () => {
    open();
    // The field allows leading/trailing spaces; a trimmed length < 6 hits the
    // early-return guard in handleSubmit (the button is enabled by raw length).
    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "AB    " },
    });
    // Submit via the form (Enter) to bypass the disabled-button UI check.
    fireEvent.submit(screen.getByLabelText("Transfer code").closest("form")!);
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it("closes and resets the form via the back/cancel action", () => {
    open();
    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "ABC234" },
    });

    // The PageLayout back button cancels -> handleClose -> reset + close.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    // The overlay form is gone.
    expect(screen.queryByLabelText("Transfer code")).not.toBeInTheDocument();

    // Re-open: the code was reset to empty.
    fireEvent.click(
      screen.getByRole("button", { name: /Moving from another device/i }),
    );
    expect(screen.getByLabelText("Transfer code")).toHaveValue("");
  });

  it("does not close while a claim is in flight", async () => {
    // A never-resolving claim keeps loading=true, so handleClose is a no-op.
    mockClaim.mockReturnValue(new Promise(() => {}));
    open();

    fireEvent.change(screen.getByLabelText("Transfer code"), {
      target: { value: "ABC234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Take over seat" }));

    // Now loading; the back/cancel action should be ignored.
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText("Transfer code")).toBeInTheDocument();
  });
});
