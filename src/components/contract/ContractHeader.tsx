"use client";

import { useBoard } from "@/context/BoardSelectionContext";

type Props = {
  contract: string;
  result: string;
};

export function ContractHeader({ contract, result }: Props) {
  const { selection, selectBoard } = useBoard();

  return (
    <div className="text-center mb-2">
      <div className="text-lg">Board {selection!.board}</div>
      <div className="text-2xl font-bold">
        {contract} {result}
      </div>
    </div>
  );
}
