import type { Metadata } from "next";
import { ManageGameMenu } from "@/app/game/[gameId]/manage/ManageGameMenu";

export const metadata: Metadata = {
  title: "Manage Game | Bridge Box",
};

export default async function ManageGameMenuRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return <ManageGameMenu gameId={gameId} />;
}
