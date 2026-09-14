import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageLayout } from "./PageLayout";

describe("PageLayout", () => {
  it("renders scrollable content with an action bar by default", () => {
    render(
      <PageLayout headerTitle="Home" actions={<button>Save</button>}>
        <p>body content</p>
      </PageLayout>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders centered content without an action bar", () => {
    render(
      <PageLayout headerTitle="Menu" centerContent>
        <p>menu content</p>
      </PageLayout>,
    );

    expect(screen.getByText("menu content")).toBeInTheDocument();
    // No actions supplied -> no action bar. The only button is the default
    // header back arrow.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("aria-label", "Go back");
  });

  it("shows a default back arrow, and hides it when hideBack is set", () => {
    const { rerender } = render(
      <PageLayout headerTitle="Home">
        <p>body</p>
      </PageLayout>,
    );
    expect(screen.getByLabelText("Go back")).toBeInTheDocument();

    rerender(
      <PageLayout headerTitle="Home" hideBack>
        <p>body</p>
      </PageLayout>,
    );
    expect(screen.queryByLabelText("Go back")).not.toBeInTheDocument();
  });
});
