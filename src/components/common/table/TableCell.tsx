import { ReactNode } from "react";

type Props = {
  value: ReactNode;
  className: string;
};

export function TableCell({ value, className }: Props) {
  return <td className={`px-1 py-2 text-center ${className}`}>{value}</td>;
}
