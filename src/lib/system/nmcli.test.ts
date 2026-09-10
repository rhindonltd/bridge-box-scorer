import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});

import { execFile as mockExecFile } from "child_process";
import { runNmcli, NmcliError } from "@/lib/system/nmcli";

type ExecCallback = (e: unknown, r?: { stdout: string; stderr: string }) => void;

describe("runNmcli", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stdout on success", async () => {
    vi.mocked(mockExecFile).mockImplementation(((
      _cmd: string,
      _args: string[],
      cb: unknown,
    ) => {
      (cb as ExecCallback)(null, { stdout: "ok\n", stderr: "" });
    }) as never);

    await expect(runNmcli(["radio", "wifi"])).resolves.toBe("ok\n");
  });

  it("throws an NmcliError carrying the stderr and exit code", async () => {
    vi.mocked(mockExecFile).mockImplementation(((
      _cmd: string,
      _args: string[],
      cb: unknown,
    ) => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "Error: Not authorized to control networking.",
        code: 4,
      });
      (cb as (e: unknown) => void)(err);
    }) as never);

    const error = await runNmcli(["connection", "down", "AP"]).catch((e) => e);
    expect(error).toBeInstanceOf(NmcliError);
    expect((error as NmcliError).stderr).toContain("Not authorized");
    expect((error as NmcliError).code).toBe(4);
    // The message includes the args and the stderr for easy diagnosis.
    expect((error as NmcliError).message).toContain("connection down AP");
    expect((error as NmcliError).message).toContain("Not authorized");
  });

  it("falls back to the error message when there is no stderr", async () => {
    vi.mocked(mockExecFile).mockImplementation(((
      _cmd: string,
      _args: string[],
      cb: unknown,
    ) => {
      (cb as (e: unknown) => void)(new Error("spawn nmcli ENOENT"));
    }) as never);

    const error = (await runNmcli(["radio"]).catch((e) => e)) as NmcliError;
    expect(error).toBeInstanceOf(NmcliError);
    expect(error.message).toContain("ENOENT");
  });
});
