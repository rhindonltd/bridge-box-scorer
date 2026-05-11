import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FormCardLayout from "./FormCardLayout";

// Mock Button so we can inspect props + trigger handlers easily
vi.mock("@/components/common/Button", () => ({
    default: ({ value, onClick, type, disabled }: any) => (
        <button type={type} onClick={onClick} disabled={disabled}>
            {value}
        </button>
    ),
}));

describe("FormCardLayout", () => {
    it("renders header text", () => {
        render(
            <FormCardLayout header="Test Header" onSubmit={vi.fn()}>
                <div>Child</div>
            </FormCardLayout>
        );

        expect(screen.getByText("Test Header")).toBeInTheDocument();
    });

    it("renders children", () => {
        render(
            <FormCardLayout header="H" onSubmit={vi.fn()}>
                <div>My Child</div>
            </FormCardLayout>
        );

        expect(screen.getByText("My Child")).toBeInTheDocument();
    });

    // it("uses default header color when not provided", () => {
    //     render(
    //         <FormCardLayout header="H" onSubmit={vi.fn()}>
    //             <div />
    //         </FormCardLayout>
    //     );
    //
    //     const header = screen.getByText("H");
    //
    //     expect(header.parentElement).toHaveClass("bg-blue-600");
    // });

    // it("applies custom header color", () => {
    //     render(
    //         <FormCardLayout
    //             header="H"
    //             headerColor="bg-red-500"
    //             onSubmit={vi.fn()}
    //         >
    //             <div />
    //         </FormCardLayout>
    //     );
    //
    //     const header = screen.getByText("H");
    //
    //     expect(header.parentElement).toHaveClass("bg-red-500");
    // });

    it("calls onSubmit when form is submitted", () => {
        const fn = vi.fn();

        render(
            <FormCardLayout header="H" onSubmit={fn}>
                <div />
            </FormCardLayout>
        );

        const form = screen.getByRole("button", {
            name: "Continue",
        }).closest("form")!;

        fireEvent.submit(form);

        expect(fn).toHaveBeenCalled();
    });

    it("renders primary button with default text", () => {
        render(
            <FormCardLayout header="H" onSubmit={vi.fn()}>
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Continue" })
        ).toBeInTheDocument();
    });

    it("renders custom primary button text", () => {
        render(
            <FormCardLayout
                header="H"
                primaryText="Next Step"
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Next Step" })
        ).toBeInTheDocument();
    });

    it("shows loading state", () => {
        render(
            <FormCardLayout
                header="H"
                loading
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Loading..." })
        ).toBeInTheDocument();
    });

    it("disables primary button when disabled", () => {
        render(
            <FormCardLayout
                header="H"
                disabled
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Continue" })
        ).toBeDisabled();
    });

    it("disables primary button when loading", () => {
        render(
            <FormCardLayout
                header="H"
                loading
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Loading..." })
        ).toBeDisabled();
    });

    it("renders secondary button when props provided", () => {
        render(
            <FormCardLayout
                header="H"
                secondaryText="Back"
                onSecondaryClick={vi.fn()}
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        expect(
            screen.getByRole("button", { name: "Back" })
        ).toBeInTheDocument();
    });

    it("does not render secondary button when missing props", () => {
        render(
            <FormCardLayout header="H" onSubmit={vi.fn()}>
                <div />
            </FormCardLayout>
        );

        expect(
            screen.queryByRole("button", { name: "Back" })
        ).not.toBeInTheDocument();
    });

    it("calls secondary click handler", () => {
        const fn = vi.fn();

        render(
            <FormCardLayout
                header="H"
                secondaryText="Back"
                onSecondaryClick={fn}
                onSubmit={vi.fn()}
            >
                <div />
            </FormCardLayout>
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Back" })
        );

        expect(fn).toHaveBeenCalledTimes(1);
    });
});
