import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EnterPlayerNames from "@/app/game/[gameId]/join/EnterPlayerNames";

// Mock PlayerSearch — the component renders a label heading and a search input
vi.mock("@/app/game/[gameId]/join/PlayerSearch", () => ({
  default: ({ label, value, onChange }: any) => (
    <div>
      <span data-testid={`player-search-label-${label}`}>{label} Player</span>
      {/* Name input: sets firstName (guest — no national id). */}
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
      {/* EBU input: sets a player with the given national id. */}
      <input
        aria-label={`${label} EBU`}
        data-testid={`player-ebu-${label}`}
        onChange={(e) =>
          onChange(
            e.target.value
              ? { firstName: "X", lastName: "Y", nationalId: e.target.value }
              : null,
          )
        }
      />
    </div>
  ),
}));

describe("EnterPlayerNames", () => {
  it("renders NS labels correctly", () => {
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByLabelText("North Player")).toBeInTheDocument();
    expect(screen.getByLabelText("South Player")).toBeInTheDocument();
  });

  it("renders EW labels correctly", () => {
    render(<EnterPlayerNames seat="A1EW" onSubmitPair={vi.fn()} />);
    expect(screen.getByLabelText("East Player")).toBeInTheDocument();
    expect(screen.getByLabelText("West Player")).toBeInTheDocument();
  });

  it("renders table number in header", () => {
    render(<EnterPlayerNames seat="A3NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("renders Enter Pair submit button", () => {
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Enter Pair" }),
    ).toBeInTheDocument();
  });

  it("submit button is disabled when no players selected", () => {
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Enter Pair" })).toBeDisabled();
  });

  it("submits both players once each seat is filled", () => {
    const onSubmitPair = vi.fn();
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={onSubmitPair} />);

    fireEvent.change(screen.getByLabelText("North Player"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("South Player"), {
      target: { value: "Grace" },
    });

    const submit = screen.getByRole("button", { name: "Enter Pair" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    expect(onSubmitPair).toHaveBeenCalledWith(
      { firstName: "Ada", lastName: "" },
      { firstName: "Grace", lastName: "" },
      // No team-name field shown, so no team name is passed.
      undefined,
    );
  });

  it("blocks submit and warns when both players have the same EBU number", () => {
    const onSubmitPair = vi.fn();
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={onSubmitPair} />);

    fireEvent.change(screen.getByLabelText("North EBU"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText("South EBU"), {
      target: { value: "123456" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("123456");
    const submit = screen.getByRole("button", { name: "Enter Pair" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmitPair).not.toHaveBeenCalled();
  });

  it("allows two guests (no EBU number) with the same typed name", () => {
    const onSubmitPair = vi.fn();
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={onSubmitPair} />);

    // Same name, both guests (no national id) -> permitted.
    fireEvent.change(screen.getByLabelText("North Player"), {
      target: { value: "Chris" },
    });
    fireEvent.change(screen.getByLabelText("South Player"), {
      target: { value: "Chris" },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Enter Pair" });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmitPair).toHaveBeenCalled();
  });

  it("allows two different EBU numbers", () => {
    const onSubmitPair = vi.fn();
    render(<EnterPlayerNames seat="A1NS" onSubmitPair={onSubmitPair} />);

    fireEvent.change(screen.getByLabelText("North EBU"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText("South EBU"), {
      target: { value: "654321" },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enter Pair" }),
    ).not.toBeDisabled();
  });

  describe("optional team name", () => {
    it("does not render the team-name field by default", () => {
      render(<EnterPlayerNames seat="A1NS" onSubmitPair={vi.fn()} />);
      expect(
        screen.queryByLabelText("Team name (optional)"),
      ).not.toBeInTheDocument();
    });

    it("renders the team-name field when showTeamName is set", () => {
      render(
        <EnterPlayerNames seat="A1NS" showTeamName onSubmitPair={vi.fn()} />,
      );
      expect(
        screen.getByLabelText("Team name (optional)"),
      ).toBeInTheDocument();
    });

    it("forwards the entered team name on submit", () => {
      const onSubmitPair = vi.fn();
      render(
        <EnterPlayerNames
          seat="A1NS"
          showTeamName
          onSubmitPair={onSubmitPair}
        />,
      );

      fireEvent.change(screen.getByLabelText("North Player"), {
        target: { value: "Ada" },
      });
      fireEvent.change(screen.getByLabelText("South Player"), {
        target: { value: "Grace" },
      });
      fireEvent.change(screen.getByLabelText("Team name (optional)"), {
        target: { value: "Sharks" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Enter Pair" }));

      expect(onSubmitPair).toHaveBeenCalledWith(
        { firstName: "Ada", lastName: "" },
        { firstName: "Grace", lastName: "" },
        "Sharks",
      );
    });

    it("forwards an empty string when the team name is left blank", () => {
      const onSubmitPair = vi.fn();
      render(
        <EnterPlayerNames
          seat="A1NS"
          showTeamName
          onSubmitPair={onSubmitPair}
        />,
      );

      fireEvent.change(screen.getByLabelText("North Player"), {
        target: { value: "Ada" },
      });
      fireEvent.change(screen.getByLabelText("South Player"), {
        target: { value: "Grace" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Enter Pair" }));

      expect(onSubmitPair).toHaveBeenCalledWith(
        { firstName: "Ada", lastName: "" },
        { firstName: "Grace", lastName: "" },
        "",
      );
    });
  });
});
