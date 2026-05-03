import "dotenv/config";
import { parse } from "csv-parse/sync";

import { syncPlayers } from "@/db/players/actions/sync-ebu-players";
import { Player } from "@/db/players/schema";

async function main() {
    try {
        await syncPlayersFromEbu();
        console.log("✅ EBU Player Sync complete!");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();

async function syncPlayersFromEbu() {
    const csv = await fetchPlayersCsv();
    const rows = parsePlayers(csv);
    const playersData = mapToPlayers(rows);

    if (playersData.length < 1000) {
        throw new Error("EBU file looks suspiciously small — aborting sync");
    }

    syncPlayers(playersData);
}

async function fetchPlayersCsv(): Promise<string> {
    const res = await fetch("http://www.ebu.co.uk/mpsysfiles/cn_r6eqzmi0zq.csv");

    if (!res.ok) {
        throw new Error(`Failed to fetch CSV: ${res.status}`);
    }

    return await res.text();
}

function parsePlayers(csv: string) {
    return parse(csv, {
        columns: false,
        skip_empty_lines: true,
    });
}

function mapToPlayers(rows: string[][]): Player[] {
    if (!/^\d+$/.test(rows[0][0])) {
        throw new Error("Unexpected CSV format from EBU");
    }

    return rows
        .map((row) => {
            const ebuNumber = Number(row[0]);
            if (!ebuNumber) return null;

            return {
                ebuNumber,
                lastName: row[2]?.trim() || null,
                firstName: row[1]?.trim() || null,
            };
        })
        .filter((p): p is Player => p !== null);
}
