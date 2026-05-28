"use client";

import { useState } from "react";
import { BoardResult } from "./BoardResult";
import { OpeningLead } from "./OpeningLead";
import { Card } from "@/model/common";

type Props = {
    board: number;
    contract: string;
    declarer: string;

    openingLead: boolean;

    onComplete: (data: {
        result: number;
        lead: Card | null;
    }) => void;
};

type Step = "result" | "lead";

export function BoardFlow({
                              board,
                              contract,
                              declarer,
                              onComplete,
                              openingLead,
                          }: Props) {
    const [step, setStep] = useState<Step>("result");

    const [result, setResult] = useState<number | null>(
        null
    );

    function handleResultSave(value: number) {
        // If no lead step required → finish immediately
        if (!openingLead) {
            onComplete({
                result: value,
                lead: null,
            });
            return;
        }

        setResult(value);
        setStep("lead");
    }

    function handleLeadSave(value: Card | null) {
        onComplete({
            result: result ?? 0,
            lead: value,
        });
    }

    return (
        <div>
            {step === "result" && (
                <BoardResult
                    board={board}
                    contract={contract}
                    declarer={declarer}
                    onSave={handleResultSave}
                />
            )}

            {/* Lead step only exists if required */}
            {step === "lead" && openingLead && (
                <OpeningLead
                    onSave={handleLeadSave}
                />
            )}
        </div>
    );
}
