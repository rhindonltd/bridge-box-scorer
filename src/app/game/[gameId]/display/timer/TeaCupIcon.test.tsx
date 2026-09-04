import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { TeaCupIcon } from "./TeaCupIcon";

describe("TeaCupIcon", () => {
  it("renders an svg icon", () => {
    const { container } = render(<TeaCupIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
