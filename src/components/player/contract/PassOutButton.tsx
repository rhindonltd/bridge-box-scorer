type Props = {
  onPassOut: () => void;
};

export default function PassOutButton({ onPassOut }: Props) {
  return (
    <button
      className="w-full mt-2 p-3 text-base bg-red-800 text-white rounded-xl"
      onSubmit={onPassOut}
    >
      Pass Out
    </button>
  );
}
