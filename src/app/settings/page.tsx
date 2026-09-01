import Link from "next/link";

const settingsButtonClasses =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-center block";

export default function SettingsPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        Settings
      </div>

      <div className="flex flex-col gap-3 px-6 pt-6 pb-8 max-w-sm w-full mx-auto">
        <Link href="/settings/wifi" className={settingsButtonClasses}>
          WiFi Settings
        </Link>

        <Link href="/settings/club" className={settingsButtonClasses}>
          Club Information
        </Link>

        <Link href="/settings/admin-key" className={settingsButtonClasses}>
          Update Admin Key
        </Link>
      </div>
    </div>
  );
}
