import { ReactNode } from "react";

type Props = {
  body: ReactNode;
};

export function TableBody({ body }: Props) {
  return <tbody className="bg-white">{body}</tbody>;
}
