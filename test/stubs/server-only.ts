// Test stub for the `server-only` package.
//
// The real `server-only` module throws when resolved in a client/browser
// module graph. Vitest's jsdom environment is treated as a client graph, so
// importing server modules (which guard themselves with `import "server-only"`)
// would fail at import time. In tests we alias `server-only` to this no-op so
// those server modules can be unit-tested directly, while the real guard still
// protects genuine client bundles built by Next.js.
export {};
