import React from "react";

type Props = {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
};

export function SectionInfo({ eventName, sessionName, sectionName }: Props) {
  return (
    <div className="flex flex-col bg-blue-200 py-2">
      <div className="text-center font-bold">
        <span>{eventName}</span>
      </div>
      {(sessionName || sectionName) && (
        <div className="text-center font-bold">
          {sessionName && <span>{sessionName}, </span>}
          {sectionName && <span>{sectionName}</span>}
        </div>
      )}
    </div>
  );
}
