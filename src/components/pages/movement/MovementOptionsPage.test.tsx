import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MovementOptionsPage from "./MovementOptionsPage";

// Mock children to isolate logic
vi.mock("@/components/common/SectionInfo", () => ({
    SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/layout/FormCardLayout", () => ({
    default: ({ children, onSubmit }: any) => (
        <form
            data-testid="form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(e);
            }}
        >
            {children}
            <button type="submit">Submit</button>
        </form>
    ),
}));

vi.mock("@/components/common/SelectField", () => ({
    default: ({ value, onSelect, options }: any) => (
        <div>
            <div data-testid="select-value">{value}</div>
            <button onClick={() => onSelect(options[1])}>
                Change Select
            </button>
        </div>
    ),
}));

vi.mock("@/components/common/NumberStepperField", () => ({
    NumberStepperField: ({ value, onChange }: any) => (
        <div>
            <div data-testid="number-value">{value}</div>
            <button onClick={() => onChange(3)}>Change Number</button>
        </div>
    ),
}));

describe("MovementOptionsPage", () => {
    const baseProps = {
        tables: 2,
        onSubmit: vi.fn(),
    };

    it("renders SectionInfo", () => {
        render(<MovementOptionsPage {...baseProps} />);

        expect(screen.getByTestId("section-info")).toBeInTheDocument();
    });

    it("renders FormCardLayout", () => {
        render(<MovementOptionsPage {...baseProps} />);

        expect(screen.getByTestId("form")).toBeInTheDocument();
    });

    it("generates missing pair options correctly", () => {
        render(<MovementOptionsPage {...baseProps} />);

        // default is "None"
        expect(screen.getByTestId("select-value")).toHaveTextContent("None");
    });

    it("updates missing pair selection", () => {
        render(<MovementOptionsPage {...baseProps} />);

        fireEvent.click(screen.getByText("Change Select"));

        expect(screen.getByTestId("select-value")).not.toHaveTextContent(
            "None"
        );
    });

    // it("updates arrow switched rounds", () => {
    //     render(<MovementOptionsPage {...baseProps} />);
    //
    //     fireEvent.click(screen.getByText("Change Number"));
    //
    //     expect(screen.getByTestId("number-value")).toHaveTextContent("3");
    // });

    it("submits form with selected values", () => {
        const fn = vi.fn();

        render(<MovementOptionsPage {...baseProps} onSubmit={fn} />);

        fireEvent.submit(screen.getByTestId("form"));

        expect(fn).toHaveBeenCalledWith({
            missingPair: "None",
            arrowSwitchedRounds: 0,
        });
    });

    it("applies page layout classes", () => {
        const { container } = render(
            <MovementOptionsPage {...baseProps} />
        );

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass(
            "h-screen",
            "flex",
            "flex-col",
            "bg-gray-100"
        );
    });
});
