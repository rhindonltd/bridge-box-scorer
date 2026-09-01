import type { Metadata } from "next";
import { ManageSelectGameFlow } from "@/app/manage/ManageSelectGameFlow";

export const metadata: Metadata = {
  title: "Manage Games | Bridge Box",
};

export default function ManageSelectGame() {
  return <ManageSelectGameFlow />;
}
