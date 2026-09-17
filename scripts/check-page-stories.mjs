// Guardrail: every top-level route component (a `*Page.tsx` / `*Flow.tsx`
// under src/app) should have a co-located Storybook story (`*.stories.tsx`).
//
// This is a ratchet, not a big-bang gate: components that are known to lack a
// story today are listed in KNOWN_MISSING so CI stays green, while any NEW
// `*Page`/`*Flow` added without a story fails the check. When you add a story
// for a listed component, remove it from KNOWN_MISSING (the check enforces that
// the allowlist has no stale entries, so it can only shrink).
//
// Usage: node scripts/check-page-stories.mjs
//        (or: npm run check:page-stories)

import { readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(dirname, "../src/app");

/**
 * Components that do not yet have a co-located story. Each entry is a repo-root
 * relative path. Keep this list shrinking — it exists only to baseline the
 * pre-existing gaps identified in docs/storybook-coverage-audit.md so the check
 * can guard against NEW gaps without forcing every legacy component to be
 * storied at once.
 */
const KNOWN_MISSING = new Set([
  // Thin data/gate containers whose entire visual surface is a presentational
  // child that IS storied — a container-level story would only duplicate the
  // child's variants (which also carry the socket/provider wiring that makes a
  // container story brittle). These are intentionally covered via their child:
  //   TimerPage        → DisplayTimerPage.stories (11 variants)
  //   ManageTimerPage  → TimerConfigView.stories + TimerLiveView.stories
  "src/app/game/[gameId]/display/timer/TimerPage.tsx",
  "src/app/game/[gameId]/manage/timer/ManageTimerPage.tsx",
  // Thin live-play flow container: resolves seat/game and drives usePlayFlow
  // (socket + state machine), then delegates all rendering to PlayStateRouter
  // (whose state→screen mapping is unit-tested in PlayStateRouter.test.tsx) and
  // WaitingToStartPage (which has its own story). A meaningful PlayPage story
  // would require module-mocking usePlayFlow. Its screens are each storied.
  "src/app/game/[gameId]/play/[initialSeat]/PlayPage.tsx",
  // Its meaningful states (code shown / expired) hinge on the async
  // `generateShareCode` lib call, which MSW can't intercept (it's not a
  // fetch) — a useful story would need Storybook module-mocking. The full
  // state machine (generate, countdown, expiry, regenerate, errors) is already
  // covered by ShareDirectorAccessPage.test.tsx. Revisit if we adopt module
  // mocking in stories.
  "src/app/game/[gameId]/manage/share-access/ShareDirectorAccessPage.tsx",
]);

/** Recursively collect files under `dir` matching the page-component naming. */
function collectPageComponents(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectPageComponents(full));
      continue;
    }
    const isPageComponent =
      (entry.endsWith("Page.tsx") || entry.endsWith("Flow.tsx")) &&
      entry !== "page.tsx" &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".stories.tsx");
    if (isPageComponent) out.push(full);
  }
  return out;
}

const repoRoot = path.resolve(dirname, "..");
const rel = (p) => path.relative(repoRoot, p);

const components = collectPageComponents(APP_DIR);

const missing = [];
for (const file of components) {
  const storyPath = file.replace(/\.tsx$/, ".stories.tsx");
  if (!existsSync(storyPath) && !KNOWN_MISSING.has(rel(file))) {
    missing.push(rel(file));
  }
}

// Guard against a stale allowlist: an entry that now HAS a story (or no longer
// exists) should be removed so the list only ever shrinks.
const staleAllowlist = [];
for (const entry of KNOWN_MISSING) {
  const abs = path.join(repoRoot, entry);
  const storyPath = abs.replace(/\.tsx$/, ".stories.tsx");
  if (!existsSync(abs) || existsSync(storyPath)) {
    staleAllowlist.push(entry);
  }
}

let failed = false;

if (missing.length > 0) {
  failed = true;
  console.error(
    `\n✖ ${missing.length} route component(s) are missing a co-located story:`,
  );
  for (const m of missing) console.error(`  - ${m}`);
  console.error(
    "\nAdd a `<Name>.stories.tsx` next to each, or (only if genuinely" +
      " unstoryable) add it to KNOWN_MISSING in scripts/check-page-stories.mjs" +
      " with a rationale.",
  );
}

if (staleAllowlist.length > 0) {
  failed = true;
  console.error(
    `\n✖ ${staleAllowlist.length} stale KNOWN_MISSING entr(y/ies) — a story now` +
      " exists (or the file was removed). Remove these from" +
      " scripts/check-page-stories.mjs so the allowlist only shrinks:",
  );
  for (const s of staleAllowlist) console.error(`  - ${s}`);
}

if (failed) {
  process.exit(1);
}

console.log(
  `✓ Route-component story check passed (${components.length} components,` +
    ` ${KNOWN_MISSING.size} known-missing allowlisted).`,
);
