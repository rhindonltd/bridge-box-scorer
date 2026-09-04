import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CenteredContent } from "./CenteredContent";

describe("CenteredContent", () => {
  it("renders its children", () => {
    render(
      <CenteredContent>
        <span>centered child</span>
      </CenteredContent>,
    );
    expect(screen.getByText("centered child")).toBeInTheDocument();
  });
});
