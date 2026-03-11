export interface LobbyEvent {
  id: string;
  name: string;
  players: string[];
}

// Events the client can emit
export interface LobbyClientToServerEvents {
  "lobby:join": (playerId: string, tableId: number) => void;
  "lobby:leave": (playerId: string, tableId: number) => void;
}

// Events the server emits
export interface LobbyServerToClientEvents {
  "event:created": (newEvent: LobbyEvent) => void;
  "player:joined": (playerId: string, tableId: number) => void;
  "player:left": (playerId: string, tableId: number) => void;
}
