import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StandingForm } from "./StandingForm";

function setup(
  current: Parameters<typeof StandingForm>[0]["current"] = "ACTIVE",
) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <StandingForm
      label="North / South"
      current={current}
      onSave={onSave}
      onCancel={onCancel}
    />,
  );
  return { onSave, onCancel };
}

/** Bump the stepper at `index` (0 = first) up by one. */
function bump(index = 0) {
  const plus = screen.getAllByRole("button", { name: "+" })[index];
  fireEvent.mouseDown(plus);
  fireEvent.mouseUp(plus);
}

describe("StandingForm", () => {
  it("opens on the current standing", () => {
    setup("WITHDRAWN");
    expect(screen.getByLabelText("Withdrawn")).toBeChecked();
  });

  it("saves a Withdrawn standing with a round number and the REMOVE treatment", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText("Withdrawn"));
    expect(screen.getByText("Withdrew in round")).toBeInTheDocument();
    bump(); // round 1 -> 2
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "REMOVE",
    });
  });

  it("saves a Withdrawn standing with a penalised fine", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText("Withdrawn"));
    fireEvent.click(screen.getByLabelText("Penalised"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      standing: "WITHDRAWN",
      withdrawnInRound: 1,
      treatment: "PENALISED",
      finePercent: 0,
    });
  });

  it("saves a Late standing with a penalised fine", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText("Late"));
    expect(screen.getByText("Arrived in round")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Penalised"));
    expect(screen.getByText("Fine %")).toBeInTheDocument();
    bump(1); // two steppers now: round (first) and fine (second)
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      standing: "LATE",
      arrivedInRound: 1,
      treatment: "PENALISED",
      finePercent: 1,
    });
  });

  it("saves a Late standing with the REMOVE treatment", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByLabelText("Late"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      standing: "LATE",
      arrivedInRound: 1,
      treatment: "REMOVE",
    });
  });

  it("saves Without standing and Active with no extra detail", () => {
    const first = setup();
    fireEvent.click(screen.getByLabelText("No standing"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(first.onSave).toHaveBeenCalledWith({
      standing: "WITHOUT_STANDING",
    });
  });

  it("saves Active when left on Active", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ standing: "ACTIVE" });
  });

  it("cancels without saving", () => {
    const { onSave, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
