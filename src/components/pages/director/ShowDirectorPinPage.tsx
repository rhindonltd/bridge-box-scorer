import { SectionInfo } from "@/components/common/SectionInfo";
import React from "react";

type Props = {
  eventName: string;
  directorPin: number;
  onChangePin: () => void;
};

export function ShowDirectorPinPage({
  eventName,
  directorPin,
  onChangePin,
}: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <SectionInfo eventName={eventName} />

      <div className="flex-1 flex flex-col items-center justify-center p-2 min-h-0">
        <span>Director PIN:</span>
        <span className="text-2xl font-bold">{directorPin}</span>
      </div>

      <div className="p-2">
        <button
          className="w-full mt-3 p-3 text-lg bg-green-700 text-white rounded-xl"
          onClick={onChangePin}
        >
          Change PIN
        </button>
      </div>
    </div>
  );
}
