import { redirect } from "next/navigation";

export default async function JoinGameRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  redirect(`/join/${gameId}/player`);
}
