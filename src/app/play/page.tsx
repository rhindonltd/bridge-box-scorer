import { redirect } from "next/navigation";

export default async function PlayPage() {
  redirect("/join/select-game");
}
