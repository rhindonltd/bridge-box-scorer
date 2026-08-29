import { redirect } from "next/navigation";

export default async function DisplayGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  redirect(`/display/${gameId}/menu`);
}
