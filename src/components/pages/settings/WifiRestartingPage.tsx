export function WifiRestartingPage({
  seconds,
  status,
}: {
  seconds: number;
  status: string;
}) {
  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>{status}</h1>
      <p>Reconnecting in {seconds}s...</p>
      <p>If disconnected, reconnect to BridgeBox WiFi</p>
    </div>
  );
}
