type Props = {
  onSubmit: () => void;
};

export default function SubmitButton({ onSubmit }: Props) {
  return (
    <button
      className="w-full p-2 text-lg bg-green-700 text-white rounded-xl"
      onSubmit={onSubmit}
    >
      OK
    </button>
  );
}
