import { describe, it, expect } from "vitest";
import {
  CLIENT_ADDRESS_HEADER,
  TEST_DEVICE_HEADER,
  TRUST_TEST_DEVICE_ENV,
  clientAddress,
  normaliseAddress,
  resolveClientAddress,
  stampClientAddress,
} from "./client-address";

describe("client-address", () => {
  it("normalises IPv4-in-IPv6 addresses", () => {
    expect(normaliseAddress("::ffff:192.168.4.23")).toBe("192.168.4.23");
    expect(normaliseAddress("192.168.4.23")).toBe("192.168.4.23");
    expect(normaliseAddress("fe80::1")).toBe("fe80::1");
  });

  it("uses the connection's address and ignores any the device sent", () => {
    expect(
      resolveClientAddress(
        "::ffff:10.0.0.5",
        { [CLIENT_ADDRESS_HEADER]: "1.2.3.4", [TEST_DEVICE_HEADER]: "x" },
        {},
      ),
    ).toBe("10.0.0.5");
  });

  it("reports unknown when the connection has no address", () => {
    expect(resolveClientAddress(undefined, {}, {})).toBe("unknown");
  });

  it("trusts the test device header only in the test run", () => {
    const env = { [TRUST_TEST_DEVICE_ENV]: "1" };
    expect(
      resolveClientAddress(
        "127.0.0.1",
        { [TEST_DEVICE_HEADER]: "phone-a" },
        env,
      ),
    ).toBe("test:phone-a");
    expect(
      resolveClientAddress(
        "127.0.0.1",
        { [TEST_DEVICE_HEADER]: ["phone-b", "x"] },
        env,
      ),
    ).toBe("test:phone-b");
    const a = resolveClientAddress("127.0.0.1", {}, env);
    const b = resolveClientAddress("127.0.0.1", {}, env);
    expect(a).toMatch(/^test:/);
    expect(a).not.toBe(b);
  });

  it("stamps the header on a request, replacing a forged one", () => {
    const req = {
      headers: { [CLIENT_ADDRESS_HEADER]: "forged" } as Record<
        string,
        string | string[] | undefined
      >,
      socket: { remoteAddress: "192.168.4.9" },
    };
    stampClientAddress(req);
    expect(req.headers[CLIENT_ADDRESS_HEADER]).toBe("192.168.4.9");
  });

  it("reads the stamped address from a route request", () => {
    expect(
      clientAddress(
        new Request("http://x", {
          headers: { [CLIENT_ADDRESS_HEADER]: "192.168.4.9" },
        }),
      ),
    ).toBe("192.168.4.9");
    expect(clientAddress(new Request("http://x"))).toBe("unknown");
  });
});
