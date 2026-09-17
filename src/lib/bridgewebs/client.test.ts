import { describe, it, expect, vi } from "vitest";
import {
  BRIDGEWEBS_API_BASE,
  bridgewebsUrl,
  buildBody,
  parseReply,
  parseReplyField,
  parseEventsResponse,
  postToBridgewebs,
  fetchEventsForDay,
} from "@/lib/bridgewebs/client";

describe("bridgewebsUrl", () => {
  it("appends the url-encoded club code", () => {
    expect(bridgewebsUrl("myclub")).toBe(`${BRIDGEWEBS_API_BASE}?club=myclub`);
    expect(bridgewebsUrl("my club/1")).toBe(
      `${BRIDGEWEBS_API_BASE}?club=my%20club%2F1`,
    );
  });
});

describe("buildBody", () => {
  it("form-encodes all fields", () => {
    const body = buildBody({
      club: "myclub",
      password: "s&cret=1",
      type: "upload",
    });
    const params = new URLSearchParams(body);
    expect(params.get("club")).toBe("myclub");
    expect(params.get("password")).toBe("s&cret=1");
    expect(params.get("type")).toBe("upload");
  });

  it("preserves multi-line file data (LF/CR) via encoding round-trip", () => {
    const data = "line1\nline2\r\nline3";
    const body = buildBody({ data });
    expect(new URLSearchParams(body).get("data")).toBe(data);
  });
});

describe("parseReplyField", () => {
  it("extracts a key = value line, trimming whitespace", () => {
    const raw = "foo = bar\n  message =   Upload Successful  \nbaz = qux";
    expect(parseReplyField(raw, "message")).toBe("Upload Successful");
    expect(parseReplyField(raw, "foo")).toBe("bar");
  });

  it("returns null when the key is absent", () => {
    expect(parseReplyField("nothing here", "message")).toBeNull();
  });
});

describe("parseReply", () => {
  it("marks a Successful message as ok", () => {
    const reply = parseReply("message = Upload Successful");
    expect(reply.ok).toBe(true);
    expect(reply.message).toBe("Upload Successful");
  });

  it("marks a non-success message as not ok", () => {
    const reply = parseReply("message = Invalid password");
    expect(reply.ok).toBe(false);
    expect(reply.message).toBe("Invalid password");
  });

  it("treats a missing message as not ok", () => {
    const reply = parseReply("some unexpected body");
    expect(reply.ok).toBe(false);
    expect(reply.message).toBeNull();
  });

  it("captures a json line when present", () => {
    const reply = parseReply(
      'message = Download Successful\njson = {"events":{}}',
    );
    expect(reply.ok).toBe(true);
    expect(reply.json).toBe('{"events":{}}');
  });
});

describe("parseEventsResponse", () => {
  const payload = {
    events: {
      "1": { file: "2014Jul09!!.dat", title: "Duplicate Pairs" },
      "2": { title: "Create New Event" },
      "3": { title: "Teams Match" },
    },
  };

  it("normalizes events and filters the Create New Event placeholder", () => {
    const events = parseEventsResponse(payload);
    expect(events).toEqual([
      { id: "1", title: "Duplicate Pairs" },
      { id: "3", title: "Teams Match" },
    ]);
  });

  it("accepts a JSON string", () => {
    expect(parseEventsResponse(JSON.stringify(payload))).toHaveLength(2);
  });

  it("returns an empty list for malformed JSON", () => {
    expect(parseEventsResponse("{ not json")).toEqual([]);
  });

  it("returns an empty list when there is no events object", () => {
    expect(parseEventsResponse({})).toEqual([]);
    expect(parseEventsResponse(null)).toEqual([]);
    expect(parseEventsResponse(42)).toEqual([]);
  });

  it("skips entries without a string title", () => {
    expect(
      parseEventsResponse({ events: { "1": { file: "x" }, "2": null } }),
    ).toEqual([]);
  });
});

describe("postToBridgewebs", () => {
  it("posts a form-encoded body to the club url and parses the reply", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("message = Upload Successful", { status: 200 }),
    ) as unknown as typeof fetch;

    const reply = await postToBridgewebs(
      "myclub",
      { club: "myclub", password: "secret", type: "upload" },
      fetchImpl,
    );

    expect(reply.ok).toBe(true);
    expect(reply.message).toBe("Upload Successful");

    const call = vi.mocked(fetchImpl).mock.calls[0];
    expect(call[0]).toBe(`${BRIDGEWEBS_API_BASE}?club=myclub`);
    const init = call[1]!;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    const sent = new URLSearchParams(init.body as string);
    expect(sent.get("type")).toBe("upload");
    expect(sent.get("password")).toBe("secret");
  });

  it("reports a non-2xx status as a failed reply", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("nope", { status: 500, statusText: "Server Error" }),
    ) as unknown as typeof fetch;

    const reply = await postToBridgewebs("myclub", { club: "myclub" }, fetchImpl);
    expect(reply.ok).toBe(false);
    expect(reply.message).toContain("500");
  });
});

describe("fetchEventsForDay", () => {
  it("requests events for the day and parses the json line", async () => {
    const body =
      'message = Download Successful\njson = {"events":{"1":{"title":"Duplicate Pairs"},"2":{"title":"Create New Event"}}}';
    const fetchImpl = vi.fn(async () =>
      new Response(body, { status: 200 }),
    ) as unknown as typeof fetch;

    const events = await fetchEventsForDay(
      "myclub",
      "secret",
      "20140709",
      fetchImpl,
    );

    expect(events).toEqual([{ id: "1", title: "Duplicate Pairs" }]);

    const sent = new URLSearchParams(
      vi.mocked(fetchImpl).mock.calls[0][1]!.body as string,
    );
    expect(sent.get("type")).toBe("download");
    expect(sent.get("transfer")).toBe("events");
    expect(sent.get("date")).toBe("20140709");
    expect(sent.get("format")).toBe("json");
  });

  it("falls back to a pure-json body when no json line is present", async () => {
    const body = '{"events":{"5":{"title":"Swiss Teams"}}}';
    const fetchImpl = vi.fn(async () =>
      new Response(body, { status: 200 }),
    ) as unknown as typeof fetch;

    const events = await fetchEventsForDay("c", "p", "20240101", fetchImpl);
    expect(events).toEqual([{ id: "5", title: "Swiss Teams" }]);
  });
});
