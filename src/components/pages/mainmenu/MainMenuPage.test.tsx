import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MainMenuPage } from "./MainMenuPage";

// Mock lucide icon to avoid SVG noise
vi.mock("lucide-react", () => ({
    Settings: () => <div data-testid="settings-icon" />,
}));

describe("MainMenuPage", () => {
    const baseProps = {
        onCreateNewGame: vi.fn(),
        onJoinGame: vi.fn(),
        onManagePastGames: vi.fn(),
        onOpenSettings: vi.fn(),
    };

    it("renders logo", () => {
        render(<MainMenuPage {...baseProps} />);

        expect(screen.getByAltText("Bridge Box")).toBeInTheDocument();
    });

    it("renders Settings button", () => {
        render(<MainMenuPage {...baseProps} />);

        expect(
            screen.getByRole("button", { name: "Settings" })
        ).toBeInTheDocument();
    });

    it("calls onOpenSettings when settings clicked", () => {
        render(<MainMenuPage {...baseProps} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Settings" })
        );

        expect(baseProps.onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it("calls onJoinGame when Join Game clicked", () => {
        render(<MainMenuPage {...baseProps} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Join Game" })
        );

        expect(baseProps.onJoinGame).toHaveBeenCalledTimes(1);
    });

    it("calls onCreateNewGame when Create New Game clicked", () => {
        render(<MainMenuPage {...baseProps} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Create New Game" })
        );

        expect(baseProps.onCreateNewGame).toHaveBeenCalledTimes(1);
    });

    it("calls onManagePastGames when Manage Past Games clicked", () => {
        render(<MainMenuPage {...baseProps} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Manage Past Games" })
        );

        expect(baseProps.onManagePastGames).toHaveBeenCalledTimes(1);
    });

    it("applies layout structure classes", () => {
        const { container } = render(<MainMenuPage {...baseProps} />);

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass(
            "h-screen",
            "flex",
            "flex-col",
            "overflow-y-auto",
            "relative"
        );
    });

    it("renders all main menu buttons", () => {
        render(<MainMenuPage {...baseProps} />);

        expect(screen.getByText("Join Game")).toBeInTheDocument();
        expect(screen.getByText("Create New Game")).toBeInTheDocument();
        expect(screen.getByText("Manage Past Games")).toBeInTheDocument();
    });
});
