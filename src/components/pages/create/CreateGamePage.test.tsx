import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateGamePage } from "./CreateGamePage";

// Mock child components
vi.mock("@/components/create/SimpleCreateGameForm", () => ({
  default: ({ onGameCreated }: any) => (
    <button onClick={() => onGameCreated(123)}>Submit Form</button>
  ),
}));

vi.mock("@/components/tables/ShowTables", () => ({
  default: ({ tables }: any) => (
    <div data-testid="tables">
      {tables.map((t: any) => (
        <div key={t.tableNumber}>Table {t.tableNumber}</div>
      ))}
    </div>
  ),
}));

describe("CreateGamePage", () => {
  it("renders header", () => {
    render(<CreateGamePage />);

    expect(screen.getByText("Create Game")).toBeInTheDocument();
  });

  it("shows form initially", () => {
    render(<CreateGamePage />);

    expect(
      screen.getByRole("button", { name: "Submit Form" }),
    ).toBeInTheDocument();
  });

  it("switches to tables after game creation", () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "Submit Form" }));

    expect(screen.getByTestId("tables")).toBeInTheDocument();
  });

  it("renders 10 tables after creation", () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "Submit Form" }));

    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 10")).toBeInTheDocument();
  });

  // it("does not show form after game creation", () => {
  //     render(<CreateGamePage />);
  //
  //     fireEvent.click(
  //         screen.getByRole("button", { name: "Submit Form" })
  //     );
  //
  //     expect(
  //         screen.getByRole("button", { name: "Submit Form" })
  //     ).not.toBeInTheDocument();
  // });

  it("creates correct table structure", () => {
    render(<CreateGamePage />);

    fireEvent.click(screen.getByRole("button", { name: "Submit Form" }));

    expect(screen.getByTestId("tables")).toBeInTheDocument();
  });
});
