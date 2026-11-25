import { Suspense } from "react";
import type { Metadata } from "next";
import { NewGameFlow } from "@/app/create/NewGameFlow";

export const metadata: Metadata = {
  title: "Create Game | Bridge Box",
};

export default function CreateNewGameRoute() {
  return (
    // NewGameFlow reads the `?step=` search param.
    <Suspense>
      <NewGameFlow />
    </Suspense>
  );
}
