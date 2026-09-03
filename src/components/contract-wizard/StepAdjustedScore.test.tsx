import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepAdjustedScore } from "./StepAdjustedScore";

describe("StepAdjustedScore", () => {
  it("submits a preset split", () => {
    const onSubmit = vi.fn();
    render(<StepAdjustedScore onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /AVE \(50\/50\)/ }));
    expect(onSubmit).toHaveBeenCalledWith(50, 50);
  });

  it("submits a custom NS/EW split", () => {
    const onSubmit = vi.fn();
    render(<StepAdjustedScore onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("NS %"), {
      target: { value: "70" },
    });
    fireEvent.change(screen.getByLabelText("EW %"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(70, 30);
  });
});
