import type { Metadata } from "next";
import { CreateSelectGameFlow } from "@/app/create/CreateSelectGameFlow";

export const metadata: Metadata = {
  title: "Create Game | Bridge Box",
};

export default function CreateRoute() {
  return <CreateSelectGameFlow />;
}
