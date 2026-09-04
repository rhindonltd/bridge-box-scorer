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
    // No actions supplied -> no action bar button.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
