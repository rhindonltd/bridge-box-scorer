import { useState } from "react";

interface EnterPlayerNamesProps {
  direction: "NS" | "EW";
  submitPlayerNames: (player1: string, player2: string) => void;
}

export default function EnterPlayerNames({
  direction,
  submitPlayerNames,
}: EnterPlayerNamesProps) {
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");

  return (
    <div style={container}>
      <h1>Enter Player Names</h1>

      <form
        onSubmit={() => submitPlayerNames(player1Name, player2Name)}
        style={form}
      >
        <input
          type="text"
          placeholder={`${direction === "NS" ? "North" : "East"} Player Name`}
          value={player1Name}
          onChange={(e) => setPlayer1Name(e.target.value)}
          style={input}
        />
        <input
          type="text"
          placeholder={`${direction === "NS" ? "South" : "West"} Player Name`}
          value={player2Name}
          onChange={(e) => setPlayer2Name(e.target.value)}
          style={input}
        />
        <button style={button}>Submit</button>
      </form>
    </div>
  );
}

// Styles
const container: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  fontFamily: "sans-serif",
};

const form: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "260px",
};

const input: React.CSSProperties = {
  padding: "10px",
  fontSize: "16px",
};

const button: React.CSSProperties = {
  padding: "10px",
  fontSize: "16px",
};
