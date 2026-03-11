"use client";

import { useState } from "react";

export default function BridgeScoreEntry() {
  const [level, setLevel] = useState<number | null>(null);
  const [suit, setSuit] = useState<string | null>(null);
  const [declarer, setDeclarer] = useState<string | null>(null);
  const [dbl, setDbl] = useState("");
  const [result, setResult] = useState(0);

  const levels = [1, 2, 3, 4, 5, 6, 7];
  const suits = ["♣", "♦", "♥", "♠", "NT"];

  const adjustResult = (delta: number) => {
    setResult((r) => Math.max(-13, Math.min(7, r + delta)));
  };

  const contract =
    level && suit ? `${level}${suit}${dbl} by ${declarer ?? "?"}` : "-";

  const resultText =
    result === 0 ? "=" : result > 0 ? `+${result}` : `${result}`;

  return (
    <div style={container}>
      {/* HEADER */}
      <div style={header}>
        <div style={{ fontSize: 18 }}>Board 3</div>
        <div style={contractStyle}>
          {contract} {resultText}
        </div>
      </div>

      {/* GRID SECTIONS */}
      <div style={grid}>
        {/* LEVEL */}
        <Section title="Level" gridCols={3}>
          {levels.map((l) => (
            <Button key={l} active={level === l} onClick={() => setLevel(l)}>
              {l}
            </Button>
          ))}
        </Section>

        {/* SUIT */}
        <Section title="Suit" gridCols={3}>
          {suits.map((s) => (
            <Button key={s} active={suit === s} onClick={() => setSuit(s)}>
              {s}
            </Button>
          ))}
        </Section>

        {/* DECLARER */}
        <Section title="Declarer" gridCols={2}>
          {["N", "S", "E", "W"].map((d) => (
            <Button
              key={d}
              active={declarer === d}
              onClick={() => setDeclarer(d)}
            >
              {d}
            </Button>
          ))}
        </Section>

        {/* DOUBLE */}
        <Section title="Double">
          <div>
            <Button active={dbl === ""} onClick={() => setDbl("")} fullWidth>
              None
            </Button>
          </div>
          {/* TODO: Add Not Played*/}
          <div style={{ display: "flex", gap: 12 }}>
            <Button active={dbl === "X"} onClick={() => setDbl("X")} flex={1}>
              X
            </Button>
            <Button active={dbl === "XX"} onClick={() => setDbl("XX")} flex={1}>
              XX
            </Button>
          </div>
        </Section>
      </div>

      {/* RESULT */}
      <div style={resultRow}>
        <button style={stepButton} onClick={() => adjustResult(-1)}>
          −
        </button>
        <div style={resultValue}>{resultText}</div>
        <button style={stepButton} onClick={() => adjustResult(1)}>
          +
        </button>
      </div>

      {/* ACTIONS */}
      <button style={submit}>Submit Result</button>
      <button style={passOut}>Pass Out</button>
    </div>
  );
}

/* ---------- Components ---------- */

function Section({
  title,
  children,
  gridCols = 1,
}: {
  title: string;
  children: React.ReactNode;
  gridCols?: number;
}) {
  return (
    <div style={section}>
      <div style={sectionHeader}>{title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols},1fr)`,
          gap: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Button({
  children,
  active,
  onClick,
  fullWidth = false,
  flex = 0,
}: {
  children: any;
  active: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  flex?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...buttonStyle,
        background: active ? "#1976d2" : "white",
        color: active ? "white" : "black",
        flex: flex > 0 ? flex : undefined,
        width: fullWidth ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Styles ---------- */

const container: React.CSSProperties = {
  maxWidth: 420,
  margin: "auto",
  padding: 12,
  fontFamily: "sans-serif",
};

const header: React.CSSProperties = {
  textAlign: "center",
  marginBottom: 10,
};

const contractStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: "bold",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

/* Section styling */
const section: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: 4,
  backgroundColor: "#f9f9f9",
};

const sectionHeader: React.CSSProperties = {
  fontSize: 14,
  fontWeight: "bold",
  backgroundColor: "#1976d2",
  color: "white",
  padding: "4px 8px",
  borderRadius: 4,
  marginBottom: 6,
};

const buttonStyle: React.CSSProperties = {
  padding: "14px 6px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const resultRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 20,
  marginTop: 12,
};

const stepButton: React.CSSProperties = {
  width: 50,
  height: 50,
  fontSize: 24,
  borderRadius: 10,
};

const resultValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: "bold",
  minWidth: 60,
  textAlign: "center",
};

const submit: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: 14,
  fontSize: 18,
  background: "#2e7d32",
  color: "white",
  border: "none",
  borderRadius: 10,
};

const passOut: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: 12,
  fontSize: 16,
  background: "#b71c1c",
  color: "white",
  border: "none",
  borderRadius: 10,
};
