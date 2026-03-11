interface SelectTableProps {
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
}

export default function SelectTable({ tables, selectTable }: SelectTableProps) {
  const tableNumbers = Array.from({ length: tables }, (_, i) => i + 1);

  return (
    <>
      <h2>Select a Table</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "16px",
          maxWidth: "700px",
        }}
      >
        {tableNumbers.map((table) => (
          <div
            key={table}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "12px",
              textAlign: "center",
              background: "#f9f9f9",
            }}
          >
            {/* Table number */}
            <div
              style={{
                fontWeight: "bold",
                fontSize: "18px",
                marginBottom: "12px",
              }}
            >
              Table {table}
            </div>

            {/* Buttons for NS / EW */}
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => selectTable(table, "NS")}
                style={{
                  flex: 1,
                  padding: "10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: "1px solid #888",
                  background: "#e0f7fa",
                  fontWeight: "bold",
                }}
              >
                NS
              </button>
              <button
                onClick={() => selectTable(table, "EW")}
                style={{
                  flex: 1,
                  padding: "10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: "1px solid #888",
                  background: "#ffe0b2",
                  fontWeight: "bold",
                }}
              >
                EW
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
