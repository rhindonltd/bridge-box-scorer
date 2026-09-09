import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { HeaderMenu } from "./HeaderMenu";

describe("HeaderMenu", () => {
  it("renders a trigger button with the default accessible name", () => {
    render(<HeaderMenu items={[]} />);

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("uses the provided label as the trigger's accessible name", () => {
    render(<HeaderMenu items={[]} label="Setup menu" />);

    expect(
      screen.getByRole("button", { name: "Setup menu" }),
    ).toBeInTheDocument();
  });

  it("reveals one menu item per entry when opened", async () => {
    const user = userEvent.setup();
    render(
      <HeaderMenu
        items={[
          { label: "Tables", onSelect: vi.fn() },
          { label: "Movement", onSelect: vi.fn() },
          { label: "Timer", onSelect: vi.fn() },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    expect(screen.getByRole("menuitem", { name: "Tables" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Movement" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Timer" })).toBeInTheDocument();
  });

  it("marks the active item with aria-current", async () => {
    const user = userEvent.setup();
    render(
      <HeaderMenu
        items={[
          { label: "Tables", onSelect: vi.fn() },
          { label: "Movement", onSelect: vi.fn(), active: true },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("menuitem", { name: "Movement" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.getByRole("menuitem", { name: "Tables" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("invokes an item's onSelect when it is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <HeaderMenu
        items={[
          { label: "Tables", onSelect: vi.fn() },
          { label: "Movement", onSelect },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Movement" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
