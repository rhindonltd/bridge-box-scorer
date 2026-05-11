import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayableContract } from "./PlayableContract";

// ---------------- mocks ----------------

vi.mock("../../contract/LevelSection", () => ({
    default: ({ level, onLevelSelected }: any) => (
        <div data-testid="level-section">
            <button onClick={() => onLevelSelected("1")}>
                level:{level ?? "null"}
            </button>
        </div>
    ),
}));

vi.mock("../../contract/SuitSection", () => ({
    default: ({ suit, onSuitSelected }: any) => (
        <div data-testid="suit-section">
            <button onClick={() => onSuitSelected("S")}>
                suit:{suit ?? "null"}
            </button>
        </div>
    ),
}));

vi.mock("../../contract/DeclarerSection", () => ({
    default: ({ declarer, onDeclarerSelected }: any) => (
        <div data-testid="declarer-section">
            <button onClick={() => onDeclarerSelected("N")}>
                declarer:{declarer ?? "null"}
            </button>
        </div>
    ),
}));

vi.mock("../../contract/DoubleSection", () => ({
    default: ({ dbl, onDblSelected }: any) => (
        <div data-testid="double-section">
            <button onClick={() => onDblSelected("X")}>
                dbl:{dbl ?? "null"}
            </button>
        </div>
    ),
}));

// ---------------- tests ----------------

describe("PlayableContract", () => {
    const baseProps = {
        level: null,
        suit: null,
        declarer: null,
        dbl: null,
        onLevelSelected: vi.fn(),
        onSuitSelected: vi.fn(),
        onDeclarerSelected: vi.fn(),
        onDblSelected: vi.fn(),
    };

    it("renders all contract sections", () => {
        render(<PlayableContract {...baseProps} />);

        expect(screen.getByTestId("level-section")).toBeInTheDocument();
        expect(screen.getByTestId("suit-section")).toBeInTheDocument();
        expect(screen.getByTestId("declarer-section")).toBeInTheDocument();
        expect(screen.getByTestId("double-section")).toBeInTheDocument();
    });

    it("calls onLevelSelected", () => {
        const fn = vi.fn();

        render(
            <PlayableContract {...baseProps} onLevelSelected={fn} />
        );

        fireEvent.click(screen.getByText(/level:/i));

        expect(fn).toHaveBeenCalledWith("1");
    });

    it("calls onSuitSelected", () => {
        const fn = vi.fn();

        render(
            <PlayableContract {...baseProps} onSuitSelected={fn} />
        );

        fireEvent.click(screen.getByText(/suit:/i));

        expect(fn).toHaveBeenCalledWith("S");
    });

    it("calls onDeclarerSelected", () => {
        const fn = vi.fn();

        render(
            <PlayableContract {...baseProps} onDeclarerSelected={fn} />
        );

        fireEvent.click(screen.getByText(/declarer:/i));

        expect(fn).toHaveBeenCalledWith("N");
    });

    it("calls onDblSelected", () => {
        const fn = vi.fn();

        render(
            <PlayableContract {...baseProps} onDblSelected={fn} />
        );

        fireEvent.click(screen.getByText(/dbl:/i));

        expect(fn).toHaveBeenCalledWith("X");
    });

    it("applies grid layout structure", () => {
        const { container } = render(
            <PlayableContract {...baseProps} />
        );

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass(
            "grid",
            "grid-cols-2",
            "grid-rows-2",
            "gap-x-2",
            "gap-y-3",
            "h-full"
        );
    });
});
