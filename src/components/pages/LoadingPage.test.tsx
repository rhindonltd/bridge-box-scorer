import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingPage } from "./LoadingPage";

describe("LoadingPage", () => {
  it("renders a loading indicator", () => {
    render(<LoadingPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
