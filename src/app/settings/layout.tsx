"use client";

import { useState } from "react";
import { PinEntryPage } from "@/components/pages/settings/PinEntryPage";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinEntered, setPinEntered] = useState(false);

  if (!pinEntered) {
    return (
      <PinEntryPage correctPin="1234" onSuccess={() => setPinEntered(true)} />
    );
  }

  return <>{children}</>;
}
