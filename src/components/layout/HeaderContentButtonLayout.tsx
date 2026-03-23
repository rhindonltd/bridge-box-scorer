import React from "react";

interface Props {
  heading: React.ReactNode;
  content: React.ReactNode;
  button: React.ReactNode;
}

export function HeaderContentButtonLayout({ heading, content, button }: Props) {
  return (
    <div className="flex flex-col justify-between items-center h-screen bg-gray-100">
      <div className="text-center">{heading}</div>
      <div className="w-full flex items-center justify-center">{content}</div>
      <div className="w-full flex justify-center pl-2 pr-2 pb-2">{button}</div>
    </div>
  );
}
