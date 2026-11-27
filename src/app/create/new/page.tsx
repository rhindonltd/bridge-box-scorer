import type { Metadata } from "next";
import { CreateGamePage } from "@/app/create/CreateGamePage";

export const metadata: Metadata = {
  title: "Create Game | Bridge Box",
};

/** New Game opens straight onto the details form for the new game. */
export default function CreateNewGameRoute() {
  return <CreateGamePage />;
}
