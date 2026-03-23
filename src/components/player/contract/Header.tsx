type Props = {
  contract: string | null;
  result: number | null;
};

export default function Header({ contract, result }: Props) {
  const resultText =
    result == null
      ? ""
      : result === 0
        ? "="
        : result > 0
          ? `+${result}`
          : `${result}`;

  return (
    <div className="text-center mb-2">
      <div className="text-2xl font-bold">
        {contract} {resultText}
      </div>
    </div>
  );
}
