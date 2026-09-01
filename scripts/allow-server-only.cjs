// Preload shim for tsx-run scripts (migrations, seeds).
//
// Server modules import `server-only`, which throws when resolved outside a
// Next.js server bundle. Standalone Node/tsx scripts legitimately import those
// modules, so this redirects the `server-only` specifier to an empty module
// for the script process only. tsx compiles these imports to CommonJS require
// calls, so we patch Module._resolveFilename.
const Module = require("node:module");
const path = require("node:path");

const EMPTY = path.join(__dirname, "empty-module.cjs");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") {
    return EMPTY;
  }
  return originalResolve.call(this, request, ...rest);
};
