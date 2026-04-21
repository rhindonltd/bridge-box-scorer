import {
    sqliteTable,
    text,
    integer,
    primaryKey,
} from "drizzle-orm/sqlite-core";

export const players = sqliteTable(
    "players",
    {
        pairNumber: integer("pair_number"),
        player1: text("player1"),
        player2: text("player2"),
        direction: text("direction"),
    },
    (table) => ({
        pk: primaryKey({
            columns: [table.pairNumber, table.direction],
        }),
    }),
);

export type Player = typeof players.$inferSelect;
