"use client";

import { useState } from "react";

import Level from "@/components/player/contract/Level";
import Suit from "@/components/player/contract/Suit";
import Declarer from "@/components/player/contract/Declarer";
import Double from "@/components/player/contract/Double";
import Header from "@/components/player/contract/Header";
import SubmitButton from "@/components/player/contract/SubmitButton";
import PassOutButton from "@/components/player/contract/PassOutButton";
import NumberStepper from "@/components/common/NumberStepper";

export default function EnterContractPage() {
  const [level, setLevel] = useState<number | null>(null);
  const [suit, setSuit] = useState<string | null>(null);
  const [declarer, setDeclarer] = useState<string | null>(null);
  const [dbl, setDbl] = useState("");
  const [result, setResult] = useState(0);

  const adjustResult = (delta: number) => {
    setResult((r) => Math.max(-13, Math.min(7, r + delta)));
  };

  const submitResult = () => {
    // TODO
  };

  const passOut = () => {
    // TODO
  };

  const contract =
    level && suit ? `${level}${suit}${dbl} by ${declarer ?? "?"}` : "-";

  return (
    <div className="max-w-[420px] mx-auto p-3 font-sans">
      <Header contract={contract} result={result} />
      <div className="grid grid-cols-2 gap-3">
        <Level level={level} onLevelSelected={setLevel} />
        <Suit suit={suit} onSuitSelected={setSuit} />
        <Declarer declarer={declarer} onDeclarerSelected={setDeclarer} />
        <Double dbl={dbl} onDblSelected={setDbl} />
      </div>
      <NumberStepper
        value={result}
        zeroCharacter={"="}
        onAdjustValue={adjustResult}
      />

      {/* ACTIONS */}
      <SubmitButton onSubmit={submitResult} />
      <PassOutButton onPassOut={passOut} />
    </div>
  );
}
