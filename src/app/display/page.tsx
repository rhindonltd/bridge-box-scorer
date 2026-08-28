"use client";

import SelectGamePage from "@/components/pages/SelectGamePage";
import { useRouter } from "next/navigation";

export default function DisplayRoute() {
    const router = useRouter();

    function onGameSelected(gameId: string) {
        router.push(`/display/${gameId}/menu`);
    }

    return <SelectGamePage onGameSelected={onGameSelected} />;
}
