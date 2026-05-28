import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock("@/db/system/queries/login-sessions", () => ({
    directorPasswordExists: vi.fn(),
    setDirectorPassword: vi.fn(),
}));

import {
    directorPasswordExists,
    setDirectorPassword,
} from "@/db/system/queries/login-sessions";

describe("POST /api/director/setup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 if password already exists", async () => {
        vi.mocked(directorPasswordExists).mockResolvedValue(true);

        await testApiHandler({
            appHandler,
            rejectOnHandlerError: true,

            test: async ({ fetch }) => {
                const response = await fetch({
                    method: "POST",
                    body: JSON.stringify({
                        password: "secret-password",
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                expect(response.status).toBe(400);

                expect(await response.json()).toEqual({
                    error: "Password already set",
                });

                expect(setDirectorPassword).not.toHaveBeenCalled();
            },
        });
    });

    it("sets password successfully when one does not exist", async () => {
        vi.mocked(directorPasswordExists).mockResolvedValue(false);
        vi.mocked(setDirectorPassword).mockResolvedValue(undefined);

        await testApiHandler({
            appHandler,
            rejectOnHandlerError: true,

            test: async ({ fetch }) => {
                const response = await fetch({
                    method: "POST",
                    body: JSON.stringify({
                        password: "new-password",
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                expect(response.status).toBe(200);

                expect(await response.json()).toEqual({
                    success: true,
                });

                expect(setDirectorPassword).toHaveBeenCalledWith(
                    "new-password"
                );
            },
        });
    });
});
