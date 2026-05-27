import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectSeatPage } from "./SelectSeatPage";

const mockUseGame = vi.fn();
const mockSelectIndividualTablePage = vi.fn();
const mockSelectPairsTablePage = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

vi.mock("@/components/pages/join/individual/SelectIndividualTablePage", () => ({
  SelectIndividualTablePage: (props: unknown) => {
    mockSelectIndividualTablePage(props);

    return <div data-testid="individual-page" />;
  },
}));

vi.mock("@/components/pages/join/pairs/SelectPairsTablePage", () => ({
  SelectPairsTablePage: (props: unknown) => {
    mockSelectPairsTablePage(props);

    return <div data-testid="pairs-page" />;
  },
}));

describe("SelectSeatPage", () => {
  const onSeatSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no gameSelection exists", () => {
    mockUseGame.mockReturnValue({
      gameSelection: null,
    });

    const { container } = render(
      <SelectSeatPage onSeatSelected={onSeatSelected} />,
    );

    expect(container.firstChild).toBeNull();

    expect(mockSelectIndividualTablePage).not.toHaveBeenCalled();
    expect(mockSelectPairsTablePage).not.toHaveBeenCalled();
  });

  it("renders SelectIndividualTablePage for INDIVIDUAL games", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameType: "INDIVIDUAL",
      },
    });

    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    expect(screen.getByTestId("individual-page")).toBeInTheDocument();

    expect(screen.queryByTestId("pairs-page")).not.toBeInTheDocument();
  });

  it("passes onSeatSelected to SelectIndividualTablePage", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameType: "INDIVIDUAL",
      },
    });

    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    expect(mockSelectIndividualTablePage).toHaveBeenCalledWith({
      onSeatSelected,
    });
  });

  it("renders SelectPairsTablePage for non-INDIVIDUAL games", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameType: "PAIRS",
      },
    });

    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    expect(screen.getByTestId("pairs-page")).toBeInTheDocument();

    expect(screen.queryByTestId("individual-page")).not.toBeInTheDocument();
  });

  it("passes onSeatSelected to SelectPairsTablePage", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameType: "PAIRS",
      },
    });

    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    expect(mockSelectPairsTablePage).toHaveBeenCalledWith({
      onSeatSelected,
    });
  });

  it("passes the exact callback reference", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameType: "INDIVIDUAL",
      },
    });

    render(<SelectSeatPage onSeatSelected={onSeatSelected} />);

    const props = mockSelectIndividualTablePage.mock.calls[0][0];

    expect(props.onSeatSelected).toBe(onSeatSelected);
  });
});
