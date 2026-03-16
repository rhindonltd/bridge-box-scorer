type Props = {
  result: string;
  onAdjustResult: (x: number) => void;
};

export default function Result({ result, onAdjustResult }: Props) {
  return (
    <div className="flex justify-center items-center gap-5 mt-3">
      <button
        className="w-[50px] h-[50px] text-2xl rounded-lg border"
        onClick={() => onAdjustResult(-1)}
      >
        −
      </button>

      <div className="text-3xl font-bold min-w-[60px] text-center">
        {result}
      </div>

      <button
        className="w-[50px] h-[50px] text-2xl rounded-lg border"
        onClick={() => onAdjustResult(1)}
      >
        +
      </button>
    </div>
  );
}
