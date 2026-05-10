import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeclarerSection from "./DeclarerSection";
import { Directions } from "@/model/common";

// Mock Section
vi.mock("@/components/contract/Section", () => ({
    default: ({ children, title }: any) => (
        <div data-testid="section">
            <div>{title}</div>
            {children}
        </div>
    ),
}));

// Mock ToggleButton
vi.mock("@/components/common/ToggleButton", () => ({
    ToggleButton: ({ children, active, onClick }: any) => (
        <button data-active={active} onClick={onClick}>
            {children}
        </button>
    ),
}));

describe("DeclarerSection", () => {
    it("renders all directions", () => {
        render(
            <DeclarerSection
                declarer={null}
                onDeclarerSelected={vi.fn()}
            />
        );

        Directions.forEach((d) => {
            expect(screen.getByText(d)).toBeInTheDocument();
        });
    });

    it("marks selected declarer as active", () => {
        const selected = Directions[0];

        render(
            <DeclarerSection
                declarer={selected}
                onDeclarerSelected={vi.fn()}
            />
        );

        const activeButton = screen.getByText(selected);

        expect(activeButton).toHaveAttribute("data-active", "true");
    });

    it("calls onDeclarerSelected when clicked", () => {
        const fn = vi.fn();

        render(
            <DeclarerSection
                declarer={null}
                onDeclarerSelected={fn}
            />
        );

        const first = Directions[0];

        fireEvent.click(screen.getByText(first));

        expect(fn).toHaveBeenCalledWith(first);
    });

    it("passes className to Section wrapper", () => {
        render(
            <DeclarerSection
                className="test-class"
                declarer={null}
                onDeclarerSelected={vi.fn()}
            />
        );

        expect(screen.getByTestId("section")).toBeInTheDocument();
    });
});
