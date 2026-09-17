import type { Metadata } from "next";
import { SettingsMenuPage } from "@/app/settings/SettingsMenuPage";

export const metadata: Metadata = {
  title: "Settings | Bridge Box",
};

export default function SettingsRoute() {
  return <SettingsMenuPage />;
}
