import React from "react";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface RoundInfoProps {
  roundNumber: number;
  tableNumber: number;
  boards: number[]; // e.g., [1,2,3]
  players: {
    N: PlayerName;
    S: PlayerName;
    E: PlayerName;
    W: PlayerName;
  };
  onEnterRound: () => void;
}

export default function RoundInfo({
  roundNumber,
  tableNumber,
  boards,
  players,
  onEnterRound,
}: RoundInfoProps) {
  const renderPlayer = (player: PlayerName) => (
    <div style={playerName}>
      <div style={{ fontWeight: "bold" }}>{player.firstName}</div>
      <div>{player.lastName}</div>
    </div>
  );

  return (
    <div style={container}>
      <div style={content}>
        <header style={header}>
          <div>Round: {roundNumber}</div>
          <div>Table: {tableNumber}</div>
          <div>Boards: {boards.join(", ")}</div>
        </header>

        <div style={table}>
          {/* North */}
          <div style={northSouth}>
            <div style={playerLabel}>North</div>
            {renderPlayer(players.N)}
          </div>

          {/* Middle row: West / Table / East */}
          <div style={middleRow}>
            <div style={eastWest}>
              <div style={playerLabel}>West</div>
              {renderPlayer(players.W)}
            </div>

            <div style={tableCenter}>
              <div style={tableText}>Table</div>
              <div style={tableNumberStyle}>{tableNumber}</div>
            </div>

            <div style={eastWest}>
              <div style={playerLabel}>East</div>
              {renderPlayer(players.E)}
            </div>
          </div>

          {/* South */}
          <div style={northSouth}>
            <div style={playerLabel}>South</div>
            {renderPlayer(players.S)}
          </div>
        </div>
      </div>

      {/* Enter Round Button */}
      <button style={enterButton} onClick={onEnterRound}>
        Enter Round
      </button>
    </div>
  );
}

/* ---------------- Styles ---------------- */

const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between", // vertical spacing between content and button
  alignItems: "center",
  minHeight: "100vh",
  padding: 16,
  backgroundColor: "#f0f4f8",
  fontFamily: "sans-serif",
};

const content: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1, // take available vertical space to center content
  width: "100%",
};

const header: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 24,
  gap: 6,
};

const table: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 24,
  width: "100%",
  maxWidth: 360,
};

const northSouth: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
};

const middleRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  gap: 12,
  flexWrap: "wrap",
};

const eastWest: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 60,
  flex: "1 1 25%",
};

const playerLabel: React.CSSProperties = {
  fontWeight: "bold",
  marginBottom: 4,
  fontSize: 14,
  textAlign: "center",
};

const playerName: React.CSSProperties = {
  fontSize: 16,
  padding: "6px 8px",
  backgroundColor: "#fff",
  borderRadius: 6,
  textAlign: "center",
  width: "100%",
  maxWidth: 120,
  wordBreak: "break-word",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const tableCenter: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  backgroundColor: "#1976d2",
  color: "#fff",
  borderRadius: 12,
  minWidth: 60,
  flex: "1 1 25%",
};

const tableText: React.CSSProperties = {
  fontSize: 12,
  fontWeight: "bold",
};

const tableNumberStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: "bold",
};

const enterButton: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  padding: "12px 0",
  fontSize: 18,
  fontWeight: "bold",
  backgroundColor: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  marginTop: 16,
  cursor: "pointer",
};
