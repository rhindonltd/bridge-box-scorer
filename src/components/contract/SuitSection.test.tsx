import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SuitSection from "./SuitSection";
import { ContractSuits } from "@/model/contract";

// Mock Section
vi.mock("@/components/contract/Section", () => ({
    default: ({ children, title, className, gridCols }: any) => (
        <div
            data-testid="section"
            className={className}
            data-grid-cols={gridCols}
        >
            <div>{title}</div>
            {children}
        </div>
    ),
}));

// Mock ToggleButton
vi.mock("@/components/common/ToggleButton", () => ({
    ToggleButton: ({ children, active, onClick }: any) => (
        <button
            onClick={onClick}
            data-active={active}
        >
            {children}
        </button>
    ),
}));

describe("SuitSection", () => {
    it("renders all contract suits", () => {
        render(
            <SuitSection
                suit={null}
                onSuitSelected={vi.fn()}
            />
        );

        ContractSuits.forEach((s) => {
            expect(screen.getByText(String(s))).toBeInTheDocument();
        });
    });

    it("marks selected suit as active", () => {
        const selected = ContractSuits[0];

        render(
            <SuitSection
                suit={selected}
                onSuitSelected={vi.fn()}
            />
        );

        expect(
            screen.getByText(String(selected))
        ).toHaveAttribute("data-active", "true");
    });

    it("calls onSuitSelected when a suit is clicked", () => {
        const fn = vi.fn();

        render(
            <SuitSection
                suit={null}
                onSuitSelected={fn}
            />
        );

        const selected = ContractSuits[1];

        fireEvent.click(screen.getByText(String(selected)));

        expect(fn).toHaveBeenCalledWith(selected);
    });

    it("passes className to Section", () => {
        render(
            <SuitSection
                className="test-class"
                suit={null}
                onSuitSelected={vi.fn()}
            />
        );

        expect(screen.getByTestId("section")).toHaveClass(
            "test-class"
        );
    });

    it("passes gridCols=3 to Section", () => {
        render(
            <SuitSection
                suit={null}
                onSuitSelected={vi.fn()}
            />
        );

        expect(screen.getByTestId("section")).toHaveAttribute(
            "data-grid-cols",
            "3"
        );
    });

    it("renders section title", () => {
        render(
            <SuitSection
                suit={null}
                onSuitSelected={vi.fn()}
            />
        );

        expect(screen.getByText("Suit")).toBeInTheDocument();
    });
});