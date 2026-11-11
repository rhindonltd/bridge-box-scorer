import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mirrors the real layout's header back control (an explicit backAction
// renders a "Go back" button) and its bottom action bar.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button type="button" aria-label="Go back" onClick={backAction} />
      )}
      <h1>{headerTitle}</h1>
      {children}
      {actions}
    </div>
  ),
}));

import { WithdrawPage } from "./WithdrawPage";

describe("WithdrawPage", () => {
  it("asks for confirmation before withdrawing", () => {
    const onConfirm = vi.fn();
    render(
      <WithdrawPage
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Withdraw" }),
    ).toBeInTheDocument();
    // A bold headline, like the WiFi "can't be changed on this device" screen.
    expect(
      screen.getByRole("heading", {
        name: "Withdraw your pair from the event?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeEnabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("withdraws, then shows the done state", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onDone = vi.fn();
    render(
      <WithdrawPage onCancel={vi.fn()} onConfirm={onConfirm} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(
      await screen.findByRole("heading", { name: "Withdrawn" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows the server's reason when withdrawing fails", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValue(new Error("This pair has already withdrawn."));
    render(
      <WithdrawPage
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This pair has already withdrawn.",
    );
  });

  it("falls back to a generic message when the failure has no reason", async () => {
    const onConfirm = vi.fn().mockRejectedValue("nope");
    render(
      <WithdrawPage
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not withdraw. Please try again.",
    );
  });
  it("offers a single action; the header back arrow cancels", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <WithdrawPage
        onCancel={onCancel}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    // No separate Cancel button.
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("hides the back arrow while the withdrawal is in flight", async () => {
    let resolve: () => void = () => {};
    const onConfirm = vi.fn(
      () => new Promise<void>((r) => (resolve = () => r())),
    );
    render(
      <WithdrawPage
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(
      await screen.findByRole("button", { name: "Withdrawing..." }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Go back" }),
    ).not.toBeInTheDocument();
    resolve();
    expect(
      await screen.findByRole("heading", { name: "Withdrawn" }),
    ).toBeInTheDocument();
  });
});
