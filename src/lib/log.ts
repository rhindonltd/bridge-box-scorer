import pino, { type Logger, type LoggerOptions } from "pino";

/**
 * Structured application logger (pino).
 *
 * Output:
 * - Production (`NODE_ENV=production`): line-delimited JSON on stdout, ready for
 *   journald / log shipping on the appliance.
 * - Development: human-readable, colourised output via the `pino-pretty`
 *   transport (a devDependency — never loaded in production).
 *
 * Level: from `LOG_LEVEL` (e.g. `debug`, `info`, `warn`, `error`), defaulting
 * to `info`. Set `LOG_LEVEL=debug` to see verbose diagnostics.
 *
 * Secrets: the fields below are redacted wherever they appear (top level, under
 * common wrapper objects, and in request headers) so tokens, keys, EBU numbers
 * and transfer codes never reach the logs.
 *
 * This module is a per-bundle singleton (a plain module-level constant). The
 * app ships as two bundles (custom server + Next route handlers); each gets its
 * own logger instance, which is fine because the logger is stateless — it just
 * writes to stdout. It is intentionally NOT on `globalThis`.
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Field paths redacted from all log output. Covers the raw field names and the
 * usual places they nest: request/response headers (incl. the lowercased HTTP
 * header form), and generic `payload`/`body`/`data` wrappers used by the socket
 * and HTTP layers.
 */
const REDACT_FIELDS = [
  "token",
  "directorToken",
  "secretKey",
  "nationalId",
  "code",
] as const;

function redactPaths(): string[] {
  const wrappers = ["payload", "body", "data", "req.body", "res.body"];
  const paths = new Set<string>();

  for (const field of REDACT_FIELDS) {
    paths.add(field);
    paths.add(`*.${field}`);
    for (const wrapper of wrappers) {
      paths.add(`${wrapper}.${field}`);
      paths.add(`${wrapper}.*.${field}`);
    }
  }

  // The admin key is carried as an HTTP header, not a body field.
  paths.add('req.headers["x-admin-token"]');
  paths.add('headers["x-admin-token"]');

  return [...paths];
}

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  // pino's standard error serializer expands `err` into { type, message, stack }.
  serializers: { err: pino.stdSerializers.err },
  redact: {
    paths: redactPaths(),
    censor: "[redacted]",
  },
};

/**
 * The application logger. Use `logger.info({ ...fields }, "message")` — put
 * structured data in the first argument, a short human message second. For
 * errors, pass the caught value under `err`: `logger.error({ err }, "…")`.
 */
export const logger: Logger = isProduction
  ? pino(baseOptions)
  : pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
    });

/**
 * Derive a child logger that stamps every line with the given bindings — used
 * to carry a correlation id (and any request/event context) through a single
 * HTTP request or socket event. Children share the parent's transport, level,
 * and redaction, so correlation propagation stays consistent.
 */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
