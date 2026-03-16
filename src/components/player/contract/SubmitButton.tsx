type Props = {
  onSubmit: () => void;
};

export default function SubmitButton({ onSubmit }: Props) {
  return (
    <button
      className="w-full mt-3 p-3 text-lg bg-green-700 text-white rounded-xl"
      onSubmit={onSubmit}
    >
      Submit Result
    </button>
  );
}
