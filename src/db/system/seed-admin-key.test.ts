import { describe, it, expect, vi, afterEach } from "vitest";
import os from "os";
import { deriveDefaultAdminKey } from "./seed-admin-key";

describe("deriveDefaultAdminKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockInterfaces(value: ReturnType<typeof os.networkInterfaces>) {
    vi.spyOn(os, "networkInterfaces").mockReturnValue(value);
  }

  it("returns the last 6 hex digits of a real MAC, uppercased with no separators", () => {
    mockInterfaces({
      eth0: [
        {
          address: "192.168.1.5",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "dc:a6:32:ab:cd:ef",
          internal: false,
          cidr: "192.168.1.5/24",
        },
      ],
    } as any);

    expect(deriveDefaultAdminKey()).toBe("ABCDEF");
  });

  it("skips internal (loopback) interfaces", () => {
    mockInterfaces({
      lo: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
      eth0: [
        {
          address: "192.168.1.5",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "11:22:33:44:55:66",
          internal: false,
          cidr: "192.168.1.5/24",
        },
      ],
    } as any);

    expect(deriveDefaultAdminKey()).toBe("445566");
  });

  it("skips interfaces with an all-zero MAC", () => {
    mockInterfaces({
      eth0: [
        {
          address: "192.168.1.5",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: false,
          cidr: "192.168.1.5/24",
        },
      ],
      wlan0: [
        {
          address: "192.168.1.6",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "192.168.1.6/24",
        },
      ],
    } as any);

    expect(deriveDefaultAdminKey()).toBe("DDEEFF");
  });

  it("returns null when no usable MAC address is found", () => {
    mockInterfaces({
      lo: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
    } as any);

    expect(deriveDefaultAdminKey()).toBeNull();
  });
});
