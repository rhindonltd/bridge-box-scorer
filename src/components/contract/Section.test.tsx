import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Section from "./Section";

describe("Section", () => {
    it("renders the title", () => {
        render(
            <Section title="Test Title">
                <div>Content</div>
            </Section>
        );

        expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("renders children", () => {
        render(
            <Section title="Section">
                <div>Child Content</div>
            </Section>
        );

        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("applies default container classes", () => {
        const { container } = render(
            <Section title="Section">
                <div>Content</div>
            </Section>
        );

        expect(container.firstChild).toHaveClass(
            "border",
            "border-gray-300",
            "bg-gray-50",
            "flex",
            "flex-col",
            "h-full"
        );
    });

    it("applies custom className", () => {
        const { container } = render(
            <Section
                title="Section"
                className="custom-class"
            >
                <div>Content</div>
            </Section>
        );

        expect(container.firstChild).toHaveClass("custom-class");
    });

    it("renders title section with expected classes", () => {
        render(
            <Section title="My Title">
                <div>Content</div>
            </Section>
        );

        const title = screen.getByText("My Title");

        expect(title).toHaveClass(
            "text-sm",
            "font-bold",
            "bg-blue-600",
            "text-white",
            "px-2",
            "py-1",
            "mb-1"
        );
    });

    it("uses default gridCols=1", () => {
        const { container } = render(
            <Section title="Section">
                <div>Content</div>
            </Section>
        );

        const grid = container.querySelector(".grid");

        expect(grid).toHaveStyle({
            gridTemplateColumns: "repeat(1,1fr)",
        });
    });

    it("applies custom gridCols", () => {
        const { container } = render(
            <Section
                title="Section"
                gridCols={4}
            >
                <div>Content</div>
            </Section>
        );

        const grid = container.querySelector(".grid");

        expect(grid).toHaveStyle({
            gridTemplateColumns: "repeat(4,1fr)",
        });
    });

    it("renders multiple children", () => {
        render(
            <Section title="Section">
                <div>One</div>
                <div>Two</div>
            </Section>
        );

        expect(screen.getByText("One")).toBeInTheDocument();
        expect(screen.getByText("Two")).toBeInTheDocument();
    });
});
