import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const selectProps = vi.fn();
vi.mock("@/components/common/SelectField", () => ({
  default: (props: {
    label: string;
    value: string;
    onSelect: (v: string) => void;
  }) => {
    selectProps(props);
    return (
      <button onClick={() => props.onSelect("COUNTY_BLUE")}>
        {props.label}:{props.value}
      </button>
    );
  },
}));

import { TournamentLevelSelect } from "./TournamentLevelSelect";
import { TOURNAMENT_LEVEL_INFO } from "@/model/tournament-level";

describe("TournamentLevelSelect", () => {
  it("shows the resolved masterpoint fields for the level", () => {
    render(<TournamentLevelSelect value="NORMAL_CLUB" onChange={vi.fn()} />);
    const info = TOURNAMENT_LEVEL_INFO.NORMAL_CLUB;
    expect(screen.getByText(info.masterPointScale)).toBeInTheDocument();
    expect(screen.getByText(info.masterPointType)).toBeInTheDocument();
    expect(screen.getByText(info.p2pChargeRate)).toBeInTheDocument();
  });
  it("passes the chosen level to onChange", () => {
    const onChange = vi.fn();
    render(<TournamentLevelSelect value="NORMAL_CLUB" onChange={onChange} />);
    screen.getByText("Tournament Level:NORMAL_CLUB").click();
    expect(onChange).toHaveBeenCalledWith("COUNTY_BLUE");
  });
  it("is enabled by default and can be disabled", () => {
    const { container, rerender } = render(
      <TournamentLevelSelect value="NORMAL_CLUB" onChange={vi.fn()} />,
    );
    expect(container.querySelector("fieldset")).not.toBeDisabled();
    rerender(
      <TournamentLevelSelect value="NORMAL_CLUB" onChange={vi.fn()} disabled />,
    );
    expect(container.querySelector("fieldset")).toBeDisabled();
  });
});
