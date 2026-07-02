import React from "react";

interface Props {
  heading: React.ReactNode;
  content: React.ReactNode;
  bottom: React.ReactNode;
}

export function HeaderContentBottomLayout({ heading, content, bottom }: Props) {
  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <div className="text-center shrink-0">{heading}</div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center">{content}</div>
      </div>

      <div className="shrink-0 w-full flex justify-center px-2 pb-2">
        {bottom}
      </div>
    </div>
  );
}
