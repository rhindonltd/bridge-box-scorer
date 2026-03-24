import RoundInfo from "@/components/player/table/RoundInfo";
import React from "react";
import {SectionInfo} from "@/components/common/SectionInfo";
import {TableRoundPairBoardInfo} from "@/components/common/TableRoundPairBoardInfo";

interface PlayerName {
    firstName: string;
    lastName: string;
}

interface Props {
    eventName: string
    sessionName?: string
    sectionName?: string
    round: number;
    table: number;
    boards: number[];
    players: {
        N: PlayerName;
        S: PlayerName;
        E: PlayerName;
        W: PlayerName;
    };
    onEnterRound: () => void;
}

export function RoundInfoPage({ eventName, sessionName, sectionName, round, table, boards, players, onEnterRound }: Props) {
    return (<div className="h-screen flex flex-col bg-gray-100">
        <div className="w-full">
            <SectionInfo
                eventName={eventName}
                sessionName={sessionName}
                sectionName={sectionName}
            />
        </div>

        <div className="w-full">
            <TableRoundPairBoardInfo round={round} table={table} />
        </div>

        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            <RoundInfo boards={boards} table={table} players={players} />
        </div>

        <div className="p-2">
            <button
                onClick={onEnterRound}
                className="w-full max-w-[360px] py-3 text-lg font-bold bg-blue-600 text-white rounded-lg mt-4 hover:bg-blue-700 active:scale-[0.98] transition"
            >
                Enter Round
            </button>
        </div>
    </div>)
}
