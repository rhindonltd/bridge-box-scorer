import packageJson from "../../package.json";

const packageVersion: string = packageJson.version;

/**
 * Running application version/commit, surfaced so an operator can confirm which
 * release is live without SSHing into the appliance (see /healthz and the UI
 * footer).
 *
 * The device deploys by git commit. Provisioning can bake the commit SHA into
 * the environment at build/deploy time via one of the recognised env vars
 * below; if none is set we fall back to the semver from package.json.
 */

/** The semver from package.json (e.g. "0.1.0"). */
export const APP_VERSION: string = packageVersion;

/**
 * The deployed git commit SHA, if provisioning exposed one. Checked in order:
 * an app-specific var first, then common CI/build conventions.
 */
export const APP_COMMIT: string | null =
  process.env.APP_COMMIT ??
  process.env.GIT_COMMIT ??
  process.env.SOURCE_COMMIT ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  null;

export interface VersionInfo {
  version: string;
  commit: string | null;
}

export function getVersionInfo(): VersionInfo {
  return { version: APP_VERSION, commit: APP_COMMIT };
}

/**
 * Short human-readable version string, e.g. "0.1.0 (a1b2c3d)" or just "0.1.0"
 * when no commit is available. Used in the UI footer.
 */
export function getVersionLabel(): string {
  if (APP_COMMIT) {
    return `${APP_VERSION} (${APP_COMMIT.slice(0, 7)})`;
  }
  return APP_VERSION;
}
