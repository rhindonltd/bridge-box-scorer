import type { Metadata } from "next";
import { JoinGamePage } from "@/app/join/JoinGamePage";

export const metadata: Metadata = {
  title: "Join Game | Bridge Box",
};

export default function JoinRoute() {
  return <JoinGamePage />;
}
