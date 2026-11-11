import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("withdraws, then shows the done state", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onDone = vi.fn();
    render(
      <WithdrawPage onCancel={vi.fn()} onConfirm={onConfirm} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Withdraw our pair" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Withdraw our pair" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Withdraw our pair" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not withdraw. Please try again.",
    );
  });
  it("cancels without withdrawing", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <WithdrawPage
        onCancel={onCancel}
        onConfirm={onConfirm}
        onDone={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
