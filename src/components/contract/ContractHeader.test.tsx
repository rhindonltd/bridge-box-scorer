import { render, screen } from "@testing-library/react";
import {afterEach, describe, expect, it, Mock, vi } from "vitest";
import { ContractHeader } from "./ContractHeader";

vi.mock("@/context/PlayContext", () => ({
    usePlay: vi.fn(),
}));

import { usePlay } from "@/context/PlayContext";

const mockedUsePlay = usePlay as unknown as Mock;

describe("ContractHeader", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("renders board number from context", () => {
        mockedUsePlay.mockReturnValue({
            boardSelection: { board: 12 },
        });

        render(<ContractHeader contract="4♠" result="+1" />);

        expect(screen.getByText("Board 12")).toBeInTheDocument();
    });

    it("renders contract and result", () => {
        mockedUsePlay.mockReturnValue({
            boardSelection: { board: 3 },
        });

        render(<ContractHeader contract="3NT" result="=" />);

        expect(screen.getByText("3NT =")).toBeInTheDocument();
    });

    it("renders contract and result together correctly", () => {
        mockedUsePlay.mockReturnValue({
            boardSelection: { board: 7 },
        });

        render(<ContractHeader contract="2♥" result="-1" />);

        const text = screen.getByText("2♥ -1");
        expect(text).toBeInTheDocument();
    });

    it("renders correct structure", () => {
        mockedUsePlay.mockReturnValue({
            boardSelection: { board: 1 },
        });

        render(<ContractHeader contract="1♣" result="+2" />);

        const board = screen.getByText("Board 1");
        const contract = screen.getByText("1♣ +2");

        expect(board).toHaveClass("text-lg");
        expect(contract).toHaveClass("text-2xl");
        expect(contract).toHaveClass("font-bold");
    });
});
