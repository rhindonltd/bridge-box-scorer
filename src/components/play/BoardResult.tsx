import { useMemo, useState } from "react";

type Props = {
    board: number;
    contract: string;
    declarer: string;

    onSave: (result: number) => void;
};

function parseContract(contract: string) {
    const level = parseInt(contract[0], 10);
    return { requiredTricks: 6 + level };
}

export function BoardResult({
                                board,
                                contract,
                                declarer,
                                onSave,
                            }: Props) {
    const { requiredTricks } = useMemo(
        () => parseContract(contract),
        [contract]
    );

    const maxOver = 13 - requiredTricks;
    const maxDown = requiredTricks;

    const [mode, setMode] = useState<"made" | "down">("made");
    const [value, setValue] = useState(0);

    const result =
        mode === "made" ? value : -value;

    const values = useMemo(() => {
        return mode === "made"
            ? Array.from({ length: maxOver + 1 }, (_, i) => i)
            : Array.from({ length: maxDown }, (_, i) => i + 1);
    }, [mode, maxOver, maxDown]);

    return (
        <div className="flex h-[100dvh] flex-col p-6">

            {/* HEADER */}
            <header className="shrink-0 mb-4">
                <h1 className="text-xl font-semibold">
                    Board {board}
                </h1>
                <p className="text-sm text-gray-500">
                    {contract} by {declarer}
                </p>
            </header>

            {/* BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto space-y-6">

                {/* MODE */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            setMode("made");
                            setValue(0);
                        }}
                        className={
                            mode === "made"
                                ? "rounded-lg bg-green-600 py-3 text-white"
                                : "rounded-lg border py-3"
                        }
                    >
                        Made
                    </button>

                    <button
                        onClick={() => {
                            setMode("down");
                            setValue(1);
                        }}
                        className={
                            mode === "down"
                                ? "rounded-lg bg-red-600 py-3 text-white"
                                : "rounded-lg border py-3"
                        }
                    >
                        Down
                    </button>
                </div>

                {/* GRID */}
                <div>
                    <div className="mb-2 text-sm text-gray-500">
                        {mode === "made"
                            ? "Overtricks"
                            : "Down tricks"}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {values.map((v) => (
                            <button
                                key={v}
                                onClick={() => setValue(v)}
                                className={[
                                    "rounded-xl py-4 text-lg font-medium",
                                    v === value
                                        ? "bg-black text-white"
                                        : "border",
                                ].join(" ")}
                            >
                                {mode === "made"
                                    ? `+${v}`
                                    : `-${v}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="shrink-0 mt-4">
                <button
                    onClick={() => onSave(result)}
                    className="w-full rounded-xl bg-black py-4 text-white"
                >
                    Continue
                </button>
            </footer>
        </div>
    );
}
