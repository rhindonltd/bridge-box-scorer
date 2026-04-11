"use client";

import { usePlay } from "@/context/PlayContext";

type Props = {
  contract: string;
  result: string;
};

export function ContractHeader({ contract, result }: Props) {
  const { boardSelection } = usePlay();

  return (
    <div className="text-center mb-2">
      <div className="text-lg">Board {boardSelection!.board}</div>
      <div className="text-2xl font-bold">
        {contract} {result}
      </div>
    </div>
  );
}
