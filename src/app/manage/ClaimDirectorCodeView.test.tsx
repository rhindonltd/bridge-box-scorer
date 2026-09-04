import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    actions,
    children,
  }: {
    actions: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{actions}</div>
      <div>{children}</div>
    </div>
  ),
}));

import { ClaimDirectorCodeView } from "./ClaimDirectorCodeView";

const baseProps = {
  gameName: "Tuesday Pairs",
  code: "",
  error: null as string | null,
  loading: false,
  onCodeChange: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("ClaimDirectorCodeView", () => {
  it("uppercases entered codes and reports changes", () => {
    const onCodeChange = vi.fn();
    render(<ClaimDirectorCodeView {...baseProps} onCodeChange={onCodeChange} />);

    fireEvent.change(screen.getByLabelText("Share Code"), {
      target: { value: "abc12" },
    });
    expect(onCodeChange).toHaveBeenCalledWith("ABC12");
  });

  it("disables the claim button until six characters are entered", () => {
    const { rerender } = render(
      <ClaimDirectorCodeView {...baseProps} code="ABC12" />,
    );
    expect(screen.getByRole("button", { name: "Claim Access" })).toBeDisabled();

    rerender(<ClaimDirectorCodeView {...baseProps} code="ABC123" />);
    expect(screen.getByRole("button", { name: "Claim Access" })).toBeEnabled();
  });

  it("shows the claiming label while loading", () => {
    render(<ClaimDirectorCodeView {...baseProps} code="ABC123" loading />);
    expect(screen.getByRole("button", { name: "Claiming..." })).toBeDisabled();
  });

  it("submits the form and cancels", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <ClaimDirectorCodeView
        {...baseProps}
        code="ABC123"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.submit(screen.getByLabelText("Share Code").closest("form")!);
    expect(onSubmit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders an error message when present", () => {
    render(<ClaimDirectorCodeView {...baseProps} error="Bad code" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Bad code");
  });
});
