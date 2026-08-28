import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EnterPlayerNames from "@/app/game/[gameId]/join/player/EnterPlayerNames";

// Mock PlayerSearch — the component renders a label heading and a search input
vi.mock("@/components/pages/join/PlayerSearch", () => ({
  default: ({ label, value, onChange }: any) => (
    <div>
      <span data-testid={`player-search-label-${label}`}>{label} Player</span>
      <input
        aria-label={`${label} Player`}
        data-testid={`player-search-${label}`}
        defaultValue={value?.firstName ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value ? { firstName: e.target.value, lastName: "" } : null,
          )
        }
      />
    </div>
  ),
}));

describe("EnterPlayerNames", () => {
  it("renders NS labels correctly", () => {
    render(<EnterPlayerNames seat="1NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByLabelText("North Player")).toBeInTheDocument();
    expect(screen.getByLabelText("South Player")).toBeInTheDocument();
  });

  it("renders EW labels correctly", () => {
    render(<EnterPlayerNames seat="1EW" onSubmitPair={vi.fn()} />);
    expect(screen.getByLabelText("East Player")).toBeInTheDocument();
    expect(screen.getByLabelText("West Player")).toBeInTheDocument();
  });

  it("renders table number in header", () => {
    render(<EnterPlayerNames seat="3NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("renders Enter Pair submit button", () => {
    render(<EnterPlayerNames seat="1NS" onSubmitPair={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Enter Pair" }),
    ).toBeInTheDocument();
  });

  it("submit button is disabled when no players selected", () => {
    render(<EnterPlayerNames seat="1NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Enter Pair" })).toBeDisabled();
  });
});
