/**
 * JSON entry point to {@link seedGame} for the automated Playwright suite.
 *
 *   tsx --require ./scripts/allow-server-only.cjs src/scripts/e2e-seed/seed-json.ts '<SeedGameOptions JSON>'
 *
 * Reads the options as JSON (argv[2]) and writes the {@link SeedGameResult} as a
 * single JSON line to stdout. Errors go to stderr with a non-zero exit, so the
 * test sees the seeder's own plain-English message.
 */
import { seedGame, type SeedGameOptions } from "@/scripts/e2e-seed/seed-game";

async function main() {
  const raw = process.argv[2] ?? "{}";
  const options = JSON.parse(raw) as SeedGameOptions;
  const result = await seedGame(options);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
