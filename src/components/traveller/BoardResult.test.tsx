import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { BoardResult } from "./BoardResult";
import type { BoardOutcome } from "@/model/score";

describe("BoardResult", () => {
  it("renders a played NT contract with level, declarer and result", () => {
    const { container } = render(
      <BoardResult boardOutcome={"3NTN+1" as BoardOutcome} />,
    );
    // NT contracts render "NT" text (no suit symbol).
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("NT");
    expect(container.textContent).toContain("N");
    expect(container.textContent).toContain("+1");
  });

  it("renders a suited contract with its suit symbol", () => {
    const { container } = render(
      <BoardResult boardOutcome={"4SS=" as BoardOutcome} />,
    );
    expect(container.textContent).toContain("♠");
    expect(container.textContent).toContain("=");
  });

  it("renders an adjusted score in Adj X%/Y% form", () => {
    const { container } = render(
      <BoardResult boardOutcome={"A60/40" as BoardOutcome} />,
    );
    expect(container.textContent).toContain("Adj 60%/40%");
  });

  it("renders an unrecognised outcome as raw text", () => {
    const { container } = render(
      <BoardResult boardOutcome={"NP" as BoardOutcome} />,
    );
    expect(container.textContent).toBe("NP");
  });
});
