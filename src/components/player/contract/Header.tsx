type Props = {
  contract: string | null;
  resultText: string | null;
};

export default function Header({ contract, resultText }: Props) {
  return (
    <div className="text-center mb-2">
      <div className="text-lg">Board 3</div>
      <div className="text-2xl font-bold">
        {contract} {resultText}
      </div>
    </div>
  );
}
