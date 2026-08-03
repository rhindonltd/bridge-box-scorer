"use client";

import { ReactNode } from "react";

type Props = {
  header?: ReactNode;
  subHeader?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageLayout({ header, subHeader, actions, children }: Props) {
  return (
    <div className="flex-1 flex flex-col">
      {header && <div className="shrink-0">{header}</div>}
      {subHeader && <div className="shrink-0">{subHeader}</div>}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      {actions && <div className="shrink-0 p-2">{actions}</div>}
    </div>
  );
}
