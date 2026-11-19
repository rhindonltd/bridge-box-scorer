import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadCard } from "./LeadCard";

describe("LeadCard", () => {
  it("shows a spade in black with its rank", () => {
    render(<LeadCard card="SA" />);
    expect(screen.getByTestId("lead-card")).toHaveTextContent("♠A");
    expect(screen.getByText("♠")).toHaveClass("text-black");
  });
  it("shows clubs in black", () => {
    render(<LeadCard card="C7" />);
    expect(screen.getByText("♣")).toHaveClass("text-black");
  });
  it("shows hearts in red", () => {
    render(<LeadCard card="HK" />);
    expect(screen.getByText("♥")).toHaveClass("text-red-600");
  });
  it("shows diamonds in red", () => {
    render(<LeadCard card="D2" />);
    expect(screen.getByText("♦")).toHaveClass("text-red-600");
  });
  it("writes the ten as 10", () => {
    render(<LeadCard card="HT" />);
    expect(screen.getByTestId("lead-card")).toHaveTextContent("♥10");
  });
});
