import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockSections = [
  { section: "A", label: "A", tables: 4, selectedMovement: null },
];
let mockSelected = "A";
vi.mock("./useSetupSections", () => ({
  useSetupSections: () => ({
    sections: mockSections,
    selected: mockSelected,
    setSelected: vi.fn(),
    pills: <div>section-pills</div>,
    modal: <div>section-modal</div>,
  }),
}));

vi.mock("./SectionMovementPicker", () => ({
  SectionMovementPicker: ({
    section,
    tables,
    onSelected,
  }: {
    section: string;
    tables: number;
    onSelected?: () => void;
  }) => (
    <div>
      <span>
        picker section={section} tables={tables}
      </span>
      <button onClick={() => onSelected?.()}>confirm-movement</button>
    </div>
  ),
}));

import { MovementStep } from "./MovementStep";

describe("MovementStep", () => {
  beforeEach(() => {
    mockSections = [
      { section: "A", label: "A", tables: 4, selectedMovement: null },
      { section: "B", label: "B", tables: 6, selectedMovement: null },
    ];
    mockSelected = "A";
  });

  it("renders the pills, modal and the picker for the selected section", () => {
    render(<MovementStep gameId="g1" />);

    expect(screen.getByText("section-pills")).toBeInTheDocument();
    expect(screen.getByText("section-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/picker section=A tables=4/),
    ).toBeInTheDocument();
  });

  it("renders the picker for whichever section is selected", () => {
    mockSelected = "B";
    render(<MovementStep gameId="g1" />);

    expect(
      screen.getByText(/picker section=B tables=6/),
    ).toBeInTheDocument();
  });

  it("forwards onMovementSelected to the picker's onSelected", () => {
    const onMovementSelected = vi.fn();
    render(
      <MovementStep gameId="g1" onMovementSelected={onMovementSelected} />,
    );

    fireEvent.click(screen.getByText("confirm-movement"));
    expect(onMovementSelected).toHaveBeenCalledOnce();
  });
});
