import { randomUUID } from "node:crypto";

/**
 * The header the custom server (server.ts) stamps on every request with the
 * network address of the device on the other end of the connection. Route
 * handlers can't see the connection themselves, so they read it from here.
 */
export const CLIENT_ADDRESS_HEADER = "x-bridgebox-client-ip";

/**
 * TEST ONLY. In the automated end-to-end run every simulated device connects
 * from the same machine, so they would all share one address. When the server
 * is started with {@link TRUST_TEST_DEVICE_ENV} set, a device can name itself
 * with this header instead. A real Bridge Box never sets that variable, so the
 * header is ignored there.
 */
export const TEST_DEVICE_HEADER = "x-bridgebox-test-device";
export const TRUST_TEST_DEVICE_ENV = "BRIDGEBOX_TRUST_TEST_DEVICE_HEADER";

type Headers = Record<string, string | string[] | undefined>;

/** "::ffff:192.168.4.23" (IPv4 in IPv6 form) -> "192.168.4.23". */
export function normaliseAddress(address: string): string {
  return address.replace(/^::ffff:/i, "");
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Work out the address to stamp on a request. Normally the connection's own
 * address, overwriting anything the device sent. In the end-to-end test run it
 * is the device's self-chosen test id, or a fresh one per request when none is
 * given (so devices that don't name themselves never share a count).
 */
export function resolveClientAddress(
  remoteAddress: string | undefined,
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env[TRUST_TEST_DEVICE_ENV] === "1") {
    const testDevice = firstHeader(headers[TEST_DEVICE_HEADER]);
    return testDevice ? `test:${testDevice}` : `test:${randomUUID()}`;
  }
  return remoteAddress ? normaliseAddress(remoteAddress) : "unknown";
}

/** Set the client-address header on an incoming Node request. */
export function stampClientAddress(req: {
  headers: Headers;
  socket: { remoteAddress?: string };
}): void {
  req.headers[CLIENT_ADDRESS_HEADER] = resolveClientAddress(
    req.socket.remoteAddress,
    req.headers,
  );
}

/** The address of the device that sent this request (set by server.ts). */
export function clientAddress(req: Request): string {
  return req.headers.get(CLIENT_ADDRESS_HEADER) ?? "unknown";
}
