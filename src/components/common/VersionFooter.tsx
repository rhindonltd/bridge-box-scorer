import { getVersionLabel } from "@/lib/version";

/**
 * Small, unobtrusive footer showing the running app version/commit so an
 * operator can confirm which release is live without SSHing into the appliance
 * (see scorer-app-improvements.md, "Running-version visibility").
 *
 * Server component: the version is resolved on the server from package.json and
 * the build-time commit env var.
 */
export function VersionFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`text-center text-xs text-gray-400 pb-3 ${className}`.trim()}
    >
      <span>v{getVersionLabel()}</span>
    </footer>
  );
}
