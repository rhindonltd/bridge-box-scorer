type Props = {
  onNotPlayed: () => void;
};

export default function NotPlayedButton({ onNotPlayed }: Props) {
  return (
    <button
      className="w-full mt-2 p-2 text-base bg-blue-400 rounded-xl"
      onSubmit={onNotPlayed}
    >
      Not Played
    </button>
  );
}
