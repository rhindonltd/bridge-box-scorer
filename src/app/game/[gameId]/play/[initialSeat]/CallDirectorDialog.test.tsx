import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CallDirectorDialog } from "./CallDirectorDialog";
import type { CallDirectorState } from "@/hooks/call-director";

const table = {
  section: null,
  tableNumber: 3,
  roundNumber: 2,
  side: "NS" as const,
};

function setup(state: CallDirectorState) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <CallDirectorDialog
      state={state}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose };
}

describe("CallDirectorDialog", () => {
  it("renders nothing while closed", () => {
    setup({ step: "closed" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation, and can be cancelled", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = setup({ step: "confirm" });

    expect(screen.getByText("Call the director?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Call Director" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables the button while sending", () => {
    setup({ step: "sending" });
    expect(screen.getByRole("button", { name: "Calling…" })).toBeDisabled();
  });

  it("names the table once called", async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ step: "called", table, calls: 1 });

    expect(screen.getByText("Director called")).toBeInTheDocument();
    expect(screen.getByText(/Table 3, Round 2/)).toBeInTheDocument();
    expect(screen.queryByText(/times/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("says how many times the pair has called", () => {
    setup({ step: "called", table, calls: 3 });
    expect(screen.getByText(/You have called 3 times/)).toBeInTheDocument();
  });

  it("tells the player the director is on the way", async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ step: "answered" });

    expect(screen.getByText("The director is on the way")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error", async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ step: "error", message: "Not your seat" });

    expect(screen.getByRole("alert")).toHaveTextContent("Not your seat");
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalled();
  });
});
