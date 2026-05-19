"use client";

import { RoundInfoPage } from "@/components/pages/play/RoundInfoPage";

export default function PlayGame() {
  return (
    <RoundInfoPage
      round={2}
      table={3}
      boards={[1, 2, 3]}
      players={{
        N: {
          id: 1,
          firstName: "Jacqui",
          lastName: "Collier",
          nationalId: "477484",
        },
        S: {
          id: 2,
          firstName: "David",
          lastName: "Collier",
          nationalId: "404476",
        },
        W: {
          id: 3,
          firstName: "Peter",
          lastName: "Collier",
          nationalId: "123456",
        },
        E: {
          id: 4,
          firstName: "Nye",
          lastName: "Collier",
          nationalId: "654321",
        },
      }}
      onEnterRound={() => {}}
    />
  );
}
