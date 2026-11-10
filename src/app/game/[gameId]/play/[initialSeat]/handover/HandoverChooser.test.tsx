import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    headerRight,
    actions,
    children,
  }: any) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { HandoverChooser } from "./HandoverChooser";

describe("HandoverChooser", () => {
  it("routes to each choice and back", () => {
    const onCancel = vi.fn();
    const onSameDevice = vi.fn();
    const onDifferentDevice = vi.fn();
    render(
      <HandoverChooser
        onCancel={onCancel}
        onSameDevice={onSameDevice}
        onDifferentDevice={onDifferentDevice}
      />,
    );
    fireEvent.click(screen.getByText("Same device"));
    expect(onSameDevice).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Different device"));
    expect(onDifferentDevice).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
