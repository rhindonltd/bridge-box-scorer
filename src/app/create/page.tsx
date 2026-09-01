import type { Metadata } from "next";
import { CreateGamePage } from "@/app/create/CreateGamePage";

export const metadata: Metadata = {
  title: "Create Game | Bridge Box",
};

export default function CreateRoute() {
  return <CreateGamePage />;
}
