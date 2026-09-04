import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AdminKeyEntryView } from "./AdminKeyEntryView";

const baseProps = {
  code: "",
  error: null as string | null,
  loading: false,
  onCodeChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe("AdminKeyEntryView", () => {
  it("reports code changes", () => {
    const onCodeChange = vi.fn();
    render(<AdminKeyEntryView {...baseProps} onCodeChange={onCodeChange} />);

    fireEvent.change(screen.getByLabelText("Admin Key"), {
      target: { value: "secret" },
    });
    expect(onCodeChange).toHaveBeenCalledWith("secret");
  });

  it("disables Unlock when the code is empty and enables it otherwise", () => {
    const { rerender } = render(<AdminKeyEntryView {...baseProps} />);
    expect(screen.getByRole("button", { name: "Unlock" })).toBeDisabled();

    rerender(<AdminKeyEntryView {...baseProps} code="x" />);
    expect(screen.getByRole("button", { name: "Unlock" })).toBeEnabled();
  });

  it("renders the checking label while loading", () => {
    render(<AdminKeyEntryView {...baseProps} code="x" loading />);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();
  });

  it("submits the form", () => {
    const onSubmit = vi.fn();
    render(<AdminKeyEntryView {...baseProps} code="x" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByLabelText("Admin Key").closest("form")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders an error message when present", () => {
    render(<AdminKeyEntryView {...baseProps} error="Wrong key" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong key");
  });
});
