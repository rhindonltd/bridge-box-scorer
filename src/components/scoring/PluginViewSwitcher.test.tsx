import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PluginViewSwitcher } from "./PluginViewSwitcher";

const one = [{ id: "mp", label: "MP" }];
const two = [
  { id: "mp", label: "MP" },
  { id: "pct", label: "%" },
];
const renderView = (v: { id: string; label: string }) => (
  <div data-testid="view">{v.id}</div>
);

describe("PluginViewSwitcher", () => {
  it("renders a single view directly with no toggle", () => {
    render(<PluginViewSwitcher views={one} renderView={renderView} />);
    expect(screen.getByTestId("view")).toHaveTextContent("mp");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("shows a toggle for two views, defaulting to the first and switching", () => {
    render(<PluginViewSwitcher views={two} renderView={renderView} />);
    expect(screen.getByTestId("view")).toHaveTextContent("mp");
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    expect(screen.getByTestId("view")).toHaveTextContent("pct");
    fireEvent.click(screen.getByRole("button", { name: "MP" }));
    expect(screen.getByTestId("view")).toHaveTextContent("mp");
  });

  it("renders a pre-selected view with no toggle", () => {
    render(
      <PluginViewSwitcher
        views={two}
        renderView={renderView}
        selectedViewId="pct"
      />,
    );
    expect(screen.getByTestId("view")).toHaveTextContent("pct");
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("falls back to the toggle when the selected view id matches nothing", () => {
    render(
      <PluginViewSwitcher
        views={two}
        renderView={renderView}
        selectedViewId="nope"
      />,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByTestId("view")).toHaveTextContent("mp");
  });
});
