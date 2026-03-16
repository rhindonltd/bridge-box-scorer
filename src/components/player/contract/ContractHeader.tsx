type Props = {
  board: number;
  contract: string;
  result: string;
};

export function ContractHeader({ board, contract, result }: Props) {
  return (
    <div className="text-center mb-2">
      <div className="text-lg">Board {board}</div>
      <div className="text-2xl font-bold">
        {contract} {result}
      </div>
    </div>
  );
}
