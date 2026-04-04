import React from "react";
import { SectionInfo } from "@/components/common/SectionInfo";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";

export function AwaitingMovementPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <AwaitingMovement />
    </div>
  );
}
