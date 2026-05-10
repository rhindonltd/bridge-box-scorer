import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGame } from "./CreateGame";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";

vi.mock("@/db/game-index/actions/create-game", () => ({
    createBridgeGame: vi.fn(),
}));

vi.mock("@/db/games/actions/create-game", () => ({
    createGameDb: vi.fn(),
}));

describe("createGame", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates bridge game and db entry, then returns gameId", async () => {
        vi.mocked(createBridgeGame).mockResolvedValue(123);

        const input = {
            eventName: "Test Event",
            director: "Director",
            eventType: "Teams/Pairs",
            tables: 10,
        } as any;

        const result = await createGame(input);

        expect(createBridgeGame).toHaveBeenCalledWith(
            expect.objectContaining({
                eventName: "Test Event",
                director: "Director",
                eventType: "Teams/Pairs",
                sessionName: "",
                sectionName: "",
                eventDate: expect.any(String),
            })
        );

        expect(createGameDb).toHaveBeenCalledWith(
            123,
            "Teams/Pairs"
        );

        expect(result).toBe(123);
    });

    it("passes ISO date string to createBridgeGame", async () => {
        vi.mocked(createBridgeGame).mockResolvedValue(1);

        const input = {
            eventName: "A",
            director: "B",
            eventType: "Individual",
            tables: 1,
        } as any;

        await createGame(input);

        const callArg = vi.mocked(createBridgeGame).mock.calls[0][0];

        expect(new Date(callArg.eventDate).toISOString()).toBe(
            callArg.eventDate
        );
    });

    it("awaits createGameDb after bridge creation", async () => {
        vi.mocked(createBridgeGame).mockResolvedValue(55);

        const order: string[] = [];

        vi.mocked(createBridgeGame).mockImplementation(async () => {
            order.push("bridge");
            return 55;
        });

        // @ts-ignore
        vi.mocked(createGameDb).mockImplementation(async () => {
            order.push("db");
        });

        await createGame({
            eventName: "X",
            director: "Y",
            eventType: "Teams/Pairs",
            tables: 1,
        } as any);

        expect(order).toEqual(["bridge", "db"]);
    });
});
