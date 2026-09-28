import Link from "next/link";
import { LogoutButton } from "@/app/settings/LogoutButton";
import { PageLayout } from "@/components/layout/PageLayout";

const settingsButtonClasses =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-center block";

/**
 * The Settings landing menu: links to each settings screen plus the admin
 * logout. Extracted from the route so the menu is storyable.
 */
export function SettingsMenuPage() {
  return (
    <PageLayout headerTitle="Settings">
      <div className="flex flex-col gap-3 px-6 pt-6 max-w-sm w-full mx-auto">
        <Link href="/settings/wifi" className={settingsButtonClasses}>
          WiFi Settings
        </Link>

        <Link href="/settings/club" className={settingsButtonClasses}>
          Club Information
        </Link>

        <Link href="/settings/bridgewebs" className={settingsButtonClasses}>
          BridgeWebs
        </Link>

        <Link href="/settings/cloud-sync" className={settingsButtonClasses}>
          Cloud Backup
        </Link>

        <Link href="/settings/admin-key" className={settingsButtonClasses}>
          Update Admin Key
        </Link>

        <div className="pt-3">
          <LogoutButton />
        </div>
      </div>
    </PageLayout>
  );
}
