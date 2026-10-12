import { describe, it, expect, vi } from "vitest";
import {
  basicAuthHeader,
  unwrapResponse,
  parseUsebio,
  checkSessionDate,
  checkPlayers,
  submitSession,
  EbuApiError,
  type EbuAuth,
} from "@/lib/ebu/client";

const auth: EbuAuth = { ebuNumber: "123456", password: "s3cret" };

/** A fetch stub returning the given status + body for a single call. */
function stubFetch(status: number, body: string) {
  return vi.fn().mockResolvedValue(
    new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("basicAuthHeader", () => {
  it("base64-encodes number:password", () => {
    const header = basicAuthHeader(auth);
    expect(header.startsWith("Basic ")).toBe(true);
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
    expect(decoded).toBe("123456:s3cret");
  });
});

describe("unwrapResponse", () => {
  it("unwraps the top-level response object", () => {
    expect(unwrapResponse({ response: { login: "club" } })).toEqual({
      login: "club",
    });
  });

  it("tolerates an already-flat object", () => {
    expect(unwrapResponse({ login: "club" })).toEqual({ login: "club" });
  });

  it("returns {} for non-objects", () => {
    expect(unwrapResponse(null)).toEqual({});
    expect(unwrapResponse("x")).toEqual({});
  });
});

describe("parseUsebio", () => {
  it("posts the file as multipart under 'myfile' with Basic auth", async () => {
    const fetchImpl = stubFetch(200, JSON.stringify({ response: { ok: 1 } }));
    const result = await parseUsebio(
      auth,
      "<USEBIO/>",
      "event.xml",
      fetchImpl,
    );

    expect(result).toEqual({ ok: 1 });
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization.startsWith("Basic ")).toBe(true);
    expect(init.body).toBeInstanceOf(FormData);
    const file = (init.body as FormData).get("myfile");
    expect(file).toBeInstanceOf(Blob);
  });

  it("throws EbuApiError on a non-2xx status", async () => {
    const fetchImpl = stubFetch(500, "boom");
    await expect(
      parseUsebio(auth, "<USEBIO/>", "e.xml", fetchImpl),
    ).rejects.toBeInstanceOf(EbuApiError);
  });

  it("throws EbuApiError on a non-JSON body", async () => {
    const fetchImpl = stubFetch(200, "not json");
    await expect(
      parseUsebio(auth, "<USEBIO/>", "e.xml", fetchImpl),
    ).rejects.toBeInstanceOf(EbuApiError);
  });
});

describe("checkSessionDate", () => {
  it("normalizes Sims (single object) and Duplicates", async () => {
    const fetchImpl = stubFetch(
      200,
      JSON.stringify({
        response: {
          Sims: { ID: "000181", Description: "Autumn Pairs" },
          Duplicates: "1",
        },
      }),
    );
    const result = await checkSessionDate(auth, "20170101", fetchImpl);
    expect(result).toEqual({
      sims: [{ id: "000181", description: "Autumn Pairs" }],
      duplicates: 1,
    });
  });

  it("handles no sims and zero duplicates", async () => {
    const fetchImpl = stubFetch(
      200,
      JSON.stringify({ response: { Duplicates: 0 } }),
    );
    const result = await checkSessionDate(auth, "20170101", fetchImpl);
    expect(result).toEqual({ sims: [], duplicates: 0 });
  });
});

describe("checkPlayers", () => {
  it("sends the player list and normalizes the results + totals", async () => {
    const fetchImpl = stubFetch(
      200,
      JSON.stringify({
        response: {
          Players: [
            { ebu: "1", surname: "Shears", check: "abc" },
            { ebu: "2", surname: "NotExist", bad_ebu: 1 },
            { ebu: "3", surname: "Cooke", found_surname: "Cook", mismatch: 1 },
          ],
          BadEBUs: 1,
          Mismatches: 1,
        },
      }),
    );

    const result = await checkPlayers(
      auth,
      [
        { ebu: "1", surname: "Shears" },
        { ebu: "2", surname: "NotExist" },
        { ebu: "3", surname: "Cooke" },
      ],
      fetchImpl,
    );

    expect(result.badEbus).toBe(1);
    expect(result.mismatches).toBe(1);
    expect(result.players[0]).toEqual({
      ebu: "1",
      surname: "Shears",
      check: "abc",
    });
    expect(result.players[1].bad_ebu).toBe(1);
    expect(result.players[2].mismatch).toBe(1);
    expect(result.players[2].found_surname).toBe("Cook");

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const sent = new URLSearchParams(init.body as string).get("data");
    expect(JSON.parse(sent!)).toHaveLength(3);
  });
});

describe("submitSession", () => {
  it("returns ok with the SessionID on success", async () => {
    const fetchImpl = stubFetch(
      200,
      JSON.stringify({ response: { SessionID: "EBU-004255" } }),
    );
    const result = await submitSession(auth, { foo: 1 }, fetchImpl);
    expect(result).toEqual({
      ok: true,
      sessionId: "EBU-004255",
      warnings: [],
    });
  });

  it("returns not-ok with the failure message", async () => {
    const fetchImpl = stubFetch(
      200,
      JSON.stringify({
        response: { failure: "Bad data", warnings: ["w1"] },
      }),
    );
    const result = await submitSession(auth, {}, fetchImpl);
    expect(result).toEqual({
      ok: false,
      failure: "Bad data",
      warnings: ["w1"],
    });
  });

  it("treats a missing SessionID (and no failure) as a failure", async () => {
    const fetchImpl = stubFetch(200, JSON.stringify({ response: {} }));
    const result = await submitSession(auth, {}, fetchImpl);
    expect(result.ok).toBe(false);
  });
});
