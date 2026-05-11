import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TableCompassLayout from "./TableCompassLayout";

describe("TableCompassLayout", () => {
    it("renders north, south, east, and west content", () => {
        render(
            <TableCompassLayout
                north={<div>North</div>}
                south={<div>South</div>}
                east={<div>East</div>}
                west={<div>West</div>}
            />
        );

        expect(screen.getByText("North")).toBeInTheDocument();
        expect(screen.getByText("South")).toBeInTheDocument();
        expect(screen.getByText("East")).toBeInTheDocument();
        expect(screen.getByText("West")).toBeInTheDocument();
    });

    it("renders center content when provided", () => {
        render(
            <TableCompassLayout
                north={<div>North</div>}
                south={<div>South</div>}
                east={<div>East</div>}
                west={<div>West</div>}
                center={<div>Center</div>}
            />
        );

        expect(screen.getByText("Center")).toBeInTheDocument();
    });

    it("does not require center content", () => {
        render(
            <TableCompassLayout
                north={<div>North</div>}
                south={<div>South</div>}
                east={<div>East</div>}
                west={<div>West</div>}
            />
        );

        // should still render layout correctly without center
        expect(screen.getByText("North")).toBeInTheDocument();
        expect(screen.getByText("South")).toBeInTheDocument();
    });

    it("renders middle row in correct order (west, center, east)", () => {
        render(
            <TableCompassLayout
                north={<div>North</div>}
                south={<div>South</div>}
                west={<div>West</div>}
                center={<div>Center</div>}
                east={<div>East</div>}
            />
        );

        const middleRow = screen.getByText("West").parentElement;

        expect(middleRow).toHaveTextContent("West");
        expect(middleRow).toHaveTextContent("Center");
        expect(middleRow).toHaveTextContent("East");
    });

    it("applies container layout classes", () => {
        const { container } = render(
            <TableCompassLayout
                north={<div>N</div>}
                south={<div>S</div>}
                east={<div>E</div>}
                west={<div>W</div>}
            />
        );

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass(
            "flex",
            "flex-col",
            "items-center",
            "gap-5",
            "w-full",
            "max-w-[360px]"
        );
    });
});
